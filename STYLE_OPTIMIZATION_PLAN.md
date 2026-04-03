# 样式优化方案 - SiYuan Task Note Management Plugin

## 概述

基于现有样式系统进行优化，统一使用CSS变量（Design Tokens），简化项目列表面板样式，对齐全局按钮和弹窗风格，优化日历面板样式。

---

## 一、需要修改的文件列表

### 核心样式文件
1. `src/styles/_variables.scss` - 新增/优化CSS变量
2. `src/styles/_mixins.scss` - 新增通用mixins
3. `src/index.scss` - 优化按钮、弹窗、全局样式
4. `src/styles/project-reminder.scss` - 简化项目面板样式
5. `src/styles/_calendar.scss` - 优化日历样式

### 新增文件
6. `src/styles/_components.scss` - 通用组件样式（表格、列表、卡片等）

---

## 二、具体修改内容

### 2.1 新增CSS变量（_variables.scss）

```scss
:root {
    /* === 新增：布局变量 === */
    --task-layout-sidebar-width: 280px;
    --task-layout-header-height: 48px;
    --task-layout-footer-height: 56px;
    
    /* === 新增：表格变量 === */
    --task-table-header-bg: var(--b3-theme-surface);
    --task-table-row-hover: var(--b3-list-hover);
    --task-table-border: var(--b3-border-color);
    --task-table-cell-padding: 12px 16px;
    
    /* === 新增：列表变量 === */
    --task-list-item-gap: 8px;
    --task-list-item-padding: 12px;
    --task-list-item-radius: var(--task-radius-md);
    
    /* === 新增：面板变量 === */
    --task-panel-padding: 16px;
    --task-panel-gap: 12px;
    --task-panel-header-padding: 12px 16px;
    
    /* === 新增：输入框变量 === */
    --task-input-height: 32px;
    --task-input-padding: 8px 12px;
    --task-input-radius: var(--task-radius-sm);
    
    /* === 新增：边距规范 === */
    --task-margin-xs: 4px;
    --task-margin-sm: 8px;
    --task-margin-md: 12px;
    --task-margin-lg: 16px;
    --task-margin-xl: 24px;
    
    /* === 新增：分隔线 === */
    --task-divider-color: var(--b3-border-color);
    --task-divider-width: 1px;
}
```

### 2.2 项目列表面板优化（project-reminder.scss）

**当前问题：**
- 样式层级过深，选择器复杂
- 混合使用了新旧命名规范
- 边距和间距不统一

**优化措施：**

```scss
// 简化后的项目面板结构
.project-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    font-size: var(--task-font-sm);
}

// 统一头部样式
.project-panel__header {
    padding: var(--task-panel-header-padding);
    border-bottom: var(--task-divider-width) solid var(--task-divider-color);
    background: var(--task-surface-soft);
    flex-shrink: 0;
}

// 简化项目项样式
.project-item {
    position: relative;
    padding: var(--task-list-item-padding);
    margin-bottom: var(--task-list-item-gap);
    background: var(--task-surface-muted);
    border: 1px solid var(--task-border-default);
    border-radius: var(--task-list-item-radius);
    cursor: pointer;
    transition: all var(--task-motion-fast);
    
    &:hover {
        background: var(--task-surface-elevated);
        border-color: var(--task-border-focus);
        box-shadow: var(--task-shadow-hover);
        transform: translateY(-1px);
    }
}

// 统一信息布局
.project-item__content {
    display: flex;
    flex-direction: column;
    gap: var(--task-space-2);
}

.project-item__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--task-space-2);
}

.project-item__title {
    font-weight: 500;
    font-size: var(--task-font-md);
    color: var(--b3-theme-on-background);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.project-item__meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--task-space-2);
    font-size: var(--task-font-xs);
    color: var(--b3-theme-on-surface-light);
}

// 统一标签样式
.project-item__tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--task-space-1);
}

.project-item__tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    font-size: var(--task-font-xs);
    background: var(--task-bg-subtle);
    border-radius: var(--task-radius-xs);
    border: 1px solid var(--task-border-default);
}
```

### 2.3 全局按钮样式对齐（index.scss）

**优化措施：**

```scss
// 统一按钮基础样式
.plugin-task-btn {
    // 盒模型
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--task-space-1);
    box-sizing: border-box;
    
    // 尺寸(默认中等)
    min-height: var(--task-toolbar-height);
    height: var(--task-toolbar-height);
    padding: 8px 16px;
    
    // 字体
    font-family: inherit;
    font-size: var(--task-font-sm);
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    
    // 边框与圆角
    border: 1px solid transparent;
    border-radius: var(--task-radius-sm);
    
    // 背景与颜色
    background: var(--task-surface-soft);
    color: var(--b3-theme-on-background);
    
    // 交互
    cursor: pointer;
    transition: var(--task-motion-fast);
    user-select: none;
    
    // 焦点样式
    &:focus-visible {
        outline: 2px solid var(--b3-theme-primary);
        outline-offset: 2px;
    }
    
    // 悬停状态
    &:hover:not(:disabled, .plugin-task-btn--disabled) {
        background: var(--task-bg-hover);
        transform: translateY(-1px);
        box-shadow: var(--task-shadow-hover);
    }
    
    // 按下状态
    &:active:not(:disabled, .plugin-task-btn--disabled) {
        transform: translateY(0);
        box-shadow: none;
    }
    
    // 禁用状态
    &:disabled,
    &--disabled {
        opacity: var(--task-text-disabled);
        cursor: not-allowed;
        pointer-events: none;
    }
}

// 主按钮
.plugin-task-btn--primary {
    background: var(--b3-theme-primary);
    color: white;
    border-color: var(--b3-theme-primary);
    
    &:hover:not(:disabled, .plugin-task-btn--disabled) {
        background: var(--b3-theme-primary-light);
        border-color: var(--b3-theme-primary-light);
    }
}

// 描边按钮
.plugin-task-btn--outline {
    background: transparent;
    color: var(--b3-theme-on-background);
    border-color: var(--task-border-default);
    
    &:hover:not(:disabled, .plugin-task-btn--disabled) {
        background: var(--task-surface-soft);
        border-color: var(--b3-theme-primary-light);
        color: var(--b3-theme-primary);
    }
}

// 幽灵按钮
.plugin-task-btn--ghost {
    background: transparent;
    color: var(--b3-theme-on-surface);
    border-color: transparent;
    
    &:hover:not(:disabled, .plugin-task-btn--disabled) {
        background: var(--task-bg-hover);
        color: var(--b3-theme-on-background);
        box-shadow: none;
    }
}

// 尺寸变体
.plugin-task-btn--sm {
    min-height: 28px;
    height: 28px;
    padding: 6px 12px;
    font-size: var(--task-font-xs);
    border-radius: var(--task-radius-xs);
}

.plugin-task-btn--lg {
    min-height: 40px;
    height: 40px;
    padding: 10px 20px;
    font-size: var(--task-font-md);
    border-radius: var(--task-radius-md);
}

// 图标按钮
.plugin-task-btn--icon {
    width: var(--task-toolbar-icon-size);
    min-width: var(--task-toolbar-icon-size);
    padding: 0;
}
```

### 2.4 全局弹窗样式对齐（index.scss）

**优化措施：**

```scss
// 统一弹窗容器
.plugin-task-dialog {
    max-height: 100%;
    max-width: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    
    // SiYuan Dialog 容器适配
    .b3-dialog__container {
        display: flex;
        flex-direction: column;
        border-radius: var(--task-radius-xl);
        background: var(--task-surface-muted);
        box-shadow: var(--task-shadow-panel);
        overflow: hidden;
    }
    
    // 头部样式
    &__header {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--task-space-5) var(--task-space-6);
        border-bottom: 1px solid var(--task-border-default);
        background: var(--task-surface-soft);
    }
    
    &__title {
        margin: 0;
        font-size: var(--task-font-lg);
        font-weight: 600;
        color: var(--b3-theme-on-background);
        line-height: 1.4;
    }
    
    &__close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        border: none;
        border-radius: var(--task-radius-sm);
        background: transparent;
        color: var(--b3-theme-on-surface-light);
        cursor: pointer;
        transition: var(--task-motion-fast);
        
        &:hover {
            background: var(--task-bg-hover);
            color: var(--b3-theme-on-surface);
        }
    }
    
    // 内容区域
    &__content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: var(--task-space-6);
        background: var(--task-surface-muted);
        max-height: 70vh;
        
        // 表单组默认样式
        .b3-form__group {
            margin-bottom: var(--task-space-5);
        }
        
        .b3-form__label {
            display: block;
            margin-bottom: var(--task-space-1);
            font-weight: 500;
            font-size: var(--task-font-sm);
        }
        
        .b3-form__desc {
            font-size: var(--task-font-xs);
            color: var(--b3-theme-on-surface-light);
            margin-top: var(--task-space-1);
        }
    }
    
    // 底部操作栏
    &__footer {
        flex-shrink: 0;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: var(--task-space-3);
        padding: var(--task-space-5) var(--task-space-6);
        border-top: 1px solid var(--task-border-default);
        background: var(--task-surface-soft);
        
        &--space-between {
            justify-content: space-between;
        }
        
        &--center {
            justify-content: center;
        }
    }
    
    // 尺寸变体
    &--sm {
        .b3-dialog__container {
            min-width: 320px;
            max-width: 400px;
        }
    }
    
    &--md {
        .b3-dialog__container {
            min-width: 400px;
            max-width: 500px;
        }
    }
    
    &--lg {
        .b3-dialog__container {
            min-width: 500px;
            max-width: 700px;
        }
        
        .plugin-task-dialog__content {
            max-height: 75vh;
        }
    }
    
    // 移动端适配
    @media (max-width: 768px) {
        .b3-dialog__container {
            min-width: auto !important;
            max-width: 92vw !important;
            width: auto !important;
        }
        
        &__content {
            padding: var(--task-space-5);
            max-height: 65vh;
        }
        
        &__header,
        &__footer {
            padding: var(--task-space-4) var(--task-space-5);
        }
    }
}
```

### 2.5 日历面板样式优化（_calendar.scss）

**优化措施：**

```scss
// 日历容器优化
.plugin-task-calendar {
    // 日历专用 CSS 变量
    --fc-calendar-primary: var(--b3-theme-primary);
    --fc-calendar-primary-light: var(--b3-theme-primary-light);
    --fc-calendar-primary-lightest: var(--b3-theme-primary-lightest);
    --fc-calendar-bg: var(--b3-theme-background);
    --fc-calendar-surface: var(--b3-theme-surface);
    --fc-calendar-surface-light: var(--b3-theme-surface-light);
    --fc-calendar-border: var(--b3-border-color);
    --fc-calendar-text: var(--b3-theme-on-background);
    --fc-calendar-text-secondary: var(--b3-theme-on-surface-light);
    --fc-calendar-today-bg: var(--b3-theme-primary-lightest);
    
    // 事件卡片变量
    --fc-event-radius: var(--task-radius-xs);
    --fc-event-padding: 2px 4px;
    --fc-event-border-width: 4px;
    --fc-event-opacity-completed: 0.5;
    
    // 单元格变量
    --fc-day-padding: 4px;
    --fc-day-header-height: 26px;
    --fc-day-min-rows: 5;
    --fc-day-event-line-height: 1.4;
}

// 工具栏优化
.plugin-task-calendar-toolbar {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--task-space-3);
    align-items: center;
    gap: var(--task-space-3);
    
    &--dock {
        justify-content: flex-end;
        gap: 4px;
        margin-bottom: 4px;
    }
}

// 事件卡片优化
.plugin-task-calendar-event {
    border-radius: var(--fc-event-radius);
    padding: var(--fc-event-padding);
    font-size: var(--task-font-sm);
    transition: var(--task-motion-fast);
    
    // Modern UI 风格
    border: none;
    border-left: var(--fc-event-border-width) solid var(--fc-calendar-primary);
    background-color: var(--fc-calendar-surface-light);
    color: var(--fc-calendar-text);
    
    &:hover {
        box-shadow: var(--task-shadow-hover);
        transform: translateY(-1px);
        z-index: 10;
    }
    
    // 已完成事件
    &--completed {
        opacity: var(--fc-event-opacity-completed);
        filter: grayscale(0.3);
    }
}

// 单元格优化
.fc-daygrid-day {
    padding: var(--fc-day-padding);
    
    &.fc-day-today {
        background-color: var(--fc-calendar-today-bg);
        
        .fc-daygrid-day-number {
            background-color: var(--fc-calendar-primary);
            color: var(--b3-theme-on-primary, white);
            border-radius: var(--task-radius-sm);
            padding: 2px 6px;
            font-weight: 600;
        }
    }
    
    &:hover:not(.fc-day-today) {
        background-color: var(--fc-calendar-surface-light);
    }
}

// 日期数字优化
.fc-daygrid-day-number {
    cursor: pointer;
    border-radius: var(--task-radius-sm);
    padding: 1px 6px;
    transition: background-color 0.15s ease, color 0.15s ease;
    text-decoration: none !important;
    
    &:hover {
        background-color: var(--fc-calendar-primary-lightest);
        color: var(--fc-calendar-primary);
    }
}
```

### 2.6 新增通用组件样式（_components.scss）

```scss
// 表格样式
.plugin-task-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--task-font-sm);
    
    th,
    td {
        padding: var(--task-table-cell-padding);
        border-bottom: 1px solid var(--task-table-border);
        text-align: left;
    }
    
    th {
        background: var(--task-table-header-bg);
        font-weight: 600;
        color: var(--b3-theme-on-background);
    }
    
    tbody tr {
        transition: background-color var(--task-motion-fast);
        
        &:hover {
            background: var(--task-table-row-hover);
        }
    }
}

// 列表样式
.plugin-task-list {
    list-style: none;
    padding: 0;
    margin: 0;
    
    &__item {
        display: flex;
        align-items: center;
        padding: var(--task-list-item-padding);
        margin-bottom: var(--task-list-item-gap);
        background: var(--task-surface-muted);
        border: 1px solid var(--task-border-default);
        border-radius: var(--task-list-item-radius);
        transition: all var(--task-motion-fast);
        
        &:hover {
            background: var(--task-surface-elevated);
            border-color: var(--task-border-focus);
            box-shadow: var(--task-shadow-hover);
        }
        
        &:last-child {
            margin-bottom: 0;
        }
    }
}

// 卡片样式
.plugin-task-card {
    background: var(--task-surface-soft);
    border: 1px solid var(--task-border-default);
    border-radius: var(--task-radius-md);
    padding: var(--task-space-4);
    transition: all var(--task-motion-fast);
    
    &:hover {
        box-shadow: var(--task-shadow-hover);
        transform: translateY(-1px);
    }
    
    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--task-space-3);
    }
    
    &__title {
        font-weight: 600;
        font-size: var(--task-font-md);
        color: var(--b3-theme-on-background);
    }
    
    &__content {
        color: var(--b3-theme-on-surface);
        font-size: var(--task-font-sm);
    }
    
    &__footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--task-space-2);
        margin-top: var(--task-space-3);
        padding-top: var(--task-space-3);
        border-top: 1px solid var(--task-border-default);
    }
}

// 输入框样式
.plugin-task-input {
    width: 100%;
    height: var(--task-input-height);
    padding: var(--task-input-padding);
    border: 1px solid var(--task-border-default);
    border-radius: var(--task-input-radius);
    background: var(--task-surface-muted);
    font-size: var(--task-font-sm);
    transition: border-color var(--task-motion-fast);
    
    &:focus {
        outline: none;
        border-color: var(--task-border-focus);
    }
    
    &::placeholder {
        color: var(--b3-theme-on-surface-light);
        opacity: 0.6;
    }
}

// 标签样式
.plugin-task-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    font-size: var(--task-font-xs);
    font-weight: 500;
    background: var(--task-bg-subtle);
    border: 1px solid var(--task-border-default);
    border-radius: var(--task-radius-xs);
    color: var(--b3-theme-on-surface);
    
    &--primary {
        background: var(--b3-theme-primary-lightest);
        border-color: var(--b3-theme-primary-light);
        color: var(--b3-theme-primary);
    }
    
    &--success {
        background: var(--b3-theme-success-lightest);
        border-color: var(--b3-theme-success-light);
        color: var(--b3-theme-success);
    }
    
    &--warning {
        background: var(--b3-theme-warning-lightest);
        border-color: var(--b3-theme-warning-light);
        color: var(--b3-theme-warning);
    }
    
    &--error {
        background: var(--b3-theme-error-lightest);
        border-color: var(--b3-theme-error-light);
        color: var(--b3-theme-error);
    }
}

// 分隔线样式
.plugin-task-divider {
    height: var(--task-divider-width);
    background: var(--task-divider-color);
    margin: var(--task-space-4) 0;
    border: none;
}

// 空状态样式
.plugin-task-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--task-space-6);
    color: var(--b3-theme-on-surface-light);
    text-align: center;
    
    &__icon {
        font-size: 48px;
        margin-bottom: var(--task-space-3);
        opacity: 0.5;
    }
    
    &__text {
        font-size: var(--task-font-sm);
    }
}
```

---

## 三、样式迁移指南

### 3.1 按钮类名迁移

| 旧类名 | 新类名 |
|--------|--------|
| .plugin-task-btn-primary | .plugin-task-btn--primary |
| .plugin-task-btn-outline | .plugin-task-btn--outline |
| .plugin-task-btn-ghost | .plugin-task-btn--ghost |
| .plugin-task-btn-sm | .plugin-task-btn--sm |
| .plugin-task-btn-lg | .plugin-task-btn--lg |
| .plugin-task-btn-icon | .plugin-task-btn--icon |
| .plugin-task-btn-loading | .plugin-task-btn--loading |
| .plugin-task-btn-disabled | .plugin-task-btn--disabled |

### 3.2 弹窗类名迁移

| 旧类名 | 新类名 |
|--------|--------|
| .plugin-task-dialog--small | .plugin-task-dialog--sm |
| .plugin-task-dialog--medium | .plugin-task-dialog--md |
| .plugin-task-dialog--large | .plugin-task-dialog--lg |

### 3.3 项目面板类名迁移

| 旧类名 | 新类名 |
|--------|--------|
| .project-item__content | 保持不变 |
| .project-item__info | .project-item__content |
| .project-item__counts | .project-item__meta |
| .project-category-tag | .project-item__tag |

---

## 四、实施步骤

### 第一阶段：变量系统完善
1. 在 _variables.scss 中新增布局、表格、列表、面板等变量
2. 确保所有新增变量都使用SiYuan主题变量作为基础

### 第二阶段：组件样式统一
1. 创建 _components.scss 文件
2. 实现表格、列表、卡片、输入框、标签等通用组件样式
3. 在 index.scss 中导入 _components.scss

### 第三阶段：按钮样式对齐
1. 更新 index.scss 中的按钮样式
2. 使用 BEM 命名规范（双横线表示修饰符）
3. 确保所有按钮变体都使用CSS变量

### 第四阶段：弹窗样式对齐
1. 更新 index.scss 中的弹窗样式
2. 统一使用 .plugin-task-dialog 作为基础类
3. 确保所有弹窗尺寸变体一致

### 第五阶段：项目面板简化
1. 重构 project-reminder.scss
2. 简化选择器层级
3. 统一使用CSS变量控制间距和边距

### 第六阶段：日历样式优化
1. 更新 _calendar.scss
2. 优化事件卡片和单元格样式
3. 确保日历样式与整体风格一致

---

## 五、验证清单

- [ ] 所有颜色都使用CSS变量，无硬编码颜色值
- [ ] 所有间距都使用 --task-space-* 变量
- [ ] 所有圆角都使用 --task-radius-* 变量
- [ ] 所有阴影都使用 --task-shadow-* 变量
- [ ] 所有字体大小都使用 --task-font-* 变量
- [ ] 所有边框颜色都使用 --task-border-* 变量
- [ ] 按钮样式在所有地方一致
- [ ] 弹窗样式在所有地方一致
- [ ] 项目面板样式简化且一致
- [ ] 日历样式优化完成
- [ ] 深色主题适配正常
- [ ] 移动端适配正常

---

## 六、注意事项

1. **不要修改颜色值**：只使用SiYuan主题变量，不修改实际颜色值
2. **可以修改边框颜色**：使用 --task-border-default 等变量
3. **保持向后兼容**：旧类名保留但标记为废弃
4. **测试深色主题**：所有修改都要在深色主题下测试
5. **测试移动端**：确保移动端显示正常
