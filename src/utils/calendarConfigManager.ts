import { Plugin } from "siyuan";
import { getFile, removeFile } from "../api";

const CALENDAR_CONFIG_FILE = 'data/storage/petal/siyuan-plugin-task-daily/calendar-config.json';

export interface CalendarConfig {
    colorBy: 'category' | 'priority' | 'project';
    viewMode: 'multiMonthYear' | 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'dayGridWeek' | 'dayGridDay' | 'listDay' | 'listWeek' | 'listMonth' | 'listYear' | 'timeGridMultiDays7' | 'dayGridMultiDays7' | 'listMultiDays7' | 'resourceTimeGridDay' | 'resourceTimeGridWeek' | 'resourceTimelineDay' | 'resourceTimelineWeek' | 'resourceTimelineMonth' | 'resourceTimelineYear' | 'resourceTimelineMultiDays7';
    viewType: 'timeline' | 'kanban' | 'list' | 'resource';
    showLunar: boolean;
    showPomodoro: boolean;
    completionFilter: 'all' | 'completed' | 'incomplete';
    showCrossDayTasks: boolean;
    crossDayThreshold: number;
    showSubtasks: boolean;
    showRepeatTasks: boolean;
    repeatInstanceLimit: number;
    showHiddenTasks: boolean; // 显示不在日历视图显示的任务
    showHabits: boolean; // 显示习惯打卡
    defaultNotebookId: string; // 默认日记笔记本ID
}

export class CalendarConfigManager {
    private static instance: CalendarConfigManager;
    private config: CalendarConfig;
    private plugin: Plugin;

    private constructor(plugin: Plugin) {
        this.plugin = plugin;
        this.config = {
            colorBy: 'priority',
            viewMode: 'timeGridWeek',
            viewType: 'timeline',
            showLunar: true,
            showPomodoro: true,
            completionFilter: 'all',
            showCrossDayTasks: true,
            crossDayThreshold: -1,
            showSubtasks: true,
            showRepeatTasks: true,
            repeatInstanceLimit: -1,
            showHiddenTasks: false,
            showHabits: true,
            defaultNotebookId: ''
        };
    }

    public static getInstance(plugin: Plugin): CalendarConfigManager {
        if (!CalendarConfigManager.instance) {
            CalendarConfigManager.instance = new CalendarConfigManager(plugin);
        }
        return CalendarConfigManager.instance;
    }

    async initialize() {
        await this.loadConfig();
    }

    private async saveConfig() {
        try {
            const settings = await (this.plugin as any).loadSettings();
            settings.calendarColorBy = this.config.colorBy;
            settings.calendarViewMode = this.config.viewMode;
            settings.calendarViewType = this.config.viewType;
            settings.calendarShowLunar = this.config.showLunar;
            settings.calendarShowPomodoro = this.config.showPomodoro;
            settings.calendarCompletionFilter = this.config.completionFilter;
            settings.calendarShowCrossDayTasks = this.config.showCrossDayTasks;
            settings.calendarCrossDayThreshold = this.config.crossDayThreshold;
            settings.calendarShowSubtasks = this.config.showSubtasks;
            settings.calendarShowRepeatTasks = this.config.showRepeatTasks;
            settings.calendarRepeatInstanceLimit = this.config.repeatInstanceLimit;
            settings.calendarShowHiddenTasks = this.config.showHiddenTasks;
            settings.calendarShowHabits = this.config.showHabits;
            settings.calendarDefaultNotebookId = this.config.defaultNotebookId;
            await (this.plugin as any).saveSettings(settings);
        } catch (error) {
            console.error('Failed to save calendar config:', error);
            throw error;
        }
    }

    private async loadConfig() {
        try {
            const settings = await (this.plugin as any).loadSettings();

            // 检查是否存在旧的 calendar-config.json 文件，如果存在则导入并删除
            try {
                const oldCalendarContent = await getFile(CALENDAR_CONFIG_FILE);
                if (oldCalendarContent && oldCalendarContent.code !== 404) {
                    const oldCalendar = typeof oldCalendarContent === 'string' ? JSON.parse(oldCalendarContent) : oldCalendarContent;
                    if (oldCalendar && typeof oldCalendar === 'object') {
                        // 合并旧日历配置到新的 settings
                        if (oldCalendar.colorBy) settings.calendarColorBy = oldCalendar.colorBy;
                        if (oldCalendar.viewMode) settings.calendarViewMode = oldCalendar.viewMode;
                        await (this.plugin as any).saveSettings(settings);
                        // 删除旧文件
                        await removeFile(CALENDAR_CONFIG_FILE);
                        console.log('成功导入并删除旧的 calendar-config.json 文件');
                    }
                }
            } catch (error) {
                // 如果文件不存在或其他错误，忽略
                console.log('旧的 calendar-config.json 文件不存在或已处理');
            }

            this.config = {
                colorBy: settings.calendarColorBy || 'priority',
                viewMode: settings.calendarViewMode || 'timeGridWeek',
                viewType: settings.calendarViewType || 'timeline',
                showLunar: settings.calendarShowLunar !== false,
                showPomodoro: settings.calendarShowPomodoro !== false,
                completionFilter: (settings.calendarCompletionFilter as any) || 'all',
                showCrossDayTasks: settings.calendarShowCrossDayTasks !== false,
                crossDayThreshold: settings.calendarCrossDayThreshold !== undefined ? settings.calendarCrossDayThreshold : -1,
                showSubtasks: settings.calendarShowSubtasks !== false,
                showRepeatTasks: settings.calendarShowRepeatTasks !== false,
                repeatInstanceLimit: settings.calendarRepeatInstanceLimit !== undefined ? settings.calendarRepeatInstanceLimit : -1,
                showHiddenTasks: settings.calendarShowHiddenTasks === true,
                showHabits: settings.calendarShowHabits !== false,
                defaultNotebookId: settings.calendarDefaultNotebookId || ''
            };
        } catch (error) {
            console.warn('Failed to load calendar config, using defaults:', error);
            this.config = {
                colorBy: 'priority',
                viewMode: 'timeGridWeek',
                viewType: 'timeline',
                showLunar: true,
                showPomodoro: true,
                completionFilter: 'all',
                showCrossDayTasks: true,
                crossDayThreshold: -1,
                showSubtasks: true,
                showRepeatTasks: true,
                repeatInstanceLimit: -1,
                showHiddenTasks: false,
                showHabits: true,
                defaultNotebookId: ''
            };
            try {
                await this.saveConfig();
            } catch (saveError) {
                console.error('Failed to create initial calendar config:', saveError);
            }
        }
    }

    public async setColorBy(colorBy: 'category' | 'priority' | 'project') {
        this.config.colorBy = colorBy;
        await this.saveConfig();
    }

    public async setCompletionFilter(filter: 'all' | 'completed' | 'incomplete') {
        this.config.completionFilter = filter;
        await this.saveConfig();
    }

    public getColorBy(): 'category' | 'priority' | 'project' {
        return this.config.colorBy;
    }

    public async setViewMode(viewMode: 'multiMonthYear' | 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'dayGridWeek' | 'dayGridDay' | 'listDay' | 'listWeek' | 'listMonth' | 'listYear' | 'timeGridMultiDays7' | 'dayGridMultiDays7' | 'listMultiDays7' | 'resourceTimeGridDay' | 'resourceTimeGridWeek' | 'resourceTimelineDay' | 'resourceTimelineWeek' | 'resourceTimelineMonth' | 'resourceTimelineYear' | 'resourceTimelineMultiDays7') {
        this.config.viewMode = viewMode;
        await this.saveConfig();
    }

    public getViewMode(): 'multiMonthYear' | 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'dayGridWeek' | 'dayGridDay' | 'listDay' | 'listWeek' | 'listMonth' | 'listYear' | 'timeGridMultiDays7' | 'dayGridMultiDays7' | 'listMultiDays7' | 'resourceTimeGridDay' | 'resourceTimeGridWeek' | 'resourceTimelineDay' | 'resourceTimelineWeek' | 'resourceTimelineMonth' | 'resourceTimelineYear' | 'resourceTimelineMultiDays7' {
        return this.config.viewMode;
    }

    public async setViewType(viewType: 'timeline' | 'kanban' | 'list' | 'resource') {
        this.config.viewType = viewType;
        await this.saveConfig();
    }

    public getViewType(): 'timeline' | 'kanban' | 'list' | 'resource' {
        return this.config.viewType;
    }

    public getCompletionFilter(): 'all' | 'completed' | 'incomplete' {
        return this.config.completionFilter || 'all';
    }

    public async setShowLunar(showLunar: boolean) {
        this.config.showLunar = showLunar;
        await this.saveConfig();
    }

    public getShowLunar(): boolean {
        return this.config.showLunar;
    }

    public async setShowPomodoro(showPomodoro: boolean) {
        this.config.showPomodoro = showPomodoro;
        await this.saveConfig();
    }

    public getShowPomodoro(): boolean {
        return this.config.showPomodoro;
    }

    public async setShowCrossDayTasks(show: boolean) {
        this.config.showCrossDayTasks = show;
        await this.saveConfig();
    }

    public getShowCrossDayTasks(): boolean {
        return this.config.showCrossDayTasks;
    }

    public async setCrossDayThreshold(threshold: number) {
        this.config.crossDayThreshold = threshold;
        await this.saveConfig();
    }

    public getCrossDayThreshold(): number {
        return this.config.crossDayThreshold !== undefined ? this.config.crossDayThreshold : -1;
    }

    public async setShowSubtasks(show: boolean) {
        this.config.showSubtasks = show;
        await this.saveConfig();
    }

    public getShowSubtasks(): boolean {
        return this.config.showSubtasks;
    }

    public async setShowRepeatTasks(show: boolean) {
        this.config.showRepeatTasks = show;
        await this.saveConfig();
    }

    public getShowRepeatTasks(): boolean {
        return this.config.showRepeatTasks;
    }

    public async setRepeatInstanceLimit(limit: number) {
        this.config.repeatInstanceLimit = limit;
        await this.saveConfig();
    }

    public getRepeatInstanceLimit(): number {
        return this.config.repeatInstanceLimit !== undefined ? this.config.repeatInstanceLimit : -1;
    }

    public async setShowHiddenTasks(show: boolean) {
        this.config.showHiddenTasks = show;
        await this.saveConfig();
    }

    public getShowHiddenTasks(): boolean {
        return this.config.showHiddenTasks !== undefined ? this.config.showHiddenTasks : false;
    }

    public async setShowHabits(show: boolean) {
        this.config.showHabits = show;
        await this.saveConfig();
    }

    public getShowHabits(): boolean {
        return this.config.showHabits !== false;
    }

    public getConfig(): CalendarConfig {
        return { ...this.config };
    }

    public async setDefaultNotebookId(notebookId: string) {
        this.config.defaultNotebookId = notebookId;
        await this.saveConfig();
    }

    public getDefaultNotebookId(): string {
        return this.config.defaultNotebookId || '';
    }
}