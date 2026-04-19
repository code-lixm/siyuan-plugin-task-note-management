export type SettingTier = "core" | "advanced";

export interface SettingsGroupSchema {
    key: string;
    title: string;
    tier: SettingTier;
    settingKeys: string[];
}

export const SETTINGS_SCHEMA_VERSION = 2;

export const SETTINGS_GROUPS: SettingsGroupSchema[] = [
    {
        key: "sidebar",
        title: "sidebarSettings",
        tier: "core",
        settingKeys: [
            "showAdvancedFeatures",
            "enableReminderDock",
            "enableProjectDock",
            "enableCalendarDock",
            "enableDockBadge",
            "enableReminderDockBadge",
            "enableProjectDockBadge",
        ],
    },
    {
        key: "notification",
        title: "notificationReminder",
        tier: "core",
        settingKeys: [
            "notificationSound",
            "reminderSystemNotification",
            "showInternalNotification",
            "dailyNotificationTime",
            "dailyNotificationEnabled",
        ],
    },
    {
        key: "calendar",
        title: "calendarSettings",
        tier: "core",
        settingKeys: [
            "calendarAutoOpen",
            "weekStartDay",
            "calendarShowHoliday",
            "calendarShowLunar",
            "calendarShowCategoryAndProject",
            "todayStartTime",
            "dayStartTime",
        ],
    },
    {
        key: "taskNote",
        title: "taskNoteSettings",
        tier: "core",
        settingKeys: [
            "autoDetectDateTime",
            "removeDateAfterDetection",
            "newDocNotebook",
            "newDocPath",
            "defaultHeadingLevel",
            "defaultHeadingPosition",
            "enableOutlinePrefix",
        ],
    },
    {
        key: "pomodoro",
        title: "pomodoroSettings",
        tier: "advanced",
        settingKeys: [
            "pomodoroWorkDuration",
            "pomodoroBreakDuration",
            "pomodoroLongBreakDuration",
            "pomodoroAutoMode",
            "pomodoroSystemNotification",
            "pomodoroEndPopupWindow",
        ],
    },
    {
        key: "dataStorage",
        title: "dataStorageLocation",
        tier: "core",
        settingKeys: [
            "dataStorageInfo",
            "openDataFolder",
            "deletePluginData",
        ],
    },
    {
        key: "icsSubscription",
        title: "icsSubscription",
        tier: "core",
        settingKeys: [],
    },
    {
        key: "sync",
        title: "calendarUpload",
        tier: "advanced",
        settingKeys: [
            "icsSyncEnabled",
            "icsSyncMethod",
            "icsSyncInterval",
            "icsDailySyncTime",
            "icsTaskFilter",
            "icsFileName",
            "icsCloudUrl",
            "icsLastSyncAt",
        ],
    },
];

export function getSettingTier(key: string): SettingTier {
    for (const group of SETTINGS_GROUPS) {
        if (group.settingKeys.includes(key)) {
            return group.tier;
        }
    }
    // 未纳入 schema 的旧设置默认视为 core，避免误隐藏
    return "core";
}

export function getGroupTier(groupKey?: string): SettingTier {
    if (!groupKey) return "core";
    const group = SETTINGS_GROUPS.find((item) => item.key === groupKey);
    return group?.tier || "core";
}

export function getGroupOrder(groupKey?: string): number {
    if (!groupKey) return Number.MAX_SAFE_INTEGER;
    const index = SETTINGS_GROUPS.findIndex((item) => item.key === groupKey);
    return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}
