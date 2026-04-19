export type PluginAction =
    | "openCalendar"
    | "openProjectKanban"
    | "openEisenhowerMatrix"
    | "openSetting"
    | "toggleMiniPomodoro";

export interface PluginActionPayload {
    projectId?: string;
    projectTitle?: string;
    projectFilter?: string;
}

export interface PluginActionHost {
    openCalendarTab?: (data?: { projectFilter?: string }) => void;
    openProjectKanbanTab?: (projectId: string, projectTitle: string) => void;
    openEisenhowerMatrixTab?: () => Promise<void> | void;
    openSetting?: () => Promise<void> | void;
    toggleMiniPomodoroRing?: () => Promise<void> | void;
}

export async function executePluginAction(
    host: PluginActionHost | undefined,
    action: PluginAction,
    payload?: PluginActionPayload
): Promise<boolean> {
    if (!host) return false;

    try {
        switch (action) {
            case "openCalendar":
                host.openCalendarTab?.({ projectFilter: payload?.projectFilter });
                return true;
            case "openProjectKanban":
                if (!payload?.projectId) return false;
                host.openProjectKanbanTab?.(payload.projectId, payload.projectTitle || payload.projectId);
                return true;
            case "openEisenhowerMatrix":
                await host.openEisenhowerMatrixTab?.();
                return true;
            case "openSetting":
                await host.openSetting?.();
                return true;
            case "toggleMiniPomodoro":
                await host.toggleMiniPomodoroRing?.();
                return true;
            default:
                return false;
        }
    } catch (error) {
        console.error(`[PluginAction] execute failed: ${action}`, error);
        return false;
    }
}
