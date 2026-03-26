import type { Reminder } from "@/stores/useReminderStore";
import type { Project, Milestone } from "@/stores/useProjectStore";
import type { Habit } from "@/stores/useHabitStore";

export interface LegacyData {
    reminders?: any[];
    projects?: any[];
    habits?: any[];
    categories?: any[];
    settings?: any;
    lastModified?: number;
}

export interface MigrationResult {
    success: boolean;
    migratedCount: number;
    errors: string[];
    details: {
        reminders: number;
        projects: number;
        habits: number;
    };
}

export const LEGACY_FIELD_MAPPING = {
    reminder: {
        id: "id",
        content: "title/content",
        datetime: "date + time",
        priority: "priority",
        category: "categoryId",
        completed: "completed",
        blockId: "blockId",
        createdAt: "createdAt",
    },
    project: {
        id: "id",
        name: "name",
        description: "description",
        milestones: "milestones",
        tasks: "milestones(回退)",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
    },
    habit: {
        id: "id",
        name: "title",
        frequency: "frequency",
        target: "target",
        checkInLog: "checkIns",
        groupId: "groupId",
        createdAt: "createdAt",
    },
} as const;

interface MigrationPlugin {
    loadReminderData: () => Promise<any>;
    saveReminderData: (data: any) => Promise<void>;
    loadProjectData: () => Promise<any>;
    saveProjectData: (data: any) => Promise<void>;
    loadHabitData: () => Promise<any>;
    saveHabitData: (data: any) => Promise<void>;
    loadSettings?: () => Promise<any>;
    saveSettings?: (data: any) => Promise<void>;
    loadData?: (filename: string) => Promise<any>;
    saveData?: (filename: string, data: any) => Promise<void>;
}

const LEGACY_BUNDLE_FILES = ["legacy-data.json", "task-daily-data.json", "task-note-data.json"];

export class DataMigration {
    static async detectLegacyData(plugin: any): Promise<boolean> {
        const typedPlugin = plugin as MigrationPlugin;

        try {
            const [reminderData, projectData, habitData, bundle] = await Promise.all([
                typedPlugin.loadReminderData(),
                typedPlugin.loadProjectData(),
                typedPlugin.loadHabitData(),
                this.loadLegacyBundle(typedPlugin),
            ]);

            if (this.isLegacyReminderData(reminderData)) return true;
            if (this.isLegacyProjectData(projectData)) return true;
            if (this.isLegacyHabitData(habitData)) return true;

            if (bundle && (
                (Array.isArray(bundle.reminders) && bundle.reminders.length > 0) ||
                (Array.isArray(bundle.projects) && bundle.projects.length > 0) ||
                (Array.isArray(bundle.habits) && bundle.habits.length > 0)
            )) {
                return true;
            }
        } catch (error) {
            console.error("[Migration] detect legacy data failed:", error);
        }

        return false;
    }

    static async migrate(plugin: any): Promise<MigrationResult> {
        const typedPlugin = plugin as MigrationPlugin;
        const result: MigrationResult = {
            success: true,
            migratedCount: 0,
            errors: [],
            details: {
                reminders: 0,
                projects: 0,
                habits: 0,
            },
        };

        try {
            const [reminderData, projectData, habitData, legacyBundle] = await Promise.all([
                typedPlugin.loadReminderData(),
                typedPlugin.loadProjectData(),
                typedPlugin.loadHabitData(),
                this.loadLegacyBundle(typedPlugin),
            ]);

            // reminders
            const migratedReminders = this.collectLegacyReminders(reminderData, legacyBundle, result.errors)
                .map((item) => this.migrateReminder(item));
            if (migratedReminders.length > 0) {
                await typedPlugin.saveReminderData({ reminders: this.deduplicateById(migratedReminders) });
                result.details.reminders = migratedReminders.length;
                result.migratedCount += migratedReminders.length;
            }

            // projects
            const migratedProjects = this.collectLegacyProjects(projectData, legacyBundle, result.errors)
                .map((item) => this.migrateProject(item));
            if (migratedProjects.length > 0) {
                await typedPlugin.saveProjectData({ projects: this.deduplicateById(migratedProjects) });
                result.details.projects = migratedProjects.length;
                result.migratedCount += migratedProjects.length;
            }

            // habits
            const existingGroups = Array.isArray(habitData?.groups) ? habitData.groups : [];
            const migratedHabits = this.collectLegacyHabits(habitData, legacyBundle, result.errors)
                .map((item) => this.migrateHabit(item));
            if (migratedHabits.length > 0) {
                await typedPlugin.saveHabitData({
                    habits: this.deduplicateById(migratedHabits),
                    groups: existingGroups,
                });
                result.details.habits = migratedHabits.length;
                result.migratedCount += migratedHabits.length;
            }

            await this.migrateCategoriesAndSettings(typedPlugin, legacyBundle, result.errors);
        } catch (error) {
            result.success = false;
            result.errors.push(error instanceof Error ? error.message : String(error));
        }

        if (result.errors.length > 0) {
            result.success = false;
        }
        return result;
    }

    private static migrateReminder(legacy: any): Reminder {
        const timestamp = this.normalizeDateTime(legacy?.createdAt || legacy?.datetime || Date.now());
        const { date, time } = this.parseLegacyDateTime(legacy?.datetime);

        return {
            id: String(legacy?.id || this.generateId("reminder")),
            title: String(legacy?.content || legacy?.title || ""),
            content: legacy?.content ? String(legacy.content) : undefined,
            date: legacy?.date ? String(legacy.date) : date,
            time: legacy?.time ? String(legacy.time) : time,
            completed: Boolean(legacy?.completed),
            categoryId: legacy?.category ? String(legacy.category) : legacy?.categoryId,
            projectId: legacy?.projectId ? String(legacy.projectId) : undefined,
            blockId: legacy?.blockId ? String(legacy.blockId) : undefined,
            priority: this.normalizePriority(legacy?.priority),
            createdAt: timestamp,
            updatedAt: this.normalizeDateTime(legacy?.updatedAt || timestamp),
        };
    }

    private static migrateProject(legacy: any): Project {
        const createdAt = this.normalizeDateTime(legacy?.createdAt || Date.now());
        const updatedAt = this.normalizeDateTime(legacy?.updatedAt || createdAt);
        const milestones = this.mapLegacyMilestones(legacy?.milestones, legacy?.tasks);

        return {
            id: String(legacy?.id || this.generateId("project")),
            name: String(legacy?.name || legacy?.title || ""),
            description: legacy?.description ? String(legacy.description) : undefined,
            milestones,
            createdAt,
            updatedAt,
        };
    }

    private static migrateHabit(legacy: any): Habit {
        const createdAt = this.normalizeDateTime(legacy?.createdAt || Date.now());
        const updatedAt = this.normalizeDateTime(legacy?.updatedAt || createdAt);
        const frequency = this.normalizeFrequency(legacy?.frequency);
        const checkIns = this.normalizeCheckInLog(legacy?.checkInLog, legacy?.target);
        const totalCheckIns = Object.values(checkIns).reduce((sum, record: any) => sum + (record?.count || 0), 0);

        return {
            id: String(legacy?.id || this.generateId("habit")),
            title: String(legacy?.name || legacy?.title || ""),
            note: legacy?.note ? String(legacy.note) : undefined,
            blockId: legacy?.blockId ? String(legacy.blockId) : undefined,
            target: this.normalizeTarget(legacy?.target),
            frequency,
            startDate: String(legacy?.startDate || createdAt.slice(0, 10)),
            endDate: legacy?.endDate ? String(legacy.endDate) : undefined,
            groupId: legacy?.groupId ? String(legacy.groupId) : undefined,
            priority: this.normalizePriorityWithNone(legacy?.priority),
            checkInEmojis: [
                { emoji: "✅", meaning: "完成", countsAsSuccess: true },
            ],
            checkIns,
            totalCheckIns,
            createdAt,
            updatedAt,
        };
    }

    private static isLegacyReminderData(data: any): boolean {
        if (!data || typeof data !== "object") return false;
        if (Array.isArray(data?.reminders)) return false;
        return this.isLegacyRecordMap(data, ["content", "datetime", "createdAt"]);
    }

    private static isLegacyProjectData(data: any): boolean {
        if (!data || typeof data !== "object") return false;
        if (Array.isArray(data?.projects)) return false;
        return this.isLegacyRecordMap(data, ["name", "description", "createdAt"]);
    }

    private static isLegacyHabitData(data: any): boolean {
        if (!data || typeof data !== "object") return false;
        if (Array.isArray(data?.habits)) return false;
        return this.isLegacyRecordMap(data, ["name", "frequency", "target"]);
    }

    private static isLegacyRecordMap(data: any, legacyKeys: string[]): boolean {
        const entries = Object.values(data || {}).filter((item: any) => item && typeof item === "object");
        if (entries.length === 0) return false;
        return entries.some((item: any) => legacyKeys.some((key) => key in item));
    }

    private static collectLegacyReminders(reminderData: any, bundle: LegacyData | null, errors: string[]): any[] {
        const source: any[] = [];
        if (this.isLegacyReminderData(reminderData)) {
            source.push(...Object.values(reminderData));
        }
        if (Array.isArray(bundle?.reminders)) {
            source.push(...bundle.reminders);
        }
        return source.filter((item) => this.isValidLegacyReminder(item, errors));
    }

    private static collectLegacyProjects(projectData: any, bundle: LegacyData | null, errors: string[]): any[] {
        const source: any[] = [];
        if (this.isLegacyProjectData(projectData)) {
            source.push(...Object.values(projectData));
        }
        if (Array.isArray(bundle?.projects)) {
            source.push(...bundle.projects);
        }
        return source.filter((item) => this.isValidLegacyProject(item, errors));
    }

    private static collectLegacyHabits(habitData: any, bundle: LegacyData | null, errors: string[]): any[] {
        const source: any[] = [];
        if (this.isLegacyHabitData(habitData)) {
            source.push(...Object.values(habitData));
        }
        if (Array.isArray(bundle?.habits)) {
            source.push(...bundle.habits);
        }
        return source.filter((item) => this.isValidLegacyHabit(item, errors));
    }

    private static async loadLegacyBundle(plugin: MigrationPlugin): Promise<LegacyData | null> {
        if (!plugin.loadData) return null;

        for (const filename of LEGACY_BUNDLE_FILES) {
            try {
                const data = await plugin.loadData(filename);
                if (!data || typeof data !== "object") continue;
                if (
                    Array.isArray((data as LegacyData).reminders) ||
                    Array.isArray((data as LegacyData).projects) ||
                    Array.isArray((data as LegacyData).habits)
                ) {
                    return data as LegacyData;
                }
            } catch {
                // 忽略不存在的历史文件
            }
        }

        return null;
    }

    private static async migrateCategoriesAndSettings(plugin: MigrationPlugin, bundle: LegacyData | null, errors: string[]) {
        if (!bundle) return;

        try {
            if (Array.isArray(bundle.categories) && bundle.categories.length > 0 && plugin.saveData) {
                await plugin.saveData("categories.json", bundle.categories);
            }
        } catch (error) {
            errors.push(`migrate categories failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        try {
            if (bundle.settings && typeof bundle.settings === "object" && plugin.loadSettings && plugin.saveSettings) {
                const current = await plugin.loadSettings();
                await plugin.saveSettings({ ...current, ...bundle.settings });
            }
        } catch (error) {
            errors.push(`migrate settings failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private static isValidLegacyReminder(item: any, errors: string[]): boolean {
        if (!item || typeof item !== "object") {
            errors.push("skip invalid reminder item");
            return false;
        }
        if (!item.id && !item.content && !item.title) {
            errors.push("skip reminder without id/content");
            return false;
        }
        return true;
    }

    private static isValidLegacyProject(item: any, errors: string[]): boolean {
        if (!item || typeof item !== "object") {
            errors.push("skip invalid project item");
            return false;
        }
        if (!item.id && !item.name && !item.title) {
            errors.push("skip project without id/name");
            return false;
        }
        return true;
    }

    private static isValidLegacyHabit(item: any, errors: string[]): boolean {
        if (!item || typeof item !== "object") {
            errors.push("skip invalid habit item");
            return false;
        }
        if (!item.id && !item.name && !item.title) {
            errors.push("skip habit without id/name");
            return false;
        }
        return true;
    }

    private static deduplicateById<T extends { id: string }>(items: T[]): T[] {
        const map = new Map<string, T>();
        for (const item of items) {
            map.set(String(item.id), item);
        }
        return Array.from(map.values());
    }

    private static parseLegacyDateTime(datetime: unknown): { date?: string; time?: string } {
        if (!datetime) return {};
        const value = String(datetime).trim();

        const ymdHm = value.match(/^(\d{4}-\d{2}-\d{2})[\sT](\d{2}:\d{2})/);
        if (ymdHm) {
            return { date: ymdHm[1], time: ymdHm[2] };
        }

        const ymd = value.match(/^(\d{4}-\d{2}-\d{2})$/);
        if (ymd) {
            return { date: ymd[1] };
        }

        return {};
    }

    private static normalizeDateTime(input: unknown): string {
        if (!input) return new Date().toISOString();
        const date = typeof input === "number" ? new Date(input) : new Date(String(input));
        if (Number.isNaN(date.getTime())) {
            return new Date().toISOString();
        }
        return date.toISOString();
    }

    private static normalizePriority(priority: unknown): Reminder["priority"] {
        if (priority === "high" || priority === "medium" || priority === "low") {
            return priority;
        }
        return undefined;
    }

    private static normalizePriorityWithNone(priority: unknown): Habit["priority"] {
        if (priority === "high" || priority === "medium" || priority === "low" || priority === "none") {
            return priority;
        }
        return "none";
    }

    private static mapLegacyMilestones(milestones: any, tasks: any): Milestone[] | undefined {
        const source = Array.isArray(milestones)
            ? milestones
            : (Array.isArray(tasks) ? tasks : []);

        if (source.length === 0) {
            return undefined;
        }

        return source.map((item: any, index: number) => ({
            id: String(item?.id || `milestone_${Date.now()}_${index}`),
            name: String(item?.name || item?.title || ""),
            description: item?.description ? String(item.description) : undefined,
            dueDate: item?.dueDate ? String(item.dueDate) : undefined,
            completed: Boolean(item?.completed),
        }));
    }

    private static normalizeFrequency(frequency: any): Habit["frequency"] {
        const defaultFrequency: Habit["frequency"] = { type: "daily" };
        if (!frequency) return defaultFrequency;

        if (typeof frequency === "string") {
            if (frequency === "daily" || frequency === "weekly" || frequency === "monthly" || frequency === "yearly") {
                return { type: frequency };
            }
            return defaultFrequency;
        }

        if (typeof frequency === "object") {
            const type = frequency.type;
            if (type === "daily" || type === "weekly" || type === "monthly" || type === "yearly") {
                return {
                    type,
                    interval: typeof frequency.interval === "number" ? frequency.interval : undefined,
                    weekdays: Array.isArray(frequency.weekdays) ? frequency.weekdays : undefined,
                    monthDays: Array.isArray(frequency.monthDays) ? frequency.monthDays : undefined,
                    months: Array.isArray(frequency.months) ? frequency.months : undefined,
                };
            }
        }

        return defaultFrequency;
    }

    private static normalizeTarget(target: unknown): number {
        const parsed = Number(target);
        if (Number.isFinite(parsed) && parsed > 0) {
            return Math.floor(parsed);
        }
        return 1;
    }

    private static normalizeCheckInLog(checkInLog: any, target: unknown): Habit["checkIns"] {
        const normalized: Habit["checkIns"] = {};
        const targetValue = this.normalizeTarget(target);

        if (!Array.isArray(checkInLog)) {
            return normalized;
        }

        for (const entry of checkInLog) {
            if (!entry) continue;

            if (typeof entry === "string") {
                const date = entry.slice(0, 10);
                if (!date) continue;
                normalized[date] = {
                    count: Math.max(normalized[date]?.count || 0, targetValue),
                    status: Array(targetValue).fill("✅"),
                    timestamp: this.normalizeDateTime(entry),
                };
                continue;
            }

            if (typeof entry === "object") {
                const date = String(entry.date || entry.timestamp || "").slice(0, 10);
                if (!date) continue;

                const count = Number(entry.count);
                const safeCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : 1;
                const status = Array.isArray(entry.status) && entry.status.length > 0
                    ? entry.status.map((value: any) => String(value))
                    : Array(safeCount).fill("✅");

                normalized[date] = {
                    count: safeCount,
                    status,
                    timestamp: this.normalizeDateTime(entry.timestamp || entry.date || Date.now()),
                };
            }
        }

        return normalized;
    }

    private static generateId(prefix: string): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
}
