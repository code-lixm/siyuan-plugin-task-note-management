/**
 * Database Templates
 * 
 * SiYuan Attribute View数据库模板定义
 * 用于自动创建项目管理中心数据库
 */

export interface TemplateColumn {
    name: string;
    type: 'text' | 'mSelect' | 'date' | 'number' | 'checkbox' | 'relation';
    required?: boolean;
    options?: Array<{
        content: string;
        color: string;
    }>;
}

export interface DatabaseTemplate {
    name: string;
    columns: TemplateColumn[];
}

/**
 * 项目管理中心数据库模板
 * 单数据库设计：包含项目、分组、里程碑所有数据
 */
export const ProjectHubTemplate: DatabaseTemplate = {
    name: '项目管理中心',
    columns: [
        {
            name: '名称',
            type: 'text',
            required: true
        },
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
        {
            name: '父级项目',
            type: 'relation'
        },
        {
            name: '所属分组',
            type: 'relation'
        },
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
        {
            name: '项目颜色',
            type: 'text'
        },
        {
            name: '看板模式',
            type: 'mSelect',
            options: [
                { content: '状态模式', color: '#3498db' },
                { content: '自定义分组', color: '#9b59b6' },
                { content: '列表模式', color: '#95a5a6' }
            ]
        },
        {
            name: '开始日期',
            type: 'date'
        },
        {
            name: '创建时间',
            type: 'date'
        },
        {
            name: '最后修改',
            type: 'date'
        },
        {
            name: '版本号',
            type: 'number'
        },
        {
            name: '关联块ID',
            type: 'text'
        },
        {
            name: '归档',
            type: 'checkbox'
        },
        {
            name: '排序',
            type: 'number'
        }
    ]
};

/**
 * 获取模板列定义
 */
export function getTemplateColumns(template: DatabaseTemplate): TemplateColumn[] {
    return template.columns;
}

/**
 * 验证数据库结构是否符合模板
 */
export function validateAgainstTemplate(
    actualColumns: string[],
    template: DatabaseTemplate
): { valid: boolean; missing: string[]; extra: string[] } {
    const requiredColumns = template.columns
        .filter(col => col.required)
        .map(col => col.name);
    
    const templateColumnNames = template.columns.map(col => col.name);
    
    const missing = requiredColumns.filter(col => !actualColumns.includes(col));
    const extra = actualColumns.filter(col => !templateColumnNames.includes(col));
    
    return {
        valid: missing.length === 0,
        missing,
        extra
    };
}
