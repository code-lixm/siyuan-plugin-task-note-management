# Pinch UI 设计适配文档

## 1. 目标

本文档基于对 `pinch` 源码的直接核查，整理其 UI 框架、颜色系统、边框、圆角、阴影、控件封装与布局风格，并给出一份适配当前仓库 `siyuan-plugin-task-note-management` 的落地建议。

目标不是 1:1 复制 `pinch`，而是抽取其中适合当前插件的视觉语言与组件组织方式，形成一套可渐进接入的样式规范。

---

## 2. Pinch 的 UI 框架结构

### 2.1 技术栈

从 `pinch/package.json` 可确认：

- UI 框架：`Vue 3`
- 构建工具：`Vite 6`
- 样式方案：`SCSS + CSS Variables`
- 运行宿主：`SiYuan Plugin`
- 测试：`Vitest + @vue/test-utils + @testing-library/vue`

### 2.2 它并没有引入独立第三方 UI 组件库

`pinch` 的 UI 不是建立在 Element Plus、Naive UI、Vuetify 这一类完整组件库之上，而是采用：

- `Vue` 负责业务组件组织；
- `SiYuan` 自带的 `b3-*` 类名与主题变量负责基础控件皮肤；
- 项目内部用极薄封装统一接入宿主样式。

直接证据：

- `src/components/SiyuanTheme/SySelect.vue` 使用 `class="b3-select fn__flex-center"`
- `src/components/SiyuanTheme/SyInput.vue` 使用 `class="b3-text-field fn__flex-center"`
- `src/components/SiyuanTheme/SyTextarea.vue` 使用 `class="b3-text-field fn__block"`
- `src/components/SiyuanTheme/SyCheckbox.vue` 使用 `class="b3-switch fn__flex-center"`
- `src/components/SiyuanTheme/SyButton.vue` 仅是一个极薄按钮壳，不承担完整皮肤体系

### 2.3 对当前项目的启示

当前仓库是：

- `Svelte 4` 用于复杂设置与表单；
- 大多数弹窗/面板仍是 `TypeScript Class + DOM` 方式；
- 同样运行在 `SiYuan` 宿主中。

因此，最合适的迁移路径不是把 `pinch` 的 Vue 组件搬过来，而是借它的两层结构：

1. **宿主层**：继续复用 SiYuan 的 `--b3-*` 变量和基础控件样式；
2. **插件层**：在本项目新增一层自己的任务管理设计 token，用于统一颜色、圆角、阴影、间距和状态语义。

---

## 3. Pinch 的视觉基础：颜色、边框、圆角、阴影

## 3.1 颜色系统

### 3.1.1 全局色板来源

`pinch/src/index.scss` 在 `:root` 和 dark mode 下定义了两套 token：

- `--pinch-background1` ~ `--pinch-background10`
- `--pinch-color1` ~ `--pinch-color10`
- `--pinch-font-color1` ~ `--pinch-font-color10`
- `--pinch-group-color1` ~ `--pinch-group-color10`

这是一个 **10 组柔和彩色语义板**，而不是单一主色体系。

### 3.1.2 颜色风格特征

整体视觉不是高对比商务风，而是：

- 低饱和背景色
- 中等饱和强调色
- 清晰但不刺眼的文字色
- 在深色模式下保留同一语义映射，只调整亮度与对比

可提炼的代表色：

- 强调暖色：`#f98f7a`
- 成功绿：`#27ae60`
- 警告橙：`#f39c12`
- 危险红：`#e74c3c`

### 3.1.3 优先级语义映射

从已有分析与组件使用可归纳：

- 高优先级：第 10 组红色系
- 中优先级：第 3 组橙色系
- 低优先级：第 7 组蓝色系
- 无优先级：回退到 `--b3-list-hover` 或中性色表面

### 3.1.4 对当前项目的建议

当前仓库已经大量使用 `--b3-theme-*`、`--b3-border-color`、`--b3-point-shadow`。因此不建议照搬 `pinch` 的 10 组原始变量名，而应在 `src/index.scss` 中新增一层任务域 token，例如：

```scss
:root {
  --task-surface-soft: var(--b3-theme-surface);
  --task-surface-muted: var(--b3-theme-background);
  --task-border-default: var(--b3-border-color);
  --task-shadow-card: var(--b3-point-shadow, 0 1px 5px rgba(0, 0, 0, 0.08));

  --task-priority-high-bg: #fae5e5;
  --task-priority-high-text: #e03e3e;
  --task-priority-medium-bg: #fcede2;
  --task-priority-medium-text: #db7c1c;
  --task-priority-low-bg: #deebf1;
  --task-priority-low-text: #0b6e99;

  --task-accent-soft: #f98f7a;
}
```

这样做的优点：

- 与 SiYuan 主题兼容；
- 不把 `pinch` 的命名污染到本仓库；
- 便于在 `TS Dialog` 与 `Svelte` 两套 UI 中统一复用。

---

## 4. 边框与描边策略

### 4.1 Pinch 的边框特征

`pinch` 很少使用重边框，主打法是：

- 1px 轻描边 + 圆角
- 配合浅阴影建立层级
- 焦点态/选中态用 inset 或主题色描边强化

高频证据：

- `TaskGroupDialog.vue`：`border: 1px solid var(--b3-border-color)`
- `TaskScopeDialog.vue`：`border: 1px solid var(--b3-border-color)`
- `TaskDatePopover.vue`：`border: 1px solid var(--b3-theme-border)`
- `TaskContextMenu.vue`：`border: 1px solid var(--b3-border-color)`
- `PriorityPopover.vue`：`border: 1px solid var(--b3-border-color)`

强化态常见模式：

- `box-shadow: 0 0 0 1px #f98f7a inset`
- `box-shadow: 0 0 0 2px var(--b3-theme-primary)`
- `border: 2px dashed #3b82f6`（拖拽/占位状态）

### 4.2 可总结为三类边框角色

1. **容器边框**：`1px solid var(--b3-border-color)`
2. **焦点/选中边框**：主题色或强调色 inset/outline
3. **拖拽/占位边框**：虚线 + 冷色提示

### 4.3 对当前项目的建议

当前项目很多组件各自写边框，但规范还不够统一。建议在文档级先约束为：

- 默认容器：`1px solid var(--task-border-default)`
- 选中/激活：`box-shadow: 0 0 0 2px var(--b3-theme-primary)`
- 弱化输入框：只保留 `b3-text-field` 原生边框，不额外加重
- 拖拽或范围选择：`2px dashed rgba(59, 130, 246, 0.6)`

适用位置：

- `QuickReminderDialog.ts`
- `ProjectDialog.ts`
- `CategoryManageDialog.ts`
- `StatusManageDialog.ts`
- `ProjectKanbanView.ts`
- `CalendarView.ts`

---

## 5. 圆角体系

### 5.1 Pinch 的圆角不是单一值，而是分层使用

从多组件 grep 结果可以提炼出一套非常清晰的层级：

| 场景 | 常见值 | 说明 |
|------|--------|------|
| 微标签/小状态块 | `4px` | 标签、细粒度 chip、小输入块 |
| 普通按钮/输入 | `6px` / `8px` | 表单控件、普通操作按钮 |
| 卡片/浮层 | `10px` / `12px` / `14px` | 卡片、popover、小面板 |
| 强调卡片/胶囊面板 | `15px` / `16px` | 浮动卡片、重点块 |
| 主 CTA / 底部操作 | `20px` | 大按钮、底部主操作 |
| 抽屉/移动端底部弹层 | `24px 24px 0 0` | 底部上滑面板 |
| 胶囊/筛选器 | `999px` | capsule、pill、tag filter |

### 5.2 直接证据

- `HabitModal.vue`：`24px 24px 0 0`
- `TaskModal.vue`：`24px 24px 0 0`、`24px`
- `TaskGroupDialog.vue`：`14px`、`12px`、`8px`、`6px`、`20px`
- `TaskScopeDialog.vue`：`12px`、`20px`、`4px`
- `FloatingFocusCapsule.vue`：`999px`、`16px`、`14px`
- `PriorityPopover.vue`：`8px`、`6px`
- `TaskContextMenu.vue`：`8px`、`14px`、`6px`、`4px`

### 5.3 对当前项目的建议

当前仓库已经出现 `4px / 6px / 12px` 等值，但还缺少统一命名。建议定义：

```scss
:root {
  --task-radius-xs: 4px;
  --task-radius-sm: 6px;
  --task-radius-md: 8px;
  --task-radius-lg: 12px;
  --task-radius-xl: 16px;
  --task-radius-cta: 20px;
  --task-radius-sheet: 24px;
  --task-radius-pill: 999px;
}
```

映射规则：

- 小标签、优先级块、状态点：`xs`
- 输入、次按钮：`sm/md`
- 卡片、统计块、弹出层：`lg`
- 聚焦块、重点卡片：`xl`
- 主按钮：`cta`
- 底部抽屉：`sheet`
- 筛选 chip：`pill`

---

## 6. 阴影体系

### 6.1 Pinch 的阴影以轻量悬浮为主

Pinch 很少使用厚重投影，常见是三档：

1. **轻卡片阴影**
   - `0 1px 5px rgba(...)`
   - `var(--b3-point-shadow)`

2. **中层浮层阴影**
   - `0 4px 12px rgba(0, 0, 0, 0.15)`
   - `0 6px 16px rgba(0, 0, 0, 0.12~0.16)`

3. **强浮层阴影**
   - `0 10px 24px rgba(...)`
   - `0 12px 30px rgba(...)`
   - `0 14px 36px rgba(...)`

### 6.2 组件证据

- `TaskContextMenu.vue`：`0 4px 12px rgba(0, 0, 0, 0.15)`
- `PriorityPopover.vue`：`0 4px 12px rgba(0, 0, 0, 0.15)`
- `TaskFilterPopover.vue`：`0 10px 24px rgba(0, 0, 0, 0.16)`
- `TaskGroupDialog.vue`：`0 12px 30px rgba(0, 0, 0, 0.2)`
- `KanbanView.vue`：`0 14px 36px rgba(0, 0, 0, 0.2)`
- `HabitModal.vue` / `TaskModal.vue`：`0 -4px 12px rgba(0, 0, 0, 0.15)`

### 6.3 对当前项目的建议

当前项目已经使用 `--b3-point-shadow` 与 `--b3-dialog-shadow`，所以建议不要重造阴影体系，只补充一个插件层映射：

```scss
:root {
  --task-shadow-card: var(--b3-point-shadow, 0 1px 5px rgba(0, 0, 0, 0.08));
  --task-shadow-popover: 0 4px 12px rgba(0, 0, 0, 0.15);
  --task-shadow-panel: 0 10px 24px rgba(0, 0, 0, 0.16);
  --task-shadow-sheet: 0 -4px 12px rgba(0, 0, 0, 0.15);
}
```

这样能让：

- 面板卡片延续宿主风格；
- 弹层有统一的悬浮层级；
- 移动端/底部弹窗有独立语义。

---

## 7. 间距、字号与动效

## 7.1 间距

Pinch 的高频间距集中在：

- `4px`：微间距、icon 与文字贴合
- `6px`：chip / 小按钮内部 padding
- `8px`：默认 gap
- `12px`：模块内中等分隔
- `14px ~ 16px`：卡片、面板内部主要留白
- `20px+`：对话框主体 padding

当前仓库 `src/index.scss` 中已有大量 `6 / 8 / 12 / 20` 的使用，这与 `pinch` 非常接近，因此迁移成本低。

建议统一定义：

```scss
:root {
  --task-space-1: 4px;
  --task-space-2: 6px;
  --task-space-3: 8px;
  --task-space-4: 12px;
  --task-space-5: 16px;
  --task-space-6: 20px;
}
```

## 7.2 字号

Pinch 的可观察层级：

- `10px ~ 12px`：辅助文本、角标、状态说明
- `13px`：次级说明、标签标题
- `14px`：正文主字号
- `16px ~ 18px`：标题、模块头部、强调信息

### 适配建议

本项目建议维持：

- 正文默认：`14px`
- 次级说明：`12px` / `13px`
- 模块标题：`16px`
- 大标题不超过 `18px`

这样更符合思源面板式插件的阅读密度，不会显得像网页后台。

## 7.3 动效

Pinch 的典型动效：

- 常规 hover/focus：`0.2s ease`
- 面板/视图切换：`0.3s ease`
- 滑入面板：`0.3s cubic-bezier(0.4, 0, 0.2, 1)`

当前项目 `src/index.scss` 也已大量使用 `0.2s ease` 与 `0.3s ease`，说明两者风格天然兼容。

建议后续统一到：

```scss
:root {
  --task-motion-fast: 0.2s ease;
  --task-motion-normal: 0.3s ease;
  --task-motion-slide: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 8. 图标与控件封装模式

## 8.1 图标系统

`pinch/src/components/Icon.vue` 说明它采用：

- 内联 SVG 字典
- `viewBox + path` 配置式定义
- 大量 `fill="currentColor"`
- 少数品牌图标使用固定色

这代表它的图标系统核心思想是：**图标跟随文本色，而不是每个图标单独指定颜色**。

### 适配建议

当前项目继续优先使用 SiYuan 图标系统即可，但新增图标时建议遵循 `currentColor` 规则，这样：

- 深浅主题自动适配；
- 按钮 hover/选中态自动联动；
- 不需要到处写硬编码颜色。

## 8.2 控件封装思路

Pinch 的 `SiyuanTheme/*` 组件说明了一件事：

> 它的组件封装重点不是重新设计控件，而是把业务组件与 SiYuan 宿主控件做一层稳定适配。

这对当前仓库尤其重要，因为本仓库同时存在：

- `Svelte` 表单组件；
- `TS class` 手写 DOM 表单；
- 大量直接使用 `b3-button` / `b3-text-field` 的老代码。

因此更推荐在当前项目建立“样式约定”而不是立刻做完整组件重写。

---

## 9. 针对当前仓库的落地方案

## 9.1 适配原则

1. **不迁移 Vue 组件**
2. **不引入新 UI 框架**
3. **继续依赖 SiYuan 原生主题变量**
4. **在 `src/index.scss` 增加插件级 token**
5. **优先改造高频组件，而不是全局同时重做**

## 9.2 推荐优先落地位置

### 第一批：高频弹窗和任务操作入口

- `src/components/QuickReminderDialog.ts`
- `src/components/ProjectDialog.ts`
- `src/components/CategoryManageDialog.ts`
- `src/components/StatusManageDialog.ts`
- `src/components/RepeatSettingsDialog.ts`

这些组件最适合先引入：

- 新圆角 token
- 新边框/阴影 token
- 统一按钮尺寸和 chip 样式

### 第二批：高密度视图

- `src/components/ProjectKanbanView.ts`
- `src/components/CalendarView.ts`
- `src/components/ReminderPanel.ts`
- `src/components/HabitPanel.ts`

这些视图更适合借鉴 `pinch` 的：

- 柔和彩色状态块
- 胶囊筛选器
- 轻卡片阴影
- 14px 正文为中心的排版密度

### 第三批：Svelte 设置与表单页

- `src/SettingPanel.svelte`
- `src/components/FilterManagement.svelte`
- `src/components/icsSubscriptionPanel.svelte`

这里建议把 token 真正变成共享样式规范，避免 Svelte 与 TS Dialog 各写一套。

---

## 10. 推荐的适配 Token 草案

建议在当前仓库后续增补如下 token：

```scss
:root {
  --task-accent-soft: #f98f7a;
  --task-success: #27ae60;
  --task-warning: #f39c12;
  --task-danger: #e74c3c;

  --task-priority-high-bg: #fae5e5;
  --task-priority-high-text: #e03e3e;
  --task-priority-medium-bg: #fcede2;
  --task-priority-medium-text: #db7c1c;
  --task-priority-low-bg: #deebf1;
  --task-priority-low-text: #0b6e99;

  --task-border-default: var(--b3-border-color);
  --task-border-focus: var(--b3-theme-primary);

  --task-radius-xs: 4px;
  --task-radius-sm: 6px;
  --task-radius-md: 8px;
  --task-radius-lg: 12px;
  --task-radius-xl: 16px;
  --task-radius-cta: 20px;
  --task-radius-sheet: 24px;
  --task-radius-pill: 999px;

  --task-shadow-card: var(--b3-point-shadow, 0 1px 5px rgba(0, 0, 0, 0.08));
  --task-shadow-popover: 0 4px 12px rgba(0, 0, 0, 0.15);
  --task-shadow-panel: 0 10px 24px rgba(0, 0, 0, 0.16);
  --task-shadow-sheet: 0 -4px 12px rgba(0, 0, 0, 0.15);

  --task-space-1: 4px;
  --task-space-2: 6px;
  --task-space-3: 8px;
  --task-space-4: 12px;
  --task-space-5: 16px;
  --task-space-6: 20px;

  --task-font-xs: 12px;
  --task-font-sm: 13px;
  --task-font-md: 14px;
  --task-font-lg: 16px;
  --task-font-xl: 18px;

  --task-motion-fast: 0.2s ease;
  --task-motion-normal: 0.3s ease;
  --task-motion-slide: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 11. 最终结论

Pinch 值得借鉴的不是某个 Vue 组件本身，而是下面这套组合：

- **框架策略**：业务层自定义，宿主层复用 SiYuan 样式系统；
- **视觉语言**：柔和粉彩 accent、轻阴影、高圆角、低压迫感；
- **组件风格**：轻边框 + 浮层阴影 + capsule 筛选器；
- **状态表达**：优先级和分类通过语义色块表达，而不是靠大量文字；
- **适配方法**：把这些沉淀为当前项目自己的 token，而不是复制 `pinch` 的 Vue 实现。

对 `siyuan-plugin-task-note-management` 来说，最合理的做法是：

1. 在 `src/index.scss` 建立统一 token；
2. 先改造高频任务弹窗与项目视图；
3. 再把相同规则推广到 `Svelte` 设置页和复杂视图；
4. 最终形成一套适合本仓库混合架构的任务 UI 设计规范。
