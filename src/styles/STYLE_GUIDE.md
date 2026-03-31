# 插件样式规范 / Style Specification

**版本:** 1.0  
**更新:** 2026-03-31  
**基于:** Pinch设计语言 + SiYuan主题系统

---

## 1. 设计原则

### 1.1 Pinch核心哲学
- **黑白极简**: 优先使用中性色(`neutral`)和透明度变化
- **优先级层次**: 用`opacity`表示，不使用彩色边框或背景
- **如羽毛般不扰人**: 阴影和边框极轻，不抢夺视觉焦点
- **无装饰性渐变**: UI元素不使用`color-mix()`、`saturate()`或装饰性渐变

### 1.2 颜色系统

| 用途 | 变量 | 说明 |
|------|------|------|
| 成功/完成 | `var(--b3-theme-success)` | 仅用于真正的成功状态 |
| 警告 | `var(--b3-theme-warning)` | 仅用于警告 |
| 错误 | `var(--b3-theme-error)` | 仅用于错误/过期 |
| 强调 | `var(--b3-theme-primary)` | 交互元素 |
| 表面色 | `var(--b3-theme-*)` | 背景、边框等 |
| **禁止** | 硬编码彩色值 | 如`#e74c3c`、`rgba(231,76,60,x)`用于优先级 |

### 1.3 优先级表示法

```scss
// ✅ 正确：使用opacity灰度层级
.task-priority-high   { opacity: 0.85; }
.task-priority-medium { opacity: 0.70; }
.task-priority-low    { opacity: 0.55; }
.task-priority-none   { opacity: 0.40; }

// ❌ 错误：使用彩色边框
.task-priority-high   { border-left: 3px solid #e74c3c; }
```

### 1.4 阴影层级

```scss
--task-shadow-card:    rgba(0, 0, 0, 0.06) 0 1px 5px;    // 卡片
--task-shadow-hover:  rgba(0, 0, 0, 0.09) 0 2px 8px;     // 悬停
--task-shadow-popover: rgba(0, 0, 0, 0.10) 0 4px 12px;  // 弹出层
--task-shadow-panel:  rgba(0, 0, 0, 0.12) 0 8px 20px;    // 面板
```

---

## 2. 文件结构

### 2.1 目录组织

```
src/
├── index.scss           # 主入口，导入所有样式
├── styles/
│   ├── _variables.scss  # ✅ 设计令牌 (CSS自定义属性)
│   ├── _mixins.scss     # ✅ 可复用mixin
│   ├── _base.scss       # ✅ 重置和基础样式
│   ├── _dialogs.scss    # ✅ Dialog通用样式
│   ├── _calendar.scss   # FullCalendar定制
│   ├── habit-calendar.scss
│   ├── pomodoroTimer.scss
│   ├── pomodoroStats.scss
│   ├── project-reminder.scss
│   └── doc-reminder.scss
└── components/
    └── [Svelte组件]     # 组件内联样式或scoped样式
```

### 2.2 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| SCSSpartial | 下划线前缀 | `_variables.scss`, `_mixins.scss` |
| CSS类 | BEM / 连字符 | `.task-card`, `.reminder-item__title` |
| CSS变量 | 双破折号前缀 | `--task-shadow-card` |
| 组件样式 | BEM变体 | `.reminder-item--overdue` |

---

## 3. CSS变量 (Design Tokens)

### 3.1 在`styles/_variables.scss`中定义

```scss
:root {
  // === 表面色 ===
  --task-surface-muted:    var(--b3-theme-background);
  --task-surface-soft:     var(--b3-theme-surface);
  --task-surface-elevated:  var(--b3-theme-surface-lighter);
  --task-surface-hover:     var(--b3-list-hover);
  --task-border-default:    var(--b3-border-color);
  --task-border-focus:      var(--b3-theme-primary);

  // === 优先级透明度 ===
  --task-priority-high-opacity:    0.85;
  --task-priority-medium-opacity:  0.70;
  --task-priority-low-opacity:     0.55;
  --task-priority-none-opacity:    0.40;

  // === 圆角 ===
  --task-radius-xs:   4px;
  --task-radius-sm:   6px;
  --task-radius-md:   8px;
  --task-radius-lg:   10px;
  --task-radius-xl:   15px;
  --task-radius-cta:  20px;
  --task-radius-sheet: 24px;
  --task-radius-pill:  999px;

  // === 阴影 ===
  --task-shadow-card:    rgba(0, 0, 0, 0.06) 0 1px 5px;
  --task-shadow-hover:    rgba(0, 0, 0, 0.09) 0 2px 8px;
  --task-shadow-popover: rgba(0, 0, 0, 0.10) 0 4px 12px;
  --task-shadow-panel:    rgba(0, 0, 0, 0.12) 0 8px 20px;
  --task-shadow-sheet:    rgba(0, 0, 0, 0.10) 0 -4px 12px;

  // === 间距 ===
  --task-space-1:   4px;
  --task-space-2:   6px;
  --task-space-3:   8px;
  --task-space-4:   12px;
  --task-space-5:   16px;
  --task-space-6:   20px;

  // === 字号 ===
  --task-font-xs:   12px;
  --task-font-sm:   13px;
  --task-font-md:   14px;
  --task-font-lg:   16px;
  --task-font-xl:   18px;

  // === 动效 ===
  --task-motion-fast:   0.2s ease;
  --task-motion-normal: 0.3s ease;
  --task-motion-slide:  0.3s cubic-bezier(0.4, 0, 0.2, 1);

  // === 文字透明度 ===
  --task-text-secondary: 0.6;
  --task-text-disabled:  0.35;
  --task-text-active:     0.9;
}
```

---

## 4. Mixins

### 4.1 在`styles/_mixins.scss`中定义

```scss
// === 卡片基础样式 ===
@mixin card-base {
  background: var(--task-surface-soft);
  border: 1px solid var(--task-border-default);
  border-radius: var(--task-radius-md);
  transition: box-shadow var(--task-motion-fast);
  
  &:hover {
    box-shadow: var(--task-shadow-hover);
  }
}

// === 优先级容器 ===
@mixin priority-container($opacity: 0.85) {
  opacity: $opacity;
  
  .item__note {
    opacity: $opacity;
    border: 1px solid var(--task-border-default);
  }
}

// === 按钮基础 ===
@mixin button-base {
  border-radius: var(--task-radius-sm);
  transition: all var(--task-motion-fast);
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--task-shadow-hover);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
}

// === 对话框内容区 ===
@mixin dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--task-space-6);
  max-height: 90vh;
  background: var(--task-surface-muted);
}

// === 响应式断点 ===
@mixin mobile {
  @media (max-width: 480px) { @content; }
}

@mixin tablet {
  @media (max-width: 768px) { @content; }
}
```

---

## 5. 样式规则

### 5.1 优先级样式

```scss
// ✅ 正确：使用opacity + 透明度变量
.priority-high   { opacity: var(--task-priority-high-opacity); }
.priority-medium { opacity: var(--task-priority-medium-opacity); }
.priority-low    { opacity: var(--task-priority-low-opacity); }
.priority-none   { opacity: var(--task-priority-none-opacity); }

// ✅ 优先级标签
.priority-label {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
  
  &.high   { background: rgba(0,0,0,0.06); opacity: 0.85; }
  &.medium { background: rgba(0,0,0,0.05); opacity: 0.70; }
  &.low    { background: rgba(0,0,0,0.04); opacity: 0.55; }
}
```

### 5.2 边框和分隔线

```scss
// ✅ 正确：使用中性边框
.item {
  border: 1px solid var(--task-border-default);
  
  &--active {
    border-left: 2px solid var(--task-border-default);
  }
}

// ❌ 错误：硬编码彩色边框
.item--urgent { border-left: 3px solid #e74c3c; }
```

### 5.3 悬停状态

```scss
// ✅ 正确：使用阴影变化
.card {
  &:hover {
    box-shadow: var(--task-shadow-hover);
    transform: translateY(-1px);
  }
}

// ❌ 错误：使用彩色边框hover
.card:hover { border-color: #3498db; }
```

### 5.4 状态变化

```scss
// ✅ 正确：降低透明度表示完成
.completed {
  opacity: 0.6;
  // 不使用删除线，复选框已足够
}

// ✅ 过期状态：使用SiYuan错误变量
.overdue {
  border-color: var(--b3-theme-error-light);
  background: var(--b3-theme-error-lighter);
}
```

---

## 6. 禁止的模式

| 禁止 | 替代方案 |
|------|----------|
| 硬编码彩色值 (`#e74c3c`, `rgba(231,76,60,x)`) | SiYuan变量或`rgba(0,0,0,x)` |
| 优先级彩色边框 | opacity灰度层级 |
| 装饰性渐变 | 无渐变，纯色表面 |
| `color-mix()` | 不使用 |
| `saturate()` | 不使用 |

---

## 7. Svelte组件样式

组件样式使用scoped CSS或class名称遵循BEM规范：

```svelte
<div class="reminder-item reminder-item--overdue">
  <span class="reminder-item__title">{title}</span>
</div>

<style>
.reminder-item {
  &--overdue {
    border-color: var(--b3-theme-error-light);
  }
  
  &__title {
    font-weight: 500;
  }
}
</style>
```

---

## 8. 迁移检查清单

- [ ] 所有硬编码彩色值 → SiYuan变量或rgba(0,0,0,x)
- [ ] 所有优先级边框 → opacity灰度
- [ ] 所有硬编码阴影 → 使用`--task-shadow-*`变量
- [ ] 所有硬编码圆角 → 使用`--task-radius-*`变量
- [ ] 所有硬编码间距 → 使用`--task-space-*`变量
- [ ] 组件样式迁移到规范的文件结构
