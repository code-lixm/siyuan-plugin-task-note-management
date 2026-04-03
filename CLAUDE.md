# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
# Install dependencies
npm install

# Development mode (with hot reload)
npm run dev

# Production build
npm run build
```

## Data File Paths

Plugin data is stored in SiYuan's storage directory. When debugging, the relevant files are at:

```
~/Documents/我的文档/data/storage/petal/siyuan-plugin-task-daily/
├── reminder.json          # 任务提醒数据
├── project.json           # 项目配置
├── categories.json        # 分类配置
├── reminder-settings.json # 插件设置
├── pomodoro_record.json   # 番茄钟记录
├── habit.json             # 习惯数据
├── habitGroup.json        # 习惯分组
├── statuses.json          # 自定义状态
├── holiday.json           # 节假日配置
├── ics-subscriptions.json # ICS订阅配置
├── Subscribe/             # ICS订阅的task数据
└── audios/                # 音频文件
```

## Architecture

### Core Entry Point (`src/index.ts`)

The main plugin class registers dock panels, tabs, and handles lifecycle:
- `ReminderPanel` - Main task list dock panel
- `CalendarView` - Calendar scheduling tab
- `EisenhowerMatrixView` - Four-quadrant task prioritization
- `ProjectKanbanView` / `ProjectPanel` - Project management

### Key Utilities

| File | Purpose |
|------|---------|
| `src/utils/dateUtils.ts` | Date parsing with chrono-node, logical date handling |
| `src/utils/categoryManager.ts` | Task category management |
| `src/utils/projectManager.ts` | Project CRUD, kanban statuses, milestones |
| `src/utils/pomodoroRecord.ts` | Pomodoro session tracking |
| `src/utils/repeatUtils.ts` | Recurring task instance generation |
| `src/utils/icsSubscription.ts` | ICS feed subscriptions, `getAllReminders()` |
| `src/utils/taskNoteDOM.ts` | Block/task binding in document outline |

### Task Hierarchy

Tasks support parent-child relationships via `parentId` field:
- Top-level tasks: `parentId` is null/empty
- Child tasks: `parentId` points to parent task ID
- Hierarchy is **recursive** - unlimited nesting depth

### Progress Bar Calculation (`ProjectKanbanView.countTopLevelTasksByStatus`)

The project progress bar in the left panel calculates **leaf task status counts**:
1. Collect all parent task IDs (tasks that have children)
2. For each top-level task (no parentId), recursively traverse its subtree
3. Only count **leaf tasks** (tasks with no children) in the status totals
4. Parent tasks themselves are **not** counted - only their leaf descendants

### Paste Task Dialog (`PasteTaskDialog.ts`)

Supports creating tasks from Markdown with metadata:
```markdown
- 任务标题 @priority=high&startDate=2025-08-12&categoryId=分类ID
```

Supports multi-level lists (auto-creates parent-child relationships).

### SiYuan Integration

- Block binding via `((blockId "title"))` or `[title](siyuan://blocks/blockId)`
- Uses SiYuan's plugin API for dialogs, notifications, block operations
- Data persisted via `plugin.loadData()` / `plugin.saveData()`

## Development Notes

- **Language**: Always support both English and Chinese - add translations to both `i18n/*.json` files
- **Type Safety**: Use TypeScript properly, avoid `any` when possible
- **Error Handling**: Wrap async operations in try-catch, show user-friendly messages
- **Mobile Support**: Plugin supports iOS/Android SiYuan clients
