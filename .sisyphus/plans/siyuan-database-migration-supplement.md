# Design Supplement: Critical Design Decisions

## 1. Architecture Decision: Single Database (Project Hub)

**Decision**: 采用单数据库（项目管理中心）管理所有实体

**Rationale**:
- 查询简单：一次API调用获取所有相关数据
- 关系清晰：使用 Type 字段 + Relation 字段建立树形关系
- 视图灵活：可以创建多个筛选视图
- 减少API调用次数

**Database Structure**:
```
项目管理中心 (Attribute View)
├── 行1: 类型=项目, 名称="项目A", 状态=进行中
├── 行2: 类型=分组, 名称="分组1", 父级项目=行1.id
├── 行3: 类型=里程碑, 名称="里程碑1", 父级项目=行1.id, 所属分组=行2.id
└── 行4: 类型=项目, 名称="项目B", 状态=短期
```

**Columns**:
| 列名 | 类型 | 说明 |
|------|------|------|
| 名称 | text | 项目/分组/里程碑名称 |
| 类型 | mSelect | [项目, 分组, 里程碑] |
| 父级项目 | relation | 指向同库项目行 |
| 所属分组 | relation | 指向同库分组行 |
| 项目状态 | mSelect | 进行中/短期/长期/已完成 |
| 优先级 | mSelect | 高/中/低/无 |
| 项目颜色 | text | HEX颜色代码 |
| 看板模式 | mSelect | 状态模式/自定义分组/列表模式 |
| 开始日期 | date | 时间戳 |
| 创建时间 | date | 时间戳 |
| 最后修改 | date | 用于乐观锁 |
| 版本号 | number | 用于乐观锁 |
| 关联块ID | text | SiYuan块ID |
| 归档 | checkbox | true/false |
| 排序 | number | 用于排序 |

## 2. API Capability Matrix

| Operation | SiYuan API | Payload Example | Notes |
|-----------|------------|-----------------|-------|
| **Read All** | POST `/api/av/getAttributeView` | `{ id: databaseId }` | Returns all rows |
| **Read Filtered** | POST `/api/av/getAttributeView` | `{ id: databaseId, filter: {...} }` | With filter conditions |
| **Update Cell** | POST `/api/av/setAttributeViewBlockAttr` | `{ avID, keyID, itemID, value }` | Single cell update |
| **Batch Update** | POST `/api/av/batchSetAttributeViewBlockAttrs` | `{ avID, items: [...] }` | Multiple cells |
| **Add Row** | POST `/api/av/appendAttributeViewDetachedBlocksWithValues` | `{ avID, rows: [...] }` | Create new row |
| **Delete Row** | POST `/api/av/removeAttributeViewBlock` | `{ avID, itemID }` | Remove row |
| **Get Schema** | POST `/api/av/getAttributeView` | `{ id: databaseId }` | Returns column definitions |

## 3. ID Mapping Strategy

**Business ID (Project.id)** vs **AV Row ID**:

```typescript
interface IDMapping {
    // 业务ID：用户可见，来自JSON存储或生成
    businessId: string;
    // AV行ID：SiYuan内部ID，用于API操作
    avRowId: string;
    // 类型：项目/分组/里程碑
    type: 'project' | 'group' | 'milestone';
}

// 在内存中维护映射表
class IDMappingManager {
    private mapping: Map<string, IDMapping> = new Map();
    
    // businessId -> avRowId
    getAvRowId(businessId: string): string | undefined;
    
    // avRowId -> businessId
    getBusinessId(avRowId: string): string | undefined;
    
    // 创建新映射
    addMapping(businessId: string, avRowId: string, type: string): void;
    
    // 持久化到JSON文件
    async saveMapping(): Promise<void>;
    
    // 从JSON文件加载
    async loadMapping(): Promise<void>;
}
```

**Why separate IDs?**
- AV行ID是SiYuan生成的，可能变化（如删除重建）
- 业务ID保持稳定，用于URL、块属性绑定等
- 支持跨数据库迁移（导出导入）

## 4. Optimistic Locking Model

**Fields for Concurrency Control**:
```typescript
// 添加到 ProjectDatabaseRow
interface ProjectDatabaseRow {
    // ... other fields
    '最后修改': { date: { content: number } };
    '版本号': { number: { content: number } };
}

// 更新时的检查逻辑
async updateWithOptimisticLock(
    avRowId: string,
    updates: Partial<ProjectDatabaseRowValues>,
    expectedVersion: number
): Promise<void> {
    // 1. Read current row
    const current = await this.getRow(avRowId);
    const currentVersion = current['版本号']?.number?.content || 0;
    
    // 2. Check version
    if (currentVersion !== expectedVersion) {
        throw new ConcurrentModificationError({
            expectedVersion,
            actualVersion: currentVersion,
            serverData: current
        });
    }
    
    // 3. Update with new version
    await this.updateRow(avRowId, {
        ...updates,
        '最后修改': { date: { content: Date.now(), isNotEmpty: true } },
        '版本号': { number: { content: expectedVersion + 1 } }
    });
}
```

## 5. Hybrid Mode Semantics

**Definition**: Hybrid = 同时写入 JSON + Database

**Write Strategy**:
```typescript
async saveProject(project: Project): Promise<void> {
    if (this.storageMode === StorageMode.HYBRID) {
        // 策略1: 同时写入，JSON为主（失败容忍）
        const jsonPromise = this.jsonManager.saveProject(project);
        const dbPromise = this.dbManager.updateProject(project)
            .catch(err => {
                // 数据库失败不阻塞，记录日志
                console.warn('DB write failed, JSON is primary:', err);
                this.scheduleRetry(project.id);
            });
        
        // 等待JSON完成（必须成功）
        await jsonPromise;
        // DB失败不等待
        await Promise.allSettled([dbPromise]);
        
    } else if (this.storageMode === StorageMode.DATABASE_ONLY) {
        await this.dbManager.updateProject(project);
    } else {
        await this.jsonManager.saveProject(project);
    }
}
```

**Read Strategy**:
```typescript
async loadProject(id: string): Promise<Project | null> {
    if (this.shouldUseDatabase()) {
        try {
            // 优先从数据库读取
            return await this.dbManager.getProjectById(id);
        } catch (error) {
            if (this.config.fallbackOnError) {
                // 降级到JSON
                return await this.jsonManager.loadProject(id);
            }
            throw error;
        }
    }
    return await this.jsonManager.loadProject(id);
}
```

**Failure Recovery**:
- JSON写入失败：整体失败，显示错误
- DB写入失败：记录日志，标记为"待同步"，定时重试
- 读取时DB失败：自动降级到JSON（如果fallbackOnError=true）

## 6. Migration & Rollback Granularity

**Checkpoint Structure**:
```typescript
interface MigrationCheckpoint {
    timestamp: number;
    phase: 'projects' | 'groups' | 'milestones';
    lastProcessedId: string;
    stats: {
        success: number;
        failed: number;
        skipped: number;
    };
}

interface MigrationState {
    version: string;
    startedAt: number;
    checkpoint?: MigrationCheckpoint;
    backupPath: string;
    completed: boolean;
}
```

**Granular Rollback**:
```typescript
async rollbackToCheckpoint(checkpoint: MigrationCheckpoint): Promise<void> {
    // 1. 回滚当前阶段的部分迁移
    if (checkpoint.phase === 'projects') {
        await this.rollbackProjects(checkpoint.lastProcessedId);
    }
    // 2. 删除后续阶段的数据
    if (checkpoint.phase !== 'milestones') {
        await this.deleteMigratedGroupsAndMilestones();
    }
    // 3. 恢复JSON文件
    await this.restoreFromBackup();
}
```

**Retry Strategy**:
- 幂等操作：重复执行相同的迁移不会产生副作用
- 失败重试：3次指数退避（1s, 2s, 4s）
- 部分失败：记录失败的ID，继续处理其他，最后统一重试

## 7. Database Template (Complete)

```typescript
export const ProjectHubTemplate = {
    name: '项目管理中心',
    columns: [
        // 基础信息
        { name: '名称', type: 'text', required: true },
        { 
            name: '类型', 
            type: 'mSelect', 
            required: true,
            options: [
                { content: '项目', color: '#e74c3c' },
                { content: '分组', color: '#3498db' },
                { content: '里程碑', color: '#9b59b6' }
            ]
        },
        
        // 关系字段（relation类型）
        { name: '父级项目', type: 'relation' },
        { name: '所属分组', type: 'relation' },
        
        // 项目属性
        { 
            name: '项目状态', 
            type: 'mSelect',
            options: [
                { content: '进行中', color: '#e74c3c' },
                { content: '短期', color: '#3498db' },
                { content: '长期', color: '#9b59b6' },
                { content: '已完成', color: '#2ecc71' }
            ]
        },
        { 
            name: '优先级', 
            type: 'mSelect',
            options: [
                { content: '高', color: '#e74c3c' },
                { content: '中', color: '#f39c12' },
                { content: '低', color: '#2ecc71' },
                { content: '无', color: '#95a5a6' }
            ]
        },
        { name: '项目颜色', type: 'text' },
        { 
            name: '看板模式', 
            type: 'mSelect',
            options: [
                { content: '状态模式', color: '#3498db' },
                { content: '自定义分组', color: '#9b59b6' },
                { content: '列表模式', color: '#95a5a6' }
            ]
        },
        
        // 时间字段
        { name: '开始日期', type: 'date' },
        { name: '创建时间', type: 'date' },
        { name: '最后修改', type: 'date' },
        
        // 并发控制
        { name: '版本号', type: 'number' },
        
        // 其他
        { name: '关联块ID', type: 'text' },
        { name: '归档', type: 'checkbox' },
        { name: '排序', type: 'number' }
    ]
};
```

## Design Freeze Checklist

- [x] 架构决策：单数据库（项目管理中心）
- [x] API能力矩阵：列出所有CRUD操作的SiYuan API
- [x] ID策略：businessId vs avRowId 分离，IDMappingManager维护
- [x] 乐观锁：lastModified + version 字段
- [x] Hybrid模式：双写策略，JSON为主，DB失败可容忍
- [x] 迁移粒度：Checkpoint结构，支持断点续传和分级回滚
- [x] 完整模板：包含所有字段（类型、关系、时间、版本等）

**Status**: ✅ Design Freeze Ready

## Reference Documents

- **Main Design**: `.spec-workflow/specs/siyuan-database-migration/design.md`
- **Requirements**: `.spec-workflow/specs/siyuan-database-migration/requirements.md`
- **Tasks**: `.spec-workflow/specs/siyuan-database-migration/tasks.md`

**Created**: 2026-03-09
**Purpose**: Fix Oracle validation gaps before implementation