import { i18n } from '../pluginInstance';

/**
 * 分类标签柔和色板
 * ============================================================
 * 两套精心搭配的柔和色板（饱和度 30-50%，亮度 70-80%）
 * 清新系：蓝/青/绿/紫 — 专业沉静
 * 暖色系：桃/珊瑚/橙/棕 — 温暖柔和
 * ============================================================
 *
 * 使用方式：
 *   const color = CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length];
 *   backgroundColor: color.bg     // 如 hsla(200, 35%, 78%, 0.45)
 *   borderColor:   color.border  // 如 hsla(200, 30%, 68%, 0.45)
 *   textColor:     color.text    // 如 #2d3436
 */
export const CATEGORY_PALETTE: Array<{ bg: string; border: string; text: string }> = [
    // ── 清新系（Cool）— 增加饱和度/亮度差异以提高区分度 ──────────
    // 静蓝（饱和度高，亮度低 → 深色背景）
    { bg: 'hsla(210, 50%, 72%, 0.50)', border: 'hsla(210, 45%, 62%, 0.50)', text: '#1a2d3d' },
    // 薄荷绿（高饱和，亮色）
    { bg: 'hsla(160, 48%, 70%, 0.48)', border: 'hsla(160, 42%, 60%, 0.48)', text: '#1a3830' },
    // 薰衣草紫（中饱和，亮色）
    { bg: 'hsla(260, 40%, 75%, 0.48)', border: 'hsla(260, 35%, 65%, 0.48)', text: '#2d2040' },
    // 青绿（高饱和，亮色）
    { bg: 'hsla(175, 52%, 68%, 0.50)', border: 'hsla(175, 46%, 58%, 0.50)', text: '#1e3a3a' },
    // 雾霾蓝（低饱和，中亮度 → 灰色调但带蓝）
    { bg: 'hsla(215, 28%, 78%, 0.45)', border: 'hsla(215, 24%, 68%, 0.45)', text: '#2a3040' },
    // 翠绿（高饱和，亮色）
    { bg: 'hsla(145, 50%, 65%, 0.50)', border: 'hsla(145, 45%, 55%, 0.50)', text: '#1e3a2e' },
    // 冰川蓝（中饱和，中亮度）
    { bg: 'hsla(195, 38%, 72%, 0.48)', border: 'hsla(195, 32%, 62%, 0.48)', text: '#1a2e3d' },
    // 灰紫（低饱和，暗色）
    { bg: 'hsla(270, 22%, 65%, 0.50)', border: 'hsla(270, 18%, 55%, 0.50)', text: '#2d2040' },

    // ── 暖色系（Warm）— 增加饱和度/亮度差异 ─────────────────────
    // 珊瑚红（高饱和，亮色）
    { bg: 'hsla(12, 55%, 72%, 0.50)', border: 'hsla(12, 50%, 62%, 0.50)', text: '#3d2018' },
    // 琥珀橙（高饱和，亮色）
    { bg: 'hsla(35, 55%, 70%, 0.50)', border: 'hsla(35, 50%, 60%, 0.50)', text: '#3d2e18' },
    // 杏色（中饱和，亮色）
    { bg: 'hsla(25, 45%, 78%, 0.48)', border: 'hsla(25, 40%, 68%, 0.48)', text: '#3d2c20' },
    // 玫瑰粉（中高饱和，亮色）
    { bg: 'hsla(345, 42%, 75%, 0.48)', border: 'hsla(345, 38%, 65%, 0.48)', text: '#3a2030' },
    // 焦糖棕（低饱和，暗色）
    { bg: 'hsla(25, 35%, 58%, 0.52)', border: 'hsla(25, 30%, 48%, 0.52)', text: '#3d2c18' },
    // 日落橙（高饱和，亮色）
    { bg: 'hsla(18, 52%, 68%, 0.50)', border: 'hsla(18, 47%, 58%, 0.50)', text: '#3d2a20' },
    // 暖灰棕（中饱和，中亮度）
    { bg: 'hsla(30, 28%, 68%, 0.50)', border: 'hsla(30, 24%, 58%, 0.50)', text: '#3d3028' },
    // 奶茶色（低饱和，亮色）
    { bg: 'hsla(35, 32%, 80%, 0.45)', border: 'hsla(35, 28%, 70%, 0.45)', text: '#3d3020' },
];

export interface Category {
    id: string;
    name: string;
    color: string;
    icon?: string;
}

const DEFAULT_CATEGORIES: Category[] = [
    { id: 'work', name: '工作', color: '#e74c3c', icon: '🎯' },
    { id: 'study', name: '学习', color: '#3498db', icon: '📖' },
    { id: 'life', name: '生活', color: '#27ae60', icon: '☘️' }
];

/**
 * 获取本地化默认分类
 */
function getLocalizedDefaultCategories(): Category[] {
    return [
        { id: 'work', name: i18n('work'), color: '#e74c3c', icon: '🎯' },
        { id: 'study', name: i18n('study'), color: '#3498db', icon: '📖' },
        { id: 'life', name: i18n('life'), color: '#27ae60', icon: '☘️' }
    ];
}

/**
 * 检查分类名称是否为默认名称
 */
function isDefaultCategoryName(id: string, name: string): boolean {
    const defaultNames: { [key: string]: string[] } = {
        'work': ['工作', 'Work'],
        'study': ['学习', 'Study'],
        'life': ['娱乐', '生活', 'Life']
    };
    return defaultNames[id]?.includes(name) || false;
}

export class CategoryManager {
    private static instance: CategoryManager;
    private categories: Category[] = [];
    private plugin: any;

    private constructor(plugin: any) {
        this.plugin = plugin;
    }

    public static getInstance(plugin?: any): CategoryManager {
        if (!CategoryManager.instance) {
            CategoryManager.instance = new CategoryManager(plugin);
        }
        return CategoryManager.instance;
    }

    /**
     * 初始化分类数据
     */
    public async initialize(): Promise<void> {
        try {
            await this.loadCategories();
        } catch (error) {
            console.error('初始化分类失败:', error);
            // 如果加载失败，使用默认分类
            this.categories = getLocalizedDefaultCategories();
        }
    }

    /**
     * 加载分类数据
     */
    public async loadCategories(): Promise<Category[]> {
        try {
            const content = await this.plugin.loadCategories();
            if (!content) {
                this.categories = getLocalizedDefaultCategories();
                return this.categories;
            }

            const categoriesData = content;

            // 验证加载的数据是否为有效的分类数组
            if (Array.isArray(categoriesData)) {
                const localizedDefaults = getLocalizedDefaultCategories();
                this.categories = categoriesData.map(category => {
                    // 如果名称是默认名称，自动更换为 i18n 文本
                    if (isDefaultCategoryName(category.id, category.name)) {
                        const defaultCategory = localizedDefaults.find(d => d.id === category.id);
                        if (defaultCategory) {
                            return { ...category, name: defaultCategory.name };
                        }
                    }
                    return category;
                });
            } else {
                console.log('分类数据无效，使用默认分类');
                this.categories = getLocalizedDefaultCategories();
            }
        } catch (error) {
            console.warn('加载分类文件失败，使用默认分类:', error);
            this.categories = getLocalizedDefaultCategories();
        }

        return this.categories;
    }

    /**
     * 保存分类数据
     */
    public async saveCategories(): Promise<void> {
        try {
            await this.plugin.saveCategories(this.categories);
        } catch (error) {
            console.error('保存分类失败:', error);
            throw error;
        }
    }

    /**
     * 获取所有分类
     */
    public getCategories(): Category[] {
        return [...this.categories];
    }

    /**
     * 根据ID获取分类
     */
    public getCategoryById(id: string): Category | undefined {
        return this.categories.find(cat => cat.id === id);
    }

    /**
     * 添加新分类
     */
    public async addCategory(category: Omit<Category, 'id'>): Promise<Category> {
        const newCategory: Category = {
            ...category,
            id: `category_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        };

        this.categories.push(newCategory);
        await this.saveCategories();
        return newCategory;
    }

    /**
     * 更新分类
     */
    public async updateCategory(id: string, updates: Partial<Omit<Category, 'id'>>): Promise<boolean> {
        const index = this.categories.findIndex(cat => cat.id === id);
        if (index === -1) {
            return false;
        }

        this.categories[index] = { ...this.categories[index], ...updates };
        await this.saveCategories();
        return true;
    }

    /**
     * 删除分类
     */
    public async deleteCategory(id: string): Promise<boolean> {
        const index = this.categories.findIndex(cat => cat.id === id);
        if (index === -1) {
            return false;
        }

        this.categories.splice(index, 1);
        await this.saveCategories();
        return true;
    }

    /**
     * 重置为默认分类
     */
    public async resetToDefault(): Promise<void> {
        this.categories = getLocalizedDefaultCategories();
        await this.saveCategories();
    }

    /**
     * 获取分类的样式
     */
    public getCategoryStyle(categoryId: string): { backgroundColor: string; borderColor: string } {
        const category = this.getCategoryById(categoryId);
        if (!category) {
            return { backgroundColor: '#95a5a6', borderColor: '#7f8c8d' };
        }

        return {
            backgroundColor: category.color,
            borderColor: this.darkenColor(category.color, 10)
        };
    }

    /**
     * 获取分类标签样式（根据分类名称生成浅色背景，黑色文字）
     * 使用两套精心搭配的柔和色板，避免随机 hash 产生脏色
     *
     * 清新系：蓝/青/绿/紫 → 专业沉静
     * 暖色系：桃/珊瑚/橙/棕 → 温暖柔和
     */
    public getCategoryLabelStyle(category?: Category): { backgroundColor: string; borderColor: string; textColor: string } {
        if (!category) {
            return {
                backgroundColor: 'hsla(210, 10%, 85%, 0.5)',
                borderColor: 'hsla(210, 10%, 70%, 0.5)',
                textColor: '#000000'
            };
        }

        const seed = category.name || category.id || 'category';
        const colorIndex = this.hashToPaletteIndex(seed);
        const { bg, border, text } = CATEGORY_PALETTE[colorIndex];

        return {
            backgroundColor: bg,
            borderColor: border,
            textColor: text
        };
    }

    /**
     * 加深颜色
     */
    private darkenColor(color: string, percent: number): string {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    /**
     * 将文本稳定映射为色板索引（0-15），使用两套柔和色板
     */
    private hashToPaletteIndex(text: string): number {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
        }
        return hash % CATEGORY_PALETTE.length;
    }

    /**
     * 重新排序分类
     */
    public async reorderCategories(reorderedCategories: Category[]): Promise<void> {
        // 验证传入的分类数组
        if (!Array.isArray(reorderedCategories)) {
            throw new Error('重排序的分类必须是数组');
        }

        // 验证分类数量是否匹配
        if (reorderedCategories.length !== this.categories.length) {
            throw new Error('重排序的分类数量不匹配');
        }

        // 验证所有分类ID都存在
        const currentIds = new Set(this.categories.map(cat => cat.id));
        const reorderedIds = new Set(reorderedCategories.map(cat => cat.id));

        if (currentIds.size !== reorderedIds.size ||
            ![...currentIds].every(id => reorderedIds.has(id))) {
            throw new Error('重排序的分类ID不匹配');
        }

        // 更新分类顺序
        this.categories = [...reorderedCategories];
        await this.saveCategories();
    }
}
