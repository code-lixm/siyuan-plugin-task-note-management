# 组件说明（已精简版）

## 核心视图组件
- **ReminderPanel.ts**：任务提醒主面板
- **ProjectPanel.ts**：项目主面板
- **CalendarView.ts**：日历视图
- **ProjectKanbanView.ts**：项目看板
- **EisenhowerMatrixView.ts**：四象限视图

## 主要对话框组件
- **QuickReminderDialog.ts**：任务创建/编辑主入口
- **BatchReminderDialog.ts**：批量创建任务
- **ProjectDialog.ts**：项目创建/编辑
- **CategoryManageDialog.ts**：分类管理
- **StatusManageDialog.ts**：状态管理
- **TaskSummaryDialog.ts**：任务统计摘要
- **ContextRemindersDialog.ts**：统一上下文提醒查看入口（文档/块）
- **DocumentReminderDialog.ts**：文档提醒详情（由 ContextRemindersDialog 复用）
- **BlockRemindersDialog.ts**：块提醒详情（由 ContextRemindersDialog 复用）

## Svelte 组件
- **SettingPanel.svelte**：插件设置面板
- **FilterManagement.svelte**：筛选器管理
- **LoadingDialog.svelte**：加载中弹窗
- **icsSubscriptionPanel.svelte**：ICS 订阅管理
