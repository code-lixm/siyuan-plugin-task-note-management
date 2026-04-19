export function isAdvancedFeaturesEnabled(settings: any): boolean {
    return settings?.showAdvancedFeatures === true;
}

export type DockKey = "project_dock" | "reminder_dock" | "calendar_dock";

export function shouldShowDock(settings: any, dockType: DockKey): boolean {
    const advancedEnabled = isAdvancedFeaturesEnabled(settings);

    if (dockType === "project_dock") {
        return settings?.enableProjectDock !== false;
    }

    if (dockType === "reminder_dock") {
        return settings?.enableReminderDock !== false;
    }

    // 日历入口在简化模式下默认隐藏
    return advancedEnabled && settings?.enableCalendarDock !== false;
}
