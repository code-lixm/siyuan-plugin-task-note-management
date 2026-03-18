# React + shadcn Refactor Plan

## 概述
将 SiYuan 插件从 TypeScript + Svelte 架构迁移到 React 18 + TypeScript + shadcn/ui + Tailwind CSS，同时保持与 SiYuan 的完整通信能力。

## 目标架构

### 核心原则
1. **React 函数组件** - 替代 TS Class 组件
2. **shadcn/ui 组件库** - 替代原生 DOM/Svelte UI
3. **React Hooks** - 管理状态和副作用
4. **Bridge Pattern** - React 与 SiYuan API 的适配层
5. **单文件打包** - 保持 `inlineDynamicImports: true`

## 新目录结构

```
src/
├── index.tsx                    # 插件入口 (React root)
├── api.ts                       # SiYuan API 层 (保持不变)
├── pluginInstance.ts            # 全局插件实例
│
├── bridge/                      # React-SiYuan Bridge
│   ├── SiYuanContext.tsx        # React Context 提供 plugin 实例
│   ├── useSiYuan.ts             # Hook: 访问 SiYuan API
│   └── mountReact.tsx           # React 挂载到 DOM 工具
│
├── hooks/                       # 自定义 React Hooks
│   ├── useReminders.ts          # 提醒数据管理
│   ├── useProjects.ts           # 项目数据管理
│   ├── useHabits.ts             # 习惯数据管理
│   ├── useSettings.ts           # 设置管理
│   └── useSiYuanData.ts         # 通用数据加载/保存
│
├── components/                  # React 组件
│   ├── ui/                      # shadcn/ui 组件
│   ├── layout/
│   │   ├── ReminderPanel.tsx    # 主面板 (替代 ReminderPanel.ts)
│   │   ├── ProjectPanel.tsx     # 项目面板
│   │   └── HabitPanel.tsx       # 习惯面板
│   ├── dialogs/
│   │   ├── QuickReminderDialog.tsx
│   │   ├── BatchReminderDialog.tsx
│   │   └── ...
│   ├── views/
│   │   ├── CalendarView.tsx     # 日历视图
│   │   ├── KanbanView.tsx       # 看板视图
│   │   └── MatrixView.tsx       # 四象限视图
│   └── shared/
│       ├── ReminderCard.tsx
│       ├── ProjectCard.tsx
│       └── ...
│
├── stores/                      # 状态管理 (Zustand)
│   ├── useReminderStore.ts
│   ├── useProjectStore.ts
│   └── useHabitStore.ts
│
├── types/                       # TypeScript 类型
│   ├── index.d.ts
│   ├── reminder.ts
│   └── api.d.ts
│
├── utils/                       # 工具函数
│   ├── dateUtils.ts
│   ├── categoryManager.ts
│   └── ...
│
├── styles/
│   ├── globals.css              # Tailwind + 全局样式
│   └── components.css           # 组件特定样式
│
└── lib/                         # shadcn 工具
    └── utils.ts                 # cn() 函数
```

## 阶段 1: 基础设施 (最高优先级)

### 任务 1.1: 更新 package.json
- **Scope**: 添加 React、shadcn 依赖
- **Category**: quick
- **Dependencies**: 无

**添加依赖:**
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.5",
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-dropdown-menu": "^2.1.1",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.2",
    "lucide-react": "^0.446.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.10",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.2",
    "tailwindcss": "^3.4.13",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47"
  }
}
```

### 任务 1.2: 配置 Vite + React
- **Scope**: `vite.config.ts`
- **Category**: quick
- **Dependencies**: 1.1

**修改:**
```typescript
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),  // 替代 svelte
    // ...
  ],
  build: {
    // 保持现有配置 (inlineDynamicImports, cjs)
  }
});
```

### 任务 1.3: 初始化 Tailwind CSS + shadcn
- **Scope**: 创建配置文件
- **Category**: quick
- **Dependencies**: 1.1, 1.2

**文件:**
- `tailwind.config.js` - 主题配置
- `postcss.config.js` - PostCSS 配置
- `src/styles/globals.css` - Tailwind 指令 + CSS 变量
- `components.json` - shadcn 配置

### 任务 1.4: 创建 Bridge 层
- **Scope**: `src/bridge/`
- **Category**: deep
- **Dependencies**: 1.3

**核心设计:**
```typescript
// SiYuanContext.tsx
export const SiYuanContext = createContext<SiYuanContextType>(null!);
export function SiYuanProvider({ plugin, children }) {
  return <SiYuanContext.Provider value={{ plugin }}>{children}</SiYuanContext.Provider>;
}

// useSiYuan.ts
export function useSiYuan() {
  const { plugin } = useContext(SiYuanContext);
  return {
    plugin,
    showMessage: (msg) => showMessage(msg),
    // ... 其他 API 包装
  };
}

// mountReact.tsx
export function mountReact(container: HTMLElement, Component: React.ComponentType, props) {
  const root = createRoot(container);
  root.render(<SiYuanProvider plugin={props.plugin}><Component {...props} /></SiYuanProvider>);
  return { destroy: () => root.unmount() };
}
```

## 阶段 2: 数据层 (高优先级)

### 任务 2.1: 创建 Zustand Stores
- **Scope**: `src/stores/`
- **Category**: deep
- **Dependencies**: 1.4

**Store 结构:**
```typescript
// useReminderStore.ts
interface ReminderState {
  reminders: Reminder[];
  isLoading: boolean;
  loadReminders: () => Promise<void>;
  addReminder: (data) => Promise<void>;
  updateReminder: (id, data) => Promise<void>;
  deleteReminder: (id) => Promise<void>;
}
```

### 任务 2.2: 创建 Data Hooks
- **Scope**: `src/hooks/`
- **Category**: deep
- **Dependencies**: 2.1

**Hooks:**
- `useReminders()` - 管理提醒数据
- `useProjects()` - 管理项目数据
- `useHabits()` - 管理习惯数据
- `useSettings()` - 管理设置

## 阶段 3: UI 组件 (中优先级)

### 任务 3.1: 安装 shadcn/ui 基础组件
- **Scope**: `src/components/ui/`
- **Category**: quick
- **Dependencies**: 1.3

**需要组件:**
- button, card, dialog, dropdown-menu
- input, select, textarea, checkbox
- tabs, badge, tooltip, scroll-area
- calendar, popover, separator

### 任务 3.2: 重构 ReminderPanel
- **Scope**: `src/components/layout/ReminderPanel.tsx`
- **Category**: visual-engineering
- **Skills**: frontend-ui-ux
- **Dependencies**: 3.1, 2.2

**重构策略:**
1. 将 TS Class 转换为 React 函数组件
2. 使用 shadcn/ui 的 Card、Tabs、Button、Input
3. 用 Zustand store 替代本地 state
4. 保留拖放、分页、多选功能

### 任务 3.3: 重构 Dialog 组件
- **Scope**: `src/components/dialogs/`
- **Category**: visual-engineering
- **Skills**: frontend-ui-ux
- **Dependencies**: 3.1, 2.2

**对话框列表:**
- QuickReminderDialog
- BatchReminderDialog
- BlockBindingDialog
- CategoryManageDialog
- etc.

### 任务 3.4: 重构视图组件
- **Scope**: `src/components/views/`
- **Category**: visual-engineering
- **Dependencies**: 3.1

**视图:**
- CalendarView (FullCalendar React wrapper)
- KanbanView (ProjectKanbanView 重构)
- MatrixView (EisenhowerMatrixView 重构)

### 任务 3.5: 重构入口 index.ts → index.tsx
- **Scope**: `src/index.tsx`
- **Category**: deep
- **Dependencies**: 3.2, 3.3, 3.4

**修改:**
- 改为 .tsx 扩展名
- 使用 React 挂载组件到 dock/tab 容器
- 保留插件生命周期方法

## 构建配置关键保留项

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    lib: {
      entry: "src/index.tsx",  // 改为 .tsx
      formats: ["cjs"],
      fileName: () => "index.js"
    },
    rollupOptions: {
      external: ["siyuan", /^node:/, "process"],
      output: {
        inlineDynamicImports: true,  // CRITICAL: 必须保留
        exports: "default"
      }
    }
  }
});
```

## 风险缓解

| 风险 | 缓解策略 |
|------|----------|
| 单文件打包失败 | 确保 inlineDynamicImports: true，测试构建输出 |
| React 与 SiYuan DOM 冲突 | 使用 createRoot 在独立容器中挂载，避免直接操作 SiYuan DOM |
| CSS 冲突 | 使用 Tailwind 的 prefix 或 CSS-in-JS 隔离 |
| 性能问题 | 使用 React.memo、useMemo 优化大数据列表 |
| 类型错误 | 渐进式迁移，保持 strict: false |

## 测试检查清单

- [ ] `npm run build` 成功，输出单个 index.js
- [ ] 插件在 SiYuan 中正常加载
- [ ] 所有主要功能正常工作
- [ ] 没有控制台错误
- [ ] UI 样式正确显示
