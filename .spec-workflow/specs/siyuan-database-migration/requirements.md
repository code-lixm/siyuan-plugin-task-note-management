# Requirements Document: SiYuan Database Migration

## Introduction

本Spec定义将任务管理插件从独立JSON文件存储迁移到SiYuan本地数据库(Attribute View)的完整方案。

**当前痛点：**
- 数据存储在11个独立的JSON文件中，缺乏可视化能力
- 用户无法直接查看和编辑底层数据
- 无法利用SiYuan原生的筛选、排序、关联功能
- 数据与笔记内容割裂，难以形成知识联动

**目标价值：**
- 利用SiYuan数据库原生的表格/看板/日历视图
- 实现数据与笔记块的双向关联
- 支持多设备同步和协作（SiYuan原生支持）
- 提供更直观的数据管理和可视化能力

## Alignment with Product Vision

本项目符合SiYuan插件生态的发展方向：
- **数据本地化**：与SiYuan核心数据存储深度融合
- **可视化增强**：利用原生Attribute View的多视图能力
- **知识联动**：通过Relation字段关联项目和笔记块
- **长期可维护**：跟随SiYuan核心功能迭代

## Requirements

### Requirement 1: 项目管理数据库

**User Story:** 作为用户，我希望项目数据存储在SiYuan数据库中，以便在笔记中直接查看和管理项目。

#### Acceptance Criteria

1. **WHEN** 插件初始化 **THEN** 系统 **SHALL** 检查是否存在项目管理数据库，如不存在则自动创建
2. **WHEN** 用户创建项目 **THEN** 系统 **SHALL** 在数据库中插入新行，并返回项目ID
3. **WHEN** 用户更新项目 **THEN** 系统 **SHALL** 通过API更新对应数据库行的单元格
4. **WHEN** 用户删除项目 **THEN** 系统 **SHALL** 从数据库中移除对应行
5. **IF** 数据库被外部修改 **THEN** 系统 **SHALL** 在下一次读取时同步到内存缓存
6. **WHEN** 项目数据加载 **THEN** 系统 **SHALL** 优先从数据库读取，如失败则回退到JSON文件

**数据库列要求：**
- 项目名称 (text)
- 项目状态 (mSelect: 进行中/短期/长期/已完成)
- 优先级 (mSelect: 高/中/低/无)
- 项目颜色 (text: 颜色代码)
- 看板模式 (mSelect: 状态模式/自定义分组/列表模式)
- 开始日期 (date)
- 创建时间 (date)

### Requirement 2: 分组管理数据库

**User Story:** 作为用户，我希望项目分组也存储在数据库中，并能与项目关联，以实现更灵活的看板组织。

#### Acceptance Criteria

1. **WHEN** 用户创建分组 **THEN** 系统 **SHALL** 在分组数据库中插入新行，包含名称、颜色、排序
2. **WHEN** 分组分配给项目 **THEN** 系统 **SHALL** 更新项目的"当前分组"字段
3. **WHEN** 用户拖拽调整分组顺序 **THEN** 系统 **SHALL** 批量更新分组数据库的sort字段
4. **IF** 分组包含里程碑 **THEN** 系统 **SHALL** 在里程碑数据库中建立关联

**数据库列要求：**
- 分组名称 (text)
- 关联项目 (relation → 项目管理数据库)
- 分组颜色 (text)
- 分组图标 (text)
- 排序 (number)
- 归档状态 (checkbox)

### Requirement 3: 里程碑管理数据库

**User Story:** 作为用户，我希望里程碑数据也存储在数据库中，以便追踪项目关键节点。

#### Acceptance Criteria

1. **WHEN** 用户为项目/分组创建里程碑 **THEN** 系统 **SHALL** 在里程碑数据库中插入行
2. **WHEN** 里程碑开始/结束时间更新 **THEN** 系统 **SHALL** 同步更新数据库对应日期字段
3. **WHEN** 用户查看项目详情 **THEN** 系统 **SHALL** 查询并展示关联的里程碑
4. **IF** 里程碑关联了SiYuan块 **THEN** 系统 **SHALL** 存储块ID以便快速跳转

**数据库列要求：**
- 里程碑名称 (text)
- 关联项目 (relation → 项目管理数据库)
- 关联分组 (relation → 分组管理数据库)
- 开始时间 (date)
- 结束时间 (date)
- 关联块ID (text)
- 图标 (text)
- 归档状态 (checkbox)

### Requirement 4: 数据迁移与兼容性

**User Story:** 作为现有用户，我希望现有数据能平滑迁移到新系统，且可以随时回滚。

#### Acceptance Criteria

1. **WHEN** 插件首次启用数据库功能 **THEN** 系统 **SHALL** 提供数据迁移向导
2. **WHEN** 迁移执行 **THEN** 系统 **SHALL** 保留原始JSON文件作为备份
3. **WHEN** 迁移过程中断 **THEN** 系统 **SHALL** 支持断点续传或完整回滚
4. **IF** 数据库访问失败 **THEN** 系统 **SHALL** 自动降级使用JSON文件
5. **WHEN** 用户手动触发回滚 **THEN** 系统 **SHALL** 从JSON备份恢复数据
6. **WHEN** 数据库和JSON数据不一致 **THEN** 系统 **SHALL** 提示用户选择主数据源

### Requirement 5: 看板与数据库同步

**User Story:** 作为用户，我希望在插件看板中的操作能实时同步到SiYuan数据库。

#### Acceptance Criteria

1. **WHEN** 用户在项目看板中拖拽项目到不同状态列 **THEN** 系统 **SHALL** 更新数据库中的项目状态
2. **WHEN** 用户在自定义分组看板中移动项目 **THEN** 系统 **SHALL** 更新项目的分组关联
3. **WHEN** 用户在数据库视图中修改项目 **THEN** 系统 **SHALL** 在下次加载时同步到插件
4. **IF** 数据库外部修改与插件本地修改冲突 **THEN** 系统 **SHALL** 提示用户解决冲突
5. **WHEN** 批量更新（如拖拽排序） **THEN** 系统 **SHALL** 使用批量API减少请求次数

### Requirement 6: API封装层

**User Story:** 作为开发者，我希望有统一的API封装层来处理所有数据库操作。

#### Acceptance Criteria

1. **WHEN** 数据库API调用 **THEN** 系统 **SHALL** 通过统一的SiYuanDatabaseManager处理
2. **WHEN** API调用失败 **THEN** 系统 **SHALL** 自动重试（最多3次）并记录错误日志
3. **WHEN** 频繁的数据库操作 **THEN** 系统 **SHALL** 合并为批量请求
4. **WHEN** 网络不可用 **THEN** 系统 **SHALL** 缓存操作并在恢复后批量执行
5. **WHEN** API响应返回 **THEN** 系统 **SHALL** 统一处理错误码并转换为业务异常

## Non-Functional Requirements

### Code Architecture and Modularity

- **封装原则**: 所有数据库操作必须通过 `SiYuanDatabaseManager` 类，禁止直接调用fetch
- **双模式支持**: 系统必须同时支持JSON和数据库两种存储模式，可配置切换
- **向后兼容**: 保留现有Manager类接口，内部实现改为调用DatabaseManager
- **依赖隔离**: DatabaseManager不应依赖UI组件，保持可测试性

### Performance

- **响应时间**: 单次数据库查询响应时间 < 500ms
- **批量操作**: 支持单次请求更新最多100条记录
- **缓存策略**: 内存缓存最近访问的项目数据，TTL 5分钟
- **懒加载**: 项目详情和里程碑按需加载，非一次性全量加载

### Security

- **数据备份**: 迁移前自动备份所有JSON文件，保留最近3个版本
- **权限检查**: 操作前检查用户对数据库块的读写权限
- **敏感信息**: 不在日志中记录项目内容等敏感信息

### Reliability

- **降级机制**: 数据库不可用自动降级到JSON，用户无感知
- **数据一致性**: 定期校验数据库和缓存的一致性
- **事务支持**: 关键操作（如迁移）需支持回滚
- **错误恢复**: API调用失败提供明确的错误信息和恢复建议

### Usability

- **迁移向导**: 提供图形化迁移向导，显示进度和预计时间
- **配置简单**: 数据库ID可通过选择器自动获取，无需手动输入
- **冲突提示**: 数据冲突时清晰展示差异，支持一键选择
- **文档完善**: 提供完整的API文档和使用示例