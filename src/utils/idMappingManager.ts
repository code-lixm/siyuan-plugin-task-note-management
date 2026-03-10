/**
 * ID Mapping Manager
 * 
 * 管理业务ID与SiYuan AV行ID之间的双向映射
 * 支持持久化到JSON文件
 */

import { IDMappingEntry, IIDMappingManager } from '../types/database';

export class IDMappingManager implements IIDMappingManager {
    private static instance: IDMappingManager;
    private businessToEntry: Map<string, IDMappingEntry>;
    private avToBusiness: Map<string, string>;
    private initialized: boolean = false;
    private plugin: any = null;

    private constructor() {
        this.businessToEntry = new Map();
        this.avToBusiness = new Map();
    }

    /**
     * 获取单例实例
     */
    static getInstance(): IDMappingManager {
        if (!IDMappingManager.instance) {
            IDMappingManager.instance = new IDMappingManager();
        }
        return IDMappingManager.instance;
    }

    /**
     * 初始化管理器
     * @param plugin - SiYuan插件实例
     */
    async initialize(plugin: any): Promise<void> {
        if (this.initialized) {
            return;
        }

        this.plugin = plugin;
        await this.load();
        this.initialized = true;
    }

    /**
     * 检查是否已初始化
     */
    isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * 根据业务ID获取AV行ID
     */
    getAvRowId(businessId: string): string | undefined {
        const entry = this.businessToEntry.get(businessId);
        return entry?.avRowId;
    }

    /**
     * 根据AV行ID获取业务ID
     */
    getBusinessId(avRowId: string): string | undefined {
        return this.avToBusiness.get(avRowId);
    }

    /**
     * 获取完整映射条目
     */
    getMapping(businessId: string): IDMappingEntry | undefined {
        return this.businessToEntry.get(businessId);
    }

    /**
     * 添加或更新映射
     */
    addMapping(businessId: string, avRowId: string, type: 'project' | 'group' | 'milestone' | '项目' | '分组' | '里程碑'): void {
        // 移除旧的AV行ID映射
        const oldEntry = this.businessToEntry.get(businessId);
        if (oldEntry && oldEntry.avRowId !== avRowId) {
            this.avToBusiness.delete(oldEntry.avRowId);
        }

        // 创建新映射
        const entry: IDMappingEntry = {
            businessId,
            avRowId,
            type: type as any,
            updatedAt: Date.now()
        };

        this.businessToEntry.set(businessId, entry);
        this.avToBusiness.set(avRowId, businessId);
    }

    /**
     * 移除映射
     */
    removeMapping(businessId: string): void {
        const entry = this.businessToEntry.get(businessId);
        if (entry) {
            this.avToBusiness.delete(entry.avRowId);
            this.businessToEntry.delete(businessId);
        }
    }

    /**
     * 获取所有映射
     */
    getAllMappings(): IDMappingEntry[] {
        return Array.from(this.businessToEntry.values());
    }

    /**
     * 清空所有映射
     */
    clear(): void {
        this.businessToEntry.clear();
        this.avToBusiness.clear();
    }

    /**
     * 从JSON文件加载映射
     */
    async load(): Promise<void> {
        if (!this.plugin) {
            console.warn('[IDMappingManager] Plugin not initialized');
            return;
        }

        try {
            const data = await this.plugin.loadData('id-mapping.json');
            if (data && Array.isArray(data)) {
                this.clear();
                for (const entry of data) {
                    if (entry.businessId && entry.avRowId && entry.type) {
                        this.businessToEntry.set(entry.businessId, entry);
                        this.avToBusiness.set(entry.avRowId, entry.businessId);
                    }
                }
                console.log(`[IDMappingManager] Loaded ${this.businessToEntry.size} mappings`);
            }
        } catch (error) {
            console.error('[IDMappingManager] Failed to load mappings:', error);
        }
    }

    /**
     * 保存映射到JSON文件
     */
    async save(): Promise<void> {
        if (!this.plugin) {
            console.warn('[IDMappingManager] Plugin not initialized');
            return;
        }

        try {
            const data = this.getAllMappings();
            await this.plugin.saveData('id-mapping.json', data);
            console.log(`[IDMappingManager] Saved ${data.length} mappings`);
        } catch (error) {
            console.error('[IDMappingManager] Failed to save mappings:', error);
        }
    }
}

// 导出单例实例
export const idMappingManager = IDMappingManager.getInstance();
