# 代码风格和约定

## 架构模式
- **大部分组件是TypeScript类**，非Svelte
- 类组件模式: `constructor()`, `render()`, `destroy()`
- DOM操作通过 `document.createElement()`，非JSX/Svelte模板
- Svelte仅用于: SettingPanel, LoadingDialog, FilterManagement, Form, SelectDialog

## 命名约定
- 文件名: PascalCase (ProjectManager.ts, ProjectKanbanView.ts)
- 类名: PascalCase
- 接口名: PascalCase
- 方法/变量: camelCase
- 常量: UPPER_SNAKE_CASE

## TypeScript配置
- `strict: false` - 非严格模式
- `noUnusedLocals: true` - 未使用变量报错
- 路径别名: `@/` → `src/`

## 代码风格
- 单文件bundle (inlineDynamicImports: true)
- 注释多为中文（内部逻辑）
- i18n双语: en_US.json / zh_CN.json

## 数据存储约定
- 使用SiYuan API: `plugin.loadData()` / `saveData()`
- 禁止使用 localStorage
- Manager模式: 单例 + Map缓存 + 初始化标记
- 数据修改后异步保存

## 块绑定
- 使用块属性绑定任务: `custom-task-projectid`, `custom-bind-reminders`
- 通过SiYuan API设置/读取块属性