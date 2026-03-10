/**
 * JSON Fallback Manager
 * 
 * 当数据库不可用时提供JSON文件降级方案
 * 兼容现有的 project.json 格式
 */

import { Project } from './projectManager';

export class JSONFallbackManager {
    private static instance: JSONFallbackManager;
    private initialized: boolean = false;
    private plugin: any = null;

    private constructor() {}

    /**
     * 获取单例实例
     */
    static getInstance(): JSONFallbackManager {
        if (!JSONFallbackManager.instance) {
            JSONFallbackManager.instance = new JSONFallbackManager();
        }
        return JSONFallbackManager.instance;
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
        this.initialized = true;
    }

    /**
     * 检查是否已初始化
     */
    isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * 加载所有项目
     */
    async loadProjects(): Promise<Project[]> {
        if (!this.plugin) {
            throw new Error('[JSONFallbackManager] Not initialized');
        }

        try {
            const data = await this.plugin.loadData('project.json');
            if (!data) {
                return [];
            }

            // 兼容旧格式：可以是对象或数组
            if (Array.isArray(data)) {
                return data.map(p => this.normalizeProject(p));
            } else if (typeof data === 'object') {
                // 旧格式：{ projectId: projectData }
                return Object.entries(data).map(([id, project]) => {
                    const p = project as any;
                    return this.normalizeProject({ ...p, id });
                });
            }

            return [];
        } catch (error) {
            console.error('[JSONFallbackManager] Failed to load projects:', error);
            return [];
        }
    }

    /**
     * 保存所有项目
     */
    async saveProjects(projects: Project[]): Promise<void> {
        if (!this.plugin) {
            throw new Error('[JSONFallbackManager] Not initialized');
        }

        try {
            // 保存为对象格式，键为项目ID
            const data: Record<string, any> = {};
            for (const project of projects) {
                data[project.id] = this.serializeProject(project);
            }

            await this.plugin.saveData('project.json', data);
            console.log('[JSONFallbackManager] Saved', projects.length, 'projects');
        } catch (error) {
            console.error('[JSONFallbackManager] Failed to save projects:', error);
            throw error;
        }
    }

    /**
     * 根据ID加载单个项目
     */
    async loadProjectById(id: string): Promise<Project | null> {
        const projects = await this.loadProjects();
        return projects.find(p => p.id === id) || null;
    }

    /**
     * 创建新项目
     */
    async createProject(project: Project): Promise<Project> {
        const projects = await this.loadProjects();
        
        // 检查ID是否已存在
        if (projects.some(p => p.id === project.id)) {
            throw new Error(`[JSONFallbackManager] Project with id ${project.id} already exists`);
        }

        projects.push(project);
        await this.saveProjects(projects);
        return project;
    }

    /**
     * 更新项目
     */
    async updateProject(project: Project): Promise<void> {
        const projects = await this.loadProjects();
        const index = projects.findIndex(p => p.id === project.id);
        
        if (index === -1) {
            throw new Error(`[JSONFallbackManager] Project with id ${project.id} not found`);
        }

        projects[index] = project;
        await this.saveProjects(projects);
    }

    /**
     * 删除项目
     */
    async deleteProject(id: string): Promise<void> {
        const projects = await this.loadProjects();
        const filtered = projects.filter(p => p.id !== id);
        
        if (filtered.length === projects.length) {
            throw new Error(`[JSONFallbackManager] Project with id ${id} not found`);
        }

        await this.saveProjects(filtered);
    }

    /**
     * 规范化项目数据
     * 处理旧格式和缺失字段
     */
    private normalizeProject(data: any): Project {
        return {
            id: data.id || '',
            name: data.name || '未命名项目',
            status: data.status || 'doing',
            color: data.color || '#e74c3c',
            kanbanMode: data.kanbanMode || 'status',
            customGroups: Array.isArray(data.customGroups) ? data.customGroups : [],
            milestones: Array.isArray(data.milestones) ? data.milestones : [],
            priority: data.priority || 'none',
            sort: typeof data.sort === 'number' ? data.sort : 0,
            startDate: data.startDate,
            createdTime: data.createdTime || new Date().toISOString(),
            categoryId: data.categoryId,
            blockId: data.blockId
        };
    }

    /**
     * 序列化项目数据
     * 移除undefined值以节省空间
     */
    private serializeProject(project: Project): any {
        const data: any = { ...project };
        
        // 移除undefined值
        Object.keys(data).forEach(key => {
            if (data[key] === undefined) {
                delete data[key];
            }
        });

        return data;
    }
}

// 导出单例实例
export const jsonFallbackManager = JSONFallbackManager.getInstance();
