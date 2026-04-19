import { BlockRemindersDialog } from "./BlockRemindersDialog";
import { DocumentReminderDialog } from "./DocumentReminderDialog";

export type ReminderContextType = "document" | "block";

export class ContextRemindersDialog {
    private contextType: ReminderContextType;
    private contextId: string;
    private plugin: any;

    constructor(contextType: ReminderContextType, contextId: string, plugin: any) {
        this.contextType = contextType;
        this.contextId = contextId;
        this.plugin = plugin;
    }

    public async show(): Promise<void> {
        if (this.contextType === "document") {
            const dialog = new DocumentReminderDialog(this.contextId, this.plugin);
            dialog.show();
            return;
        }

        const dialog = new BlockRemindersDialog(this.contextId, this.plugin);
        await dialog.show();
    }

    public static async showForDocument(documentId: string, plugin: any): Promise<void> {
        const dialog = new ContextRemindersDialog("document", documentId, plugin);
        await dialog.show();
    }

    public static async showForBlock(blockId: string, plugin: any): Promise<void> {
        const dialog = new ContextRemindersDialog("block", blockId, plugin);
        await dialog.show();
    }
}
