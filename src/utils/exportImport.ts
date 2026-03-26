export interface ExportOptions {
  format: 'json' | 'csv';
  includeReminders: boolean;
  includeProjects: boolean;
  includeHabits: boolean;
  dateRange?: { start: Date; end: Date };
}

export interface ImportResult {
  success: boolean;
  imported: {
    reminders: number;
    projects: number;
    habits: number;
  };
  errors: string[];
  warnings: string[];
}

interface PluginDataAPI {
  loadReminderData?: () => Promise<Record<string, any>>;
  saveReminderData?: (data: Record<string, any>) => Promise<void>;
  loadProjectData?: () => Promise<Record<string, any>>;
  saveProjectData?: (data: Record<string, any>) => Promise<void>;
  loadHabitData?: () => Promise<Record<string, any>>;
  saveHabitData?: (data: Record<string, any>) => Promise<void>;
}

const CSV_SECTION_PREFIX = '#TYPE:';
const CSV_HEADERS = {
  reminder: ['id', 'content', 'datetime', 'priority', 'category', 'completed', 'docId', 'createdAt'],
  project: ['id', 'name', 'description', 'status', 'progress', 'createdAt', 'updatedAt'],
  habit: ['id', 'name', 'frequencyType', 'frequencyInterval', 'target', 'groupId', 'createdAt'],
} as const;

export class DataExportImport {
  static async export(plugin: any, options: ExportOptions): Promise<string> {
    const dataApi = plugin as PluginDataAPI;
    const exportData: Record<string, any> = {
      meta: {
        exportedAt: new Date().toISOString(),
        format: options.format,
        version: 1,
      },
    };

    const reminders = options.includeReminders
      ? this.filterByDateRange(this.extractCollection(await dataApi.loadReminderData?.(), 'reminders'), options.dateRange)
      : [];
    const projects = options.includeProjects
      ? this.filterByDateRange(this.extractCollection(await dataApi.loadProjectData?.(), 'projects'), options.dateRange)
      : [];

    let habits: any[] = [];
    let habitGroups: any[] = [];
    if (options.includeHabits) {
      const rawHabitData = await dataApi.loadHabitData?.();
      habits = this.filterByDateRange(this.extractCollection(rawHabitData, 'habits'), options.dateRange);
      habitGroups = this.extractCollection(rawHabitData, 'groups');
    }

    if (options.format === 'json') {
      if (options.includeReminders) exportData.reminders = reminders;
      if (options.includeProjects) exportData.projects = projects;
      if (options.includeHabits) {
        exportData.habits = habits;
        exportData.habitGroups = habitGroups;
      }
      return this.exportJSON(exportData);
    }

    const sections: string[] = [];
    if (options.includeReminders) {
      sections.push(`${CSV_SECTION_PREFIX}reminder`);
      sections.push(this.exportCSV('reminder', reminders));
    }
    if (options.includeProjects) {
      sections.push(`${CSV_SECTION_PREFIX}project`);
      sections.push(this.exportCSV('project', projects));
    }
    if (options.includeHabits) {
      sections.push(`${CSV_SECTION_PREFIX}habit`);
      sections.push(this.exportCSV('habit', habits));
    }

    return sections.join('\n\n').trim();
  }

  private static exportJSON(data: any): string {
    return JSON.stringify(data, null, 2);
  }

  private static exportCSV(type: string, data: any[]): string {
    const headers = this.getHeadersByType(type);
    const rows = [headers.join(',')];

    for (const item of data) {
      const record = this.mapItemToCsvRecord(type, item);
      const values = headers.map((header) => this.escapeCSVValue(record[header]));
      rows.push(values.join(','));
    }

    return rows.join('\n');
  }

  static async import(
    plugin: any,
    content: string,
    format: 'json' | 'csv',
    options?: {
      mergeStrategy: 'replace' | 'merge' | 'skip';
    }
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: {
        reminders: 0,
        projects: 0,
        habits: 0,
      },
      errors: [],
      warnings: [],
    };

    const mergeStrategy = options?.mergeStrategy || 'merge';
    const dataApi = plugin as PluginDataAPI;

    try {
      let importData: {
        reminders?: any[];
        projects?: any[];
        habits?: any[];
        habitGroups?: any[];
      } = {};

      if (format === 'json') {
        const parsed = this.parseJSON(content);
        importData = {
          reminders: this.extractCollection(parsed, 'reminders'),
          projects: this.extractCollection(parsed, 'projects'),
          habits: this.extractCollection(parsed, 'habits'),
          habitGroups: this.extractCollection(parsed, 'habitGroups').length > 0
            ? this.extractCollection(parsed, 'habitGroups')
            : this.extractCollection(parsed, 'groups'),
        };
      } else {
        importData = this.parseCsvPayload(content, result.warnings);
      }

      const currentReminderData = await dataApi.loadReminderData?.();
      const currentProjectData = await dataApi.loadProjectData?.();
      const currentHabitData = await dataApi.loadHabitData?.();

      if (importData.reminders && importData.reminders.length > 0 && dataApi.saveReminderData) {
        const existingReminders = this.extractCollection(currentReminderData, 'reminders');
        const mergedReminders = this.applyMergeStrategy(existingReminders, importData.reminders, mergeStrategy);
        await dataApi.saveReminderData({ reminders: mergedReminders });
        result.imported.reminders = mergedReminders.length - (mergeStrategy === 'merge' ? existingReminders.length : 0);
        if (mergeStrategy === 'replace') {
          result.imported.reminders = importData.reminders.length;
        }
        if (mergeStrategy === 'skip') {
          result.imported.reminders = this.countAddedBySkip(existingReminders, importData.reminders);
        }
      }

      if (importData.projects && importData.projects.length > 0 && dataApi.saveProjectData) {
        const existingProjects = this.extractCollection(currentProjectData, 'projects');
        const mergedProjects = this.applyMergeStrategy(existingProjects, importData.projects, mergeStrategy);
        await dataApi.saveProjectData({ projects: mergedProjects });
        result.imported.projects = mergedProjects.length - (mergeStrategy === 'merge' ? existingProjects.length : 0);
        if (mergeStrategy === 'replace') {
          result.imported.projects = importData.projects.length;
        }
        if (mergeStrategy === 'skip') {
          result.imported.projects = this.countAddedBySkip(existingProjects, importData.projects);
        }
      }

      if (importData.habits && importData.habits.length > 0 && dataApi.saveHabitData) {
        const existingHabits = this.extractCollection(currentHabitData, 'habits');
        const existingGroups = this.extractCollection(currentHabitData, 'groups');
        const mergedHabits = this.applyMergeStrategy(existingHabits, importData.habits, mergeStrategy);
        const groups = importData.habitGroups && importData.habitGroups.length > 0
          ? this.applyMergeStrategy(existingGroups, importData.habitGroups, mergeStrategy)
          : existingGroups;

        await dataApi.saveHabitData({
          habits: mergedHabits,
          groups,
        });

        result.imported.habits = mergedHabits.length - (mergeStrategy === 'merge' ? existingHabits.length : 0);
        if (mergeStrategy === 'replace') {
          result.imported.habits = importData.habits.length;
        }
        if (mergeStrategy === 'skip') {
          result.imported.habits = this.countAddedBySkip(existingHabits, importData.habits);
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  private static parseJSON(content: string): any {
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`JSON 解析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static parseCSV(content: string, type: string): any[] {
    const rows = this.parseCSVRows(content);
    if (rows.length <= 1) {
      return [];
    }

    const headers = rows[0].map((h) => h.trim());
    const records: any[] = [];

    for (let index = 1; index < rows.length; index += 1) {
      const row = rows[index];
      if (row.every((v) => v.trim() === '')) {
        continue;
      }

      const rawRecord: Record<string, string> = {};
      headers.forEach((header, i) => {
        rawRecord[header] = (row[i] || '').trim();
      });

      const mapped = this.mapCsvRecordToItem(type, rawRecord);
      records.push(mapped);
    }

    return records;
  }

  static downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
  }

  static readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsText(file, 'utf-8');
    });
  }

  private static parseCsvPayload(content: string, warnings: string[]): {
    reminders?: any[];
    projects?: any[];
    habits?: any[];
  } {
    const sections = this.splitCsvSections(content);
    const data: {
      reminders?: any[];
      projects?: any[];
      habits?: any[];
    } = {};

    if (sections.length > 0) {
      for (const section of sections) {
        const normalizedType = section.type.toLowerCase();
        if (normalizedType === 'reminder' || normalizedType === 'reminders') {
          data.reminders = this.parseCSV(section.content, 'reminder');
        } else if (normalizedType === 'project' || normalizedType === 'projects') {
          data.projects = this.parseCSV(section.content, 'project');
        } else if (normalizedType === 'habit' || normalizedType === 'habits') {
          data.habits = this.parseCSV(section.content, 'habit');
        } else {
          warnings.push(`忽略未知 CSV 分段类型: ${section.type}`);
        }
      }
      return data;
    }

    const firstLine = content.split(/\r?\n/).find((line) => line.trim().length > 0) || '';
    const header = firstLine.split(',').map((h) => h.trim()).join(',');
    if (header === CSV_HEADERS.reminder.join(',')) {
      data.reminders = this.parseCSV(content, 'reminder');
      return data;
    }
    if (header === CSV_HEADERS.project.join(',')) {
      data.projects = this.parseCSV(content, 'project');
      return data;
    }
    if (header === CSV_HEADERS.habit.join(',')) {
      data.habits = this.parseCSV(content, 'habit');
      return data;
    }

    warnings.push('CSV 内容未包含可识别类型，未导入任何数据');
    return data;
  }

  private static splitCsvSections(content: string): Array<{ type: string; content: string }> {
    const lines = content.split(/\r?\n/);
    const sections: Array<{ type: string; content: string }> = [];
    let currentType = '';
    let currentLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith(CSV_SECTION_PREFIX)) {
        if (currentType && currentLines.length > 0) {
          sections.push({
            type: currentType,
            content: currentLines.join('\n').trim(),
          });
        }
        currentType = line.slice(CSV_SECTION_PREFIX.length).trim();
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }

    if (currentType && currentLines.length > 0) {
      sections.push({
        type: currentType,
        content: currentLines.join('\n').trim(),
      });
    }

    return sections.filter((s) => s.content.length > 0);
  }

  private static parseCSVRows(content: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentValue = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i += 1) {
      const char = content[i];
      const nextChar = content[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        currentRow.push(currentValue);
        currentValue = '';
        continue;
      }

      if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i += 1;
        }
        currentRow.push(currentValue);
        const shouldKeep = currentRow.some((v) => v.trim().length > 0);
        if (shouldKeep) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentValue = '';
        continue;
      }

      currentValue += char;
    }

    if (currentValue.length > 0 || currentRow.length > 0) {
      currentRow.push(currentValue);
      const shouldKeep = currentRow.some((v) => v.trim().length > 0);
      if (shouldKeep) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  private static filterByDateRange(items: any[], dateRange?: { start: Date; end: Date }): any[] {
    if (!dateRange) {
      return items;
    }

    const startMs = dateRange.start.getTime();
    const endMs = dateRange.end.getTime();
    return items.filter((item) => {
      const candidate = this.pickDateField(item);
      if (!candidate) {
        return false;
      }
      const ms = new Date(candidate).getTime();
      return !Number.isNaN(ms) && ms >= startMs && ms <= endMs;
    });
  }

  private static pickDateField(item: Record<string, any>): string | undefined {
    return item.createdAt || item.updatedAt || item.datetime || item.date || item.startDate;
  }

  private static extractCollection(payload: any, key: string): any[] {
    if (!payload) {
      return [];
    }

    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && Array.isArray(payload[key])) {
      return payload[key];
    }

    const values = Object.values(payload);
    const isRecordLike = values.length > 0 && values.every((value) => typeof value === 'object' && value !== null && !Array.isArray(value));
    if (isRecordLike) {
      return values as any[];
    }

    return [];
  }

  private static getHeadersByType(type: string): readonly string[] {
    if (type === 'reminder') return CSV_HEADERS.reminder;
    if (type === 'project') return CSV_HEADERS.project;
    if (type === 'habit') return CSV_HEADERS.habit;
    throw new Error(`不支持的 CSV 类型: ${type}`);
  }

  private static mapItemToCsvRecord(type: string, item: any): Record<string, any> {
    if (type === 'reminder') {
      const date = item.date || '';
      const time = item.time || '';
      const datetime = item.datetime || (date ? `${date}${time ? ` ${time}` : ''}` : '');
      return {
        id: item.id || '',
        content: item.content || item.title || item.note || '',
        datetime,
        priority: item.priority || '',
        category: item.category || item.categoryId || '',
        completed: item.completed === true,
        docId: item.docId || item.blockId || '',
        createdAt: item.createdAt || '',
      };
    }

    if (type === 'project') {
      return {
        id: item.id || '',
        name: item.name || '',
        description: item.description || '',
        status: item.status || '',
        progress: item.progress ?? '',
        createdAt: item.createdAt || '',
        updatedAt: item.updatedAt || '',
      };
    }

    if (type === 'habit') {
      const frequencyType = item.frequencyType || item.frequency?.type || 'daily';
      const frequencyInterval = item.frequencyInterval || item.frequency?.interval || '';
      return {
        id: item.id || '',
        name: item.name || item.title || '',
        frequencyType,
        frequencyInterval,
        target: item.target ?? 1,
        groupId: item.groupId || '',
        createdAt: item.createdAt || '',
      };
    }

    throw new Error(`不支持的 CSV 类型: ${type}`);
  }

  private static mapCsvRecordToItem(type: string, record: Record<string, string>): any {
    if (type === 'reminder') {
      const datetime = record.datetime || '';
      const [datePart, timePart] = datetime.split(/\s+/);
      const now = new Date().toISOString();
      return {
        id: record.id || `reminder_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        title: record.content || '',
        content: record.content || '',
        date: datePart || undefined,
        time: timePart || undefined,
        priority: this.normalizePriority(record.priority),
        categoryId: record.category || undefined,
        completed: this.parseBoolean(record.completed),
        blockId: record.docId || undefined,
        createdAt: record.createdAt || now,
        updatedAt: now,
      };
    }

    if (type === 'project') {
      const now = new Date().toISOString();
      return {
        id: record.id || `project_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        name: record.name || 'Untitled Project',
        description: record.description || undefined,
        status: record.status || undefined,
        progress: this.parseNumber(record.progress),
        createdAt: record.createdAt || now,
        updatedAt: record.updatedAt || now,
      };
    }

    if (type === 'habit') {
      const now = new Date().toISOString();
      return {
        id: record.id || `habit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        title: record.name || 'Untitled Habit',
        target: this.parseNumber(record.target, 1),
        frequency: {
          type: this.normalizeFrequencyType(record.frequencyType),
          interval: this.parseNumber(record.frequencyInterval, undefined),
        },
        groupId: record.groupId || undefined,
        createdAt: record.createdAt || now,
        updatedAt: now,
        checkInEmojis: [],
        checkIns: {},
        totalCheckIns: 0,
        startDate: (record.createdAt || now).slice(0, 10),
      };
    }

    throw new Error(`不支持的 CSV 类型: ${type}`);
  }

  private static applyMergeStrategy(existingItems: any[], incomingItems: any[], strategy: 'replace' | 'merge' | 'skip'): any[] {
    if (strategy === 'replace') {
      return incomingItems;
    }

    const existingMap = new Map<string, any>();
    for (const item of existingItems) {
      const id = this.getItemId(item);
      if (id) {
        existingMap.set(id, item);
      }
    }

    if (strategy === 'skip') {
      const additions = incomingItems.filter((item) => {
        const id = this.getItemId(item);
        return !id || !existingMap.has(id);
      });
      return [...existingItems, ...additions];
    }

    const mergedMap = new Map<string, any>();
    for (const item of existingItems) {
      const id = this.getItemId(item);
      if (id) {
        mergedMap.set(id, item);
      }
    }

    for (const item of incomingItems) {
      const id = this.getItemId(item);
      if (!id) {
        mergedMap.set(`_no_id_${Math.random().toString(36).slice(2)}`, item);
      } else {
        const existing = mergedMap.get(id) || {};
        mergedMap.set(id, { ...existing, ...item });
      }
    }

    return Array.from(mergedMap.values());
  }

  private static countAddedBySkip(existingItems: any[], incomingItems: any[]): number {
    const existingIds = new Set(existingItems.map((item) => this.getItemId(item)).filter(Boolean));
    let added = 0;
    for (const item of incomingItems) {
      const id = this.getItemId(item);
      if (!id || !existingIds.has(id)) {
        added += 1;
      }
    }
    return added;
  }

  private static getItemId(item: any): string | undefined {
    if (!item || typeof item !== 'object') {
      return undefined;
    }
    if (typeof item.id === 'string' && item.id.trim().length > 0) {
      return item.id;
    }
    return undefined;
  }

  private static escapeCSVValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private static parseBoolean(value: string): boolean {
    const normalized = (value || '').trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }

  private static parseNumber(value: string, fallback: any = undefined): number | undefined {
    const normalized = (value || '').trim();
    if (!normalized) {
      return fallback;
    }
    const num = Number(normalized);
    return Number.isNaN(num) ? fallback : num;
  }

  private static normalizePriority(priority: string): 'low' | 'medium' | 'high' | undefined {
    const normalized = (priority || '').toLowerCase();
    if (normalized === 'low' || normalized === 'medium' || normalized === 'high') {
      return normalized;
    }
    return undefined;
  }

  private static normalizeFrequencyType(type: string): 'daily' | 'weekly' | 'monthly' | 'yearly' {
    const normalized = (type || '').toLowerCase();
    if (normalized === 'daily' || normalized === 'weekly' || normalized === 'monthly' || normalized === 'yearly') {
      return normalized;
    }
    return 'daily';
  }
}
