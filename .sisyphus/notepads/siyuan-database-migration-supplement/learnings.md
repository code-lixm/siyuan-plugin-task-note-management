## 2026-03-09

- `SiYuanDatabaseManager` 基础层可直接用 `fetch` 访问 `/api/av/*`，保持和设计补充文档中的 payload 一致：`getAttributeView` 用 `{ id }`，`setAttributeViewBlockAttr` 用 `{ avID, keyID, itemID, value }`。
- 统一重试逻辑可封装在 `requestWithRetry`，指数退避按 1s/2s/4s 实现，重试次数以 `DatabaseConfig.retryCount` 驱动（默认 3）。
- `src/types/database.ts` 中的 `DatabaseOperationError` 与 `SiYuanCellValue` 已覆盖基础错误包装和单元格值类型，能直接用于基础 manager 层。
- 新增 `MigrationExecutor` 时，`SiYuanDatabaseManager` 当前未导出单例常量，需通过 `SiYuanDatabaseManager.getInstance()` 获取实例。
- 项目已有模式是以 `(manager as any).saveProjects` 做能力探测，迁移执行器沿用该模式可兼容未完成实现阶段。

- 新增 `DataMigrationWizard` 时，采用现有组件的 `Dialog + innerHTML + bindEvents` 结构更易与当前代码风格保持一致。
- 迁移执行入口可通过能力探测同时兼容 `migrationExecutor.executeMigration()` 与 `migrationExecutor.execute()`，降低对执行器实现细节的耦合。
- 验证展示、进度展示、结果展示拆分成独立渲染方法（`renderValidationResult` / `updateProgress` / `updateResultSection`）后，状态切换更清晰。
