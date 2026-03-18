# TypeScript 错误修复计划

## 问题概述

修复代码库中存在的 TypeScript 类型错误，涉及 4 个文件：

1. **CalendarView.ts** - 128 个错误
2. **SettingPanel.svelte** - 76 个错误  
3. **api.ts** - 37 个错误
4. **index.ts** - 14 个错误

---

## 执行策略

### Wave 1 - 导入和缺失变量修复 (并行)
- 任务 1.1: 添加 CalendarView.ts 缺失的导入
- 任务 1.2: 添加 SettingPanel.svelte 缺失的 calendarDefaultNotebookId
- 任务 1.3: 修复 api.ts sendNotification 类型问题

### Wave 2 - 类型转换修复
- 任务 2.1: 修复 index.ts Element 到 HTMLElement 的类型转换

### Wave 3 - 验证
- 任务 3.1: 运行 TypeScript 编译检查
- 任务 3.2: 运行生产构建

---

## TODOs

- [x] **任务 1.1**: 修复 CalendarView.ts 缺失的导入
  - 文件: `src/components/CalendarView.ts`
  - 问题: 缺少 `colorWithOpacity` 导入（行 1513, 1712 使用）
  - 修复: 添加 `import { colorWithOpacity } from "../utils/uiUtils";`
  - 问题: 缺少 `isDraggedInstance` 等变量声明（行 4116, 4152 等）
  - 修复: 检查并添加缺失的变量声明

- [x] **任务 1.2**: 添加 SettingPanel.svelte 缺失的默认设置
  - 文件: `src/SettingPanel.svelte` 和 `src/index.ts`
  - 问题: `calendarDefaultNotebookId` 未在 DEFAULT_SETTINGS 中定义（行 486）
  - 修复: 在 `src/index.ts` 的 DEFAULT_SETTINGS 中添加 `calendarDefaultNotebookId: ''`

- [x] **任务 1.3**: 修复 api.ts sendNotification 类型问题
  - 文件: `src/api.ts`
  - 问题: `platformUtils.sendNotification` 类型不存在（行 707）
  - 修复: 检查正确的 API 调用方式，可能需要用 `window.require('electron')` 或其他方式

- [x] **任务 2.1**: 修复 index.ts Element/HTMLElement 类型问题
  - 文件: `src/index.ts`
  - 问题: Element 类型缺少 HTMLElement 属性（行 1227, 1228, 1250, 1272, 1294）
  - 修复: 添加类型断言 `as HTMLElement` 或修改类型声明

- [x] **任务 3.1**: 运行 TypeScript 编译检查
  - 命令: `npx tsc --noEmit`
  - 验证: 无类型错误

- [x] **任务 3.2**: 运行生产构建
  - 命令: `npm run build`
  - 验证: 构建成功

---

## 已知问题

**CalendarView.ts** 文件中还有其他未定义变量：
- `festival` (行 2503) - 可能应为 `isFestival`
- `calendarEvents` (行 4074)
- `isDraggedInstance` (行 4116, 4152)
- `draggedInstanceDate` (行 4152, 4155, 4156, 4158)
- `createPomodoroStartSubmenu` (行 7918)
- 类型问题 (行 8476, 8477)

这些可能是代码不完整或合并时遗漏的代码块。