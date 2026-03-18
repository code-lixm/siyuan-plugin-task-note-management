import { sql, openBlock, createDocWithMd, getNotebookConf, getSystemConf, lsNotebooks, renameDocByID } from "../api";

export interface DailyNote {
    id: string;
    path: string;
    date: string;
    created: string;
    updated: string;
}

export class DailyNoteManager {
    private static instance: DailyNoteManager;
    private cache: Map<string, DailyNote> = new Map();
    private cacheExpiry: number = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000;

    private constructor() {}

    public static getInstance(): DailyNoteManager {
        if (!DailyNoteManager.instance) {
            DailyNoteManager.instance = new DailyNoteManager();
        }
        return DailyNoteManager.instance;
    }

    public clearCache(): void {
        this.cache.clear();
        this.cacheExpiry = 0;
    }

    private isCacheExpired(): boolean {
        return Date.now() > this.cacheExpiry;
    }

    private updateCacheExpiry(): void {
        this.cacheExpiry = Date.now() + this.CACHE_DURATION;
    }

    private getDailyNoteFlagKey(date: string): string {
        return `custom-dailynote-${date}`;
    }

    private async sleep(ms: number): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, ms));
    }

    private async forceRefreshDocTreeIcon(docId: string, title: string): Promise<void> {
        const normalizedTitle = (title || '').trim();
        if (!normalizedTitle) {
            return;
        }

        const tempTitle = `${normalizedTitle} `;
        try {
            await renameDocByID(docId, tempTitle);
            await this.sleep(80);
            await renameDocByID(docId, normalizedTitle);
        } catch (error) {
            console.warn('强制刷新文档树图标失败:', error);
        }
    }

    private extractDocVisualAttrsFromTemplateContent(content: string): Record<string, string> {
        const attrs: Record<string, string> = {};
        if (!content) return attrs;

        const ialMatches = content.match(/\{:[^\n]*\}/g) || [];
        const lastIAL = ialMatches.length ? ialMatches[ialMatches.length - 1] : '';
        if (!lastIAL) return attrs;

        const capture = (key: string): string => {
            const re = new RegExp(`${key}=(?:\"([^\"]*)\"|'([^']*)'|([^\\s\\}]+))`);
            const m = lastIAL.match(re);
            return (m?.[1] || m?.[2] || m?.[3] || '').trim();
        };

        const icon = capture('icon');
        const titleImg = capture('title-img');
        if (icon) attrs['icon'] = this.normalizeIconAttr(icon);
        if (titleImg) attrs['title-img'] = titleImg;
        return attrs;
    }

    private normalizeIconAttr(icon: string): string {
        let value = (icon || '').trim();
        while (value.includes('&amp;')) {
            value = value.replace(/&amp;/g, '&');
        }
        return value;
    }

    private async openDailyNoteWithRetry(notebookId: string, date: string, preferredId?: string): Promise<boolean> {
        const tryOpen = async (id?: string): Promise<boolean> => {
            if (!id) return false;
            try {
                await openBlock(id);
                return true;
            } catch {
                return false;
            }
        };

        if (await tryOpen(preferredId)) {
            return true;
        }

        await this.sleep(120);
        this.clearCache();
        const refreshed = await this.getDailyNote(notebookId, date);
        if (await tryOpen(refreshed?.id)) {
            return true;
        }

        await this.sleep(220);
        this.clearCache();
        const refreshed2 = await this.getDailyNote(notebookId, date);
        return tryOpen(refreshed2?.id);
    }

    private normalizeDocPath(rawPath: string): string {
        let path = (rawPath || '').trim();
        if ((path.startsWith('"') && path.endsWith('"')) || (path.startsWith("'") && path.endsWith("'"))) {
            path = path.slice(1, -1);
        }
        if (!path.startsWith('/')) {
            path = `/${path}`;
        }
        if (path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        if (path.endsWith('.md')) {
            path = path.slice(0, -3);
        }
        return path;
    }

    private normalizeTemplatePath(rawPath: string): string {
        let path = (rawPath || '').trim();
        if (!path) {
            return '';
        }
        if ((path.startsWith('"') && path.endsWith('"')) || (path.startsWith("'") && path.endsWith("'"))) {
            path = path.slice(1, -1);
        }
        if (!path.startsWith('/')) {
            path = `/${path}`;
        }

        path = path.replace(/\/+/g, '/');
        return path;
    }

    private joinPath(base: string, sub: string): string {
        const a = (base || '').replace(/\/+$/, '');
        const b = (sub || '').replace(/^\/+/, '');
        return `${a}/${b}`;
    }

    private async resolveTemplateAbsolutePath(rawPath: string): Promise<string> {
        const normalized = this.normalizeTemplatePath(rawPath);
        if (!normalized) {
            return '';
        }

        const systemConf = await getSystemConf();
        const dataDir = systemConf?.conf?.system?.dataDir || '';

        if (!dataDir) {
            return normalized;
        }

        if (normalized.startsWith('/data/templates/')) {
            const rel = normalized.replace(/^\/data\/templates\/?/, '');
            return this.joinPath(this.joinPath(dataDir, 'templates'), rel);
        }

        if (normalized.startsWith('/data/')) {
            const rel = normalized.replace(/^\/data\/?/, '');
            return this.joinPath(dataDir, rel);
        }

        if (normalized.startsWith('/')) {
            const rel = normalized.replace(/^\/+/, '');
            return this.joinPath(this.joinPath(dataDir, 'templates'), rel);
        }

        return normalized;
    }


    private async resolveDailyDocPath(notebookId: string, date: string): Promise<string> {
        const notebookConf = await getNotebookConf(notebookId);
        let pathTemplate = notebookConf?.conf?.dailyNoteSavePath || '/daily-notes/{{now | date "2006-01-02"}}';

        const year = date.substring(0, 4);
        const month = date.substring(4, 6);
        const day = date.substring(6, 8);
        const dateDashed = `${year}-${month}-${day}`;

        pathTemplate = pathTemplate.replace(/\{\{\s*now\s*\|\s*date\s*["']2006-01-02["']\s*\}\}/g, dateDashed);
        pathTemplate = pathTemplate.replace(/\{\{\s*now\s*\|\s*date\s*["']20060102["']\s*\}\}/g, date);
        pathTemplate = pathTemplate.replace(/\{\{\s*now\s*\|\s*date\s*["']200601["']\s*\}\}/g, `${year}${month}`);
        pathTemplate = pathTemplate.replace(/\{\{\s*now\s*\|\s*date\s*["']2006["']\s*\}\}/g, year);
        pathTemplate = pathTemplate.replace(/\{\{\s*now\s*\|\s*date\s*["']06["']\s*\}\}/g, year.substring(2));
        pathTemplate = pathTemplate.replace(/\{\{\s*now\s*\|\s*date\s*["']01["']\s*\}\}/g, month);
        pathTemplate = pathTemplate.replace(/\{\{\s*now\s*\|\s*date\s*["']02["']\s*\}\}/g, day);

        const { renderSprig } = await import('../api');
        const rendered = await renderSprig(pathTemplate);
        let docPath = this.normalizeDocPath(rendered);

        const hasUnresolvedTemplate = docPath.includes('{{') || docPath.includes('}}');
        const segments = docPath.split('/').filter(Boolean);
        const looksRootSingleFile = segments.length <= 1;

        if (hasUnresolvedTemplate || looksRootSingleFile || docPath === '/') {
            docPath = `/${year}/${month}/${dateDashed}`;
        }

        return docPath;
    }

    public async queryDailyNotes(
        notebookId: string,
        startDate: string,
        endDate: string
    ): Promise<DailyNote[]> {
        if (!notebookId) {
            return [];
        }

        if (!this.isCacheExpired() && this.cache.size > 0) {
            const cached = this.getCachedDailyNotesInRange(startDate, endDate);
            if (cached.length > 0) {
                return cached;
            }
        }

        try {
            const sqlQuery = `
                SELECT b.id, b.path, b.created, b.updated,
                    CASE
                        WHEN a.name = 'custom-dailynote-yyyymmdd' THEN a.value
                        WHEN a.name LIKE 'custom-dailynote-________' THEN substr(a.name, 18, 8)
                        ELSE ''
                    END as dateTag
                FROM blocks b
                JOIN attributes a ON b.id = a.block_id
                WHERE b.box = '${notebookId}'
                    AND b.type = 'd'
                    AND (
                        (a.name = 'custom-dailynote-yyyymmdd' AND a.value >= '${startDate}' AND a.value <= '${endDate}')
                        OR (a.name LIKE 'custom-dailynote-________' AND substr(a.name, 18, 8) >= '${startDate}' AND substr(a.name, 18, 8) <= '${endDate}')
                    )
                ORDER BY dateTag
            `;

            const result = await sql(sqlQuery);

            if (result && Array.isArray(result)) {
                const dailyNotes: DailyNote[] = result.map((row: any) => ({
                    id: row.id,
                    path: row.path,
                    date: row.dateTag,
                    created: row.created,
                    updated: row.updated
                }));

                dailyNotes.forEach(note => {
                    this.cache.set(note.date, note);
                });
                this.updateCacheExpiry();

                return dailyNotes;
            }
        } catch (error) {
            console.error('查询日记列表失败:', error);
        }

        return [];
    }

    private getCachedDailyNotesInRange(startDate: string, endDate: string): DailyNote[] {
        const notes: DailyNote[] = [];
        const start = parseInt(startDate);
        const end = parseInt(endDate);

        for (const [date, note] of this.cache.entries()) {
            const dateNum = parseInt(date);
            if (dateNum >= start && dateNum <= end) {
                notes.push(note);
            }
        }

        return notes;
    }

    public async getDailyNote(notebookId: string, date: string): Promise<DailyNote | null> {
        if (!notebookId || !date) {
            return null;
        }

        if (!this.isCacheExpired() && this.cache.has(date)) {
            return this.cache.get(date) || null;
        }

        try {
            const year = date.substring(0, 4);
            const month = date.substring(4, 6);
            const day = date.substring(6, 8);
            const dateDashed = `${year}-${month}-${day}`;

            const { setBlockAttrs } = await import('../api');
            const docPath = await this.resolveDailyDocPath(notebookId, date);

            const exactQuery = `
                SELECT b.id, b.path, b.hpath, b.created, b.updated
                FROM blocks b
                WHERE b.box = '${notebookId}'
                  AND b.type = 'd'
                  AND (
                    b.hpath = '${docPath}'
                    OR b.path = '${docPath}'
                    OR b.path = '${docPath}.sy'
                  )
                ORDER BY CASE WHEN b.hpath = '${docPath}' THEN 0 ELSE 1 END, LENGTH(b.path) ASC
                LIMIT 1
            `;

            let result = await sql(exactQuery);

            if (!result || !Array.isArray(result) || result.length === 0) {
                const fallbackQuery = `
                    SELECT b.id, b.path, b.hpath, b.created, b.updated
                    FROM blocks b
                    WHERE b.box = '${notebookId}'
                      AND b.type = 'd'
                      AND (
                        b.hpath LIKE '%/${dateDashed}'
                        OR b.path LIKE '%/${dateDashed}'
                        OR b.path LIKE '%/${dateDashed}.sy'
                        OR b.path LIKE '%/${date}'
                        OR b.path LIKE '%/${date}.sy'
                      )
                    ORDER BY LENGTH(b.path) ASC
                    LIMIT 1
                `;
                result = await sql(fallbackQuery);
            }

            if (result && Array.isArray(result) && result.length > 0) {
                const row = result[0];
                const note: DailyNote = {
                    id: row.id,
                    path: row.hpath || row.path,
                    date,
                    created: row.created,
                    updated: row.updated
                };

                this.cache.set(date, note);

                try {
                    const dateFlagKey = this.getDailyNoteFlagKey(date);
                    const year = date.substring(0, 4);
                    const month = date.substring(4, 6);
                    const day = date.substring(6, 8);
                    const dateDashed = `${year}-${month}-${day}`;
                    const dynamicDailyIcon = `api/icon/getDynamicIcon?type=6&date=${dateDashed}&color=red`;

                    const iconQuery = `
                        SELECT value
                        FROM attributes
                        WHERE block_id = '${note.id}'
                          AND name = 'icon'
                        LIMIT 1
                    `;
                    const iconRows = await sql(iconQuery);
                    const iconValue = Array.isArray(iconRows) && iconRows.length > 0 ? (iconRows[0]?.value || '') : '';
                    const needFixIcon = !iconValue || iconValue.includes('&amp;amp;');

                    const attrs: Record<string, string> = {
                        [dateFlagKey]: date
                    };
                    if (needFixIcon) {
                        attrs.icon = dynamicDailyIcon;
                    }

                    await setBlockAttrs(note.id, attrs);
                } catch (attrError) {
                    console.warn('设置日记属性失败:', attrError);
                }

                return note;
            }
        } catch (error) {
            console.error('获取日记失败:', error);
        }

        return null;
    }

    public async hasDailyNote(notebookId: string, date: string): Promise<boolean> {
        const note = await this.getDailyNote(notebookId, date);
        return note !== null;
    }

    public async openDailyNote(notebookId: string, date: string): Promise<boolean> {
        const note = await this.getDailyNote(notebookId, date);
        if (note) {
            return this.openDailyNoteWithRetry(notebookId, date, note.id);
        }
        return false;
    }

    public async createDailyNote(
        notebookId: string,
        date: string
    ): Promise<DailyNote | null> {
        if (!notebookId || !date) {
            return null;
        }

        try {
            // 1. 检查是否已存在
            const existing = await this.getDailyNote(notebookId, date);
            if (existing) {
                return existing;
            }

            // 2. 获取笔记本配置的路径模板
            const notebookConf = await getNotebookConf(notebookId);
            const docPath = await this.resolveDailyDocPath(notebookId, date);
            
            // 5. 创建空文档
            const docId = await createDocWithMd(notebookId, docPath, '');

            if (docId) {
                let visualAttrs: Record<string, string> = {};
                // 6. 如果有模板，渲染并插入
                const templatePath = await this.resolveTemplateAbsolutePath(notebookConf?.conf?.dailyNoteTemplatePath || '');
                if (templatePath) {
                    try {
                        const { render } = await import('../api');
                        const res = await render(docId, templatePath);
                        if (res && res.content) {
                            visualAttrs = this.extractDocVisualAttrsFromTemplateContent(res.content);
                            const { prependBlock } = await import('../api');
                            await prependBlock('dom', res.content, docId);
                        }
                    } catch (templateError) {
                        console.warn('渲染模板失败:', templateError);
                    }
                }
                
                // 7. 设置自定义属性标记为日记
                const { setBlockAttrs } = await import('../api');
                const dateFlagKey = this.getDailyNoteFlagKey(date);
                const year = date.substring(0, 4);
                const month = date.substring(4, 6);
                const day = date.substring(6, 8);
                const dateDashed = `${year}-${month}-${day}`;
                const dynamicDailyIcon = `api/icon/getDynamicIcon?type=6&date=${dateDashed}&color=red`;
                const attrs: Record<string, string> = {
                    ...visualAttrs,
                    icon: this.normalizeIconAttr(visualAttrs.icon || dynamicDailyIcon),
                    [dateFlagKey]: date
                };
                await setBlockAttrs(docId, attrs);

                await this.forceRefreshDocTreeIcon(docId, dateDashed);

                const note: DailyNote = {
                    id: docId,
                    path: docPath,
                    date: date,
                    created: new Date().toISOString(),
                    updated: new Date().toISOString()
                };

                this.cache.set(date, note);
                return note;
            }
        } catch (error) {
            console.error('创建日记失败:', error);
        }

        return null;
    }

    public async getOrCreateDailyNote(
        notebookId: string,
        date: string
    ): Promise<DailyNote | null> {
        const existing = await this.getDailyNote(notebookId, date);
        if (existing) {
            return existing;
        }
        return this.createDailyNote(notebookId, date);
    }

    public async openOrCreateDailyNote(
        notebookId: string,
        date: string
    ): Promise<boolean> {
        if (!notebookId) {
            console.warn('未设置默认笔记本');
            return false;
        }

        try {
            const opened = await this.openDailyNote(notebookId, date);
            if (opened) {
                return true;
            }

            const created = await this.createDailyNote(notebookId, date);
            if (created) {
                return this.openDailyNoteWithRetry(notebookId, date, created.id);
            }
        } catch (error) {
            console.error('打开或创建日记失败:', error);
        }

        return false;
    }

    public async getNotebooks(): Promise<Array<{ id: string; name: string }>> {
        try {
            const result = await lsNotebooks();
            if (result && result.notebooks) {
                return result.notebooks.map((nb: any) => ({
                    id: nb.id,
                    name: nb.name
                }));
            }
        } catch (error) {
            console.error('获取笔记本列表失败:', error);
        }
        return [];
    }

    public async getYearDailyNotes(
        notebookId: string,
        year: string
    ): Promise<DailyNote[]> {
        const startDate = `${year}0101`;
        const endDate = `${year}1231`;
        return this.queryDailyNotes(notebookId, startDate, endDate);
    }

    public async getMonthDailyNotes(
        notebookId: string,
        yearMonth: string
    ): Promise<DailyNote[]> {
        const year = yearMonth.substring(0, 4);
        const month = yearMonth.substring(4, 6);
        const startDate = `${yearMonth}01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const endDate = `${yearMonth}${lastDay.toString().padStart(2, '0')}`;
        return this.queryDailyNotes(notebookId, startDate, endDate);
    }
}
