/*
 * Copyright (c) 2024 by siyuan-plugin-task-note-management. All Rights Reserved.
 * @Author       : siyuan-plugin-task-note-management
 * @Date         : 2024
 * @FilePath     : /src/components/dialogs/ReminderEditDialogExample.ts
 * @Description  : ReminderEditDialog 集成示例 - 展示如何在 ReminderPanel 中使用
 */

import { Dialog } from "siyuan";
import { i18n } from "@/pluginInstance";
import { CategoryManager } from "@/utils/categoryManager";

/**
 * 使用示例：在 ReminderPanel 中集成 ReminderEditDialog
 * 
 * 这是一个示例文件，展示了如何在现有的 TypeScript 类组件中使用
 * 新的 React ReminderEditDialog 组件。
 */

// 导入 React 和 ReactDOM
import React from 'react';
import { createRoot } from 'react-dom/client';

// 动态导入 ReminderEditDialog 组件
async function loadReminderEditDialog() {
    const { ReminderEditDialog } = await import('./ReminderEditDialog');
    return ReminderEditDialog;
}

/**
 * ReminderEditDialogReactAdapter - 将 React 组件包装为与现有代码兼容的类
 * 
 * 使用方式：
 * ```typescript
 * // 在 ReminderPanel 中
 * const adapter = new ReminderEditDialogReactAdapter(
 *     this.plugin,
 *     this.categoryManager,
 *     (savedReminder) => {
 *         // 保存回调
 *         this.handleOptimisticSavedReminder(savedReminder);
 *     }
 * );
 * 
 * // 创建新任务
 * adapter.showCreateDialog();
 * 
 * // 编辑现有任务
 * adapter.showEditDialog(existingReminder);
 * ```
 */
export class ReminderEditDialogReactAdapter {
    private plugin: any;
    private categoryManager: CategoryManager;
    private onSaveCallback: (reminder: any) => void;
    private dialogContainer: HTMLDivElement | null = null;
    private root: any = null;

    constructor(
        plugin: any,
        categoryManager: CategoryManager,
        onSaveCallback: (reminder: any) => void
    ) {
        this.plugin = plugin;
        this.categoryManager = categoryManager;
        this.onSaveCallback = onSaveCallback;
    }

    /**
     * 显示创建新任务对话框
     */
    async showCreateDialog(): Promise<void> {
        await this.showDialog(null, true);
    }

    /**
     * 显示编辑任务对话框
     */
    async showEditDialog(reminder: any): Promise<void> {
        await this.showDialog(reminder, false);
    }

    /**
     * 内部方法：显示对话框
     */
    private async showDialog(reminder: any | null, isCreating: boolean): Promise<void> {
        const ReminderEditDialog = await loadReminderEditDialog();
        const categories = this.categoryManager.getCategories();

        // 创建对话框容器
        this.dialogContainer = document.createElement('div');
        this.dialogContainer.id = 'reminder-edit-dialog-container';
        
        // 使用 SiYuan 的 Dialog 创建基础对话框框架
        const siyuanDialog = new Dialog({
            title: isCreating ? i18n('newTask') : i18n('editTask'),
            content: `<div id="reminder-edit-react-root"></div>`,
            width: "600px",
            destroyCallback: () => {
                // 清理 React 根节点
                if (this.root) {
                    this.root.unmount();
                    this.root = null;
                }
                if (this.dialogContainer) {
                    this.dialogContainer.remove();
                    this.dialogContainer = null;
                }
            }
        });

        // 获取 React 挂载点
        const reactRoot = siyuanDialog.element.querySelector('#reminder-edit-react-root');
        if (!reactRoot) {
            console.error('Failed to find React root element');
            siyuanDialog.destroy();
            return;
        }

        // 创建 React 根节点
        this.root = createRoot(reactRoot);

        // 渲染 React 组件
        this.root.render(
            React.createElement(ReminderEditDialog, {
                isOpen: true,
                onClose: () => {
                    siyuanDialog.destroy();
                },
                reminder: reminder,
                isCreating: isCreating,
                categories: categories,
                i18n: (key: string, params?: Record<string, string>) => {
                    return i18n(key, params);
                },
                onSave: async (updatedReminder: any) => {
                    try {
                        // 构建完整提醒数据
                        const fullReminder = {
                            ...reminder,
                            ...updatedReminder,
                            id: reminder?.id || this.generateId(),
                            createdAt: reminder?.createdAt || new Date().toISOString(),
                        };

                        // 保存到数据库
                        await this.saveReminderToDatabase(fullReminder);

                        // 调用回调
                        this.onSaveCallback(fullReminder);

                        // 关闭对话框
                        siyuanDialog.destroy();

                        // 显示成功消息
                        showMessage(i18n(isCreating ? 'taskCreated' : 'taskUpdated'));
                    } catch (error) {
                        console.error('保存任务失败:', error);
                        showMessage(i18n('saveReminderFailed'));
                    }
                }
            })
        );
    }

    /**
     * 保存提醒到数据库
     */
    private async saveReminderToDatabase(reminder: any): Promise<void> {
        try {
            const reminderData = await this.plugin.loadReminderData() || {};
            reminderData[reminder.id] = reminder;
            await this.plugin.saveReminderData(reminderData);
        } catch (error) {
            console.error('保存提醒数据失败:', error);
            throw error;
        }
    }

    /**
     * 生成唯一 ID
     */
    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

/**
 * 简单的集成示例函数
 * 
 * 可以直接在 ReminderPanel 中调用此函数来测试新的对话框
 */
export async function showReminderEditDialogExample(
    plugin: any,
    categoryManager: CategoryManager,
    onSave: (reminder: any) => void,
    existingReminder?: any
): Promise<void> {
    try {
        const adapter = new ReminderEditDialogReactAdapter(
            plugin,
            categoryManager,
            onSave
        );

        if (existingReminder) {
            await adapter.showEditDialog(existingReminder);
        } else {
            await adapter.showCreateDialog();
        }
    } catch (error) {
        console.error('显示对话框失败:', error);
        showMessage(i18n('openModifyDialogFailed'));
    }
}

// 导入 showMessage
import { showMessage } from "siyuan";

/**
 * ReminderPanel 集成修改建议
 * 
 * 1. 在 ReminderPanel 类中添加属性：
 * ```typescript
 * private reminderEditDialogAdapter: ReminderEditDialogReactAdapter;
 * ```
 * 
 * 2. 在构造函数中初始化：
 * ```typescript
 * this.reminderEditDialogAdapter = new ReminderEditDialogReactAdapter(
 *     this.plugin,
 *     this.categoryManager,
 *     (savedReminder) => this.handleOptimisticSavedReminder(savedReminder)
 * );
 * ```
 * 
 * 3. 修改 showNewTaskDialog 方法：
 * ```typescript
 * private async showNewTaskDialog() {
 *     await this.reminderEditDialogAdapter.showCreateDialog();
 * }
 * ```
 * 
 * 4. 添加编辑任务方法：
 * ```typescript
 * private async showEditTaskDialog(reminder: any) {
 *     await this.reminderEditDialogAdapter.showEditDialog(reminder);
 * }
 * ```
 */
