/*
 * Copyright (c) 2024 by siyuan-plugin-task-daily. All Rights Reserved.
 * @Author       : siyuan-plugin-task-daily
 * @Date         : 2024
 * @FilePath     : /src/utils/migrationValidator.ts
 * @Description  : Data migration validator for validating projects before migration
 */

import { Project, ProjectGroup, Milestone } from './projectManager';

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * 有效的项目状态值
 */
const VALID_STATUSES = ['active', 'someday', 'archived'];

/**
 * 有效的优先级值
 */
const VALID_PRIORITIES = ['high', 'medium', 'low', 'none'];

/**
 * 有效的看板模式值
 */
const VALID_KANBAN_MODES = ['status', 'custom', 'list'];

/**
 * 有效的排序顺序值
 */
const VALID_SORT_ORDERS = ['asc', 'desc'];

export class MigrationValidator {
    /**
     * 验证项目列表
     * @param projects 要验证的项目列表
     * @returns 验证结果
     */
    public validateProjects(projects: Project[]): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!Array.isArray(projects)) {
            errors.push('项目数据必须是数组');
            return {
                valid: false,
                errors,
                warnings
            };
        }

        // 检查重复ID
        this.checkDuplicateIds(projects, errors);

        // 验证每个项目
        projects.forEach((project, index) => {
            this.validateProject(project, index, errors, warnings);
        });

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 检查重复的项目ID
     */
    private checkDuplicateIds(projects: Project[], errors: string[]): void {
        const idMap = new Map<string, number[]>();

        projects.forEach((project, index) => {
            if (project.id) {
                const indices = idMap.get(project.id) || [];
                indices.push(index);
                idMap.set(project.id, indices);
            }
        });

        idMap.forEach((indices, id) => {
            if (indices.length > 1) {
                errors.push(`发现重复的项目ID "${id}"，出现在索引 ${indices.join(', ')}`);
            }
        });
    }

    /**
     * 验证单个项目
     */
    private validateProject(
        project: Project,
        index: number,
        errors: string[],
        warnings: string[]
    ): void {
        const prefix = `项目[${index}]`;

        // 检查必填字段
        if (!project.id) {
            errors.push(`${prefix}: 缺少必填字段 "id"`);
        }

        if (!project.name) {
            errors.push(`${prefix}: 缺少必填字段 "name"`);
        }

        if (project.status === undefined || project.status === null) {
            errors.push(`${prefix}: 缺少必填字段 "status"`);
        }

        // 验证状态值
        if (project.status !== undefined && project.status !== null) {
            if (!VALID_STATUSES.includes(project.status)) {
                errors.push(`${prefix}: 无效的状态值 "${project.status}"，有效值为: ${VALID_STATUSES.join(', ')}`);
            }
        }

        // 验证优先级值
        if (project.priority !== undefined && project.priority !== null) {
            if (!VALID_PRIORITIES.includes(project.priority)) {
                errors.push(`${prefix}: 无效的优先级值 "${project.priority}"，有效值为: ${VALID_PRIORITIES.join(', ')}`);
            }
        }

        // 验证看板模式值
        if (project.kanbanMode !== undefined && project.kanbanMode !== null) {
            if (!VALID_KANBAN_MODES.includes(project.kanbanMode)) {
                errors.push(`${prefix}: 无效的看板模式 "${project.kanbanMode}"，有效值为: ${VALID_KANBAN_MODES.join(', ')}`);
            }
        }

        // 验证排序顺序值
        if (project.sortOrder !== undefined && project.sortOrder !== null) {
            if (!VALID_SORT_ORDERS.includes(project.sortOrder)) {
                errors.push(`${prefix}: 无效的排序顺序 "${project.sortOrder}"，有效值为: ${VALID_SORT_ORDERS.join(', ')}`);
            }
        }

        // 验证日期格式
        if (project.startDate && !this.isValidDateString(project.startDate)) {
            warnings.push(`${prefix}: startDate "${project.startDate}" 可能不是有效的日期格式`);
        }

        if (project.createdTime && !this.isValidDateString(project.createdTime)) {
            warnings.push(`${prefix}: createdTime "${project.createdTime}" 可能不是有效的日期格式`);
        }

        // 验证自定义分组
        if (project.customGroups && Array.isArray(project.customGroups)) {
            project.customGroups.forEach((group, groupIndex) => {
                this.validateProjectGroup(group, `${prefix}.customGroups[${groupIndex}]`, errors, warnings);
            });
        }

        // 验证里程碑
        if (project.milestones && Array.isArray(project.milestones)) {
            project.milestones.forEach((milestone, milestoneIndex) => {
                this.validateMilestone(milestone, `${prefix}.milestones[${milestoneIndex}]`, errors, warnings);
            });
        }

        // 检查空名称警告
        if (project.name && project.name.trim() === '') {
            warnings.push(`${prefix}: 项目名称为空字符串`);
        }

        // 检查未定义的可选字段
        if (project.color === undefined) {
            warnings.push(`${prefix}: 未设置颜色`);
        }

        // 检查负数排序值
        if (project.sort !== undefined && project.sort < 0) {
            warnings.push(`${prefix}: sort值为负数 (${project.sort})`);
        }
    }

    /**
     * 验证项目分组
     */
    private validateProjectGroup(
        group: ProjectGroup,
        path: string,
        errors: string[],
        warnings: string[]
    ): void {
        if (!group.id) {
            errors.push(`${path}: 缺少必填字段 "id"`);
        }

        if (!group.name) {
            errors.push(`${path}: 缺少必填字段 "name"`);
        }

        if (group.color === undefined || group.color === null) {
            errors.push(`${path}: 缺少必填字段 "color"`);
        }

        if (group.sort === undefined || group.sort === null) {
            errors.push(`${path}: 缺少必填字段 "sort"`);
        }

        // 验证分组内的里程碑
        if (group.milestones && Array.isArray(group.milestones)) {
            group.milestones.forEach((milestone, index) => {
                this.validateMilestone(milestone, `${path}.milestones[${index}]`, errors, warnings);
            });
        }
    }

    /**
     * 验证里程碑
     */
    private validateMilestone(
        milestone: Milestone,
        path: string,
        errors: string[],
        warnings: string[]
    ): void {
        if (!milestone.id) {
            errors.push(`${path}: 缺少必填字段 "id"`);
        }

        if (!milestone.name) {
            errors.push(`${path}: 缺少必填字段 "name"`);
        }

        if (milestone.sort === undefined || milestone.sort === null) {
            errors.push(`${path}: 缺少必填字段 "sort"`);
        }

        // 验证里程碑日期
        if (milestone.startTime && !this.isValidDateString(milestone.startTime)) {
            warnings.push(`${path}: startTime "${milestone.startTime}" 可能不是有效的日期格式`);
        }

        if (milestone.endTime && !this.isValidDateString(milestone.endTime)) {
            warnings.push(`${path}: endTime "${milestone.endTime}" 可能不是有效的日期格式`);
        }

        // 验证结束时间是否晚于开始时间
        if (milestone.startTime && milestone.endTime) {
            const start = new Date(milestone.startTime);
            const end = new Date(milestone.endTime);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end < start) {
                warnings.push(`${path}: 结束时间早于开始时间`);
            }
        }
    }

    /**
     * 检查是否为有效的日期字符串
     */
    private isValidDateString(dateString: string): boolean {
        if (!dateString || typeof dateString !== 'string') {
            return false;
        }

        // 尝试解析日期
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    }
}
