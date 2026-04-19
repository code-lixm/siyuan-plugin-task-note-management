import { Dialog, showMessage, Menu, platformUtils } from "siyuan";

import { i18n } from "../pluginInstance";
import { getLocalDateString, getLogicalDateString, getLocaleTag } from "../utils/dateUtils";
import { ProjectManager } from "../utils/projectManager";

import { generateRepeatInstances } from "@/utils/repeatUtils";
import { CalendarView } from "@/components/CalendarView";
import { PomodoroRecordManager } from "@/utils/pomodoroRecord";

export class TaskSummaryDialog {
  private calendarView: CalendarView;
  private projectManager: ProjectManager;
  private calendar: any;
  private plugin: any;
  private lute: any;

  private currentDialog: Dialog;
  private currentFilter: string = 'current'; // 'current', 'today', 'tomorrow', 'yesterday', 'thisWeek', 'nextWeek', 'lastWeek', 'thisMonth', 'lastMonth'
  private currentFocusFilter: string = 'all'; // 'all', 'open', 'high', 'overdue', 'undated'
  private currentSemanticFilter: string = 'auto'; // 'auto', 'today', 'next7', 'overdue', 'history'
  private shouldAutoPickFocus: boolean = true;
  private completedSectionsExpanded: boolean = false;
  private lastGroupedTasks: Map<string, Map<string, any[]>> | null = null;
  private lastStats: any = null;

  constructor(calendar?: any, plugin?: any) {
    this.projectManager = ProjectManager.getInstance(plugin);
    this.calendar = calendar;
    this.plugin = plugin;

    // 初始化 Lute
    try {
      if ((window as any).Lute) {
        this.lute = (window as any).Lute.New();
      }
    } catch (e) {
      console.error('初始化 Lute 失败:', e);
    }
  }

  private formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h > 0) {
      return `${h} ${i18n('hourSymbol')} ${m} ${i18n('minuteSymbol')}`;
    }
    return `${m} ${i18n('minuteSymbol')}`;
  }

  private getDisplayTimeForDate(task: any, date: string): string {
    // 返回不带前后空格的时间区间字符串，例如 "(14:49-19:49)" 或 "(14:49-23:59)"，若无时间返回空字符串
    const sd = task.fullStartDate;
    const ed = task.fullEndDate;
    const st = task.time;
    const et = task.endTime;

    const wrap = (s: string) => s ? ` (${s})` : '';

    if (!sd && !ed) {
      if (st) return wrap(st + (et ? `-${et}` : ''));
      return '';
    }

    if (!ed || sd === ed) {
      if (st && et) return wrap(`${st}-${et}`);
      if (st) return wrap(st);
      return '';
    }

    // 跨天任务
    if (date === sd) {
      if (st) return wrap(`${st}-23:59`);
      return wrap(i18n('allDay'));
    }

    if (date === ed) {
      if (et) return wrap(`00:00-${et}`);
      return wrap(i18n('allDay'));
    }

    // 中间天
    return wrap(`00:00-23:59`);
  }

  private formatMonthDay(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return i18n('monthDayTemplate').replace('${m}', m.toString()).replace('${d}', day.toString());
  }

  /**
   * 格式化完成时间
   * @param completedTime 完成时间字符串，格式为 "YYYY-MM-DD HH:mm" 或 ISO字符串
   * @param taskDate 任务所在的日期（YYYY-MM-DD格式），这是任务的逻辑日期
   */
  private formatCompletedTime(completedTime: string, taskDate: string): string {
    if (!completedTime) return '';

    // 提取实际完成日期（从原始字符串中提取，避免时区转换问题）
    let actualCompletedDateStr: string;
    // "YYYY-MM-DD HH:mm" 格式: "2026-01-20 01:31"
    actualCompletedDateStr = completedTime.split(' ')[0];
    // 处理 "YYYY-MM-DD HH:mm" 格式，转换为可解析的日期格式
    let completed: Date;
    completed = new Date(completedTime.replace(' ', 'T') + ':00');

    const timeStr = completed.toLocaleTimeString(getLocaleTag(), { hour: '2-digit', minute: '2-digit' });

    // 使用 getLogicalDateString 获取完成时间的逻辑日期（仅用于比较）
    // 例如：如果一天开始时间设置为03:00，则2026-01-20 02:30的逻辑日期是2026-01-19
    const completedLogicalDate = getLogicalDateString(completed);

    // 比较任务的逻辑日期和完成时间的逻辑日期是否为同一天
    // taskDate 已经是任务的逻辑日期（从 reminder.date 获取）
    if (completedLogicalDate === taskDate) {
      // 同一天：只显示时间
      return i18n('completedAtTemplate').replace('${time}', timeStr);
    } else {
      // 不同天：显示实际完成日期+时间
      // 注意：这里显示的是实际完成时间的日期（从原始字符串提取），而不是逻辑日期
      const dateStr = this.formatMonthDay(actualCompletedDateStr);
      return i18n('completedAtWithDateTemplate').replace('${date}', dateStr).replace('${time}', timeStr);
    }
  }

  private formatRepeatLabel(repeat: any, startDate?: string): string {
    if (!repeat || !repeat.type) return '';
    const interval = repeat.interval || 1;
    switch (repeat.type) {
      case 'daily':
        return interval === 1 ? `🔄 ${i18n('daily') || '每天'}` : `🔄 ${i18n('every') || '每'}${interval}${i18n('days') || '天'}`;
      case 'weekly': {
        // 优先使用配置中的 weekDays
        if (repeat.weekDays && repeat.weekDays.length > 0) {
          const days = repeat.weekDays.map((d: number) => {
            const keys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            return i18n(keys[d]);
          }).join('、');
          return `🔄 ${i18n('weekly') || '每周'} (${days})`;
        }
        // 如果没有显式 weekDays，尝试从 startDate 推断单一星期几
        if (startDate) {
          try {
            const sd = new Date(startDate + 'T00:00:00');
            const d = sd.getDay();
            const keys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayLabel = i18n(keys[d]);
            return `🔄 ${i18n('weekly') || '每周'}${dayLabel}`;
          } catch (e) {
            // fallback
          }
        }
        return interval === 1 ? `🔄 ${i18n('weekly') || '每周'}` : `🔄 ${i18n('every') || '每'}${interval}${i18n('weeks') || '周'}`;
      }
      case 'monthly': {
        if (repeat.monthDays && repeat.monthDays.length > 0) {
          return `🔄 ${i18n('monthly') || '每月'} (${repeat.monthDays.join('、')}${i18n('day') || '日'})`;
        }
        return interval === 1 ? `🔄 ${i18n('monthly') || '每月'}` : `🔄 ${i18n('every') || '每'}${interval}${i18n('months') || '月'}`;
      }
      case 'yearly':
        return `🔄 ${i18n('yearly') || '每年'}`;
      case 'custom': {
        const parts: string[] = [];
        if (repeat.weekDays && repeat.weekDays.length) {
          const days = repeat.weekDays.map((d: number) => i18n(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][d]));
          parts.push(`${i18n('weekly') || '每周'}(${days.join('、')})`);
        }
        if (repeat.monthDays && repeat.monthDays.length) {
          parts.push(`${i18n('monthly') || '每月'}(${repeat.monthDays.join('、')}${i18n('day') || '日'})`);
        }
        if (repeat.months && repeat.months.length) {
          parts.push(`${i18n('yearly') || '每年'}(${repeat.months.join('、')}${i18n('month') || '月'})`);
        }
        return `🔄 ${parts.join(' ')}`;
      }
      case 'ebbinghaus':
        return `🔄 ${i18n('ebbinghaus') || '艾宾浩斯'}`;
      case 'lunar-monthly':
        return `🔄 ${i18n('lunarMonthly') || '农历每月'}`;
      case 'lunar-yearly':
        return `🔄 ${i18n('lunarYearly') || '农历每年'}`;
      default:
        return '';
    }
  }

  /**
   * 显示任务摘要弹窗
   */
  public async showTaskSummaryDialog() {
    try {
      this.currentFilter = 'current';
      this.currentFocusFilter = 'all';
      this.currentSemanticFilter = 'auto';
      this.shouldAutoPickFocus = true;
      this.completedSectionsExpanded = false;

      // 创建弹窗
      this.currentDialog = new Dialog({
        title: i18n("taskSummary"),
        content: `<div id="task-summary-dialog-container" style="height: 100%; display: flex; flex-direction: column;"></div>`,
        width: "90vw",
        height: "85vh"
      });

      this.renderSummary();
    } catch (error) {
      console.error('显示任务摘要失败:', error);
      showMessage(i18n("showSummaryFailed"));
    }
  }

  private async renderSummary() {
    const container = this.currentDialog.element.querySelector('#task-summary-dialog-container') as HTMLElement;
    if (!container) return;

    container.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%;"><svg class="ft__loading"><use xlink:href="#iconLoading"></use></svg></div>`;

    const dateRange = this.getFilterDateRange();
    const logicalToday = getLogicalDateString();
    if (this.shouldAutoPickFocus) {
      // 智能默认：当前/未来优先看未完成，纯历史范围回到全部视图
      this.currentFocusFilter = dateRange.end < logicalToday ? 'all' : 'open';
    }
    const events = await this.getEventsForRange(dateRange.start, dateRange.end);

    // 获取统计数据 (stats need to be calculated first to identify tasks worked on)
    const stats = await this.calculateStats(dateRange.start, dateRange.end);

    // 过滤在当前视图范围内的任务
    const filteredEvents = this.filterEventsByDateRange(events, dateRange);

    // 按日期和项目分组任务
    const groupedTasks = this.groupTasksByDateAndProject(filteredEvents, dateRange, stats, events);

    // 保存上次生成的数据，供复制使用
    this.lastGroupedTasks = groupedTasks;
    this.lastStats = stats;

    container.innerHTML = this.generateSummaryContent(groupedTasks, dateRange, stats);

    this.bindSummaryEvents();
  }

  private getFilterDateRange(): { start: string, end: string, label: string } {
    if (this.currentSemanticFilter !== 'auto') {
      return this.getSemanticRange(this.currentSemanticFilter);
    }
    if (this.currentFilter === 'current') {
      const range = this.getCurrentViewDateRange();
      return { ...range, label: this.getCurrentViewInfo() };
    }
    return this.getRange(this.currentFilter);
  }

  private getSemanticRange(type: string): { start: string, end: string, label: string } {
    const logicalToday = getLogicalDateString();
    const todayDate = new Date(logicalToday);

    switch (type) {
      case 'today':
        return {
          start: logicalToday,
          end: logicalToday,
          label: i18n('summarySemanticTodayLabel') || i18n('today')
        };
      case 'next3': {
        const endDate = new Date(todayDate);
        endDate.setDate(endDate.getDate() + 2);
        return {
          start: logicalToday,
          end: getLocalDateString(endDate),
          label: i18n('summarySemanticNext3Label') || '未来3天'
        };
      }
      case 'next7': {
        const endDate = new Date(todayDate);
        endDate.setDate(endDate.getDate() + 6);
        return {
          start: logicalToday,
          end: getLocalDateString(endDate),
          label: i18n('summarySemanticNext7Label') || (i18n('nextWeek') || '未来7天')
        };
      }
      case 'overdue': {
        const startDate = new Date(todayDate);
        startDate.setDate(startDate.getDate() - 30);
        return {
          start: getLocalDateString(startDate),
          end: logicalToday,
          label: i18n('summarySemanticOverdueLabel') || '近30天（含今天）'
        };
      }
      case 'history': {
        const startDate = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1);
        const endDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), 0);
        return {
          start: getLocalDateString(startDate),
          end: getLocalDateString(endDate),
          label: i18n('summarySemanticHistoryLabel') || i18n('lastMonth')
        };
      }
      default:
        return this.getRange(this.currentFilter);
    }
  }

  private async getEventsForRange(startDate: string, endDate: string) {
    try {
      const reminderData = await this.plugin.loadReminderData() || {};
      const events = [];

      for (const reminder of Object.values(reminderData) as any[]) {
        if (!reminder || typeof reminder !== 'object') continue;

        if (reminder.repeat?.enabled) {
          const repeatInstances = generateRepeatInstances(reminder, startDate, endDate);

          // 检查生成的实例中是否有与原始日期相同的
          const sameDateInstance = repeatInstances.find(i => i.date === reminder.date);

          // 只有当没有同日期的实例时，才添加原始事件
          // (如果有了同日期的实例，我们希望使用实例对象代替原始对象，以便具有唯一的实例ID)
          if (!sameDateInstance) {
            this.addEventToList(events, reminder, reminder.id, false);
          }

          repeatInstances.forEach(instance => {
            // 现在不再跳过与原始事件相同日期的实例
            // 如果日期相同，上面的逻辑已经阻止了原始事件的添加，所以这里添加实例是安全的替代

            const originalKey = instance.date;

            // 检查实例级别的完成状态
            const completedInstances = reminder.repeat?.completedInstances || [];
            const isInstanceCompleted = completedInstances.includes(originalKey);

            // 检查实例级别的修改
            const instanceModifications = reminder.repeat?.instanceModifications || {};
            const instanceMod = instanceModifications[originalKey];

            const instanceReminder = {
              ...reminder,
              date: instance.date,
              endDate: instance.endDate,
              time: instance.time,
              endTime: instance.endTime,
              completed: isInstanceCompleted,
              note: instanceMod?.note || '',
              docTitle: reminder.docTitle
            };

            const uniqueInstanceId = `${reminder.id}_${originalKey}`;
            this.addEventToList(events, instanceReminder, uniqueInstanceId, true, reminder.id);
          });
        } else {
          // 非重复任务，直接添加
          this.addEventToList(events, reminder, reminder.id, false);
        }
      }

      return events;
    } catch (error) {
      console.error('获取事件数据失败:', error);
      return [];
    }
  }

  private async calculateStats(startDate: string, endDate: string) {
    const settings = await this.plugin.loadSettings();
    const reminderData = await this.plugin.loadReminderData() || {};

    // 1. 番茄钟统计
    const pomodoroManager = PomodoroRecordManager.getInstance(this.plugin);
    await pomodoroManager.initialize();


    let totalPomodoros = 0;
    let totalMinutes = 0;
    const pomodoroByDate: { [date: string]: { count: number, minutes: number, taskStats: any } } = {};

    // 1.1 计算所有任务的历史累计数据 (All-time stats)
    const allRecords = (pomodoroManager as any).records || {};
    const rawAllTimeStats: { [id: string]: { count: number, minutes: number } } = {};

    Object.keys(allRecords).forEach(dateStr => {
      const record = allRecords[dateStr];
      if (record && record.sessions) {
        record.sessions.forEach((s: any) => {
          if (s.type === 'work') {
            const evtId = s.eventId;
            if (evtId) {
              if (!rawAllTimeStats[evtId]) rawAllTimeStats[evtId] = { count: 0, minutes: 0 };
              rawAllTimeStats[evtId].count += pomodoroManager.calculateSessionCount(s);
              rawAllTimeStats[evtId].minutes += s.duration || 0;
            }
          }
        });
      }
    });

    // 1.2 向上冒泡累加 All-time Stats
    const allTimeTaskStats: { [id: string]: { count: number, minutes: number } } = {};
    Object.keys(rawAllTimeStats).forEach(id => {
      if (!allTimeTaskStats[id]) allTimeTaskStats[id] = { count: 0, minutes: 0 };
      allTimeTaskStats[id].count += rawAllTimeStats[id].count;
      allTimeTaskStats[id].minutes += rawAllTimeStats[id].minutes;
    });

    Object.keys(rawAllTimeStats).forEach(sourceId => {
      let currentId = sourceId;
      const statsToAdd = rawAllTimeStats[sourceId];
      let depth = 0;
      while (depth < 20) {
        let parentId: string | null = null;
        const reminder = reminderData[currentId];

        if (reminder && reminder.parentId) {
          parentId = reminder.parentId;
        } else if (!reminder && currentId.includes('_')) {
          // 尝试从实例ID中提取原始ID (instanceId = originalId_date)
          const lastIdx = currentId.lastIndexOf('_');
          if (lastIdx > 0) {
            parentId = currentId.substring(0, lastIdx);
          }
        }

        if (!parentId) break;

        if (!allTimeTaskStats[parentId]) allTimeTaskStats[parentId] = { count: 0, minutes: 0 };
        allTimeTaskStats[parentId].count += statsToAdd.count;
        allTimeTaskStats[parentId].minutes += statsToAdd.minutes;
        currentId = parentId;
        depth++;
      }
    });

    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);

    while (current <= end) {
      const dateStr = getLogicalDateString(current);
      const record = (pomodoroManager as any).records[dateStr];
      if (record) {
        // Recalculate daily total dynamically to ensure consistency with new rules
        const dayTotal = record.sessions ? record.sessions.reduce((sum: number, s: any) => {
          if (s.type === 'work') {
            return sum + pomodoroManager.calculateSessionCount(s);
          }
          return sum;
        }, 0) : (record.workSessions || 0);

        totalPomodoros += dayTotal;
        totalMinutes += record.totalWorkTime || 0;

        // 原始统计
        const rawTaskStats: { [id: string]: { count: number, minutes: number } } = {};
        if (record.sessions) {
          record.sessions.forEach((s: any) => {
            if (s.type === 'work') {
              // 兼容旧数据，有些session没有eventId
              const evtId = s.eventId;
              if (evtId) {
                if (!rawTaskStats[evtId]) rawTaskStats[evtId] = { count: 0, minutes: 0 };
                rawTaskStats[evtId].count += pomodoroManager.calculateSessionCount(s);
                rawTaskStats[evtId].minutes += s.duration || 0;
              }
            }
          });
        }

        // 聚合统计（包含子任务数据）
        const aggregatedTaskStats: { [id: string]: { count: number, minutes: number } } = {};

        // 1. 先复制原始数据
        Object.keys(rawTaskStats).forEach(id => {
          if (!aggregatedTaskStats[id]) aggregatedTaskStats[id] = { count: 0, minutes: 0 };
          aggregatedTaskStats[id].count += rawTaskStats[id].count;
          aggregatedTaskStats[id].minutes += rawTaskStats[id].minutes;
        });

        // 2. 向上冒泡累加
        Object.keys(rawTaskStats).forEach(sourceId => {
          let currentId = sourceId;
          const statsToAdd = rawTaskStats[sourceId];

          // 防止死循环，设置最大深度
          let depth = 0;
          while (depth < 20) {
            let parentId: string | null = null;
            const reminder = reminderData[currentId];

            if (reminder && reminder.parentId) {
              parentId = reminder.parentId;
            } else if (!reminder && currentId.includes('_')) {
              // 尝试从实例ID中提取原始ID
              const lastIdx = currentId.lastIndexOf('_');
              if (lastIdx > 0) {
                parentId = currentId.substring(0, lastIdx);
              }
            }

            if (!parentId) break;

            if (!aggregatedTaskStats[parentId]) aggregatedTaskStats[parentId] = { count: 0, minutes: 0 };

            aggregatedTaskStats[parentId].count += statsToAdd.count;
            aggregatedTaskStats[parentId].minutes += statsToAdd.minutes;

            currentId = parentId;
            depth++;
          }
        });

        pomodoroByDate[getLocalDateString(current)] = {
          count: dayTotal,
          minutes: record.totalWorkTime || 0,
          taskStats: aggregatedTaskStats
        };
      }
      current.setDate(current.getDate() + 1);
    }

    return {
      settings: {
        showPomodoro: settings.showPomodoroInSummary !== false
      },
      pomodoro: {
        totalCount: totalPomodoros,
        totalHours: (totalMinutes / 60).toFixed(1),
        totalMinutes: totalMinutes,
        byDate: pomodoroByDate,
        allTimeTaskStats: allTimeTaskStats // Return all-time stats
      }
    };
  }

  private getRange(type: string): { start: string, end: string, label: string } {
    // 使用逻辑日期来计算"今天"、"明天"、"昨天"
    const logicalToday = getLogicalDateString();

    let start: string;
    let end: string;
    let label = '';

    switch (type) {
      case 'today':
        start = logicalToday;
        end = logicalToday;
        label = i18n('today');
        break;
      case 'tomorrow': {
        const tomorrowDate = new Date(logicalToday);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrow = getLocalDateString(tomorrowDate);
        start = tomorrow;
        end = tomorrow;
        label = i18n('tomorrow');
        break;
      }
      case 'yesterday': {
        const yesterdayDate = new Date(logicalToday);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = getLocalDateString(yesterdayDate);
        start = yesterday;
        end = yesterday;
        label = i18n('yesterday');
        break;
      }
      case 'thisWeek': {
        const todayDate = new Date(logicalToday);
        const day = todayDate.getDay();
        const diff = todayDate.getDate() - day + (day === 0 ? -6 : 1);
        const startDate = new Date(todayDate);
        startDate.setDate(diff);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        start = getLocalDateString(startDate);
        end = getLocalDateString(endDate);
        label = `${i18n('thisWeek')} (${start} ~ ${end})`;
        break;
      }
      case 'nextWeek': {
        const todayDate = new Date(logicalToday);
        const day = todayDate.getDay();
        const diff = todayDate.getDate() - day + (day === 0 ? 1 : 8);
        const startDate = new Date(todayDate);
        startDate.setDate(diff);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        start = getLocalDateString(startDate);
        end = getLocalDateString(endDate);
        label = `${i18n('nextWeek')} (${start} ~ ${end})`;
        break;
      }
      case 'lastWeek': {
        const todayDate = new Date(logicalToday);
        const day = todayDate.getDay();
        const diff = todayDate.getDate() - day + (day === 0 ? -13 : -6);
        const startDate = new Date(todayDate);
        startDate.setDate(diff);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        start = getLocalDateString(startDate);
        end = getLocalDateString(endDate);
        label = `${i18n('lastWeek')} (${start} ~ ${end})`;
        break;
      }
      case 'thisMonth': {
        const todayDate = new Date(logicalToday);
        const startDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
        const endDate = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
        start = getLocalDateString(startDate);
        end = getLocalDateString(endDate);
        label = i18n('thisMonth');
        break;
      }
      case 'lastMonth': {
        const todayDate = new Date(logicalToday);
        const startDate = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1);
        const endDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), 0);
        start = getLocalDateString(startDate);
        end = getLocalDateString(endDate);
        label = i18n('lastMonth');
        break;
      }
    }
    return { start, end, label };
  }

  private async getEvents() {
    try {
      const reminderData = await this.plugin.loadReminderData() || {};

      const events = [];

      // 获取当前视图的日期范围
      let startDate, endDate;
      if (this.calendar && this.calendar.view) {
        const currentView = this.calendar.view;
        startDate = getLocalDateString(currentView.activeStart);
        endDate = getLocalDateString(currentView.activeEnd);
      } else {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startDate = getLocalDateString(monthStart);
        endDate = getLocalDateString(monthEnd);
      }

      for (const reminder of Object.values(reminderData) as any[]) {
        if (!reminder || typeof reminder !== 'object') continue;

        // 应用分类过滤
        if (!this.calendarView.passesCategoryFilter(reminder)) continue;

        // 添加原始事件
        this.addEventToList(events, reminder, reminder.id, false);

        // 如果有重复设置，生成重复事件实例
        if (reminder.repeat?.enabled) {
          const repeatInstances = generateRepeatInstances(reminder, startDate, endDate);
          repeatInstances.forEach(instance => {
            // 跳过与原始事件相同日期的实例
            if (instance.date !== reminder.date) {
              const instanceIdStr = (instance as any).instanceId || `${reminder.id}_${instance.date}`;
              const originalKey = instanceIdStr.split('_').pop() || instance.date;

              // 检查实例级别的完成状态
              const completedInstances = reminder.repeat?.completedInstances || [];
              const isInstanceCompleted = completedInstances.includes(originalKey);

              // 检查实例级别的修改
              const instanceModifications = reminder.repeat?.instanceModifications || {};
              const instanceMod = instanceModifications[originalKey];

              const instanceReminder = {
                ...reminder,
                date: instance.date,
                endDate: instance.endDate,
                time: instance.time,
                endTime: instance.endTime,
                completed: isInstanceCompleted,
                note: instanceMod?.note || '',
                docTitle: reminder.docTitle // 保持文档标题
              };

              // 确保实例ID的唯一性，避免重复 — 使用原始实例键作为 id 的后缀
              const uniqueInstanceId = `${reminder.id}_${originalKey}`;
              this.addEventToList(events, instanceReminder, uniqueInstanceId, true, instance.originalId);
            }
          });
        }
      }

      return events;
    } catch (error) {
      console.error('获取事件数据失败:', error);
      showMessage(i18n("loadReminderDataFailed"));
      return [];
    }
  }

  addEventToList(events: any[], reminder: any, eventId: string, isRepeated: boolean, originalId?: string) {
    const priority = reminder.priority || 'none';
    let backgroundColor, borderColor;



    // 检查完成状态
    let isCompleted = false;
    if (isRepeated && originalId) {
      isCompleted = reminder.completed || false;
    } else {
      isCompleted = reminder.completed || false;
    }

    // 如果任务已完成，使用灰色
    if (isCompleted) {
      backgroundColor = '#e3e3e3';
      borderColor = '#e3e3e3';
    }

    // 重复事件使用稍微不同的样式
    if (isRepeated) {
      backgroundColor = backgroundColor + 'dd';
      borderColor = borderColor + 'dd';
    }

    // 构建 className，包含已完成状态
    const classNames = [
      `reminder-priority-${priority}`,
      isRepeated ? 'reminder-repeated' : '',
      isCompleted ? 'completed' : '' // 将 completed 类添加到 FullCalendar 事件元素上
    ].filter(Boolean).join(' ');

    let eventObj: any = {
      id: eventId,
      title: reminder.title || i18n("unnamedNote"),
      backgroundColor: backgroundColor,
      borderColor: borderColor,
      textColor: isCompleted ? '#999999' : '#ffffff',
      className: classNames,
      extendedProps: {
        completed: isCompleted,
        completedTime: reminder.completedTime || null, // 添加完成时间
        note: reminder.note || '',
        dailyCompletions: reminder.dailyCompletions || {},
        date: reminder.date,
        endDate: reminder.endDate || null,
        time: reminder.time || null,
        endTime: reminder.endTime || null,
        priority: priority,
        categoryId: reminder.categoryId,
        projectId: reminder.projectId,
        blockId: reminder.blockId || reminder.id,
        parentId: reminder.parentId, // 添加父任务ID
        docId: reminder.docId, // 添加docId
        docTitle: reminder.docTitle, // 添加文档标题
        isRepeated: isRepeated,
        originalId: originalId || reminder.id,
        repeat: reminder.repeat,
        estimatedPomodoroDuration: reminder.estimatedPomodoroDuration // 预计番茄时长
      }
    };

    // 计算任务的逻辑日期（如果有时间）
    let taskLogicalDate = reminder.date;
    if (reminder.time && reminder.date) {
      try {
        const dateTimeStr = `${reminder.date} ${reminder.time}`;
        const taskDateTime = new Date(dateTimeStr.replace(' ', 'T') + ':00');
        taskLogicalDate = getLogicalDateString(taskDateTime);
      } catch (e) {
        taskLogicalDate = reminder.date;
      }
    }

    // 处理跨天事件
    if (reminder.endDate) {
      if (reminder.time && reminder.endTime) {
        // 使用逻辑日期作为开始日期
        eventObj.start = `${taskLogicalDate}T${reminder.time}:00`;
        eventObj.end = `${reminder.endDate}T${reminder.endTime}:00`;
        eventObj.allDay = false;
      } else {
        eventObj.start = taskLogicalDate;
        const endDate = new Date(reminder.endDate);
        endDate.setDate(endDate.getDate() + 1);
        eventObj.end = getLocalDateString(endDate);
        eventObj.allDay = true;

        if (reminder.time) {
          eventObj.title = `${reminder.title || i18n("unnamedNote")} (${reminder.time})`;
        }
      }
    } else {
      if (reminder.time) {
        // 使用逻辑日期作为开始日期
        eventObj.start = `${taskLogicalDate}T${reminder.time}:00`;
        if (reminder.endTime) {
          eventObj.end = `${taskLogicalDate}T${reminder.endTime}:00`;
        } else {
          // 对于只有开始时间的提醒，设置30分钟的默认持续时间，但确保不跨天
          const startTime = new Date(`${taskLogicalDate}T${reminder.time}:00`);
          const endTime = new Date(startTime);
          endTime.setMinutes(endTime.getMinutes() + 30);

          // 检查是否跨天，如果跨天则设置为当天23:59
          if (endTime.getDate() !== startTime.getDate()) {
            endTime.setDate(startTime.getDate());
            endTime.setHours(23, 59, 0, 0);
          }

          const endTimeStr = endTime.toTimeString().substring(0, 5);
          eventObj.end = `${taskLogicalDate}T${endTimeStr}:00`;
        }
        eventObj.allDay = false;
      } else {
        // 对于没有时间的任务
        if (reminder.date) {
          eventObj.start = taskLogicalDate;
        } else if (reminder.completed && reminder.completedTime) {
          // 对于没有日期但已完成且有完成时间的任务，使用完成时间的逻辑日期
          try {
            const completedDate = new Date(reminder.completedTime.replace(' ', 'T') + ':00');
            const completedLogicalDate = getLogicalDateString(completedDate);
            eventObj.start = completedLogicalDate;
          } catch (e) {
            // 解析失败，不设置 start
          }
        }
        eventObj.allDay = true;
        eventObj.display = 'block';
      }
    }

    events.push(eventObj);
  }


  /**
   * 获取当前日历视图的日期范围
   */
  private getCurrentViewDateRange(): { start: string, end: string } {
    if (this.calendar && this.calendar.view) {
      const currentView = this.calendar.view;
      const startDate = getLocalDateString(currentView.activeStart);

      // 对于不同视图类型，计算正确的结束日期
      let endDate: string;
      if (currentView.type === 'timeGridDay') {
        // 日视图：结束日期就是开始日期（只显示当天）
        endDate = startDate;
      } else {
        // 月视图和周视图：结束日期需要减去1天，因为activeEnd是下一个周期的开始
        const actualEndDate = new Date(currentView.activeEnd.getTime() - 24 * 60 * 60 * 1000);
        endDate = getLocalDateString(actualEndDate);
      }

      return { start: startDate, end: endDate };
    } else {
      // 如果日历未初始化，返回当前月份范围
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        start: getLocalDateString(monthStart),
        end: getLocalDateString(monthEnd)
      };
    }
  }

  /**
   * 根据日期范围过滤事件
   */
  private filterEventsByDateRange(events: any[], dateRange: { start: string, end: string }): any[] {
    const includedEvents = events.filter(event => {
      // 使用 event.start 而不是 extendedProps.date，因为 start 已经是逻辑日期
      // 从 start 中提取日期部分（可能是 "YYYY-MM-DD" 或 "YYYY-MM-DDTHH:mm:ss"）
      let eventDate: string;
      if (event.start) {
        eventDate = event.start.split('T')[0];
      } else {
        // 如果没有 start，使用原始日期
        eventDate = event.extendedProps.date;
      }

      // Undated events don't pass standard filter
      if (!eventDate) return false;

      if (event.extendedProps.endDate) {
        // 检查事件日期范围是否与给定日期范围有重叠
        const eventStart = eventDate;
        const eventEnd = event.extendedProps.endDate;
        const rangeStart = dateRange.start;
        const rangeEnd = dateRange.end;

        // 如果事件开始日期在范围内，或者事件结束日期在范围内，或者事件包含整个范围
        return (eventStart >= rangeStart && eventStart <= rangeEnd) ||
          (eventEnd >= rangeStart && eventEnd <= rangeEnd) ||
          (eventStart <= rangeStart && eventEnd >= rangeEnd);
      }
      return eventDate >= dateRange.start && eventDate <= dateRange.end;
    });

    // 2. 额外逻辑：如果父任务被包含在内，且子任务未设置日期，则也显示该子任务
    const additionalEvents: any[] = [];

    // 筛选出所有未设置日期的潜在子任务
    const undatedCandidates = events.filter(e => !e.extendedProps.date && e.extendedProps.parentId);

    if (undatedCandidates.length > 0) {
      includedEvents.forEach(parent => {
        // 使用 originalId 或 blockId 作为父任务的 ID
        const parentId = parent.extendedProps.originalId || parent.extendedProps.blockId || parent.id;
        const parentDate = parent.extendedProps.date;

        // 查找该父任务的未设置日期的子任务
        const myChildren = undatedCandidates.filter(c => c.extendedProps.parentId === parentId);

        myChildren.forEach(child => {
          // 克隆子任务对象，以免修改原始引用影响其他逻辑
          const newChild = { ...child };
          newChild.extendedProps = { ...child.extendedProps };

          // 将子任务的日期设置为父任务的日期，以便在分组时能正确归类到父任务所在日期
          newChild.extendedProps.date = parentDate;
          newChild.start = parentDate; // 保持一致性

          // 如果父任务跨天，子任务也应该继承结束日期
          if (parent.extendedProps.endDate) {
            newChild.extendedProps.endDate = parent.extendedProps.endDate;
          }

          additionalEvents.push(newChild);
        });
      });
    }

    return [...includedEvents, ...additionalEvents];
  }

  /**
   * 获取当前视图信息
   */
  private getCurrentViewInfo(): string {
    if (this.calendar && this.calendar.view) {
      const currentView = this.calendar.view;
      const viewType = currentView.type;
      const startDate = currentView.activeStart;

      const locale = (window as any).siyuan?.config?.lang === 'zh_CN' ? 'zh-CN' : 'en-US';
      switch (viewType) {
        case 'dayGridMonth':
          return i18n('yearMonthTemplate')
            .replace('${y}', startDate.getFullYear().toString())
            .replace('${m}', (startDate.getMonth() + 1).toString());
        case 'timeGridWeek':
          // 周视图：计算实际的结束日期
          const actualWeekEnd = new Date(currentView.activeEnd.getTime() - 24 * 60 * 60 * 1000);
          const weekStart = startDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
          const weekEnd = actualWeekEnd.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
          return `${weekStart} - ${weekEnd}`;
        case 'timeGridDay':
          // 日视图：只显示当天
          return startDate.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          });
        default:
          return i18n("currentView");
      }
    }
    return i18n("currentView");
  }

  /**
   * 按日期和项目分组任务
   */
  private groupTasksByDateAndProject(events: any[], dateRange: { start: string; end: string; }, stats?: any, allEvents?: any[]) {
    // 检查当前是否为日视图
    const isDayView = this.calendar && this.calendar.view.type === 'timeGridDay';
    const grouped = new Map<string, Map<string, any[]>>();

    // 用于去重：记录已经添加到某个日期的任务
    const addedTasks = new Map<string, Set<string>>(); // Map<日期, Set<任务ID>>

    // 辅助函数：将Event对象转换为taskData
    const createItemFromEvent = (event: any, dateStrForPerDateCompleted: string) => {
      const perDateCompleted = (d: string) => {
        const dc = event.extendedProps.dailyCompletions || {};
        return (event.extendedProps.completed === true) || (dc[d] === true);
      };

      return {
        id: event.id, // 使用 event.id 而不是 collapsing ID，以区分重复实例
        title: event.originalTitle || event.title,
        // completed will be set per-date when adding to grouped map
        completed: typeof perDateCompleted === 'function' ? perDateCompleted(dateStrForPerDateCompleted) : event.extendedProps.completed,
        completedTime: event.extendedProps.completedTime || null, // 添加完成时间
        priority: event.extendedProps.priority,
        time: event.extendedProps.time,
        endTime: event.extendedProps.endTime,
        fullStartDate: event.extendedProps.date,
        fullEndDate: event.extendedProps.endDate || null,
        repeat: event.extendedProps.repeat || null,
        repeatLabel: event.extendedProps.repeat ? this.formatRepeatLabel(event.extendedProps.repeat, event.extendedProps.date) : '',
        note: event.extendedProps.note,
        docTitle: event.extendedProps.docTitle,
        estimatedPomodoroDuration: event.extendedProps.estimatedPomodoroDuration,
        extendedProps: event.extendedProps, // 保留完整的 extendedProps 以便层级排序使用
        _perDateCompleted: perDateCompleted
      };
    };

    // 辅助函数：添加任务到指定日期，带去重检查
    const addTaskToDate = (dateStr: string, taskItem: any) => {
      const taskId = taskItem.id;
      // 检查是否已经添加过
      if (!addedTasks.has(dateStr)) {
        addedTasks.set(dateStr, new Set());
      }
      if (addedTasks.get(dateStr).has(taskId)) {
        return; // 已经添加过，跳过
      }

      const projectId = taskItem.extendedProps?.projectId || 'no-project';
      const projectName = projectId === 'no-project' ?
        i18n("noProject") :
        this.projectManager.getProjectName(projectId) || projectId;

      // 添加到分组
      if (!grouped.has(dateStr)) {
        grouped.set(dateStr, new Map());
      }
      const dateGroup = grouped.get(dateStr);
      if (!dateGroup.has(projectName)) {
        dateGroup.set(projectName, []);
      }
      dateGroup.get(projectName).push(taskItem);

      // 标记为已添加
      addedTasks.get(dateStr).add(taskId);
    };

    events.forEach(event => {
      const startDate = event.extendedProps.date;
      const endDate = event.extendedProps.endDate;
      const time = event.extendedProps.time;
      // const projectId... (moved to addTaskToDate)

      const taskData = createItemFromEvent(event, startDate);

      // (We removed addTaskToDate definition here to lift it up)

      // 计算任务的逻辑日期（如果有时间）
      let taskLogicalDate = startDate;
      if (time && startDate) {
        try {
          // 构建完整的日期时间字符串
          const dateTimeStr = `${startDate} ${time}`;
          const taskDateTime = new Date(dateTimeStr.replace(' ', 'T') + ':00');
          taskLogicalDate = getLogicalDateString(taskDateTime);
        } catch (e) {
          // 解析失败，使用原始日期
          taskLogicalDate = startDate;
        }
      }

      // 如果有结束日期，说明是跨天任务，在每个相关日期都显示
      if (endDate && endDate !== startDate) {
        const start = new Date(Math.max(new Date(startDate).getTime(), new Date(dateRange.start).getTime()));
        const end = new Date(Math.min(new Date(endDate).getTime(), new Date(dateRange.end).getTime()));

        // 遍历从开始日期到结束日期的每一天
        const currentDate = new Date(start);
        while (currentDate <= end) {
          const dateStr = currentDate.toISOString().split('T')[0];

          const item = { ...taskData };
          item.completed = typeof taskData._perDateCompleted === 'function' ? taskData._perDateCompleted(dateStr) : taskData.completed;
          addTaskToDate(dateStr, item);

          // 移动到下一天
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else if (startDate) {
        // 单日任务（有日期），使用逻辑日期
        const item = { ...taskData };
        item.completed = typeof taskData._perDateCompleted === 'function' ? taskData._perDateCompleted(taskLogicalDate) : taskData.completed;
        addTaskToDate(taskLogicalDate, item);
      }
      // 注意：如果任务没有日期（!startDate），则不在这里添加，
      // 而是在下面的完成时间逻辑中处理

      // 如果任务已完成且有完成时间，检查完成时间的逻辑日期
      if (event.extendedProps.completed && event.extendedProps.completedTime) {
        try {
          // 将完成时间转换为 Date 对象
          const completedDate = new Date(event.extendedProps.completedTime.replace(' ', 'T') + ':00');
          // 获取完成时间的逻辑日期
          const completedLogicalDate = getLogicalDateString(completedDate);

          // 如果任务没有日期，或者完成时间的逻辑日期与任务逻辑日期不同
          // 且在dateRange范围内，则在完成日期显示
          if ((!startDate || completedLogicalDate !== taskLogicalDate) &&
            completedLogicalDate >= dateRange.start &&
            completedLogicalDate <= dateRange.end) {

            // 在完成日期也添加这个任务（带去重检查）
            const completedItem = { ...taskData };
            completedItem.completed = true;
            addTaskToDate(completedLogicalDate, completedItem);
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    });

    // 额外的逻辑：如果任务虽未在当天计划，但当天有番茄钟专注记录，也显示在当天
    if (stats && stats.pomodoro && stats.pomodoro.byDate && allEvents) {
      // 创建ID到事件的映射，方便查找 (使用 reminder.id 作为 key)
      const eventMap = new Map<string, any>();
      allEvents.forEach(e => {
        // 优先使用 reminder.id (即 startEvent 里的 ID)
        // 如果有多个实例，我们优先取原始对象（isRepeated=false），或者随便取一个
        const oid = e.extendedProps.originalId || e.id;
        if (!eventMap.has(oid)) {
          eventMap.set(oid, e);
        } else {
          // 如果已经有了，且当前这个是否是原始对象(非重复)，则覆盖
          if (!e.extendedProps.isRepeated) {
            eventMap.set(oid, e);
          }
        }
      });

      // 遍历所有涉及的日期 (stats logic dates)
      Object.keys(stats.pomodoro.byDate).forEach(dateStr => {
        // 只处理在 view range 范围内的日期
        if (dateStr < dateRange.start || dateStr > dateRange.end) return;

        const dayStats = stats.pomodoro.byDate[dateStr];
        if (dayStats && dayStats.taskStats) {
          Object.keys(dayStats.taskStats).forEach(taskId => {
            // taskId 是 reminder.id
            const event = eventMap.get(taskId);
            if (event) {
              // 创建 taskData 并添加到该日期
              // 注意：这里我们使用 event 的信息，但日期强制归类到 dateStr
              const item = createItemFromEvent(event, dateStr);

              // 如果该任务本来不属于这一天（比如 scheduled date != dateStr），
              // 我们仍然把它加进来。
              // 为了区分，或许可以添加一个标记，但目前需求只是显示。
              addTaskToDate(dateStr, item);
            }
          });
        }
      });
    }



    // 对每个分组内的任务进行层级排序
    grouped.forEach((projectMap) => {
      projectMap.forEach((tasks, projectName) => {
        const sortedTasks = this.sortTasksByHierarchy(tasks);
        projectMap.set(projectName, sortedTasks);
      });
    });

    return grouped;
  }

  /**
   * 按层级排序任务，并计算深度
   */
  private sortTasksByHierarchy(tasks: any[]): any[] {
    if (!tasks || tasks.length === 0) return [];

    const taskMap = new Map<string, any>();
    tasks.forEach(t => taskMap.set(t.id, t));

    // 找出每个任务的子任务
    const childrenMap = new Map<string, any[]>();
    const roots: any[] = [];

    tasks.forEach(task => {
      task.depth = 0; // 初始化深度
      const parentId = task.extendedProps?.parentId; // 从 extendedProps 获取 parentId

      // 如果有父任务且父任务也在当前列表中，则是子任务
      if (parentId && taskMap.has(parentId)) {
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId).push(task);
      } else {
        // 否则视为根任务（在当前视图范围内）
        roots.push(task);
      }
    });

    const result: any[] = [];

    // 递归辅助函数，增加 completion 传递
    const traverse = (nodes: any[], depth: number, parentCompleted: boolean) => {
      nodes.forEach(node => {
        // 如果父任务已完成，子任务也包括显示为完成
        if (parentCompleted) {
          node.completed = true;
        }

        node.depth = depth;
        result.push(node);
        const children = childrenMap.get(node.id);
        if (children) {
          // 子任务按原来的顺序（通常是时间或创建顺序）排列，也可以根据需要再次排序
          traverse(children, depth + 1, node.completed);
        }
      });
    };

    traverse(roots, 0, false);
    return result;
  }


  /**
     * 设置日历实例
     */
  public setCalendar(calendar: any) {
    this.calendar = calendar;
  }

  setCategoryManager(calendarView: any) {
    this.calendarView = calendarView;
  }

  /**
   * 生成摘要内容HTML
   */
  public generateSummaryContent(groupedTasks: Map<string, Map<string, any[]>>, dateRange: { start: string, end: string, label: string }, stats: any): string {
    const rangeFilters = [
      { id: 'yesterday', label: i18n('yesterday'), mode: 'time', group: 'daily' },
      { id: 'today', label: i18n('today'), mode: 'semantic', group: 'daily' },
      { id: 'tomorrow', label: i18n('tomorrow'), mode: 'time', group: 'daily' },
      { id: 'next3', label: i18n('summarySemanticNext3') || '3天内', mode: 'semantic', group: 'multi' },
      { id: 'next7', label: i18n('summarySemanticNext7') || '7天内', mode: 'semantic', group: 'multi' },
      { id: 'lastWeek', label: i18n('lastWeek'), mode: 'time', group: 'week' },
      { id: 'thisWeek', label: i18n('thisWeek'), mode: 'time', group: 'week' },
      { id: 'nextWeek', label: i18n('nextWeek'), mode: 'time', group: 'week' },
      { id: 'thisMonth', label: i18n('thisMonth'), mode: 'time', group: 'month' },
      { id: 'lastMonth', label: i18n('lastMonth'), mode: 'time', group: 'month' },
      { id: 'overdue', label: i18n('summarySemanticOverdue') || '已过期', mode: 'semantic', group: 'other' },
      { id: 'history', label: i18n('summarySemanticHistory') || '历史回顾', mode: 'semantic', group: 'other' },
      { id: 'current', label: i18n('currentView'), mode: 'time', group: 'other' },
    ];
    const focusFilters = [
      { id: 'all', label: i18n('summaryFocusAll') || '全部' },
      { id: 'open', label: i18n('summaryFocusOpen') || '仅未完成' },
      { id: 'high', label: i18n('summaryFocusHigh') || '高优先级' },
      { id: 'overdue', label: i18n('summaryFocusOverdue') || '延期' },
      { id: 'undated', label: i18n('summaryFocusUndated') || '无日期' },
    ];

    const logicalToday = getLogicalDateString();
    const future7EndDate = new Date(logicalToday);
    future7EndDate.setDate(future7EndDate.getDate() + 6);
    const future7End = getLocalDateString(future7EndDate);
    const isHistoricalRange = dateRange.end < logicalToday;
    const isTaskOverdue = (task: any, fallbackDate: string): boolean => {
      if (task.completed) return false;
      const dueDate = task.fullEndDate || task.fullStartDate || fallbackDate;
      if (!dueDate) return false;
      return dueDate < logicalToday;
    };
    const isTaskUndated = (task: any): boolean => {
      return !task.fullStartDate && !task.fullEndDate;
    };
    const matchesFocusFilter = (task: any, date: string): boolean => {
      switch (this.currentFocusFilter) {
        case 'open':
          return !task.completed;
        case 'high':
          return !task.completed && task.priority === 'high';
        case 'overdue':
          return isTaskOverdue(task, date);
        case 'undated':
          return isTaskUndated(task);
        default:
          return true;
      }
    };

    const uniqueTaskMap = new Map<string, { task: any; date: string }>();
    groupedTasks.forEach((projectMap, date) => {
      projectMap.forEach((tasks) => {
        tasks.forEach(task => {
          if (!uniqueTaskMap.has(task.id)) {
            uniqueTaskMap.set(task.id, { task, date });
          }
        });
      });
    });

    let overdueCount = 0;
    let undatedCount = 0;
    let highPriorityCount = 0;
    let todayDueCount = 0;
    let next7DueCount = 0;
    uniqueTaskMap.forEach(({ task, date }) => {
      if (task.completed) return;
      const dueDate = task.fullEndDate || task.fullStartDate || date;
      if (isTaskOverdue(task, date)) overdueCount++;
      if (isTaskUndated(task)) undatedCount++;
      if (task.priority === 'high') highPriorityCount++;
      if (dueDate === logicalToday) todayDueCount++;
      if (dueDate >= logicalToday && dueDate <= future7End) next7DueCount++;
    });

    const filteredGrouped = new Map<string, Map<string, any[]>>();
    groupedTasks.forEach((projectMap, date) => {
      const filteredProjects = new Map<string, any[]>();
      projectMap.forEach((tasks, projectName) => {
        const filteredTasks = tasks.filter(task => matchesFocusFilter(task, date));
        if (filteredTasks.length > 0) {
          filteredProjects.set(projectName, filteredTasks);
        }
      });
      if (filteredProjects.size > 0) {
        filteredGrouped.set(date, filteredProjects);
      }
    });

    let totalTasks = 0;
    let completedTasks = 0;
    filteredGrouped.forEach((projectMap) => {
      projectMap.forEach((tasks) => {
        totalTasks += tasks.length;
        tasks.forEach(task => {
          if (task.completed) completedTasks++;
        });
      });
    });
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const completionText = i18n('completionStats').replace('${completed}', completedTasks.toString()).replace('${total}', totalTasks.toString());

    const renderTaskItem = (task: any, date: string, extraClass = '') => {
      const completedClass = task.completed ? 'completed' : '';
      const priorityClass = `priority-${task.priority || 'none'}`;
      let timeText = '';
      if (task.depth > 0 && !task.time) {
        timeText = '';
      } else if (task.fullEndDate && task.fullEndDate !== task.fullStartDate) {
        timeText = `${this.formatMonthDay(task.fullStartDate)}-${this.formatMonthDay(task.fullEndDate)}`;
      } else {
        timeText = this.getDisplayTimeForDate(task, date).trim().replace(/^\(/, '').replace(/\)$/, '');
      }

      const dayStats = stats?.pomodoro?.byDate?.[date];
      let dailyCount = 0;
      let dailyMinutes = 0;
      if (dayStats?.taskStats?.[task.id]) {
        const tStat = dayStats.taskStats[task.id];
        dailyCount = tStat.count;
        dailyMinutes = tStat.minutes;
      }

      let focusText = '';
      const isRepeated = task.extendedProps?.isRepeated;
      const isRecurring = task.repeat && task.repeat.enabled;
      const originalId = task.extendedProps?.originalId;
      const statsId = (isRepeated && originalId) ? originalId : task.id;
      const allStat = stats?.pomodoro?.allTimeTaskStats?.[statsId];
      if (dailyCount > 0 || dailyMinutes > 0) {
        focusText = `${dailyCount} 🍅 · ${this.formatDuration(dailyMinutes)}`;
        if (allStat) {
          if (isRecurring || isRepeated) {
            focusText += ` · ${i18n('series')}: ${allStat.count} 🍅 / ${this.formatDuration(allStat.minutes)}`;
          } else if (allStat.minutes > dailyMinutes + 1) {
            focusText += ` · ${i18n('totalStats')}: ${allStat.count} 🍅 / ${this.formatDuration(allStat.minutes)}`;
          }
        }
      } else if (allStat && allStat.minutes > 0) {
        const label = (isRecurring || isRepeated) ? i18n('series') : i18n('totalStats');
        focusText = `${label}: ${allStat.count} 🍅 / ${this.formatDuration(allStat.minutes)}`;
      }

      const completedTimeText = task.completed && task.completedTime
        ? this.formatCompletedTime(task.completedTime, date).trim().replace(/^\(/, '').replace(/\)$/, '')
        : '';

      const metaChips: string[] = [];
      if (task.repeatLabel) metaChips.push(`<span class="task-meta-chip repeat">${task.repeatLabel.replace(/^🔄\s*/, '')}</span>`);
      if (timeText) metaChips.push(`<span class="task-meta-chip">${timeText}</span>`);
      if (task.estimatedPomodoroDuration) metaChips.push(`<span class="task-meta-chip">${i18n('estimatedTime').replace('${duration}', task.estimatedPomodoroDuration)}</span>`);
      if (focusText) metaChips.push(`<span class="task-meta-chip focus">${focusText}</span>`);
      if (completedTimeText) metaChips.push(`<span class="task-meta-chip done-time">${completedTimeText}</span>`);
      if (task.docTitle) metaChips.push(`<span class="task-meta-chip doc">${task.docTitle}</span>`);

      const indent = Math.max(0, task.depth || 0) * 18;
      const checkboxSymbol = task.completed ? '✓' : '⬜';

      return `
        <li class="task-item ${completedClass} ${priorityClass} ${extraClass}" data-depth="${task.depth}" style="--task-indent:${indent}px;">
          <span class="task-checkbox">${checkboxSymbol}</span>
          <div class="task-body">
            <div class="task-title-line">
              <span class="task-title">${task.title}</span>
            </div>
            ${metaChips.length > 0 ? `<div class="task-meta">${metaChips.join('')}</div>` : ''}
            ${task.note ? `<div class="task-note">${this.lute ? this.lute.Md2HTML(task.note) : task.note}</div>` : ''}
          </div>
        </li>
      `;
    };

    const alertChips: string[] = [];
    if (overdueCount > 0) {
      alertChips.push(`<button class="summary-alert-chip" data-focus="overdue">${i18n('summaryRiskOverdue') || '延期'} ${overdueCount}</button>`);
    }
    if (highPriorityCount > 0) {
      alertChips.push(`<button class="summary-alert-chip" data-focus="high">${i18n('summaryRiskHigh') || '高优先级'} ${highPriorityCount}</button>`);
    }
    if (undatedCount > 0) {
      alertChips.push(`<button class="summary-alert-chip" data-focus="undated">${i18n('summaryRiskUndated') || '无日期'} ${undatedCount}</button>`);
    }

    const dateTaskTextTpl = i18n('summaryDateTaskStats') || '未完成 ${open} · 已完成 ${done}';
    const completedCollapsedTpl = i18n('summaryCompletedCollapsed') || '已完成 ${count} 条';
    const todayDueTextTpl = i18n('summaryTodayDueSub') || '今天到期 ${count} 条';
    const overdueTextTpl = i18n('summaryOverdueSub') || '已过期 ${count} 条';
    const next7TextTpl = i18n('summaryNext7Sub') || '7天内 ${count} 条';
    const completedOnlyTextTpl = i18n('summaryCompletedOnly') || '已完成 ${count} 条';
    let html = `
      <div class="task-summary-wrapper">
        <div class="task-summary-toolbar">
          <div class="task-summary-toolbar-main">
            <h2 class="task-summary-title">${i18n('taskSummary')}</h2>
            <div class="semantic-filter-buttons">
              ${rangeFilters.map((f, index) => {
      const isActive = f.mode === 'semantic'
        ? (this.currentSemanticFilter === f.id)
        : (this.currentSemanticFilter === 'auto' && this.currentFilter === f.id);
      const needDivider = index > 0 && rangeFilters[index - 1].group !== f.group;
      return `
                  ${needDivider ? '<span class="range-divider">|</span>' : ''}
                  <button class="b3-button task-summary-toolbar-btn ${isActive ? '' : 'b3-button--outline'}" data-range-mode="${f.mode}" data-range-id="${f.id}">
                    ${f.label}
                  </button>
                `;
    }).join('')}
            </div>
            <button class="b3-button b3-button--outline task-summary-toolbar-btn" id="export-summary-btn">
              <svg class="b3-button__icon"><use xlink:href="#iconCopy"></use></svg>
              ${i18n('summaryExport') || '导出'}
            </button>
          </div>
          <div class="task-summary-toolbar-sub">
            <div class="task-summary-left-controls">
              <div class="task-summary-range">
                <span class="range-label">${i18n('currentRange')}</span>
                <span class="range-value">${dateRange.label}</span>
              </div>
              <div class="summary-expand-controls">
                <button class="b3-button b3-button--outline task-summary-toolbar-btn" id="expand-all-sections-btn">${i18n('summaryExpandAll') || '全部展开'}</button>
                <button class="b3-button b3-button--outline task-summary-toolbar-btn" id="collapse-all-sections-btn">${i18n('summaryCollapseAll') || '全部收起'}</button>
              </div>
            </div>
            <div class="focus-filter-buttons">
              ${focusFilters.map(f => `
                <button class="b3-button task-summary-toolbar-btn ${this.currentFocusFilter === f.id ? '' : 'b3-button--outline'}" data-focus="${f.id}">
                  ${f.label}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="task-summary-info-cards">
          ${isHistoricalRange ? `
            <div class="info-card summary-metric-card card-completion">
              <div class="metric-label">${i18n('summaryCompletionRate') || '完成率'}</div>
              <div class="metric-value">${completionRate}%</div>
              <div class="metric-sub">${completionText}</div>
            </div>
            <div class="info-card summary-metric-card card-done">
              <div class="metric-label">${i18n('summaryCompletedTasks') || '已完成任务'}</div>
              <div class="metric-value">${completedTasks}</div>
              <div class="metric-sub">${completedOnlyTextTpl.replace('${count}', completedTasks.toString())}</div>
            </div>
            <div class="info-card summary-metric-card card-focus">
              <div class="metric-label">${i18n('pomodoroFocusCard')}</div>
              <div class="metric-value">${stats.settings.showPomodoro ? stats.pomodoro.totalCount : 0}</div>
              <div class="metric-sub">${stats.settings.showPomodoro ? this.formatDuration(stats.pomodoro.totalMinutes) : (i18n('summaryPomodoroOff') || '未启用专注统计')}</div>
            </div>
          ` : `
            <div class="info-card summary-metric-card card-today">
              <div class="metric-label">${i18n('summaryTodayDue') || '今日待办'}</div>
              <div class="metric-value">${todayDueCount}</div>
              <div class="metric-sub">${todayDueTextTpl.replace('${count}', todayDueCount.toString())}</div>
            </div>
            <div class="info-card summary-metric-card card-overdue">
              <div class="metric-label">${i18n('summaryOverdueTasks') || '已过期'}</div>
              <div class="metric-value">${overdueCount}</div>
              <div class="metric-sub">${overdueTextTpl.replace('${count}', overdueCount.toString())}</div>
            </div>
            <div class="info-card summary-metric-card card-next7">
              <div class="metric-label">${i18n('summaryNext7Tasks') || '7天内'}</div>
              <div class="metric-value">${next7DueCount}</div>
              <div class="metric-sub">${next7TextTpl.replace('${count}', next7DueCount.toString())}</div>
            </div>
          `}
        </div>

        <div class="summary-alert-bar">
          ${isHistoricalRange
        ? `<span class="summary-alert-ok">${i18n('summaryHistoricalHint') || '当前为历史范围，风险提醒已弱化，可切换到“今天/7天内/已过期”查看实时风险'}</span>`
        : (
          alertChips.length > 0
            ? `<span class="summary-alert-label">${i18n('summaryRiskHint') || '风险提示'}</span>${alertChips.join('')}`
            : `<span class="summary-alert-ok">${i18n('summaryRiskNone') || '当前范围内没有明显风险任务'}</span>`
        )
      }
        </div>

        <div class="task-summary-content" id="summary-content">
    `;

    const allDates = new Set<string>();
    filteredGrouped.forEach((_, date) => allDates.add(date));
    if (stats.settings.showPomodoro && this.currentFocusFilter === 'all') {
      Object.keys(stats.pomodoro.byDate).forEach(date => allDates.add(date));
    }
    const sortedDates = Array.from(allDates).sort();

    if (sortedDates.length === 0) {
      html += `<div class="task-summary-empty">${i18n('summaryNoTasksForFilter') || i18n('noTasks')}</div>`;
    }

    sortedDates.forEach(date => {
      const dateProjects = filteredGrouped.get(date);
      const datePomodoroStats = stats.settings.showPomodoro ? stats.pomodoro.byDate[date] : null;
      if (!dateProjects && !datePomodoroStats) return;

      const dateObj = new Date(date);
      const locale = (window as any).siyuan?.config?.lang === 'zh_CN' ? 'zh-CN' : 'en-US';
      const formattedDate = dateObj.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });

      let dayTotal = 0;
      let dayCompleted = 0;
      if (dateProjects) {
        dateProjects.forEach(tasks => {
          dayTotal += tasks.length;
          dayCompleted += tasks.filter(t => t.completed).length;
        });
      }
      const dayOpen = Math.max(0, dayTotal - dayCompleted);

      html += `<div class="task-date-group">`;
      html += `
        <div class="task-date-head">
          <h3 class="task-date-title">${formattedDate}</h3>
          <div class="task-date-meta">${dateTaskTextTpl.replace('${open}', dayOpen.toString()).replace('${done}', dayCompleted.toString())}</div>
        </div>
      `;

      if (datePomodoroStats) {
        html += `
          <div class="summary-stat-row">
            ${i18n('focusStatLine').replace('${count}', datePomodoroStats.count.toString()).replace('${duration}', this.formatDuration(datePomodoroStats.minutes))}
          </div>
        `;
      }

      const completedProjectGroups: Array<{ projectName: string; tasks: any[] }> = [];
      let completedCount = 0;

      if (dateProjects) {
        dateProjects.forEach((tasks, projectName) => {
          const activeTasks = tasks.filter(t => !t.completed);
          const doneTasks = tasks.filter(t => t.completed);
          completedCount += doneTasks.length;
          if (doneTasks.length > 0) {
            completedProjectGroups.push({ projectName, tasks: doneTasks });
          }
          if (activeTasks.length === 0) return;

          html += `<div class="task-project-group">`;
          html += `<h4 class="task-project-title">${projectName}</h4>`;
          html += `<ul class="task-list">`;
          activeTasks.forEach(task => {
            html += renderTaskItem(task, date);
          });
          html += `</ul></div>`;
        });
      }

      if (completedCount > 0) {
        html += `
          <details class="task-completed-collapse" ${this.completedSectionsExpanded ? 'open' : ''}>
            <summary>${completedCollapsedTpl.replace('${count}', completedCount.toString())}</summary>
            <div class="task-completed-hint">${i18n('summaryCompletedHint') || '默认折叠，点击展开查看明细'}</div>
        `;
        completedProjectGroups.forEach(group => {
          html += `<div class="task-project-group completed-group">`;
          html += `<h4 class="task-project-title">${group.projectName}</h4>`;
          html += `<ul class="task-list">`;
          group.tasks.forEach(task => {
            html += renderTaskItem(task, date, 'completed-item');
          });
          html += `</ul></div>`;
        });
        html += `</details>`;
      }

      html += `</div>`;
    });

    html += `
        </div>
      </div>
      <style>
        .task-summary-wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 12px 16px;
          background: var(--b3-theme-background);
        }
        .task-summary-toolbar {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
          max-width: 1260px;
          width: 100%;
          margin-left: auto;
          margin-right: auto;
          box-sizing: border-box;
        }
        .task-summary-toolbar-main {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .task-summary-title {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          line-height: 1.2;
        }
        .semantic-filter-buttons {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          align-items: center;
        }
        .range-divider {
          color: var(--b3-theme-on-surface-light);
          opacity: 0.55;
          padding: 0 2px;
          font-size: 12px;
          line-height: 1;
          user-select: none;
        }
        .summary-expand-controls {
          display: inline-flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .task-summary-toolbar-sub {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .task-summary-left-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .task-summary-range {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          background: var(--b3-theme-surface);
          border: 1px solid var(--b3-border-color);
        }
        .task-summary-range .range-label {
          color: var(--b3-theme-on-surface-light);
          font-size: 12px;
        }
        .task-summary-range .range-value {
          font-size: 13px;
          font-weight: 600;
        }
        .focus-filter-buttons {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .task-summary-toolbar-btn {
          min-height: var(--task-toolbar-height);
          height: var(--task-toolbar-height);
          padding: 0 var(--task-toolbar-padding-x);
          border-radius: var(--task-radius-sm);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          line-height: 1;
          font-size: var(--task-font-sm);
          gap: 4px;
        }
        .task-summary-info-cards {
          display: grid;
          grid-template-columns: repeat(3, minmax(180px, 1fr));
          gap: 10px;
          margin-bottom: 10px;
          max-width: 1260px;
          width: 100%;
          margin-left: auto;
          margin-right: auto;
          box-sizing: border-box;
        }
        .summary-metric-card {
          padding: 10px 12px;
          background: var(--b3-theme-surface);
          border-radius: 8px;
          border: 1px solid var(--b3-border-color);
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-height: 74px;
        }
        .summary-metric-card.card-completion {
          border-color: rgba(88, 164, 255, 0.45);
          background: linear-gradient(135deg, rgba(88, 164, 255, 0.12), rgba(88, 164, 255, 0.03));
        }
        .summary-metric-card.card-done {
          border-color: rgba(56, 176, 0, 0.45);
          background: linear-gradient(135deg, rgba(56, 176, 0, 0.12), rgba(56, 176, 0, 0.03));
        }
        .summary-metric-card.card-focus {
          border-color: rgba(250, 160, 25, 0.45);
          background: linear-gradient(135deg, rgba(250, 160, 25, 0.12), rgba(250, 160, 25, 0.03));
        }
        .summary-metric-card.card-today {
          border-color: rgba(35, 131, 226, 0.45);
          background: linear-gradient(135deg, rgba(35, 131, 226, 0.12), rgba(35, 131, 226, 0.03));
        }
        .summary-metric-card.card-overdue {
          border-color: rgba(224, 62, 62, 0.45);
          background: linear-gradient(135deg, rgba(224, 62, 62, 0.12), rgba(224, 62, 62, 0.03));
        }
        .summary-metric-card.card-next7 {
          border-color: rgba(18, 154, 147, 0.45);
          background: linear-gradient(135deg, rgba(18, 154, 147, 0.12), rgba(18, 154, 147, 0.03));
        }
        .metric-label {
          font-size: 12px;
          color: var(--b3-theme-on-surface-light);
        }
        .metric-value {
          font-size: 22px;
          font-weight: 700;
          line-height: 1;
        }
        .metric-sub {
          font-size: 12px;
          color: var(--b3-theme-on-surface-light);
        }
        .summary-alert-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid var(--b3-border-color);
          background: var(--b3-theme-surface);
          margin-bottom: 10px;
          max-width: 1260px;
          width: 100%;
          margin-left: auto;
          margin-right: auto;
          box-sizing: border-box;
        }
        .summary-alert-label {
          font-size: 12px;
          color: var(--b3-theme-on-surface-light);
          margin-right: 2px;
        }
        .summary-alert-chip {
          border: 1px solid var(--b3-border-color);
          background: var(--b3-theme-background);
          color: var(--b3-theme-on-surface);
          border-radius: 999px;
          padding: 2px 10px;
          font-size: 12px;
          cursor: pointer;
          line-height: 20px;
        }
        .summary-alert-chip:hover {
          background: var(--b3-list-hover);
        }
        .summary-alert-ok {
          font-size: 12px;
          color: var(--b3-theme-on-surface-light);
        }
        .task-summary-content {
          flex: 1;
          overflow-y: auto;
          padding-right: 4px;
          max-width: 1260px;
          width: 100%;
          margin-left: auto;
          margin-right: auto;
          box-sizing: border-box;
        }
        .task-summary-empty {
          text-align: center;
          padding: 36px 0;
          color: var(--b3-theme-on-surface-light);
        }
        .task-date-group {
          margin-bottom: 16px;
          border: 1px solid var(--b3-border-color);
          border-radius: 10px;
          background: var(--b3-theme-surface);
          padding: 8px 10px 10px 10px;
        }
        .task-date-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 6px 2px 8px 2px;
          margin-bottom: 6px;
          border-bottom: 1px solid var(--b3-border-color);
          position: sticky;
          top: 0;
          background: var(--b3-theme-surface);
          z-index: 1;
        }
        .task-date-title {
          color: var(--b3-theme-on-surface);
          margin: 0;
          font-size: 16px;
        }
        .task-date-meta {
          color: var(--b3-theme-on-surface-light);
          font-size: 12px;
        }
        .summary-stat-row {
          margin-bottom: 8px;
          font-size: 13px;
          color: var(--b3-theme-on-surface-light);
          padding-left: 2px;
        }
        .task-project-group {
          margin-bottom: 10px;
          padding: 2px 0;
        }
        .task-project-title {
          color: var(--b3-theme-on-surface-light);
          margin-bottom: 6px;
          font-size: 13px;
          margin-top: 0;
          font-weight: 600;
        }
        .task-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .task-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px;
          border: 1px solid var(--b3-border-color);
          border-radius: 8px;
          background: var(--b3-theme-background);
          margin-top: 6px;
          margin-left: var(--task-indent, 0px);
          width: calc(100% - var(--task-indent, 0px));
          max-width: 100%;
          box-sizing: border-box;
        }
        .task-item.completed {
          opacity: 0.72;
        }
        .task-item.completed .task-title {
          text-decoration: line-through;
        }
        .task-checkbox {
          width: 18px;
          text-align: center;
          color: var(--b3-theme-on-surface-light);
          flex-shrink: 0;
          padding-top: 1px;
        }
        .task-body {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
          flex: 1;
        }
        .task-title-line {
          display: flex;
          align-items: flex-start;
          gap: 6px;
        }
        .task-title {
          word-break: break-word;
          font-size: 14px;
          line-height: 1.4;
        }
        .task-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }
        .task-meta-chip {
          font-size: 12px;
          color: var(--b3-theme-on-surface-light);
          background: var(--b3-list-hover);
          border-radius: 999px;
          padding: 1px 8px;
          line-height: 20px;
        }
        .task-meta-chip.focus {
          color: var(--b3-theme-primary);
        }
        .task-meta-chip.done-time {
          color: #8b8b8b;
        }
        .task-meta-chip.doc {
          color: var(--b3-theme-secondary);
        }
        .task-note {
          font-size: 12px;
          color: var(--b3-theme-on-surface-light);
          margin-top: 2px;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .task-completed-collapse {
          margin-top: 8px;
          border-top: 1px dashed var(--b3-border-color);
          padding-top: 8px;
        }
        .task-completed-collapse > summary {
          cursor: pointer;
          color: var(--b3-theme-on-surface-light);
          font-size: 13px;
          user-select: none;
        }
        .task-completed-hint {
          font-size: 12px;
          color: var(--b3-theme-on-surface-light);
          margin: 6px 0 8px;
        }
        .completed-group .task-project-title {
          opacity: 0.8;
        }
        .priority-high {
          border-left: 3px solid #e74c3c;
        }
        .priority-medium {
          border-left: 3px solid #f39c12;
        }
        .priority-low {
          border-left: 3px solid #3498db;
        }
        .task-summary-wrapper .b3-button svg.b3-button__icon {
          margin-right: 0;
        }
        @media (max-width: 980px) {
          .task-summary-info-cards {
            grid-template-columns: repeat(2, minmax(160px, 1fr));
          }
        }
        @media (max-width: 720px) {
          .task-summary-wrapper {
            padding: 10px;
          }
          .task-summary-info-cards {
            grid-template-columns: 1fr;
          }
          .task-summary-toolbar-main {
            align-items: flex-start;
          }
        }
      </style>
    `;

    return html;
  }

  /**
   * 绑定摘要事件
   */
  private bindSummaryEvents() {
    const container = this.currentDialog.element.querySelector('#task-summary-dialog-container');
    if (!container) return;

    // 单行时间范围标签（语义范围 + 日历范围）
    container.querySelectorAll('button[data-range-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const rangeId = btn.getAttribute('data-range-id');
        const mode = btn.getAttribute('data-range-mode');
        if (!rangeId || !mode) return;

        if (mode === 'semantic') {
          this.currentSemanticFilter = rangeId;
          this.shouldAutoPickFocus = false;
          if (rangeId === 'today' || rangeId === 'next3' || rangeId === 'next7') {
            this.currentFocusFilter = 'open';
          } else if (rangeId === 'overdue') {
            this.currentFocusFilter = 'overdue';
          } else if (rangeId === 'history') {
            this.currentFocusFilter = 'all';
          }
        } else {
          this.currentSemanticFilter = 'auto';
          this.currentFilter = rangeId;
          this.shouldAutoPickFocus = true;
          this.currentFocusFilter = 'all';
        }

        this.renderSummary();
      });
    });

    // 聚焦筛选按钮事件（顶部聚焦按钮 + 风险提示条按钮）
    container.querySelectorAll('button[data-focus]').forEach(btn => {
      btn.addEventListener('click', () => {
        const focus = btn.getAttribute('data-focus');
        if (focus) {
          this.currentFocusFilter = focus;
          this.shouldAutoPickFocus = false;
          this.renderSummary();
        }
      });
    });

    // 已完成分组一键展开/收起
    const expandAllCompletedBtn = container.querySelector('#expand-all-sections-btn') as HTMLElement | null;
    const collapseAllCompletedBtn = container.querySelector('#collapse-all-sections-btn') as HTMLElement | null;
    if (expandAllCompletedBtn) {
      expandAllCompletedBtn.addEventListener('click', () => {
        this.completedSectionsExpanded = true;
        container.querySelectorAll('details.task-completed-collapse').forEach((el) => {
          (el as HTMLDetailsElement).open = true;
        });
      });
    }
    if (collapseAllCompletedBtn) {
      collapseAllCompletedBtn.addEventListener('click', () => {
        this.completedSectionsExpanded = false;
        container.querySelectorAll('details.task-completed-collapse').forEach((el) => {
          (el as HTMLDetailsElement).open = false;
        });
      });
    }

    // 导出菜单
    const exportBtn = container.querySelector('#export-summary-btn') as HTMLElement | null;
    if (exportBtn) {
      exportBtn.addEventListener('click', (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const menu = new Menu('task-summary-export-menu');
        menu.addItem({
          icon: 'iconCopy',
          label: i18n("copyRichText"),
          click: () => this.executeCopy('rich')
        });
        menu.addItem({
          icon: 'iconCopy',
          label: i18n("copyAll"),
          click: () => this.executeCopy('markdown')
        });
        menu.addItem({
          icon: 'iconCopy',
          label: i18n("copyPlainText"),
          click: () => this.executeCopy('plain')
        });
        const rect = exportBtn.getBoundingClientRect();
        menu.open({ x: rect.right, y: rect.bottom + 4 });
      });
    }
  }


  /**
   * 执行复制操作（基于当前视图HTML）
   */
  public executeCopy(copyType: string, groupedTasks?: Map<string, Map<string, any[]>>) {
    // 使用新的基于视图的复制方法
    switch (copyType) {
      case 'rich':
        this.copyFromCurrentView('html');
        break;
      case 'markdown':
        this.copyFromCurrentView('markdown');
        break;
      case 'plain':
        this.copyFromCurrentView('plain');
        break;
      default:
        this.copyFromCurrentView('html');
    }
  }

  /**
   * 复制当前视图的富文本任务摘要
   */
  public async copyCurrentViewRichText() {
    this.executeCopy('rich');
  }

  /**
   * 从当前视图的 HTML 提取内容并转换为指定格式
   */
  private async copyFromCurrentView(format: 'html' | 'markdown' | 'plain') {
    const container = this.currentDialog.element.querySelector('#task-summary-dialog-container');
    if (!container) {
      showMessage(i18n("copyFailed"));
      return;
    }

    try {
      let content = '';

      if (format === 'html') {
        content = this.extractHTMLContent(container as HTMLElement);
      } else if (format === 'markdown') {
        content = this.htmlToMarkdown(container as HTMLElement);
      } else {
        content = this.htmlToPlainText(container as HTMLElement);
      }

      // 复制到剪贴板
      if (format === 'html') {
        await this.copyHTMLToClipboard(content, this.htmlToPlainText(container as HTMLElement));
      } else {
        this.copyTextToClipboard(content);
      }
    } catch (error) {
      console.error('复制失败:', error);
      showMessage(i18n("copyFailed"));
    }
  }

  private extractHTMLContent(container: HTMLElement): string {
    const clone = container.cloneNode(true) as HTMLElement;

    // 检查是否为多天视图（通过日期组数量判断）
    const dateGroups = container.querySelectorAll('.task-date-group');
    const isMultiDayView = dateGroups.length > 1;

    // 移除不需要复制到剪贴板的交互元素
    // 移除筛选按钮组和操作按钮组（复制按钮等）
    clone.querySelectorAll('.filter-buttons, .action-buttons, button').forEach(el => el.remove());

    // 如果是单天视图，移除头部的汇总统计卡片
    if (!isMultiDayView) {
      clone.querySelectorAll('.task-summary-info-cards').forEach(el => el.remove());
    }

    return clone.innerHTML;
  }

  private htmlToMarkdown(container: HTMLElement): string {
    let markdown = '';

    // 检查是否为多天视图（通过日期组数量判断）
    const dateGroups = container.querySelectorAll('.task-date-group');
    const isMultiDayView = dateGroups.length > 1;

    const title = container.querySelector('h2');
    if (title) markdown += `# ${title.textContent?.trim()}\n\n`;

    // 只在多天视图时包含统计信息卡片
    if (isMultiDayView) {
      const infoCards = container.querySelectorAll('.info-card');
      if (infoCards.length > 0) {
        infoCards.forEach(card => {
          const divs = card.querySelectorAll('div');
          if (divs.length >= 2) {
            const label = divs[0].textContent?.trim();
            const value = divs[1].textContent?.trim();
            if (label && value) {
              markdown += `**${label}**: ${value}\n`;
            }
          }
        });
        markdown += '\n';
      }
    }

    dateGroups.forEach(dateGroup => {
      const dateTitle = dateGroup.querySelector('.task-date-title');
      if (dateTitle) markdown += `## ${dateTitle.textContent?.trim()}\n\n`;

      const projectGroups = dateGroup.querySelectorAll('.task-project-group');
      projectGroups.forEach(projectGroup => {
        const projectTitle = projectGroup.querySelector('.task-project-title');
        if (projectTitle) markdown += `### ${projectTitle.textContent?.trim()}\n\n`;

        const tasks = projectGroup.querySelectorAll('.task-item');
        tasks.forEach(task => {
          const depth = parseInt(task.getAttribute('data-depth') || '0');
          const indent = '  '.repeat(depth);
          const checkbox = task.classList.contains('completed') ? '[x]' : '[ ]';
          const title = task.querySelector('.task-title')?.textContent?.trim() || '';
          markdown += `${indent}- ${checkbox} ${title}\n`;
          const noteElem = task.querySelector('.task-note');
          if (noteElem) {
            const noteText = noteElem.textContent || '';
            const lines = noteText.split(/\r?\n/);
            if (lines.length > 0) {
              // 在标题与备注之间插入一个空行以符合 Markdown 规范
              markdown += `${indent}  \n`;
              lines.forEach(line => {
                if (line === '') {
                  // 保留空行
                  markdown += `${indent}  \n`;
                } else {
                  markdown += `${indent}  ${line.trim()}\n`;
                }
              });
            }
          }
        });
        markdown += '\n';
      });
    });
    return markdown;
  }

  private htmlToPlainText(container: HTMLElement): string {
    let text = '';

    // 检查是否为多天视图（通过日期组数量判断）
    const dateGroups = container.querySelectorAll('.task-date-group');
    const isMultiDayView = dateGroups.length > 1;

    // 提取标题（如果有）
    const title = container.querySelector('h2');
    if (title) {
      const titleText = title.textContent?.trim();
      if (titleText) {
        text += `${titleText}\n${'-'.repeat(titleText.length)}\n\n`;
      }
    }

    // 只在多天视图时包含统计信息卡片
    if (isMultiDayView) {
      const infoCards = container.querySelectorAll('.info-card');
      if (infoCards.length > 0) {
        infoCards.forEach(card => {
          const divs = card.querySelectorAll('div');
          if (divs.length >= 2) {
            const label = divs[0].textContent?.trim();
            // 清理内部空白字符，防止出现多余换行
            const value = divs[1].textContent?.trim().replace(/\s+/g, ' ');
            if (label && value) {
              text += `${label}：${value}\n`;
            }
          }
        });
        text += '\n';
      }
    }

    // 提取任务列表
    dateGroups.forEach(dateGroup => {
      const dateTitle = dateGroup.querySelector('.task-date-title');
      if (dateTitle) {
        const dateTitleText = dateTitle.textContent?.trim();
        if (dateTitleText) {
          text += `${dateTitleText}\n${'-'.repeat(dateTitleText.length)}\n\n`;
        }
      }

      // 提取统计行（番茄钟等）
      const statRows = dateGroup.querySelectorAll('.summary-stat-row');
      statRows.forEach(row => {
        const statText = row.textContent?.trim();
        if (statText) {
          text += `${statText}\n\n`;
        }
      });

      const projectGroups = dateGroup.querySelectorAll('.task-project-group');
      projectGroups.forEach(projectGroup => {
        const projectTitle = projectGroup.querySelector('.task-project-title');
        if (projectTitle) {
          const projectTitleText = projectTitle.textContent?.trim();
          if (projectTitleText) {
            text += `【${projectTitleText}】\n`;
          }
        }

        const tasks = projectGroup.querySelectorAll('.task-item');
        tasks.forEach(task => {
          const depth = parseInt(task.getAttribute('data-depth') || '0');
          const indent = '  '.repeat(depth);
          const checkbox = task.classList.contains('completed') ? '' : '⬜';

          // 提取任务标题（包含所有内联元素）
          const taskTitle = task.querySelector('.task-title');
          const titleText = taskTitle?.textContent?.trim() || '';

          text += `${indent}${checkbox} ${titleText}\n`;

          const noteElem = task.querySelector('.task-note');
          if (noteElem) {
            const noteText = noteElem.textContent || '';
            const lines = noteText.split(/\r?\n/);
            if (lines.length > 0) {
              // 在标题与备注之间插入一个空行
              text += `${indent}  \n`;
              lines.forEach(line => {
                const l = line.trim();
                if (l.length === 0) {
                  text += `${indent}  \n`;
                } else {
                  text += `${indent}  ${l}\n`;
                }
              });
            }
          }
        });
        text += '\n';
      });

      text += '\n';
    });

    return text;
  }

  private copyTextToClipboard(text: string) {
    platformUtils.writeText(text);
    showMessage(i18n("copiedToClipboard"));
  }

  private async copyHTMLToClipboard(html: string, fallbackText: string) {
    try {
      if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
        this.copyTextToClipboard(fallbackText);
        return;
      }

      const blob = new Blob([html], { type: 'text/html' });
      const clipboardItem = new ClipboardItem({ 'text/html': blob });
      await navigator.clipboard.write([clipboardItem]);
      showMessage(i18n("copiedToClipboard"));
    } catch (error) {
      console.error('复制富文本失败，回退为纯文本复制:', error);
      this.copyTextToClipboard(fallbackText);
    }
  }

}
