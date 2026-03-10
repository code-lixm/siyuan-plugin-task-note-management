import { Dialog, showMessage } from "siyuan";

import { MigrationValidator, ValidationResult } from "../utils/migrationValidator";

interface MigrationProgress {
    processed: number;
    total: number;
    currentItem?: string;
    message?: string;
}

interface MigrationResult {
    successCount: number;
    errorCount: number;
    details: string[];
}

export interface MigrationExecutor {
    executeMigration?: (
        projects: any[],
        onProgress?: (progress: MigrationProgress) => void,
        signal?: AbortSignal
    ) => Promise<Partial<MigrationResult> | void>;
    execute?: (
        projects: any[],
        onProgress?: (progress: MigrationProgress) => void,
        signal?: AbortSignal
    ) => Promise<Partial<MigrationResult> | void>;
    cancel?: () => void;
}

export class DataMigrationWizard {
    private plugin: any;
    private projects: any[];
    private migrationValidator: MigrationValidator;
    private migrationExecutor: MigrationExecutor;

    private dialog: Dialog | null = null;
    private validationResult: ValidationResult | null = null;
    private migrationResult: MigrationResult | null = null;
    private abortController: AbortController | null = null;

    private isMigrating = false;
    private isCancelled = false;

    private startBtn: HTMLButtonElement | null = null;
    private cancelBtn: HTMLButtonElement | null = null;
    private viewReportBtn: HTMLButtonElement | null = null;
    private closeBtn: HTMLButtonElement | null = null;
    private progressFillEl: HTMLElement | null = null;
    private progressTextEl: HTMLElement | null = null;
    private currentItemEl: HTMLElement | null = null;
    private validationSectionEl: HTMLElement | null = null;
    private resultSectionEl: HTMLElement | null = null;

    constructor(plugin: any, projects: any[], migrationExecutor: MigrationExecutor, migrationValidator?: MigrationValidator) {
        this.plugin = plugin;
        this.projects = Array.isArray(projects) ? projects : [];
        this.migrationExecutor = migrationExecutor;
        this.migrationValidator = migrationValidator || new MigrationValidator();
    }

    public async show(): Promise<void> {
        this.dialog = new Dialog({
            title: this.plugin?.i18n?.migrationWizardTitle || "Data Migration Wizard",
            content: `<div id="data-migration-wizard-container" style="height: 100%; display: flex; flex-direction: column;"></div>`,
            width: "760px",
            height: "640px"
        });

        this.render();
        await this.runValidation();
        this.bindEvents();
        this.updateButtonsState();
    }

    public destroy(): void {
        this.abortController?.abort();
        this.abortController = null;
        this.dialog?.destroy();
        this.dialog = null;
    }

    private render(): void {
        const container = this.dialog?.element.querySelector("#data-migration-wizard-container") as HTMLElement;
        if (!container) return;

        container.innerHTML = `
            <div class="b3-dialog__content" style="display: flex; flex-direction: column; gap: 16px; flex: 1; overflow: auto;">
                <div>
                    <div style="font-size: 14px; font-weight: 500; margin-bottom: 8px;">Validation</div>
                    <div id="migration-validation-section" style="padding: 12px; border: 1px solid var(--b3-border-color); border-radius: 8px; background: var(--b3-theme-surface);">
                        <div style="display: flex; align-items: center; gap: 8px; color: var(--b3-theme-on-surface-light);">
                            <svg class="ft__loading"><use xlink:href="#iconLoading"></use></svg>
                            <span>Validating migration data...</span>
                        </div>
                    </div>
                </div>

                <div>
                    <div style="font-size: 14px; font-weight: 500; margin-bottom: 8px;">Migration Progress</div>
                    <div style="padding: 12px; border: 1px solid var(--b3-border-color); border-radius: 8px; background: var(--b3-theme-surface);">
                        <div style="height: 10px; border-radius: 999px; background: var(--b3-theme-background); overflow: hidden;">
                            <div id="migration-progress-fill" style="height: 100%; width: 0%; background: linear-gradient(90deg, #2ecc71, #27ae60); transition: width 200ms ease;"></div>
                        </div>
                        <div id="migration-progress-text" style="margin-top: 8px; font-size: 13px; color: var(--b3-theme-on-surface-light);">Not started</div>
                        <div id="migration-current-item" style="margin-top: 6px; font-size: 12px; color: var(--b3-theme-on-surface-light);"></div>
                    </div>
                </div>

                <div>
                    <div style="font-size: 14px; font-weight: 500; margin-bottom: 8px;">Migration Results</div>
                    <div id="migration-result-section" style="padding: 12px; border: 1px solid var(--b3-border-color); border-radius: 8px; background: var(--b3-theme-surface); color: var(--b3-theme-on-surface-light);">
                        No migration executed yet.
                    </div>
                </div>
            </div>

            <div class="b3-dialog__action">
                <button class="b3-button b3-button--primary" id="migration-start-btn">Start Migration</button>
                <button class="b3-button b3-button--cancel" id="migration-cancel-btn">Cancel</button>
                <button class="b3-button b3-button--outline" id="migration-view-report-btn">View Report</button>
                <button class="b3-button" id="migration-close-btn">Close</button>
            </div>
        `;

        this.startBtn = container.querySelector("#migration-start-btn") as HTMLButtonElement;
        this.cancelBtn = container.querySelector("#migration-cancel-btn") as HTMLButtonElement;
        this.viewReportBtn = container.querySelector("#migration-view-report-btn") as HTMLButtonElement;
        this.closeBtn = container.querySelector("#migration-close-btn") as HTMLButtonElement;
        this.progressFillEl = container.querySelector("#migration-progress-fill") as HTMLElement;
        this.progressTextEl = container.querySelector("#migration-progress-text") as HTMLElement;
        this.currentItemEl = container.querySelector("#migration-current-item") as HTMLElement;
        this.validationSectionEl = container.querySelector("#migration-validation-section") as HTMLElement;
        this.resultSectionEl = container.querySelector("#migration-result-section") as HTMLElement;
    }

    private async runValidation(): Promise<void> {
        try {
            this.validationResult = this.migrationValidator.validateProjects(this.projects);
            this.renderValidationResult(this.validationResult);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.validationResult = {
                valid: false,
                errors: [message],
                warnings: []
            };
            this.renderValidationResult(this.validationResult);
        }
    }

    private renderValidationResult(result: ValidationResult): void {
        if (!this.validationSectionEl) return;

        const statusColor = result.valid ? "var(--b3-card-success-color)" : "var(--b3-card-error-color)";
        const statusLabel = result.valid ? "Validation passed" : "Validation failed";

        const errors = result.errors || [];
        const warnings = result.warnings || [];

        const listHTML = (title: string, items: string[], color: string) => {
            if (!items.length) return "";
            return `
                <div style="margin-top: 10px;">
                    <div style="font-size: 12px; font-weight: 600; color: ${color}; margin-bottom: 4px;">${title} (${items.length})</div>
                    <ul style="margin: 0; padding-left: 18px; max-height: 130px; overflow: auto; font-size: 12px; line-height: 1.55;">
                        ${items.map((item) => `<li>${this.escapeHtml(item)}</li>`).join("")}
                    </ul>
                </div>
            `;
        };

        this.validationSectionEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; color: ${statusColor}; font-weight: 600;">
                <span>${result.valid ? "✅" : "❌"}</span>
                <span>${statusLabel}</span>
            </div>
            ${listHTML("Errors", errors, "var(--b3-card-error-color)")}
            ${listHTML("Warnings", warnings, "var(--b3-card-warning-color)")}
        `;
    }

    private bindEvents(): void {
        this.startBtn?.addEventListener("click", () => {
            void this.startMigration();
        });

        this.cancelBtn?.addEventListener("click", () => {
            this.cancelMigration();
        });

        this.viewReportBtn?.addEventListener("click", () => {
            this.showReportDialog();
        });

        this.closeBtn?.addEventListener("click", () => {
            if (this.isMigrating) {
                showMessage("Migration is running, please cancel first.");
                return;
            }
            this.destroy();
        });
    }

    private async startMigration(): Promise<void> {
        if (this.isMigrating) return;
        if (!this.validationResult?.valid) {
            showMessage("Validation failed. Please fix errors before migration.");
            return;
        }

        this.isMigrating = true;
        this.isCancelled = false;
        this.abortController = new AbortController();
        this.migrationResult = null;

        this.updateProgress(0, this.projects.length, "Starting migration...");
        this.updateResultSection();
        this.updateButtonsState();

        try {
            const rawResult = await this.executeMigrationWithFallback(this.projects, (progress) => {
                this.updateProgress(progress.processed, progress.total, progress.message || "Migrating...", progress.currentItem);
            }, this.abortController.signal);

            this.migrationResult = this.normalizeMigrationResult(rawResult);
            this.updateProgress(this.projects.length, this.projects.length, "Migration completed");
            this.updateResultSection();

            if (this.migrationResult.errorCount > 0) {
                showMessage(`Migration completed with ${this.migrationResult.errorCount} errors.`, 5000, "error");
            } else {
                showMessage("Migration completed successfully.");
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            if (!this.isCancelled) {
                this.migrationResult = {
                    successCount: 0,
                    errorCount: 1,
                    details: [`Migration failed: ${message}`]
                };
                this.updateResultSection();
                this.updateProgress(0, this.projects.length, "Migration failed");
                showMessage("Migration failed.", 5000, "error");
            }
        } finally {
            this.isMigrating = false;
            this.abortController = null;
            this.updateButtonsState();
        }
    }

    private cancelMigration(): void {
        if (!this.isMigrating) {
            this.destroy();
            return;
        }

        this.isCancelled = true;
        this.abortController?.abort();
        this.migrationExecutor.cancel?.();

        this.updateProgress(0, this.projects.length, "Migration cancelled");
        showMessage("Migration cancelled.");
    }

    private async executeMigrationWithFallback(
        projects: any[],
        onProgress: (progress: MigrationProgress) => void,
        signal: AbortSignal
    ): Promise<Partial<MigrationResult> | void> {
        if (typeof this.migrationExecutor.executeMigration === "function") {
            return this.migrationExecutor.executeMigration(projects, onProgress, signal);
        }

        if (typeof this.migrationExecutor.execute === "function") {
            return this.migrationExecutor.execute(projects, onProgress, signal);
        }

        throw new Error("migrationExecutor must provide executeMigration() or execute().");
    }

    private normalizeMigrationResult(result?: Partial<MigrationResult> | void): MigrationResult {
        const safeResult = (result || {}) as Partial<MigrationResult>;
        const details = Array.isArray(safeResult.details) ? safeResult.details : [];

        const successCount = typeof safeResult.successCount === "number"
            ? safeResult.successCount
            : Math.max(this.projects.length - (safeResult.errorCount || 0), 0);

        const errorCount = typeof safeResult.errorCount === "number"
            ? safeResult.errorCount
            : details.filter((line) => line.toLowerCase().includes("error")).length;

        return {
            successCount,
            errorCount,
            details
        };
    }

    private updateProgress(processed: number, total: number, message: string, currentItem?: string): void {
        const safeTotal = total > 0 ? total : 1;
        const safeProcessed = Math.max(0, Math.min(processed, safeTotal));
        const percent = Math.round((safeProcessed / safeTotal) * 100);

        if (this.progressFillEl) {
            this.progressFillEl.style.width = `${percent}%`;
        }

        if (this.progressTextEl) {
            this.progressTextEl.textContent = `${message} (${safeProcessed}/${safeTotal}, ${percent}%)`;
        }

        if (this.currentItemEl) {
            this.currentItemEl.textContent = currentItem ? `Current: ${currentItem}` : "";
        }
    }

    private updateResultSection(): void {
        if (!this.resultSectionEl) return;

        if (!this.migrationResult) {
            this.resultSectionEl.innerHTML = "No migration executed yet.";
            return;
        }

        const detailPreview = this.migrationResult.details.slice(0, 8);

        this.resultSectionEl.innerHTML = `
            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                <div><strong>Success:</strong> ${this.migrationResult.successCount}</div>
                <div><strong>Errors:</strong> ${this.migrationResult.errorCount}</div>
                <div><strong>Total:</strong> ${this.migrationResult.successCount + this.migrationResult.errorCount}</div>
            </div>
            <div style="margin-top: 10px; font-size: 12px; color: var(--b3-theme-on-surface-light);">
                ${detailPreview.length ? detailPreview.map((line) => `<div>• ${this.escapeHtml(line)}</div>`).join("") : "No details available."}
            </div>
        `;
    }

    private showReportDialog(): void {
        if (!this.migrationResult) {
            showMessage("No migration report available.");
            return;
        }

        const reportLines = [
            `Success Count: ${this.migrationResult.successCount}`,
            `Error Count: ${this.migrationResult.errorCount}`,
            "",
            "Details:",
            ...(this.migrationResult.details.length ? this.migrationResult.details : ["(No details)"])
        ];

        const reportDialog = new Dialog({
            title: "Migration Report",
            content: `<div class="b3-dialog__content"><pre style="margin:0; max-height: 60vh; overflow: auto; white-space: pre-wrap; word-break: break-word;">${this.escapeHtml(reportLines.join("\n"))}</pre></div><div class="b3-dialog__action"><button class="b3-button b3-button--primary" id="migration-report-close-btn">Close</button></div>`,
            width: "680px",
            height: "520px"
        });

        const closeBtn = reportDialog.element.querySelector("#migration-report-close-btn") as HTMLButtonElement;
        closeBtn?.addEventListener("click", () => reportDialog.destroy());
    }

    private updateButtonsState(): void {
        const canStart = !!this.validationResult?.valid && !this.isMigrating;

        if (this.startBtn) {
            this.startBtn.disabled = !canStart;
        }

        if (this.cancelBtn) {
            this.cancelBtn.disabled = false;
            this.cancelBtn.textContent = this.isMigrating ? "Cancel" : "Cancel";
        }

        if (this.viewReportBtn) {
            this.viewReportBtn.disabled = !this.migrationResult;
        }

        if (this.closeBtn) {
            this.closeBtn.disabled = this.isMigrating;
        }
    }

    private escapeHtml(raw: string): string {
        const div = document.createElement("div");
        div.textContent = raw;
        return div.innerHTML;
    }
}
