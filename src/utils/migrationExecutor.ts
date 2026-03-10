import { Project } from './projectManager';
import { SiYuanDatabaseManager } from './siYuanDatabaseManager';
import { jsonFallbackManager } from './jsonFallbackManager';
import { idMappingManager } from './idMappingManager';

export type MigrationProgressCallback = (progress: number, message: string) => void;

export interface MigrationExecutionResult {
    success: boolean;
    migratedProjects: number;
    backupFile: string;
    error?: Error;
}

export class MigrationExecutor {
    private readonly plugin: any;
    private readonly siYuanDatabaseManager: SiYuanDatabaseManager;
    private latestBackupFile: string | null = null;

    constructor(plugin: any) {
        this.plugin = plugin;
        this.siYuanDatabaseManager = SiYuanDatabaseManager.getInstance();
    }

    /**
     * 迁移所有项目：JSON -> Database
     * 发生错误时自动回滚 project.json
     */
    public async execute(onProgress?: MigrationProgressCallback): Promise<MigrationExecutionResult> {
        let migratedProjects = 0;
        let backupFile = '';

        try {
            onProgress?.(5, 'Initializing managers');
            await this.ensureManagersInitialized();

            onProgress?.(15, 'Creating JSON backup');
            backupFile = await this.createBackup();

            onProgress?.(30, 'Loading projects from JSON');
            const projects = await jsonFallbackManager.loadProjects();

            if (projects.length === 0) {
                onProgress?.(100, 'No projects to migrate');
                return {
                    success: true,
                    migratedProjects: 0,
                    backupFile
                };
            }

            onProgress?.(55, `Migrating ${projects.length} projects to database`);
            await this.saveProjectsToDatabase(projects);

            onProgress?.(80, 'Updating id mapping');
            await this.rebuildMappings(projects);

            migratedProjects = projects.length;
            onProgress?.(100, 'Migration completed');

            return {
                success: true,
                migratedProjects,
                backupFile
            };
        } catch (error) {
            const migrationError = error instanceof Error ? error : new Error(String(error));
            console.error('[MigrationExecutor] Migration failed, rolling back...', migrationError);

            try {
                onProgress?.(90, 'Migration failed, rolling back...');
                await this.rollback(backupFile || undefined);
                onProgress?.(100, 'Rollback completed');
            } catch (rollbackError) {
                console.error('[MigrationExecutor] Rollback failed:', rollbackError);
            }

            return {
                success: false,
                migratedProjects,
                backupFile,
                error: migrationError
            };
        }
    }

    /**
     * 创建 project.json 备份
     */
    public async createBackup(): Promise<string> {
        if (!this.plugin) {
            throw new Error('[MigrationExecutor] plugin is required for backup');
        }

        const data = await this.plugin.loadData('project.json');
        const backupFile = `project.migration.backup.${Date.now()}.json`;
        await this.plugin.saveData(backupFile, data ?? {});

        this.latestBackupFile = backupFile;
        return backupFile;
    }

    /**
     * 从备份恢复 project.json
     */
    public async rollback(backupFile?: string): Promise<void> {
        if (!this.plugin) {
            throw new Error('[MigrationExecutor] plugin is required for rollback');
        }

        const targetBackup = backupFile || this.latestBackupFile;
        if (!targetBackup) {
            throw new Error('[MigrationExecutor] no backup file available for rollback');
        }

        const backupData = await this.plugin.loadData(targetBackup);
        if (backupData === undefined || backupData === null) {
            throw new Error(`[MigrationExecutor] backup file not found: ${targetBackup}`);
        }

        await this.plugin.saveData('project.json', backupData);

        idMappingManager.clear();
        await idMappingManager.save();
    }

    private async ensureManagersInitialized(): Promise<void> {
        await jsonFallbackManager.initialize(this.plugin);
        await idMappingManager.initialize(this.plugin);

        if (!(await this.siYuanDatabaseManager.isAvailable())) {
            throw new Error('[MigrationExecutor] database is not available');
        }
    }

    private async saveProjectsToDatabase(projects: Project[]): Promise<void> {
        const saveProjects = (this.siYuanDatabaseManager as any).saveProjects;
        if (typeof saveProjects !== 'function') {
            throw new Error('[MigrationExecutor] SiYuanDatabaseManager.saveProjects is not implemented');
        }

        await saveProjects.call(this.siYuanDatabaseManager, projects);
    }

    private async rebuildMappings(projects: Project[]): Promise<void> {
        idMappingManager.clear();

        for (const project of projects) {
            idMappingManager.addMapping(project.id, project.id, '项目');

            const groups = project.customGroups || [];
            for (const group of groups) {
                idMappingManager.addMapping(group.id, group.id, '分组');

                const milestones = group.milestones || [];
                for (const milestone of milestones) {
                    idMappingManager.addMapping(milestone.id, milestone.id, '里程碑');
                }
            }

            const projectMilestones = project.milestones || [];
            for (const milestone of projectMilestones) {
                idMappingManager.addMapping(milestone.id, milestone.id, '里程碑');
            }
        }

        await idMappingManager.save();
    }
}
