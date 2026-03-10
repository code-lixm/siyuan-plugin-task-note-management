import {
    DatabaseConfig,
    DatabaseOperationError,
    DEFAULT_DATABASE_CONFIG,
    SiYuanCellValue
} from '../types/database';
import type { DatabaseTemplate, TemplateColumn } from '../templates/databaseTemplates';
import { rowToProject, projectToRowValues } from './databaseConverters';
import type { Project } from './projectManager';
import type { ProjectDatabaseRow, SiYuanTextCell, SiYuanMSelectCell } from '../types/database';

interface SiYuanApiResponse<T> {
    code: number;
    msg?: string;
    data: T;
}

type AttributeViewData = Record<string, unknown>;

interface AttributeViewKeyValue {
    key: {
        id: string;
        name: string;
    };
}

interface AttributeViewRowCell {
    id?: string;
    keyId?: string;
    value?: SiYuanCellValue;
}

interface AttributeViewRow {
    id: string;
    cells?: AttributeViewRowCell[];
}

/**
 * SiYuan Database Manager
 *
 * 统一封装 SiYuan Attribute View 数据库基础访问能力：
 * - 单例生命周期管理
 * - 数据库可用性检查
 * - AV 基础读写 API 封装
 * - 重试与错误包装
 */
export class SiYuanDatabaseManager {
    private static instance: SiYuanDatabaseManager;
    private initialized = false;
    private available = false;
    private config: DatabaseConfig = { ...DEFAULT_DATABASE_CONFIG };

    private constructor() { }

    /**
     * 获取管理器单例。
     */
    public static getInstance(): SiYuanDatabaseManager {
        if (!SiYuanDatabaseManager.instance) {
            SiYuanDatabaseManager.instance = new SiYuanDatabaseManager();
        }
        return SiYuanDatabaseManager.instance;
    }

    /**
     * 初始化数据库管理器并尝试连接到配置数据库。
     *
     * @param config 可选配置，会与默认配置合并
     * @returns 是否初始化后可用
     */
    public async initialize(config?: Partial<DatabaseConfig>): Promise<boolean> {
        if (this.initialized) {
            return this.available;
        }

        this.config = {
            ...DEFAULT_DATABASE_CONFIG,
            ...config
        };

        const databaseId = this.config.projectHubDatabaseId;
        if (!databaseId) {
            console.warn('[SiYuanDatabaseManager] initialize skipped: missing projectHubDatabaseId');
            this.initialized = true;
            this.available = false;
            return this.available;
        }

        try {
            await this.getAttributeView(databaseId);
            this.available = true;
            console.debug('[SiYuanDatabaseManager] initialized successfully', { databaseId });
        } catch (error) {
            this.available = false;
            console.error('[SiYuanDatabaseManager] initialize failed', error);
        } finally {
            this.initialized = true;
        }

        return this.available;
    }

    /**
     * 检查数据库是否可访问。
     */
    public async isAvailable(): Promise<boolean> {
        const databaseId = this.config.projectHubDatabaseId;
        if (!databaseId) {
            this.available = false;
            return false;
        }

        try {
            await this.getAttributeView(databaseId);
            this.available = true;
            return true;
        } catch (error) {
            console.warn('[SiYuanDatabaseManager] isAvailable check failed', error);
            this.available = false;
            return false;
        }
    }

    /**
     * 获取 Attribute View 数据。
     *
     * @param databaseId Attribute View ID
     */
    public async getAttributeView(databaseId: string): Promise<AttributeViewData> {
        return this.requestWithRetry<AttributeViewData>(
            '/api/av/getAttributeView',
            { id: databaseId },
            'getAttributeView'
        );
    }

    /**
     * 设置 Attribute View 单元格值。
     *
     * @param avID Attribute View ID
     * @param keyID 列 ID
     * @param itemID 行/项 ID
     * @param value 单元格值
     */
    public async setAttributeViewBlockAttr(
        avID: string,
        keyID: string,
        itemID: string,
        value: SiYuanCellValue
    ): Promise<Record<string, unknown>> {
        return this.requestWithRetry<Record<string, unknown>>(
            '/api/av/setAttributeViewBlockAttr',
            { avID, keyID, itemID, value },
            'setAttributeViewBlockAttr'
        );
    }

    /**
     * 添加 Attribute View 列定义。
     */
    public async addAttributeViewKey(
        avID: string,
        column: TemplateColumn,
        previousKeyID: string
    ): Promise<string> {
        const keyID = this.generateKeyId();
        await this.requestWithRetry<Record<string, unknown>>(
            '/api/av/addAttributeViewKey',
            {
                avID,
                keyID,
                keyName: column.name,
                keyType: column.type,
                keyIcon: '',
                previousKeyID
            },
            'addAttributeViewKey'
        );
        return keyID;
    }

    /**
     * 根据模板确保数据库列存在，自动补齐缺失列。
     */
    public async ensureTemplateColumns(
        databaseId: string,
        template: DatabaseTemplate
    ): Promise<{ added: string[]; skipped: string[] }> {
        const data = await this.getAttributeView(databaseId);
        const keyValues = (data as { av?: { keyValues?: Array<{ key: { id: string; name: string } }> } }).av?.keyValues ?? [];
        const existingNames = new Set(keyValues.map((item) => item.key.name));
        const added: string[] = [];
        const skipped: string[] = [];

        let previousKeyID = keyValues.length > 0 ? keyValues[keyValues.length - 1].key.id : '';

        for (const column of template.columns) {
            if (existingNames.has(column.name)) {
                skipped.push(column.name);
                continue;
            }
            previousKeyID = await this.addAttributeViewKey(databaseId, column, previousKeyID);
            added.push(column.name);
        }

        return { added, skipped };
    }

    /**
     * 获取所有项目数据。
     */
    public async getAllProjects(): Promise<Project[]> {
        const databaseId = this.config.projectHubDatabaseId;
        if (!databaseId) {
            throw new Error('[SiYuanDatabaseManager] projectHubDatabaseId is required');
        }

        const data = await this.getAttributeView(databaseId);
        const keyValues = this.extractKeyValues(data);
        const rows = this.extractRows(data);

        const projects: Project[] = [];
        for (const row of rows) {
            const mappedRow = this.mapRowToProjectDatabaseRow(row, keyValues);
            const typeValue = this.getMSelectContent(mappedRow['类型']);
            if (typeValue && typeValue !== '项目') {
                continue;
            }
            projects.push(rowToProject(mappedRow));
        }

        return projects;
    }

    /**
     * 保存所有项目数据（数据库模式）。
     */
    public async saveProjects(projects: Project[]): Promise<void> {
        const databaseId = this.config.projectHubDatabaseId;
        if (!databaseId) {
            throw new Error('[SiYuanDatabaseManager] projectHubDatabaseId is required');
        }

        const data = await this.getAttributeView(databaseId);
        const keyValues = this.extractKeyValues(data);
        const rows = this.extractRows(data);
        const keyIdMap = new Map(keyValues.map((item) => [item.key.name, item.key.id]));
        const existingRowMap = new Map<string, ProjectDatabaseRow>();

        for (const row of rows) {
            existingRowMap.set(row.id, this.mapRowToProjectDatabaseRow(row, keyValues));
        }

        const rowsToAppend: Array<Array<Record<string, unknown>>> = [];

        for (const project of projects) {
            const existingRow = existingRowMap.get(project.id);
            const rowValues = projectToRowValues(project, existingRow);

            if (existingRow) {
                await this.updateRowValues(databaseId, project.id, rowValues, keyIdMap);
                continue;
            }

            const newRowPayload = this.buildAppendRowPayload(rowValues, keyIdMap);
            if (newRowPayload.length > 0) {
                rowsToAppend.push(newRowPayload);
            }
        }

        if (rowsToAppend.length > 0) {
            await this.appendAttributeViewDetachedBlocksWithValues(databaseId, rowsToAppend);
        }
    }

    /**
     * 执行带重试的 SiYuan AV API 请求。
     * 重试间隔使用指数退避：1s, 2s, 4s。
     */
    private async requestWithRetry<T>(
        endpoint: string,
        payload: Record<string, unknown>,
        operation: string
    ): Promise<T> {
        const maxRetries = this.config.retryCount ?? 3;
        let lastError: Error | undefined;

        for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json() as SiYuanApiResponse<T>;
                if (result.code !== 0) {
                    throw new Error(result.msg || `SiYuan API error code ${result.code}`);
                }

                if (attempt > 0) {
                    console.debug(`[SiYuanDatabaseManager] ${operation} succeeded after retry`, {
                        endpoint,
                        attempt
                    });
                }

                return result.data;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (attempt >= maxRetries) {
                    break;
                }

                const delay = 1000 * Math.pow(2, attempt);
                console.warn(`[SiYuanDatabaseManager] ${operation} attempt failed, retrying`, {
                    endpoint,
                    attempt: attempt + 1,
                    delay,
                    error: lastError.message
                });

                await this.sleep(delay);
            }
        }

        throw new DatabaseOperationError(
            `[SiYuanDatabaseManager] ${operation} failed after retries`,
            operation,
            lastError
        );
    }

    private async appendAttributeViewDetachedBlocksWithValues(
        avID: string,
        blocksValues: Array<Array<Record<string, unknown>>>
    ): Promise<void> {
        await this.requestWithRetry<Record<string, unknown>>(
            '/api/av/appendAttributeViewDetachedBlocksWithValues',
            {
                avID,
                blocksValues
            },
            'appendAttributeViewDetachedBlocksWithValues'
        );
    }

    private generateKeyId(): string {
        return `avk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    private async sleep(ms: number): Promise<void> {
        await new Promise<void>((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    private extractKeyValues(data: AttributeViewData): AttributeViewKeyValue[] {
        const av = (data as { av?: { keyValues?: AttributeViewKeyValue[] } }).av;
        return av?.keyValues ?? [];
    }

    private extractRows(data: AttributeViewData): AttributeViewRow[] {
        const av = (data as { av?: { rows?: AttributeViewRow[] }; view?: { rows?: AttributeViewRow[] }; rows?: AttributeViewRow[] }).av;
        const view = (data as { view?: { rows?: AttributeViewRow[] } }).view;
        return av?.rows ?? view?.rows ?? (data as { rows?: AttributeViewRow[] }).rows ?? [];
    }

    private mapRowToProjectDatabaseRow(
        row: AttributeViewRow,
        keyValues: AttributeViewKeyValue[]
    ): ProjectDatabaseRow {
        const result: ProjectDatabaseRow = {
            id: row.id,
            '名称': this.createDefaultTextCell(),
            '类型': this.createDefaultMSelectCell()
        };
        const keyMap = new Map(keyValues.map((item) => [item.key.id, item.key.name]));

        for (const cell of row.cells ?? []) {
            const keyId = cell.keyId || cell.id;
            if (!keyId) {
                continue;
            }
            const keyName = keyMap.get(keyId);
            if (!keyName) {
                continue;
            }
            const value = cell.value ?? (cell as unknown as SiYuanCellValue);
            if (this.isSiYuanCellValue(value)) {
                (result as unknown as Record<string, SiYuanCellValue>)[keyName] = value;
            }
        }

        return result;
    }

    private getMSelectContent(value: SiYuanCellValue | undefined): string | undefined {
        if (!value || !('mSelect' in value)) {
            return undefined;
        }
        const options = value.mSelect;
        if (!Array.isArray(options) || options.length === 0) {
            return undefined;
        }
        return options[0].content;
    }

    private isSiYuanCellValue(value: unknown): value is SiYuanCellValue {
        return typeof value === 'object' && value !== null;
    }

    private createDefaultTextCell(): SiYuanTextCell {
        return { text: { content: '' } };
    }

    private createDefaultMSelectCell(): SiYuanMSelectCell {
        return { mSelect: [] };
    }

    private async updateRowValues(
        avID: string,
        rowId: string,
        rowValues: Record<string, SiYuanCellValue | undefined>,
        keyIdMap: Map<string, string>
    ): Promise<void> {
        const entries = Object.entries(rowValues);
        for (const [columnName, value] of entries) {
            if (!value) {
                continue;
            }
            const keyID = keyIdMap.get(columnName);
            if (!keyID) {
                continue;
            }
            await this.setAttributeViewBlockAttr(avID, keyID, rowId, value);
        }
    }

    private buildAppendRowPayload(
        rowValues: Record<string, SiYuanCellValue | undefined>,
        keyIdMap: Map<string, string>
    ): Array<Record<string, unknown>> {
        const payload: Array<Record<string, unknown>> = [];
        for (const [columnName, value] of Object.entries(rowValues)) {
            if (!value) {
                continue;
            }
            const keyID = keyIdMap.get(columnName);
            if (!keyID) {
                continue;
            }
            payload.push({
                keyID,
                ...value
            });
        }
        return payload;
    }
}
