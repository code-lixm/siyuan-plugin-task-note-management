import {
    Plugin,
    showMessage,
    openTab,
    getFrontend,
} from "siyuan";
import "./styles/globals.css";

import { i18n, setPluginInstance } from "./pluginInstance";
import { mountDockComponent, mountTabComponent } from "./bridge";
import { ReminderPanel } from "./components/layout/ReminderPanel";
import { ProjectPanel } from "./components/layout/ProjectPanel";
import { HabitPanel } from "./components/layout/HabitPanel";
import CalendarView from "./components/views/CalendarView";
import { EisenhowerMatrixView } from "./components/views/EisenhowerMatrixView";
import { DataMigration } from "./utils/migration";

export const SETTINGS_FILE = "reminder-settings.json";
export const PROJECT_DATA_FILE = "project.json";
export const REMINDER_DATA_FILE = "reminder.json";
export const HABIT_DATA_FILE = "habit.json";
export const POMODORO_RECORD_DATA_FILE = "pomodoro_record.json";

export const STORAGE_NAME = "siyuan-plugin-task-daily";

const TAB_TYPE = "reminder_calendar_tab";
const EISENHOWER_TAB_TYPE = "reminder_eisenhower_tab";
const PROJECT_KANBAN_TAB_TYPE = "project_kanban_tab";

// Default settings
export const DEFAULT_SETTINGS = {
    showAdvancedFeatures: false,
    enableReminderDock: true,
    enableProjectDock: true,
    enableHabitDock: false,
    enableCalendarDock: true,
    enableDockBadge: true,
    defaultView: 'list',
    theme: 'system',
    notificationEnabled: true,
    pomodoroDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
};

export default class ReminderPlugin extends Plugin {
    // Settings
    private settingUtils: any;
    
    // Data storage keys
    private static readonly DATA_FILES = {
        reminder: REMINDER_DATA_FILE,
        project: PROJECT_DATA_FILE,
        habit: HABIT_DATA_FILE,
        pomodoroRecord: POMODORO_RECORD_DATA_FILE,
    };

    // React component destroy functions
    private reminderPanelDestroy: (() => void) | null = null;
    private projectPanelDestroy: (() => void) | null = null;
    private habitPanelDestroy: (() => void) | null = null;
    private calendarViewDestroy: (() => void) | null = null;
    private eisenhowerViewDestroy: (() => void) | null = null;

    async onload() {
        console.log("[Task Daily] Plugin loading...");
        
        // Set plugin instance for global access
        setPluginInstance(this);
        
        // Initialize data storage
        await this.initDataStorage();

        // Auto migrate legacy data
        await this.autoMigrateLegacyData();
        
        // Register docks (using React components)
        this.registerDocks();
        
        // Register tabs
        this.registerTabs();
        
        // Register commands
        this.registerCommands();
        
        // Register event handlers
        this.registerEventHandlers();
        
        console.log("[Task Daily] Plugin loaded successfully");
    }

    onunload() {
        console.log("[Task Daily] Plugin unloading...");
        
        // Cleanup React components
        if (this.reminderPanelDestroy) {
            this.reminderPanelDestroy();
            this.reminderPanelDestroy = null;
        }
        if (this.projectPanelDestroy) {
            this.projectPanelDestroy();
            this.projectPanelDestroy = null;
        }
        if (this.habitPanelDestroy) {
            this.habitPanelDestroy();
            this.habitPanelDestroy = null;
        }
        if (this.calendarViewDestroy) {
            this.calendarViewDestroy();
            this.calendarViewDestroy = null;
        }
        if (this.eisenhowerViewDestroy) {
            this.eisenhowerViewDestroy();
            this.eisenhowerViewDestroy = null;
        }
        
        console.log("[Task Daily] Plugin unloaded");
    }

    // ==================== Data Storage ====================

    private async initDataStorage() {
        // Ensure all data files exist
        for (const [key, filename] of Object.entries(ReminderPlugin.DATA_FILES)) {
            const data = await this.loadData(filename);
            if (data === null || data === undefined) {
                await this.saveData(filename, {});
            }
        }
    }

    private async autoMigrateLegacyData(): Promise<void> {
        try {
            const hasLegacyData = await DataMigration.detectLegacyData(this);
            if (!hasLegacyData) {
                return;
            }

            showMessage(i18n("legacyDataDetected") || "检测到旧版数据，开始迁移...");
            const migrationResult = await DataMigration.migrate(this);

            if (migrationResult.success) {
                showMessage(
                    i18n("legacyMigrationSuccess", {
                        count: String(migrationResult.migratedCount),
                    }) || `旧版数据迁移成功，共迁移 ${migrationResult.migratedCount} 条数据`
                );
            } else {
                console.error("[Task Daily] legacy migration failed:", migrationResult.errors);
                showMessage(
                    i18n("legacyMigrationFailed", {
                        count: String(migrationResult.errors.length),
                    }) || `旧版数据迁移失败，错误数：${migrationResult.errors.length}`,
                    7000,
                    "error"
                );
            }
        } catch (error) {
            console.error("[Task Daily] autoMigrateLegacyData failed:", error);
            showMessage(i18n("legacyMigrationException") || "旧版数据迁移异常，请查看控制台日志", 7000, "error");
        }
    }

    async loadReminderData(): Promise<Record<string, any>> {
        return (await this.loadData(REMINDER_DATA_FILE)) || {};
    }

    async saveReminderData(data: Record<string, any>): Promise<void> {
        await this.saveData(REMINDER_DATA_FILE, data);
    }

    async loadProjectData(): Promise<Record<string, any>> {
        return (await this.loadData(PROJECT_DATA_FILE)) || {};
    }

    async saveProjectData(data: Record<string, any>): Promise<void> {
        await this.saveData(PROJECT_DATA_FILE, data);
    }

    async loadHabitData(): Promise<Record<string, any>> {
        return (await this.loadData(HABIT_DATA_FILE)) || {};
    }

    async saveHabitData(data: Record<string, any>): Promise<void> {
        await this.saveData(HABIT_DATA_FILE, data);
    }

    async loadPomodoroRecordData(): Promise<Record<string, any>> {
        return (await this.loadData(POMODORO_RECORD_DATA_FILE)) || {};
    }

    async savePomodoroRecordData(data: Record<string, any>): Promise<void> {
        await this.saveData(POMODORO_RECORD_DATA_FILE, data);
    }

    async loadSettings(): Promise<typeof DEFAULT_SETTINGS> {
        return { ...DEFAULT_SETTINGS, ...(await this.loadData(SETTINGS_FILE) || {}) };
    }

    async saveSettings(settings: Partial<typeof DEFAULT_SETTINGS>): Promise<void> {
        const current = await this.loadSettings();
        await this.saveData(SETTINGS_FILE, { ...current, ...settings });
    }

    // ==================== UI Registration ====================

    private registerDocks() {
        // Reminder Dock (Task Panel)
        this.addDock({
            type: `${STORAGE_NAME}reminder_dock`,
            config: {
                position: "LeftTop",
                size: { width: 300, height: 400 },
                icon: "iconTask",
                title: i18n("dailyTasks"),
            },
            init: (dock) => {
                // Use document.createElement instead of innerHTML for security
                const container = document.createElement('div');
                container.id = 'reminder-dock-root';
                container.style.height = '100%';
                dock.element.appendChild(container);
                
                this.reminderPanelDestroy = mountDockComponent(
                    container,
                    ReminderPanel,
                    this as any,
                    { initialTab: 'today' }
                );
            },
            destroy: () => {
                if (this.reminderPanelDestroy) {
                    this.reminderPanelDestroy();
                    this.reminderPanelDestroy = null;
                }
            },
        });

        // Project Dock
        this.addDock({
            type: `${STORAGE_NAME}project_dock`,
            config: {
                position: "LeftTop",
                size: { width: 300, height: 400 },
                icon: "iconFolder",
                title: i18n("projects"),
            },
            init: (dock) => {
                // Use document.createElement instead of innerHTML for security
                const container = document.createElement('div');
                container.id = 'project-dock-root';
                container.style.height = '100%';
                dock.element.appendChild(container);
                
                this.projectPanelDestroy = mountDockComponent(
                    container,
                    ProjectPanel,
                    this as any
                );
            },
            destroy: () => {
                if (this.projectPanelDestroy) {
                    this.projectPanelDestroy();
                    this.projectPanelDestroy = null;
                }
            },
        });

        // Habit Dock
        this.addDock({
            type: `${STORAGE_NAME}habit_dock`,
            config: {
                position: "LeftTop",
                size: { width: 300, height: 400 },
                icon: "iconCheck",
                title: i18n("habits"),
            },
            init: (dock) => {
                // Use document.createElement instead of innerHTML for security
                const container = document.createElement('div');
                container.id = 'habit-dock-root';
                container.style.height = '100%';
                dock.element.appendChild(container);
                
                this.habitPanelDestroy = mountDockComponent(
                    container,
                    HabitPanel,
                    this as any
                );
            },
            destroy: () => {
                if (this.habitPanelDestroy) {
                    this.habitPanelDestroy();
                    this.habitPanelDestroy = null;
                }
            },
        });
    }

    private registerTabs() {
        // Calendar View Tab
        this.addTab({
            type: TAB_TYPE,
            init: (tab) => {
                // Create container for React component
                const container = document.createElement('div');
                container.id = 'calendar-view-root';
                container.style.height = '100%';
                tab.element.appendChild(container);
                
                // Mount CalendarView React component
                const instance = mountTabComponent(
                    container,
                    CalendarView,
                    this as any
                );
                this.calendarViewDestroy = instance.destroy;
            },
            destroy: () => {
                if (this.calendarViewDestroy) {
                    this.calendarViewDestroy();
                    this.calendarViewDestroy = null;
                }
            },
        });

        // Eisenhower Matrix Tab
        this.addTab({
            type: EISENHOWER_TAB_TYPE,
            init: (tab) => {
                const container = document.createElement('div');
                container.id = 'eisenhower-view-root';
                container.style.height = '100%';
                tab.element.appendChild(container);
                
                const instance = mountTabComponent(
                    container,
                    EisenhowerMatrixView,
                    this as any
                );
                this.eisenhowerViewDestroy = instance.destroy;
            },
            destroy: () => {
                if (this.eisenhowerViewDestroy) {
                    this.eisenhowerViewDestroy();
                    this.eisenhowerViewDestroy = null;
                }
            },
        });
    }

    private registerCommands() {
        // Open Task Panel command
        this.addCommand({
            langKey: "openTaskPanel",
            hotkey: "",
            callback: () => {
                this.openDock(`${STORAGE_NAME}reminder_dock`);
            },
        });

        // Open Calendar command
        this.addCommand({
            langKey: "openCalendar",
            hotkey: "",
            callback: () => {
                this.openCalendarTab();
            },
        });
    }

    private registerEventHandlers() {
        // Document tree menu (document items)
        this.eventBus.on("open-menu-doctree", this.handleDocumentTreeMenu.bind(this));
        
        // Block menu (right-click on blocks)
        this.eventBus.on("open-menu-block", this.handleBlockMenu.bind(this));
    }

    // ==================== Event Handlers ====================

    private handleDocumentTreeMenu({ detail }: { detail: any }) {
        const elements = detail.elements;
        if (!elements || !elements.length) return;

        const documentIds = Array.from(elements)
            .map((element: any) => element.getAttribute("data-node-id"))
            .filter((id: string | null): id is string => id !== null);

        if (!documentIds.length) return;

        detail.menu.addSeparator();
        
        detail.menu.addItem({
            iconHTML: "⏰",
            label: i18n("setTimeReminder"),
            click: () => {
                showMessage("Quick reminder - coming soon in React version");
            },
        });
    }

    private handleBlockMenu({ detail }: { detail: any }) {
        if (!detail.blockElements || !detail.blockElements.length) return;

        const blockIds = Array.from(detail.blockElements)
            .map((el: any) => el.getAttribute("data-node-id"))
            .filter((id: string | null): id is string => id !== null);

        if (!blockIds.length) return;

        detail.menu.addSeparator();
        
        detail.menu.addItem({
            iconHTML: "⏰",
            label: blockIds.length > 1 
                ? i18n("batchSetReminderBlocks", { count: blockIds.length.toString() })
                : i18n("setTimeReminder"),
            click: () => {
                showMessage("Reminder dialog - coming soon in React version");
            },
        });
    }

    // ==================== Public Methods ====================

    openCalendarTab() {
        openTab({
            app: this.app,
            custom: {
                icon: "iconCalendar",
                title: i18n("calendar"),
                data: {
                    text: i18n("calendar"),
                },
            },
            type: TAB_TYPE,
        });
    }

    async openDock(dockType: string) {
        // Trigger dock visibility
        const dock = document.querySelector(`[data-type="${dockType}"]`) as HTMLElement;
        if (dock) {
            dock.click();
        }
    }
}
