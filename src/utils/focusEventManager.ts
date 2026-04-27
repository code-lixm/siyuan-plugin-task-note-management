import { getLocalDateString, getLogicalDateString } from "./dateUtils";

const FOCUS_EVENT_DATA_FILE = "focus_event.json";

export interface FocusEvent {
    id: string;
    title: string;
    startTime: string;
    endTime?: string;
    duration: number;
    plannedDuration: number;
    completed: boolean;
    source: "quickPomodoro" | "miniPomodoro";
    projectId?: string;
    taskId?: string;
    taskTitle?: string;
}

export class FocusEventManager {
    private static instance: FocusEventManager;
    private plugin: any;
    private events: Record<string, FocusEvent> = {};
    private isInitialized = false;
    private isLoading = false;

    private constructor(plugin: any) {
        this.plugin = plugin;
    }

    public static getInstance(plugin?: any): FocusEventManager {
        if (!FocusEventManager.instance) {
            if (!plugin) {
                throw new Error("FocusEventManager 需要 plugin 实例进行初始化");
            }
            FocusEventManager.instance = new FocusEventManager(plugin);
        } else if (plugin && !FocusEventManager.instance.plugin) {
            FocusEventManager.instance.plugin = plugin;
        }
        return FocusEventManager.instance;
    }

    public async initialize(force = false): Promise<void> {
        if (this.isInitialized && !force) return;
        await this.loadEvents(force);
        this.isInitialized = true;
    }

    public async refreshData(): Promise<void> {
        await this.loadEvents(true);
        this.isInitialized = true;
    }

    public async createFocusEvent(options: {
        title?: string;
        plannedDuration: number;
        source: FocusEvent["source"];
        taskId?: string;
        taskTitle?: string;
        projectId?: string;
    }): Promise<FocusEvent> {
        await this.initialize();

        const startTime = new Date();
        const plannedEndTime = new Date(startTime.getTime() + Math.max(1, options.plannedDuration) * 60000);

        const event: FocusEvent = {
            id: this.generateEventId(),
            title: options.title || "专注工作",
            startTime: startTime.toISOString(),
            endTime: plannedEndTime.toISOString(),
            duration: Math.max(1, options.plannedDuration),
            plannedDuration: options.plannedDuration,
            completed: false,
            source: options.source,
            taskId: options.taskId || "",
            taskTitle: options.taskTitle || "",
            projectId: options.projectId || ""
        };

        this.events[event.id] = event;
        await this.saveEvents();
        return event;
    }

    public async completeFocusEvent(id: string, completed = true, endTime = new Date()): Promise<FocusEvent | null> {
        if (!id) return null;
        await this.initialize();

        const event = this.events[id];
        if (!event) return null;

        event.endTime = endTime.toISOString();
        event.duration = this.calculateDurationMinutes(event.startTime, event.endTime);
        event.completed = completed;
        await this.saveEvents();
        return event;
    }

    public async cancelFocusEvent(id: string): Promise<void> {
        if (!id) return;
        await this.initialize();
        delete this.events[id];
        await this.saveEvents();
    }

    public async getDateRangeEvents(startDate: string, endDate: string): Promise<FocusEvent[]> {
        await this.initialize();
        return Object.values(this.events).filter((event) => {
            const dateSource = event.startTime || event.endTime;
            if (!dateSource) return false;
            const date = getLocalDateString(new Date(dateSource));
            return date >= startDate && date <= endDate && !!event.startTime && !!event.endTime;
        });
    }

    private async loadEvents(force = false): Promise<void> {
        if (this.isLoading && !force) return;
        this.isLoading = true;
        try {
            const data = await this.plugin.loadData(FOCUS_EVENT_DATA_FILE);
            if (Array.isArray(data)) {
                this.events = Object.fromEntries(data.map((event: FocusEvent) => [event.id, event]));
            } else {
                this.events = data || {};
            }
        } catch (error) {
            console.error("加载专注事件失败:", error);
            this.events = {};
        } finally {
            this.isLoading = false;
        }
    }

    private async saveEvents(): Promise<void> {
        await this.plugin.saveData(FOCUS_EVENT_DATA_FILE, this.events);
    }

    private generateEventId(): string {
        return `focus_${getLogicalDateString()}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    }

    private calculateDurationMinutes(startTime: string, endTime: string): number {
        const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000);
        return Math.max(1, duration);
    }
}
