/**
 * Database Converters
 * 
 * 数据库行与Project对象之间的转换工具
 * 用于在SiYuan Attribute View数据库格式和内部数据模型之间转换
 */

import { 
    Project,
    ProjectGroup,
    Milestone
} from './projectManager';
import {
    ProjectDatabaseRow,
    ProjectDatabaseRowValues,
    SiYuanTextCell,
    SiYuanMSelectCell,
    SiYuanDateCell,
    SiYuanNumberCell,
    SiYuanCheckboxCell,
    SiYuanRelationCell,
    INTERNAL_STATUS_TO_DATABASE,
    INTERNAL_PRIORITY_TO_DATABASE,
    INTERNAL_KANBAN_MODE_TO_DATABASE,
    DATABASE_STATUS_TO_INTERNAL,
    DATABASE_PRIORITY_TO_INTERNAL,
    DATABASE_KANBAN_MODE_TO_INTERNAL,
    InternalProjectStatus,
    InternalPriority,
    InternalKanbanMode
} from '../types/database';

// ==================== Helper Functions ====================

/**
 * 从mSelect单元格中提取第一个选项的文本内容
 */
function getFirstMSelectContent(cell: SiYuanMSelectCell | undefined): string | undefined {
    if (!cell?.mSelect || cell.mSelect.length === 0) {
        return undefined;
    }
    return cell.mSelect[0].content;
}

/**
 * 将时间戳（毫秒）转换为ISO日期字符串
 */
function timestampToIso(timestamp: number | undefined): string | undefined {
    if (!timestamp) return undefined;
    return new Date(timestamp).toISOString();
}

/**
 * 将ISO日期字符串转换为时间戳（毫秒）
 */
function isoToTimestamp(isoString: string | undefined): number | undefined {
    if (!isoString) return undefined;
    return new Date(isoString).getTime();
}

// ==================== Cell Creators ====================

/**
 * 创建文本单元格
 */
function createTextCell(content: string | undefined): SiYuanTextCell | undefined {
    if (content === undefined || content === null) return undefined;
    return { text: { content } };
}

/**
 * 创建mSelect单元格
 */
function createMSelectCell(content: string | undefined, color?: string): SiYuanMSelectCell | undefined {
    if (!content) return undefined;
    return { mSelect: [{ content, color }] };
}

/**
 * 创建日期单元格
 */
function createDateCell(timestamp: number | undefined): SiYuanDateCell | undefined {
    if (!timestamp) return undefined;
    return { 
        date: { 
            content: timestamp, 
            isNotEmpty: true 
        } 
    };
}

/**
 * 创建数字单元格
 */
function createNumberCell(value: number | undefined): SiYuanNumberCell | undefined {
    if (value === undefined || value === null) return undefined;
    return { number: { content: value, isNotEmpty: true } };
}

/**
 * 创建复选框单元格
 */
function createCheckboxCell(checked: boolean): SiYuanCheckboxCell {
    return { checkbox: { checked } };
}

/**
 * 创建关联单元格
 */
function createRelationCell(targetIds: string[]): SiYuanRelationCell {
    return { relation: { blockIDs: targetIds } };
}

// ==================== Main Conversion: Row to Project ====================

/**
 * 将数据库行转换为Project对象
 * 
 * @param row - 从SiYuan AV数据库获取的行数据
 * @returns Project对象
 */
export function rowToProject(row: ProjectDatabaseRow): Project {
    // 解析状态
    const dbStatus = getFirstMSelectContent(row['项目状态']);
    const internalStatus: InternalProjectStatus = dbStatus 
        ? DATABASE_STATUS_TO_INTERNAL[dbStatus] || 'doing'
        : 'doing';

    // 解析优先级
    const dbPriority = getFirstMSelectContent(row['优先级']);
    const internalPriority: InternalPriority = dbPriority
        ? DATABASE_PRIORITY_TO_INTERNAL[dbPriority] || 'none'
        : 'none';

    // 解析看板模式
    const dbMode = getFirstMSelectContent(row['看板模式']);
    const internalMode: InternalKanbanMode = dbMode
        ? DATABASE_KANBAN_MODE_TO_INTERNAL[dbMode] || 'status'
        : 'status';

    // 解析日期
    const startTimestamp = row['开始日期']?.date?.content;
    const createdTimestamp = row['创建时间']?.date?.content;

    // 解析颜色和关联块ID
    const color = row['项目颜色']?.text?.content;
    const blockId = row['关联块ID']?.text?.content;

    // 解析排序（如果存在）
    const sort = row['排序']?.number?.content;

    // 构建Project对象
    const project: Project = {
        id: row.id,
        name: row['名称']?.text?.content || '',
        status: internalStatus,
        priority: internalPriority,
        kanbanMode: internalMode,
        color: color,
        blockId: blockId,
        sort: sort,
        startDate: timestampToIso(startTimestamp),
        createdTime: timestampToIso(createdTimestamp),
        // 分组和里程碑需要通过额外的查询获取
        customGroups: [],
        milestones: []
    };

    return project;
}

/**
 * 将数据库行转换为ProjectGroup对象
 * 
 * @param row - 从SiYuan AV数据库获取的行数据
 * @returns ProjectGroup对象
 */
export function rowToProjectGroup(row: ProjectDatabaseRow): ProjectGroup {
    const color = row['项目颜色']?.text?.content || '#3498db';
    const sort = row['排序']?.number?.content || 0;
    const archived = row['归档']?.checkbox?.checked || false;

    return {
        id: row.id,
        name: row['名称']?.text?.content || '',
        color: color,
        sort: sort,
        archived: archived,
        milestones: [] // 需要通过额外查询获取
    };
}

/**
 * 将数据库行转换为Milestone对象
 * 
 * @param row - 从SiYuan AV数据库获取的行数据
 * @returns Milestone对象
 */
export function rowToMilestone(row: ProjectDatabaseRow): Milestone {
    const startTimestamp = row['开始日期']?.date?.content;
    const endTimestamp = row['结束日期']?.date?.content;
    const archived = row['归档']?.checkbox?.checked || false;
    const blockId = row['关联块ID']?.text?.content;

    const sort = row['排序']?.number?.content || 0;

    return {
        id: row.id,
        name: row['名称']?.text?.content || '',
        startTime: timestampToIso(startTimestamp),
        endTime: timestampToIso(endTimestamp),
        archived: archived,
        blockId: blockId,
        sort: sort
    };
}

// ==================== Main Conversion: Project to Row ====================

/**
 * 将Project对象转换为数据库行值
 * 用于创建或更新数据库行
 * 
 * @param project - Project对象（可以是部分字段）
 * @returns 数据库行值对象
 */
export function projectToRowValues(
    project: Partial<Project>,
    existingRow?: ProjectDatabaseRow
): ProjectDatabaseRowValues {
    const values: Partial<ProjectDatabaseRowValues> = {};

    // 名称
    if (project.name !== undefined) {
        values['名称'] = createTextCell(project.name);
    }

    // 类型（固定为"项目"）
    values['类型'] = createMSelectCell('项目', '#e74c3c');

    // 状态
    if (project.status !== undefined) {
        const dbStatus = INTERNAL_STATUS_TO_DATABASE[project.status];
        const dbStatusEntry = Object.entries(DATABASE_STATUS_TO_INTERNAL)
            .find(([, val]) => val === project.status);
        const color = dbStatusEntry ? 
            (dbStatusEntry[0] === '进行中' ? '#e74c3c' :
             dbStatusEntry[0] === '短期' ? '#3498db' :
             dbStatusEntry[0] === '长期' ? '#9b59b6' : '#2ecc71') : '#e74c3c';
        values['项目状态'] = createMSelectCell(dbStatus, color);
    }

    // 优先级
    if (project.priority !== undefined) {
        const dbPriority = INTERNAL_PRIORITY_TO_DATABASE[project.priority];
        values['优先级'] = createMSelectCell(dbPriority.content, dbPriority.color);
    }

    // 看板模式
    if (project.kanbanMode !== undefined) {
        const dbMode = INTERNAL_KANBAN_MODE_TO_DATABASE[project.kanbanMode];
        values['看板模式'] = createMSelectCell(dbMode.content, dbMode.color);
    }

    // 项目颜色
    if (project.color !== undefined) {
        values['项目颜色'] = createTextCell(project.color);
    }

    // 开始日期
    if (project.startDate !== undefined) {
        const timestamp = isoToTimestamp(project.startDate);
        values['开始日期'] = timestamp ? createDateCell(timestamp) : undefined;
    }

    // 关联块ID
    if (project.blockId !== undefined) {
        values['关联块ID'] = createTextCell(project.blockId);
    }

    // 排序
    if (project.sort !== undefined) {
        values['排序'] = createNumberCell(project.sort);
    }

    // 创建时间（如果是新项目）
    if (!existingRow && project.createdTime) {
        const timestamp = isoToTimestamp(project.createdTime);
        values['创建时间'] = timestamp ? createDateCell(timestamp) : createDateCell(Date.now());
    }

    // 最后修改时间（总是更新）
    values['最后修改'] = createDateCell(Date.now());

    // 版本号（乐观锁）
    const currentVersion = existingRow?.['版本号']?.number?.content || 0;
    values['版本号'] = createNumberCell(currentVersion + 1);

    return values as ProjectDatabaseRowValues;
}

/**
 * 将ProjectGroup对象转换为数据库行值
 */
export function projectGroupToRowValues(
    group: Partial<ProjectGroup>,
    parentProjectId: string,
    existingRow?: ProjectDatabaseRow
): ProjectDatabaseRowValues {
    const values: Partial<ProjectDatabaseRowValues> = {};

    if (group.name !== undefined) {
        values['名称'] = createTextCell(group.name);
    }

    values['类型'] = createMSelectCell('分组', '#3498db');

    // 父级项目关联
    values['父级项目'] = createRelationCell([parentProjectId]);

    if (group.color !== undefined) {
        values['项目颜色'] = createTextCell(group.color);
    }

    if (group.sort !== undefined) {
        values['排序'] = createNumberCell(group.sort);
    }

    if (group.archived !== undefined) {
        values['归档'] = createCheckboxCell(group.archived);
    }

    // 时间戳
    values['最后修改'] = createDateCell(Date.now());
    const currentVersion = existingRow?.['版本号']?.number?.content || 0;
    values['版本号'] = createNumberCell(currentVersion + 1);

    return values as ProjectDatabaseRowValues;
}

/**
 * 将Milestone对象转换为数据库行值
 */
export function milestoneToRowValues(
    milestone: Partial<Milestone>,
    parentProjectId: string,
    parentGroupId?: string,
    existingRow?: ProjectDatabaseRow
): ProjectDatabaseRowValues {
    const values: Partial<ProjectDatabaseRowValues> = {};

    if (milestone.name !== undefined) {
        values['名称'] = createTextCell(milestone.name);
    }

    values['类型'] = createMSelectCell('里程碑', '#9b59b6');

    // 父级关联
    values['父级项目'] = createRelationCell([parentProjectId]);
    if (parentGroupId) {
        values['所属分组'] = createRelationCell([parentGroupId]);
    }

    if (milestone.startTime !== undefined) {
        const timestamp = isoToTimestamp(milestone.startTime);
        values['开始日期'] = timestamp ? createDateCell(timestamp) : undefined;
    }

    if (milestone.endTime !== undefined) {
        const timestamp = isoToTimestamp(milestone.endTime);
        values['结束日期'] = timestamp ? createDateCell(timestamp) : undefined;
    }

    if (milestone.archived !== undefined) {
        values['归档'] = createCheckboxCell(milestone.archived);
    }

    if (milestone.blockId !== undefined) {
        values['关联块ID'] = createTextCell(milestone.blockId);
    }

    // 时间戳
    values['最后修改'] = createDateCell(Date.now());
    const currentVersion = existingRow?.['版本号']?.number?.content || 0;
    values['版本号'] = createNumberCell(currentVersion + 1);

    return values as ProjectDatabaseRowValues;
}

// ==================== Export All ====================

export default {
    rowToProject,
    rowToProjectGroup,
    rowToMilestone,
    projectToRowValues,
    projectGroupToRowValues,
    milestoneToRowValues
};