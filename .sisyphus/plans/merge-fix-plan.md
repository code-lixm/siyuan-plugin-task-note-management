# 合并修复工作计划

## 问题概述

三个文件存在合并冲突和类型不匹配问题：
1. **CalendarView.ts** - Git 合并冲突标记
2. **calendarConfigManager.ts** - 缺失字段和类型不匹配
3. **SettingPanel.svelte** - 依赖上述类型定义

## 任务列表

### Wave 1: 修复 CalendarView.ts 合并冲突

- [x] **任务 1.1**: 解决 CalendarView.ts Git 合并冲突
  - 文件: `src/components/CalendarView.ts`
  - 位置: 第 8258-8267 行
  - 操作: 删除冲突标记，保留 main 分支版本（不带 7 后缀）
  - 预期结果: 
    ```typescript
    case 'timeGridMultiDays':
    case 'dayGridMultiDays':
    case 'listMultiDays':
    case 'resourceTimelineMultiDays':
    ```

### Wave 2: 修复 calendarConfigManager.ts 类型定义

- [x] **任务 2.1**: 更新 CalendarConfig 接口
  - 文件: `src/utils/calendarConfigManager.ts`
  - 操作: 
    1. 在接口中添加 `dockViewMode` 和 `dockViewType` 字段
    2. 统一所有 viewMode 类型使用不带 `7` 后缀的命名
  - 说明: 构造函数中已使用 `dockViewMode: 'timeGridDay'`，但接口缺少声明

- [x] **任务 2.2**: 修复 viewMode 类型签名
  - 操作: 确保 setViewMode/getViewMode 参数类型与 CalendarConfig.viewMode 一致
  - 需移除所有带 `7` 后缀的类型，如 `timeGridMultiDays7` → `timeGridMultiDays`

### Wave 3: 验证构建

- [x] **任务 3.1**: 运行 TypeScript 编译检查
  - 命令: `npm run build`
  - 预期结果: 构建成功，无错误

## 技术细节

### CalendarView.ts 冲突位置
```typescript
// 第 8258-8267 行存在冲突:
<<<<<<< HEAD
case 'timeGridMultiDays7':
case 'dayGridMultiDays7':
case 'listMultiDays7':
case 'resourceTimelineMultiDays7':
=======
case 'timeGridMultiDays':
case 'dayGridMultiDays':
case 'listMultiDays':
>>>>>>> main
```

**解决方案**: 保留 `main` 分支版本（代码其他部分均使用不带 `7` 后缀的命名）

### calendarConfigManager.ts 类型不匹配
- 第 8 行: `viewMode` 类型包含 `timeGridMultiDays7`（带 7 后缀）
- 第 192-198 行: setViewMode/getViewMode 签名也需要更新
- 第 31-53 行: 构造函数中使用了 `dockViewMode` 和 `dockViewType`，但接口未声明

## 变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| CalendarView.ts | 删除 | 移除合并冲突标记 |
| CalendarView.ts | 修改 | 统一使用 `timeGridMultiDays` 等命名 |
| calendarConfigManager.ts | 添加 | 新增 `dockViewMode` 和 `dockViewType` 字段 |
| calendarConfigManager.ts | 修改 | 统一 viewMode 类型（移除 `7` 后缀） |

## 风险与回滚

- **低风险**: 纯命名统一和类型修复
- **回滚**: 通过 git 恢复原始文件即可
