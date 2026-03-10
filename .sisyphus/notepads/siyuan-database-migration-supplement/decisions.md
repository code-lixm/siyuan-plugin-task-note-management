## 2026-03-09

- 新建 `src/utils/siYuanDatabaseManager.ts` 采用与现有 manager 一致的单例模式：私有构造 + `static getInstance()`。
- `initialize()` 仅在首次调用时完成配置合并与连通性探测，避免重复初始化带来的额外 API 请求。
- 基础 API 层采用严格类型：避免 `any`，请求/响应使用 `Record<string, unknown>` 和泛型 `SiYuanApiResponse<T>`。
- 失败路径统一抛出 `DatabaseOperationError`，并保留 `operation` 与 `originalError` 便于上层降级处理。

- `DataMigrationWizard` 保持依赖注入：构造时传入 `migrationValidator` 与 `migrationExecutor`，默认使用 `new MigrationValidator()`，避免在组件内耦合迁移实现。
- 迁移执行按钮状态采用集中控制（`updateButtonsState`），确保“验证失败不可启动、迁移中不可关闭、有结果才可查看报告”。
- 新建 `src/utils/migrationExecutor.ts` 采用“先备份、再迁移、失败即回滚”的事务化流程，优先保障 `project.json` 可恢复性。
- `rollback()` 额外清空并持久化 `id-mapping.json`，避免迁移失败后残留错误映射。
