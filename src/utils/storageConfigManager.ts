/**
 * Storage Config Manager
 * 
 * 管理存储配置（数据库ID、存储模式等）
 * 支持持久化到JSON文件
 */

import { 
    DatabaseConfig, 
    StorageMode, 
    DEFAULT_DATABASE_CONFIG 
} from '../types/database';

export class StorageConfigManager {
    private static instance: StorageConfigManager;
    private config: DatabaseConfig;
    private initialized: boolean = false;
    private plugin: any = null;

    private constructor() {
        this.config = { ...DEFAULT_DATABASE_CONFIG };
    }

    /**
     * 获取单例实例
     */
    static getInstance(): StorageConfigManager {
        if (!StorageConfigManager.instance) {
            StorageConfigManager.instance = new StorageConfigManager();
        }
        return StorageConfigManager.instance;
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
        await this.loadConfig();
        this.initialized = true;
    }

    /**
     * 检查是否已初始化
     */
    isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * 获取当前配置
     */
    getConfig(): DatabaseConfig {
        return { ...this.config };
    }

    /**
     * 设置存储模式
     */
    setStorageMode(mode: StorageMode): void {
        this.config.storageMode = mode;
        this.saveConfig();
    }

    /**
     * 设置数据库ID
     */
    setDatabaseId(id: string): void {
        this.config.projectHubDatabaseId = id;
        this.saveConfig();
    }

    /**
     * 设置是否在错误时回退
     */
    setFallbackOnError(fallback: boolean): void {
        this.config.fallbackOnError = fallback;
        this.saveConfig();
    }

    /**
     * 设置是否自动创建数据库
     */
    setAutoCreateDatabases(autoCreate: boolean): void {
        this.config.autoCreateDatabases = autoCreate;
        this.saveConfig();
    }

    /**
     * 设置缓存配置
     */
    setCacheEnabled(enabled: boolean): void {
        this.config.cacheEnabled = enabled;
        this.saveConfig();
    }

    /**
     * 设置缓存TTL
     */
    setCacheTTL(ttl: number): void {
        this.config.cacheTTL = ttl;
        this.saveConfig();
    }

    /**
     * 设置重试次数
     */
    setRetryCount(count: number): void {
        this.config.retryCount = count;
        this.saveConfig();
    }

    /**
     * 设置批量防抖延迟
     */
    setBatchDebounceDelay(delay: number): void {
        this.config.batchDebounceDelay = delay;
        this.saveConfig();
    }

    /**
     * 更新完整配置
     */
    updateConfig(config: Partial<DatabaseConfig>): void {
        this.config = { ...this.config, ...config };
        this.saveConfig();
    }

    /**
     * 重置为默认配置
     */
    resetToDefaults(): void {
        this.config = { ...DEFAULT_DATABASE_CONFIG };
        this.saveConfig();
    }

    /**
     * 从JSON文件加载配置
     */
    async loadConfig(): Promise<void> {
        if (!this.plugin) {
            console.warn('[StorageConfigManager] Plugin not initialized');
            return;
        }

        try {
            const data = await this.plugin.loadData('database-config.json');
            if (data) {
                // 合并保存的配置和默认配置
                this.config = {
                    ...DEFAULT_DATABASE_CONFIG,
                    ...data
                };
                console.log('[StorageConfigManager] Config loaded:', this.config);
            }
        } catch (error) {
            console.error('[StorageConfigManager] Failed to load config:', error);
            // 使用默认配置
            this.config = { ...DEFAULT_DATABASE_CONFIG };
        }
    }

    /**
     * 保存配置到JSON文件
     */
    async saveConfig(): Promise<void> {
        if (!this.plugin) {
            console.warn('[StorageConfigManager] Plugin not initialized');
            return;
        }

        try {
            await this.plugin.saveData('database-config.json', this.config);
            console.log('[StorageConfigManager] Config saved');
        } catch (error) {
            console.error('[StorageConfigManager] Failed to save config:', error);
        }
    }

    /**
     * 检查是否应该使用数据库
     */
    shouldUseDatabase(): boolean {
        return this.config.storageMode === StorageMode.DATABASE_ONLY || 
               this.config.storageMode === StorageMode.HYBRID;
    }

    /**
     * 检查是否应该使用JSON
     */
    shouldUseJson(): boolean {
        return this.config.storageMode === StorageMode.JSON_ONLY || 
               this.config.storageMode === StorageMode.HYBRID;
    }

    /**
     * 检查是否在错误时回退
     */
    shouldFallbackOnError(): boolean {
        return this.config.fallbackOnError;
    }
}

// 导出单例实例
export const storageConfigManager = StorageConfigManager.getInstance();
