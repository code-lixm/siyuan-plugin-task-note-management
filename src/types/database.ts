/**
 * SiYuan Database Types
 * 
 * 定义与SiYuan Attribute View数据库交互的所有类型
 * 用于项目、分组、里程碑等数据的存储和转换
 */

// ==================== Storage Mode ====================

/**
 * 存储模式：定义数据存储方式
 * - JSON_ONLY: 仅使用JSON文件存储（向后兼容）
 * - DATABASE_ONLY: 仅使用SiYuan数据库存储
 * - HYBRID: 双写模式（JSON为主，数据库为辅助）
 */
export enum StorageMode {
    JSON_ONLY = 'json_only',
    DATABASE_ONLY = 'database_only',
    HYBRID = 'hybrid'
}

// ==================== Configuration ====================

/**
 * 数据库连接与运行配置
 */
export interface DatabaseConfig {
    /** 项目管理中心数据库ID */
    projectHubDatabaseId?: string;

    /** 承载数据库的笔记本ID */
    projectHubNotebookId?: string;

    /** 承载数据库的文档路径（/ 开头） */
    projectHubDocPath?: string;
    
    /** 数据存储模式 */
    storageMode: StorageMode;
    
    /** 数据库异常时是否自动降级到JSON */
    fallbackOnError: boolean;
    
    /** 是否自动创建缺失数据库 */
    autoCreateDatabases: boolean;
    
    /** 是否启用内存缓存 */
    cacheEnabled: boolean;
    
    /** 缓存有效期（毫秒，默认5分钟） */
    cacheTTL: number;
    
    /** 重试次数（默认3次） */
    retryCount: number;
    
    /** 批量操作防抖延迟（毫秒，默认500ms） */
    batchDebounceDelay: number;
}

/**
 * 默认数据库配置
 */
export const DEFAULT_DATABASE_CONFIG: DatabaseConfig = {
    storageMode: StorageMode.JSON_ONLY,
    fallbackOnError: true,
    autoCreateDatabases: true,
    cacheEnabled: true,
    cacheTTL: 5 * 60 * 1000, // 5分钟
    retryCount: 3,
    batchDebounceDelay: 500,
    projectHubDocPath: '/Task Note/项目管理中心数据库'
};

// ==================== Cell Types ====================

/** SiYuan单元格类型 */
export type SiYuanCellType = 'text' | 'mSelect' | 'date' | 'number' | 'checkbox' | 'relation' | 'block';

/** 多选选项 */
export interface SiYuanMSelectOption {
    content: string;
    color?: string;
}

/** text单元格 */
export interface SiYuanTextCell {
    text: {
        content: string;
    };
}

/** mSelect单元格 */
export interface SiYuanMSelectCell {
    mSelect: SiYuanMSelectOption[];
}

/** date单元格（content为时间戳毫秒） */
export interface SiYuanDateCell {
    date: {
        content: number;
        isNotEmpty: boolean;
        content2?: number; // 结束日期（用于范围）
        isNotEmpty2?: boolean;
    };
}

/** number单元格 */
export interface SiYuanNumberCell {
    number: {
        content: number;
        isNotEmpty: boolean;
    };
}

/** checkbox单元格 */
export interface SiYuanCheckboxCell {
    checkbox: {
        checked: boolean;
    };
}

/** relation单元格 */
export interface SiYuanRelationCell {
    relation: {
        blockIDs: string[];
        contents?: string[];
    };
}

/** block单元格 */
export interface SiYuanBlockCell {
    block: {
        id: string;
        content: string;
    };
}

/**
 * SiYuan数据库单元格联合类型
 */
export type SiYuanDatabaseCell =
    | SiYuanTextCell
    | SiYuanMSelectCell
    | SiYuanDateCell
    | SiYuanNumberCell
    | SiYuanCheckboxCell
    | SiYuanRelationCell
    | SiYuanBlockCell;

/**
 * 单元格值类型（用于更新）
 */
export type SiYuanCellValue = 
    | { text: { content: string } }
    | { mSelect: SiYuanMSelectOption[] }
    | { date: { content: number; isNotEmpty: boolean; content2?: number; isNotEmpty2?: boolean } }
    | { number: { content: number; isNotEmpty: boolean } }
    | { checkbox: { checked: boolean } }
    | { relation: { blockIDs: string[] } };

// ==================== Database Schema ====================

/**
 * 数据库列定义
 */
export interface DatabaseColumnSchema {
    id: string;
    name: string;
    type: SiYuanCellType;
    icon?: string;
    numberFormat?: string;
    options?: SiYuanMSelectOption[];
    relation?: {
        avID: string;
        backRelation?: boolean;
    };
}

/**
 * 数据库行定义
 */
export interface DatabaseRow {
    id: string;
    blockID?: string;
    cells: DatabaseCell[];
}

/**
 * 数据库单元格定义
 */
export interface DatabaseCell {
    id: string;
    value?: SiYuanDatabaseCell;
    valueType?: SiYuanCellType;
}

/**
 * 数据库结构定义
 */
export interface DatabaseSchema {
    id: string;
    name: string;
    columns: DatabaseColumnSchema[];
    rows?: DatabaseRow[];
    keyValues?: Array<{
        key: { id: string; name: string };
        values: string[];
    }>;
}

/**
 * Schema验证结果
 */
export interface SchemaValidationResult {
    /** 是否通过验证 */
    valid: boolean;
    
    /** 错误信息列表 */
    errors: string[];
    
    /** 警告信息列表 */
    warnings: string[];
    
    /** 缺失的必需列 */
    missingColumns: string[];
    
    /** 多余的列 */
    extraColumns: string[];
    
    /** 类型不匹配的列 */
    typeMismatches: Array<{
        column: string;
        expected: SiYuanCellType;
        actual: SiYuanCellType;
    }>;
}

// ==================== Project Database Row ====================

/**
 * 实体类型
 */
export type EntityType = '项目' | '分组' | '里程碑';

/**
 * 项目状态（内部值）
 */
export type InternalProjectStatus = 'doing' | 'short_term' | 'long_term' | 'completed';

/**
 * 优先级（内部值）
 */
export type InternalPriority = 'high' | 'medium' | 'low' | 'none';

/**
 * 看板模式（内部值）
 */
export type InternalKanbanMode = 'status' | 'custom' | 'list';

/**
 * 项目数据库行结构
 * 中文键名对应SiYuan AV列名
 */
export interface ProjectDatabaseRow {
    /** 行ID（SiYuan AV行标识） */
    id: string;
    
    /** 实体类型：项目/分组/里程碑 */
    类型: SiYuanMSelectCell;
    
    /** 名称 */
    名称: SiYuanTextCell;
    
    /** 父级项目（relation类型） */
    父级项目?: SiYuanRelationCell;
    
    /** 所属分组（relation类型） */
    所属分组?: SiYuanRelationCell;
    
    /** 项目状态 */
    项目状态?: SiYuanMSelectCell;
    
    /** 优先级 */
    优先级?: SiYuanMSelectCell;
    
    /** 项目颜色（HEX代码） */
    项目颜色?: SiYuanTextCell;
    
    /** 看板模式 */
    看板模式?: SiYuanMSelectCell;
    
    /** 开始日期 */
    开始日期?: SiYuanDateCell;
    
    /** 创建时间 */
    创建时间?: SiYuanDateCell;
    
    /** 最后修改时间（乐观锁） */
    最后修改?: SiYuanDateCell;
    
    /** 版本号（乐观锁） */
    版本号?: SiYuanNumberCell;
    
    /** 关联的SiYuan块ID */
    关联块ID?: SiYuanTextCell;
    
    /** 是否归档 */
    归档?: SiYuanCheckboxCell;
    
    /** 排序号 */
    排序?: SiYuanNumberCell;
}

/**
 * 项目数据库行值（不包含ID，用于更新）
 */
export type ProjectDatabaseRowValues = Omit<ProjectDatabaseRow, 'id'>;

// ==================== Conversion Functions ====================

/**
 * 数据库行转项目对象转换器
 */
export type RowToProjectConverter = (row: ProjectDatabaseRow) => {
    id: string;
    name: string;
    type: EntityType;
    status?: InternalProjectStatus;
    priority?: InternalPriority;
    kanbanMode?: InternalKanbanMode;
    color?: string;
    startDate?: string;
    createdTime?: string;
    lastModified?: number;
    version?: number;
    blockId?: string;
    archived?: boolean;
    sort?: number;
    parentProjectId?: string;
    parentGroupId?: string;
};

/**
 * 项目对象转数据库行值转换器
 */
export type ProjectToRowConverter = (
    project: Partial<{
        id: string;
        name: string;
        type: EntityType;
        status: InternalProjectStatus;
        priority: InternalPriority;
        kanbanMode: InternalKanbanMode;
        color: string;
        startDate: string;
        createdTime: string;
        blockId: string;
        archived: boolean;
        sort: number;
        parentProjectId: string;
        parentGroupId: string;
    }>
) => Partial<ProjectDatabaseRowValues>;

// ==================== Mapping Constants ====================

/**
 * 数据库状态（中文） -> 内部状态（英文）
 */
export const DATABASE_STATUS_TO_INTERNAL: Record<string, InternalProjectStatus> = {
    '进行中': 'doing',
    '短期': 'short_term',
    '长期': 'long_term',
    '已完成': 'completed'
};

/**
 * 内部状态（英文） -> 数据库状态（中文）
 */
export const INTERNAL_STATUS_TO_DATABASE: Record<InternalProjectStatus, string> = {
    doing: '进行中',
    short_term: '短期',
    long_term: '长期',
    completed: '已完成'
};

/**
 * 状态对应颜色
 */
export const STATUS_COLORS: Record<InternalProjectStatus, string> = {
    doing: '#e74c3c',
    short_term: '#3498db',
    long_term: '#9b59b6',
    completed: '#2ecc71'
};

/**
 * 内部优先级 -> 数据库多选选项
 */
export const INTERNAL_PRIORITY_TO_DATABASE: Record<InternalPriority, SiYuanMSelectOption> = {
    high: { content: '高', color: '#e74c3c' },
    medium: { content: '中', color: '#f39c12' },
    low: { content: '低', color: '#2ecc71' },
    none: { content: '无', color: '#95a5a6' }
};

/**
 * 数据库优先级（中文） -> 内部优先级
 */
export const DATABASE_PRIORITY_TO_INTERNAL: Record<string, InternalPriority> = {
    '高': 'high',
    '中': 'medium',
    '低': 'low',
    '无': 'none'
};

/**
 * 内部看板模式 -> 数据库多选选项
 */
export const INTERNAL_KANBAN_MODE_TO_DATABASE: Record<InternalKanbanMode, SiYuanMSelectOption> = {
    status: { content: '状态模式', color: '#3498db' },
    custom: { content: '自定义分组', color: '#9b59b6' },
    list: { content: '列表模式', color: '#95a5a6' }
};

/**
 * 数据库看板模式（中文） -> 内部看板模式
 */
export const DATABASE_KANBAN_MODE_TO_INTERNAL: Record<string, InternalKanbanMode> = {
    '状态模式': 'status',
    '自定义分组': 'custom',
    '列表模式': 'list'
};

/**
 * 实体类型映射
 */
export const ENTITY_TYPE_OPTIONS: SiYuanMSelectOption[] = [
    { content: '项目', color: '#e74c3c' },
    { content: '分组', color: '#3498db' },
    { content: '里程碑', color: '#9b59b6' }
];

// ==================== Errors ====================

/**
 * 数据库操作错误
 */
export class DatabaseOperationError extends Error {
    constructor(
        message: string,
        public readonly operation: string,
        public readonly originalError?: Error
    ) {
        super(message);
        this.name = 'DatabaseOperationError';
    }
}

/**
 * 并发修改错误（乐观锁失败）
 */
export class ConcurrentModificationError extends Error {
    constructor(
        message: string,
        public readonly expectedVersion: number,
        public readonly actualVersion: number,
        public readonly serverData?: ProjectDatabaseRow
    ) {
        super(message);
        this.name = 'ConcurrentModificationError';
    }
}

/**
 * Schema验证错误
 */
export class SchemaValidationError extends Error {
    constructor(
        message: string,
        public readonly validationResult: SchemaValidationResult
    ) {
        super(message);
        this.name = 'SchemaValidationError';
    }
}

// ==================== ID Mapping ====================

/**
 * ID映射条目
 */
export interface IDMappingEntry {
    /** 业务ID */
    businessId: string;
    
    /** AV行ID */
    avRowId: string;
    
    /** 实体类型 */
    type: EntityType;
    
    /** 最后更新时间 */
    updatedAt: number;
}

/**
 * ID映射管理器接口
 */
export interface IIDMappingManager {
    /** 获取AV行ID */
    getAvRowId(businessId: string): string | undefined;
    
    /** 获取业务ID */
    getBusinessId(avRowId: string): string | undefined;
    
    /** 获取映射条目 */
    getMapping(businessId: string): IDMappingEntry | undefined;
    
    /** 添加映射 */
    addMapping(businessId: string, avRowId: string, type: EntityType): void;
    
    /** 移除映射 */
    removeMapping(businessId: string): void;
    
    /** 获取所有映射 */
    getAllMappings(): IDMappingEntry[];
    
    /** 清空映射 */
    clear(): void;
    
    /** 保存到存储 */
    save(): Promise<void>;
    
    /** 从存储加载 */
    load(): Promise<void>;
}
