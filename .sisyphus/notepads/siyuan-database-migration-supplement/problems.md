## 2026-03-09

- 仓库当前全量 TS 检查未通过，导致“项目级 `npx tsc --noEmit` 绿灯”无法在本任务范围内达成。
- 后续若需要严格满足该门禁，需先由专门任务清理现有组件中的历史类型错误，再回归验证数据库迁移链路。

- 当前仓库尚未发现统一的 `migrationExecutor` 实现文件；本次组件通过接口与能力探测（`executeMigration`/`execute`）适配，后续仍需在调用侧注入真实执行器。
- `SiYuanDatabaseManager.saveProjects/getAllProjects` 仍通过动态方法探测调用，待数据库写入能力正式落地后应改为强类型接口。
