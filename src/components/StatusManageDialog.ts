import { Dialog, showMessage, confirm } from "siyuan";
import { StatusManager, Status } from "../utils/statusManager";
import { i18n } from "../pluginInstance";
import { Picker } from "emoji-picker-element";
export class StatusManageDialog {
    private dialog: Dialog;
    private statusManager: StatusManager;
    private onUpdated?: () => void;
    private draggedElement: HTMLElement | null = null;
    private draggedStatus: Status | null = null;
    private plugin?: any;
    private sharedPicker: any = null;
    private activeIconDisplay: HTMLElement | null = null;
    private sharedCloseHandler?: (e: MouseEvent) => void;
    private sharedResizeHandler?: () => void;
    private sharedScrollHandler?: () => void;
    private sharedEnterHandler?: (e: KeyboardEvent) => void;

    constructor(plugin?: any, onUpdated?: () => void) {
        this.plugin = plugin;
        this.statusManager = StatusManager.getInstance(this.plugin);
        this.onUpdated = onUpdated;
    }

    public show() {
        this.dialog = new Dialog({
            title: i18n("statusManagement") || "状态管理",
            content: this.createDialogContent(),
            width: "500px",
            height: "500px"
        });

        this.bindEvents();
        this.renderStatuses();
    }

    private createDialogContent(): string {
        return `
            <div class="status-manage-dialog">
                <div class="b3-dialog__content">
                    <div class="status-toolbar">
                        <button class="b3-button b3-button--primary" id="addStatusBtn">
                            <svg class="b3-button__icon"><use xlink:href="#iconAdd"></use></svg>
                            ${i18n("addStatus") || "添加状态"}
                        </button>
                        <button class="b3-button b3-button--outline" id="resetStatusesBtn">
                            <svg class="b3-button__icon"><use xlink:href="#iconRefresh"></use></svg>
                            ${i18n("resetToDefault") || "重置为默认"}
                        </button>
                    </div>
                    <div class="status-drag-hint">
                        <span>💡 ${i18n("dragHint")}</span>
                    </div>
                    <div class="statuses-list" id="statusesList">
                        <!-- 状态列表将在这里渲染 -->
                    </div>
                </div>
                <div class="b3-dialog__action">
                    <button class="b3-button b3-button--primary" id="closeBtn">${i18n("close") || "关闭"}</button>
                </div>
            </div>
            <style>
                .status-manage-dialog {
                    max-height: 580px;
                }
                .status-drag-hint {
                    padding: 8px 16px;
                    background: rgba(52, 152, 219, 0.1);
                    border-radius: 4px;
                    margin-bottom: 12px;
                    font-size: 12px;
                    color: #666;
                    text-align: center;
                }
                .statuses-list {
                    max-height: 400px;
                    overflow-y: auto;
                }
                .status-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px;
                    margin-bottom: 8px;
                    background: var(--b3-theme-surface);
                    border: 1px solid var(--b3-border-color);
                    border-radius: 6px;
                    cursor: grab;
                    transition: all 0.2s ease;
                    position: relative;
                }
                .status-item:hover {
                    background: var(--b3-theme-surface-lighter);
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .status-item.dragging {
                    opacity: 0.6;
                    cursor: grabbing;
                    transform: rotate(2deg);
                    z-index: 1000;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }
                .status-item.drag-over-top {
                    border-top: 3px solid #3498db;
                    box-shadow: 0 -2px 0 rgba(52, 152, 219, 0.3);
                }
                .status-item.drag-over-bottom {
                    border-bottom: 3px solid #3498db;
                    box-shadow: 0 2px 0 rgba(52, 152, 219, 0.3);
                }
                .status-drag-handle {
                    cursor: grab;
                    padding: 4px;
                    color: #999;
                    display: flex;
                    align-items: center;
                    margin-right: 12px;
                    transition: color 0.2s ease;
                }
                .status-drag-handle:hover {
                    color: #3498db;
                }
                .status-drag-handle::before {
                    content: "⋮⋮";
                    font-size: 16px;
                    line-height: 1;
                }
                .status-info {
                    display: flex;
                    align-items: center;
                    flex: 1;
                }
                .status-icon {
                    font-size: 16px;
                    margin-right: 8px;
                }
                .status-actions {
                    display: flex;
                    gap: 4px;
                }
            </style>
        `;
    }

    private bindEvents() {
        const addStatusBtn = this.dialog.element.querySelector('#addStatusBtn') as HTMLButtonElement;
        const resetStatusesBtn = this.dialog.element.querySelector('#resetStatusesBtn') as HTMLButtonElement;
        const closeBtn = this.dialog.element.querySelector('#closeBtn') as HTMLButtonElement;

        addStatusBtn?.addEventListener('click', () => {
            this.showEditStatusDialog();
        });

        resetStatusesBtn?.addEventListener('click', () => {
            this.resetStatuses();
        });

        closeBtn?.addEventListener('click', () => {
            if (this.onUpdated) {
                this.onUpdated();
            }
            this.dialog.destroy();
        });
    }

    private async renderStatuses() {
        const statusesList = this.dialog.element.querySelector('#statusesList') as HTMLElement;
        if (!statusesList) return;

        try {
            const statuses = await this.statusManager.loadStatuses();
            statusesList.innerHTML = '';

            statuses.forEach(status => {
                const statusEl = this.createStatusElement(status);
                statusesList.appendChild(statusEl);
            });
        } catch (error) {
            console.error(i18n("loadStatusesFailed") || "加载状态失败", error);
            statusesList.innerHTML = `<div class="status-error">${i18n("loadStatusesFailed") || "加载状态失败"}</div>`;
        }
    }

    private createStatusElement(status: Status): HTMLElement {
        const statusEl = document.createElement('div');
        statusEl.className = 'status-item';
        statusEl.draggable = true;
        statusEl.dataset.statusId = status.id;
        statusEl.innerHTML = `
            <div class="status-drag-handle" title="拖拽排序"></div>
            <div class="status-info">
                <div class="status-icon">${status.icon || '📝'}</div>
                <div class="status-name">${status.name}</div>
            </div>
            <div class="status-actions">
                <button class="b3-button b3-button--outline status-edit-btn" data-action="edit" data-id="${status.id}" title="${i18n("editStatus") || "编辑状态"}">
                    <svg class="b3-button__icon"><use xlink:href="#iconEdit"></use></svg>
                </button>
                ${!status.isArchived ? `
                <button class="b3-button b3-button--outline status-delete-btn" data-action="delete" data-id="${status.id}" title="${i18n("deleteStatus") || "删除状态"}">
                    <svg class="b3-button__icon"><use xlink:href="#iconTrashcan"></use></svg>
                </button>
                ` : ''}
            </div>
        `;

        this.bindDragEvents(statusEl, status);

        const editBtn = statusEl.querySelector('[data-action="edit"]') as HTMLButtonElement;
        const deleteBtn = statusEl.querySelector('[data-action="delete"]') as HTMLButtonElement;

        editBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showEditStatusDialog(status);
        });

        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteStatus(status);
            });
        }

        return statusEl;
    }

    private bindDragEvents(element: HTMLElement, status: Status) {
        element.addEventListener('dragstart', (e) => {
            this.draggedElement = element;
            this.draggedStatus = status;
            element.classList.add('dragging');

            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', element.outerHTML);
            }
        });

        element.addEventListener('dragend', () => {
            element.classList.remove('dragging');
            this.draggedElement = null;
            this.draggedStatus = null;

            const allItems = this.dialog.element.querySelectorAll('.status-item');
            allItems.forEach(item => {
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            });
        });

        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'move';
            }

            if (this.draggedElement && this.draggedElement !== element) {
                element.classList.remove('drag-over-top', 'drag-over-bottom');
                const rect = element.getBoundingClientRect();
                const midPoint = rect.top + rect.height / 2;
                const mouseY = e.clientY;
                if (mouseY < midPoint) {
                    element.classList.add('drag-over-top');
                } else {
                    element.classList.add('drag-over-bottom');
                }
            }
        });

        element.addEventListener('dragleave', (e) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;

            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                element.classList.remove('drag-over-top', 'drag-over-bottom');
            }
        });

        element.addEventListener('drop', async (e) => {
            e.preventDefault();
            element.classList.remove('drag-over-top', 'drag-over-bottom');

            if (this.draggedElement && this.draggedStatus && this.draggedElement !== element) {
                const rect = element.getBoundingClientRect();
                const midPoint = rect.top + rect.height / 2;
                const mouseY = e.clientY;
                const insertBefore = mouseY < midPoint;

                const targetStatusId = element.dataset.statusId;
                const targetStatus = this.statusManager.getStatusById(targetStatusId);
                if (targetStatus) {
                    await this.handleStatusReorder(this.draggedStatus, targetStatus, insertBefore);
                }
            }
        });
    }

    private async handleStatusReorder(draggedStatus: Status, targetStatus: Status, insertBefore: boolean = false) {
        try {
            const statuses = await this.statusManager.loadStatuses();
            const draggedIndex = statuses.findIndex(s => s.id === draggedStatus.id);
            let targetIndex = statuses.findIndex(s => s.id === targetStatus.id);

            if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
                return;
            }

            const reorderedStatuses = [...statuses];
            const [removed] = reorderedStatuses.splice(draggedIndex, 1);

            targetIndex = reorderedStatuses.findIndex(s => s.id === targetStatus.id);

            if (insertBefore) {
                reorderedStatuses.splice(targetIndex, 0, removed);
            } else {
                reorderedStatuses.splice(targetIndex + 1, 0, removed);
            }

            await this.statusManager.reorderStatuses(reorderedStatuses);
            this.renderStatuses();
            showMessage("状态排序已更新");
        } catch (error) {
            console.error('重新排序状态失败:', error);
            showMessage("排序更新失败，请重试");
        }
    }

    private showEditStatusDialog(status?: Status) {
        const isEdit = !!status;
        const editDialog = new Dialog({
            title: isEdit ? (i18n("editStatus") || "编辑状态") : (i18n("addStatus") || "添加状态"),
            content: `
                <div class="status-edit-dialog">
                    <div class="b3-dialog__content">
                        <div class="b3-form__group">
                            <label class="b3-form__label">${i18n("statusName") || "状态名称"}</label>
                            <input type="text" id="statusName" class="b3-text-field" value="${status?.name || ''}" placeholder="${i18n("pleaseEnterStatusName") || "请输入状态名称"}">
                        </div>
                        <div class="b3-form__group">
                            <label class="b3-form__label">${i18n("statusIcon") || "状态图标"}</label>
                            <div id="statusIcon" class="status-icon-display">${status?.icon || '📝'}</div>
                        </div>
                    </div>
                    <div class="b3-dialog__action">
                        <button class="b3-button b3-button--cancel" id="editCancelBtn">${i18n("cancel") || "取消"}</button>
                        <button class="b3-button b3-button--primary" id="editConfirmBtn">${i18n("save") || "保存"}</button>
                    </div>
                    <style>
                        .status-icon-display {
                            width: 40px;
                            height: 40px;
                            border-radius: 50%;
                            background: var(--b3-theme-surface-lighter);
                            border: 2px solid var(--b3-theme-primary-lighter);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 20px;
                            cursor: pointer;
                            transition: all 0.2s;
                            user-select: none;
                        }
                        .status-icon-display:hover {
                            transform: scale(1.1);
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                        }
                    </style>
                </div>
            `,
            width: "400px",
            destroyCallback: () => {
                this.clearAllPickers();
            }
        });

        const nameInput = editDialog.element.querySelector('#statusName') as HTMLInputElement;
        const iconDisplay = editDialog.element.querySelector('#statusIcon') as HTMLElement;
        const cancelBtn = editDialog.element.querySelector('#editCancelBtn') as HTMLButtonElement;
        const confirmBtn = editDialog.element.querySelector('#editConfirmBtn') as HTMLButtonElement;

        // 设置初始图标
        if (status?.icon) {
            iconDisplay.textContent = status.icon;
        } else {
            iconDisplay.textContent = '📝';
        }

        // 绑定图标点击事件
        iconDisplay?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.initSharedPicker();
            this.activeIconDisplay = iconDisplay;
            if (!this.sharedPicker) return;
            const show = this.sharedPicker.style.display === 'none' || this.sharedPicker.style.display === '';
            if (show) {
                this.sharedPicker.style.display = 'block';
                this.positionSharedPicker(iconDisplay);
            } else {
                this.sharedPicker.style.display = 'none';
                this.activeIconDisplay = null;
            }
        });

        cancelBtn?.addEventListener('click', () => {
            editDialog.destroy();
        });

        confirmBtn?.addEventListener('click', async () => {
            const name = nameInput.value.trim();
            const icon = iconDisplay.textContent || '';

            if (!name) {
                showMessage(i18n("pleaseEnterStatusName") || "请输入状态名称");
                return;
            }

            try {
                if (isEdit && status) {
                    await this.statusManager.updateStatus(status.id, { name, icon });
                    showMessage(i18n("statusUpdated") || "状态已更新");
                } else {
                    await this.statusManager.addStatus({ name, icon });
                    showMessage(i18n("statusAdded") || "状态已添加");
                }

                editDialog.destroy();
                this.renderStatuses();
            } catch (error) {
                console.error('保存状态失败:', error);
                showMessage(i18n("saveStatusFailed") || "保存状态失败，请重试");
            }
        });
    }

    private async deleteStatus(status: Status) {
        if (status.isArchived) {
            showMessage(i18n("cannotDeleteArchivedStatus") || "归档状态不可删除");
            return;
        }

        await confirm(
            i18n("deleteStatus") || "删除状态",
            i18n("confirmDeleteStatus", { name: status.name }) || `确定要删除状态 "${status.name}" 吗？`,
            async () => {
                try {
                    await this.statusManager.deleteStatus(status.id);
                    showMessage(i18n("statusDeleted") || "状态已删除");
                    this.renderStatuses();
                } catch (error) {
                    console.error(i18n("deleteStatusFailed") || "删除状态失败", error);
                    showMessage(i18n("deleteStatusFailed") || "删除状态失败");
                }
            }
        );
    }

    private async resetStatuses() {
        await confirm(
            i18n("resetStatuses") || "重置状态",
            i18n("confirmResetStatuses") || "确定要将状态列表重置为默认设置吗？此操作不可撤销。",
            async () => {
                try {
                    await this.statusManager.resetToDefault();
                    showMessage(i18n("statusesReset") || "状态已重置");
                    this.renderStatuses();
                } catch (error) {
                    console.error(i18n("resetStatusesFailed") || "重置状态失败", error);
                    showMessage(i18n("resetStatusesFailed") || "重置状态失败");
                }
            }
        );
    }

    private initSharedPicker() {
        if (this.sharedPicker) return;
        try {
            // Prefer direct class constructor if available for typing and tree-shaking
            // Fallback to createElement when Picker is undefined (older build/runtime)
            try {
                // eslint-disable-next-line new-cap
                this.sharedPicker = new Picker({
                    i18n: zh_CN,
                    locale: 'zh_CN',
                    dataSource: '/plugins/siyuan-plugin-task-daily/assets/emojis_search.json'
                });
            } catch (e) {
                // @ts-ignore - fall back to DOM creation
                this.sharedPicker = document.createElement('emoji-picker') as any;
                if (this.sharedPicker) {
                    // Set attributes for DOM-created picker
                    this.sharedPicker.setAttribute('locale', 'zh_CN');
                    this.sharedPicker.setAttribute('data-source', '/plugins/siyuan-plugin-task-daily/assets/emojis_search.json');
                }
            }
            this.sharedPicker.style.cssText = 'position: fixed; left: 0; top: 0; z-index: 2147483647; display: none; margin-top: 8px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); border-radius: 12px; background: var(--b3-theme-surface);';
            document.body.appendChild(this.sharedPicker);

            this.sharedPicker.addEventListener('emoji-click', (event: any) => {
                const selectedEmoji = event.detail.emoji.unicode;
                if (this.activeIconDisplay) {
                    this.activeIconDisplay.textContent = selectedEmoji;
                }
                this.sharedPicker.style.display = 'none';
                this.activeIconDisplay = null;
            });

            // 当搜索框内容本身是 Emoji 时, 支持按 Enter 直接确定
            const attachEnterHandler = () => {
                try {
                    const searchInput = this.sharedPicker.shadowRoot?.querySelector('input[type="search"]') as HTMLInputElement;
                    if (searchInput) {
                        this.sharedEnterHandler = (e: KeyboardEvent) => {
                            if (e.key === 'Enter') {
                                const val = searchInput.value.trim();
                                if (this.isAllEmoji(val)) {
                                    this.applyEmojiFromSearch(val);
                                }
                            }
                        };
                        searchInput.addEventListener('keydown', this.sharedEnterHandler);
                    }
                } catch (error) {
                    // ignore
                }
            };

            // try to attach immediately; if not present (render delay), attach after a short delay
            attachEnterHandler();
            setTimeout(attachEnterHandler, 50);

            this.sharedCloseHandler = (e: MouseEvent) => {
                const target = e.target as Node;
                if (this.sharedPicker && !this.sharedPicker.contains(target) && this.activeIconDisplay && !this.activeIconDisplay.contains(target)) {
                    this.sharedPicker.style.display = 'none';
                    this.activeIconDisplay = null;
                }
            };
            document.addEventListener('click', this.sharedCloseHandler);

            this.sharedResizeHandler = () => {
                if (this.sharedPicker && this.sharedPicker.style.display === 'block') this.positionSharedPicker(this.activeIconDisplay);
            };
            window.addEventListener('resize', this.sharedResizeHandler);

            this.sharedScrollHandler = () => {
                if (this.sharedPicker && this.sharedPicker.style.display === 'block') this.positionSharedPicker(this.activeIconDisplay);
            };
            window.addEventListener('scroll', this.sharedScrollHandler, true);
        } catch (error) {
            console.error('init shared picker failed', error);
        }
    }

    private positionSharedPicker(target: HTMLElement | null) {
        if (!this.sharedPicker || !target) return;
        const rect = target.getBoundingClientRect();
        const prevDisplay = this.sharedPicker.style.display;
        this.sharedPicker.style.display = 'block';
        this.sharedPicker.style.visibility = 'hidden';
        const pr = this.sharedPicker.getBoundingClientRect();
        let top = rect.bottom + 8;
        if (top + pr.height > window.innerHeight) {
            top = rect.top - pr.height - 8;
        }
        let left = rect.left;
        if (left + pr.width > window.innerWidth) {
            left = window.innerWidth - pr.width - 8;
        }
        if (left < 8) left = 8;
        this.sharedPicker.style.left = `${Math.round(left)}px`;
        this.sharedPicker.style.top = `${Math.round(top)}px`;
        this.sharedPicker.style.visibility = 'visible';
        this.sharedPicker.style.display = prevDisplay;
    }

    private isAllEmoji(str: string) {
        const s = (str || '').trim();
        if (!s) return false;
        try {
            // Use Unicode property escapes to match emoji sequences, including ZWJ sequences
            return /^[\p{Extended_Pictographic}\uFE0F\u200D]+$/u.test(s);
        } catch (e) {
            // Fallback: check if there's a surrogate pair (basic heuristic)
            return /[\uD800-\uDFFF]/.test(s);
        }
    }

    private applyEmojiFromSearch(val: string) {
        const emoji = (val || '').trim();
        if (!emoji) return;
        if (this.activeIconDisplay) {
            this.activeIconDisplay.textContent = emoji;
        }
        if (this.sharedPicker) this.sharedPicker.style.display = 'none';
        this.activeIconDisplay = null;
    }

    private clearAllPickers() {
        if (this.sharedPicker) {
            try {
                if (this.sharedCloseHandler) document.removeEventListener('click', this.sharedCloseHandler);
                if (this.sharedResizeHandler) window.removeEventListener('resize', this.sharedResizeHandler);
                if (this.sharedScrollHandler) window.removeEventListener('scroll', this.sharedScrollHandler, true);
                if (this.sharedEnterHandler) {
                    // Try to remove from search input
                    try {
                        const searchInput = this.sharedPicker.shadowRoot?.querySelector('input[type="search"]') as HTMLInputElement;
                        if (searchInput) {
                            searchInput.removeEventListener('keydown', this.sharedEnterHandler);
                        }
                    } catch (e) {
                        // ignore
                    }
                }
                document.body.removeChild(this.sharedPicker);
            } catch (error) {
                console.error('clear picker failed', error);
            }
            this.sharedPicker = null;
            this.sharedCloseHandler = undefined;
            this.sharedResizeHandler = undefined;
            this.sharedScrollHandler = undefined;
            this.sharedEnterHandler = undefined;
            this.activeIconDisplay = null;
        }
    }
}
