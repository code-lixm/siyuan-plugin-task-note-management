import { create } from 'zustand';

// 打卡Emoji配置
export interface HabitCheckInEmoji {
  emoji: string;
  meaning: string;
  promptNote?: boolean;
  countsAsSuccess?: boolean;
}

// 打卡记录
export interface CheckInRecord {
  count: number;
  status: string[];
  timestamp: string;
  entries?: { emoji: string; timestamp: string; note?: string }[];
}

// 频率设置
export interface Frequency {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  weekdays?: number[]; // 0-6, 0=周日
  monthDays?: number[]; // 1-31
  months?: number[]; // 1-12
}

// 习惯数据结构
export interface Habit {
  id: string;
  title: string;
  note?: string;
  blockId?: string;
  target: number;
  frequency: Frequency;
  startDate: string;
  endDate?: string;
  reminderTime?: string;
  reminderTimes?: (string | { time: string; note?: string })[];
  groupId?: string;
  priority?: 'high' | 'medium' | 'low' | 'none';
  projectId?: string;
  categoryId?: string;
  checkInEmojis: HabitCheckInEmoji[];
  checkIns: { [date: string]: CheckInRecord };
  hasNotify?: { [date: string]: boolean | { [time: string]: boolean } };
  totalCheckIns: number;
  createdAt: string;
  updatedAt: string;
  hideCheckedToday?: boolean;
  sort?: number;
}

// 习惯分组
export interface HabitGroup {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface HabitState {
  habits: Habit[];
  groups: HabitGroup[];
  isLoading: boolean;
  error: string | null;
  selectedDate: string;
  selectedGroups: string[];
  currentTab: string;
  sortKey: 'priority' | 'title';
  sortOrder: 'asc' | 'desc';
  collapsedGroups: Set<string>;

  // Actions
  setHabits: (habits: Habit[]) => void;
  setGroups: (groups: HabitGroup[]) => void;
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'checkIns' | 'totalCheckIns'>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  checkIn: (habitId: string, date: string, emojiConfig: HabitCheckInEmoji, note?: string, customTimestamp?: string) => void;
  uncheck: (habitId: string, date: string) => void;
  setSelectedDate: (date: string) => void;
  setSelectedGroups: (groups: string[]) => void;
  setCurrentTab: (tab: string) => void;
  setSortKey: (key: 'priority' | 'title') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  toggleGroupCollapse: (groupId: string) => void;
  setCollapsedGroups: (groups: Set<string>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed helpers
  getFilteredHabits: () => Habit[];
  getHabitsByGroup: () => Map<string, Habit[]>;
  isCompletedOnDate: (habit: Habit, date: string) => boolean;
  shouldCheckInOnDate: (habit: Habit, date: string) => boolean;
  calculateStreak: (habit: Habit) => number;
  getCheckInDays: (habit: Habit) => number;
  getCheckInRate: (habit: Habit, days: number) => number;
  getBestStreak: (habit: Habit) => number;
}

// 获取逻辑日期字符串（本地时区）
const getLogicalDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 获取相对日期字符串
const getRelativeDateString = (offsetDays: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 获取本地日期时间字符串
const getLocalDateTimeString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  groups: [],
  isLoading: false,
  error: null,
  selectedDate: getLogicalDateString(),
  selectedGroups: [],
  currentTab: 'today',
  sortKey: 'priority',
  sortOrder: 'desc',
  collapsedGroups: new Set(),

  setHabits: (habits) => set({ habits }),
  setGroups: (groups) => set({ groups }),

  addHabit: (habitData) => {
    const now = getLocalDateTimeString(new Date());
    const newHabit: Habit = {
      ...habitData as any,
      id: `habit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      checkIns: {},
      totalCheckIns: 0,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      habits: [...state.habits, newHabit],
    }));
    return newHabit;
  },

  updateHabit: (id, updates) => {
    const now = getLocalDateTimeString(new Date());
    set((state) => ({
      habits: state.habits.map((h) =>
        h.id === id ? { ...h, ...updates, updatedAt: now } : h
      ),
    }));
  },

  deleteHabit: (id) => {
    set((state) => ({
      habits: state.habits.filter((h) => h.id !== id),
    }));
  },

  checkIn: (habitId, date, emojiConfig, note, customTimestamp) => {
    const now = customTimestamp || getLocalDateTimeString(new Date());
    set((state) => ({
      habits: state.habits.map((h) => {
        if (h.id !== habitId) return h;

        const checkIns = { ...h.checkIns };
        if (!checkIns[date]) {
          checkIns[date] = {
            count: 0,
            status: [],
            timestamp: now,
            entries: [],
          };
        }

        const checkIn = checkIns[date];
        checkIn.entries = checkIn.entries || [];
        checkIn.entries.push({ emoji: emojiConfig.emoji, timestamp: now, note });
        checkIn.count = (checkIn.count || 0) + 1;
        checkIn.status = [...(checkIn.status || []), emojiConfig.emoji];
        checkIn.timestamp = now;

        return {
          ...h,
          checkIns,
          totalCheckIns: (h.totalCheckIns || 0) + 1,
          updatedAt: now,
        };
      }),
    }));
  },

  uncheck: (habitId, date) => {
    set((state) => ({
      habits: state.habits.map((h) => {
        if (h.id !== habitId) return h;
        const { [date]: _, ...rest } = h.checkIns;
        return {
          ...h,
          checkIns: rest,
          updatedAt: getLocalDateTimeString(new Date()),
        };
      }),
    }));
  },

  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedGroups: (groups) => set({ selectedGroups: groups }),
  setCurrentTab: (tab) => set({ currentTab: tab }),
  setSortKey: (key) => set({ sortKey: key }),
  setSortOrder: (order) => set({ sortOrder: order }),

  toggleGroupCollapse: (groupId) => {
    set((state) => {
      const newSet = new Set(state.collapsedGroups);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return { collapsedGroups: newSet };
    });
  },

  setCollapsedGroups: (groups) => set({ collapsedGroups: groups }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // 判断是否在某天完成
  isCompletedOnDate: (habit, date) => {
    const checkIn = habit.checkIns?.[date];
    if (!checkIn) return false;

    const emojis: string[] = [];
    if (checkIn.entries && checkIn.entries.length > 0) {
      checkIn.entries.forEach((entry) => {
        if (entry.emoji) emojis.push(entry.emoji);
      });
    } else if (checkIn.status && checkIn.status.length > 0) {
      emojis.push(...checkIn.status);
    }

    const successEmojis = emojis.filter((emoji) => {
      const emojiConfig = habit.checkInEmojis?.find((e) => e.emoji === emoji);
      return emojiConfig ? emojiConfig.countsAsSuccess !== false : true;
    });

    return successEmojis.length >= (habit.target || 1);
  },

  // 判断某天是否应该打卡
  shouldCheckInOnDate: (habit, date) => {
    const { frequency } = habit;
    const checkDate = new Date(date);
    const startDate = new Date(habit.startDate);

    if (habit.startDate > date) return false;
    if (habit.endDate && habit.endDate < date) return false;

    switch (frequency.type) {
      case 'daily':
        if (frequency.interval) {
          const daysDiff = Math.floor((checkDate.getTime() - startDate.getTime()) / 86400000);
          return daysDiff % frequency.interval === 0;
        }
        return true;

      case 'weekly':
        if (frequency.weekdays && frequency.weekdays.length > 0) {
          return frequency.weekdays.includes(checkDate.getDay());
        }
        if (frequency.interval) {
          const weeksDiff = Math.floor((checkDate.getTime() - startDate.getTime()) / (86400000 * 7));
          return weeksDiff % frequency.interval === 0 && checkDate.getDay() === startDate.getDay();
        }
        return checkDate.getDay() === startDate.getDay();

      case 'monthly':
        if (frequency.monthDays && frequency.monthDays.length > 0) {
          return frequency.monthDays.includes(checkDate.getDate());
        }
        if (frequency.interval) {
          const monthsDiff = (checkDate.getFullYear() - startDate.getFullYear()) * 12 +
            (checkDate.getMonth() - startDate.getMonth());
          return monthsDiff % frequency.interval === 0 && checkDate.getDate() === startDate.getDate();
        }
        return checkDate.getDate() === startDate.getDate();

      case 'yearly':
        if (frequency.months && frequency.months.length > 0) {
          if (!frequency.months.includes(checkDate.getMonth() + 1)) return false;
          if (frequency.monthDays && frequency.monthDays.length > 0) {
            return frequency.monthDays.includes(checkDate.getDate());
          }
          return checkDate.getDate() === startDate.getDate();
        }
        if (frequency.interval) {
          const yearsDiff = checkDate.getFullYear() - startDate.getFullYear();
          return yearsDiff % frequency.interval === 0 &&
            checkDate.getMonth() === startDate.getMonth() &&
            checkDate.getDate() === startDate.getDate();
        }
        return checkDate.getMonth() === startDate.getMonth() &&
          checkDate.getDate() === startDate.getDate();

      default:
        return true;
    }
  },

  // 获取筛选后的习惯
  getFilteredHabits: () => {
    const state = get();
    const { habits, currentTab, selectedGroups, selectedDate } = state;
    const today = getLogicalDateString();
    const tomorrow = getRelativeDateString(1);
    const yesterday = getRelativeDateString(-1);

    let filtered = habits;

    // 应用时间筛选
    switch (currentTab) {
      case 'today':
        filtered = habits.filter((h) => {
          if (h.startDate > today) return false;
          if (h.endDate && h.endDate < today) return false;
          if (!state.shouldCheckInOnDate(h, today)) return false;
          return !state.isCompletedOnDate(h, today);
        });
        break;
      case 'tomorrow':
        filtered = habits.filter((h) => {
          if (h.startDate > tomorrow) return false;
          if (h.endDate && h.endDate < tomorrow) return false;
          return state.shouldCheckInOnDate(h, tomorrow);
        });
        break;
      case 'todayCompleted':
        filtered = habits.filter((h) => state.isCompletedOnDate(h, today));
        break;
      case 'yesterdayCompleted':
        filtered = habits.filter((h) => state.isCompletedOnDate(h, yesterday));
        break;
      case 'all':
      default:
        filtered = habits;
    }

    // 应用分组筛选
    if (selectedGroups.length > 0 && !selectedGroups.includes('all')) {
      filtered = filtered.filter((h) => {
        const groupId = h.groupId || 'none';
        return selectedGroups.includes(groupId);
      });
    }

    return filtered;
  },

  // 按分组获取习惯
  getHabitsByGroup: () => {
    const state = get();
    const filtered = state.getFilteredHabits();
    const grouped = new Map<string, Habit[]>();

    filtered.forEach((habit) => {
      const groupId = habit.groupId || 'none';
      if (!grouped.has(groupId)) {
        grouped.set(groupId, []);
      }
      grouped.get(groupId)!.push(habit);
    });

    return grouped;
  },

  // 计算连续打卡天数
  calculateStreak: (habit) => {
    if (!habit.checkIns || Object.keys(habit.checkIns).length === 0) {
      return 0;
    }

    const state = get();
    const completedDates = Object.keys(habit.checkIns)
      .filter((dateStr) => state.isCompletedOnDate(habit, dateStr))
      .sort()
      .reverse();

    if (completedDates.length === 0) {
      return 0;
    }

    const today = getLogicalDateString();
    let streak = 0;
    let currentDate = new Date(today);

    for (const dateStr of completedDates) {
      const checkDate = new Date(dateStr);
      const dayDiff = Math.floor((currentDate.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dayDiff === streak) {
        streak++;
      } else if (dayDiff > streak) {
        break;
      }
    }

    return streak;
  },

  // 获取打卡天数
  getCheckInDays: (habit) => {
    const state = get();
    return Object.keys(habit.checkIns || {}).filter((dateStr) =>
      state.isCompletedOnDate(habit, dateStr)
    ).length;
  },

  // 计算打卡率
  getCheckInRate: (habit, days) => {
    const state = get();
    const today = new Date();
    let shouldCheckInDays = 0;
    let completedDays = 0;

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      if (state.shouldCheckInOnDate(habit, dateStr)) {
        shouldCheckInDays++;
        if (state.isCompletedOnDate(habit, dateStr)) {
          completedDays++;
        }
      }
    }

    return shouldCheckInDays > 0 ? Math.round((completedDays / shouldCheckInDays) * 100) : 0;
  },

  // 获取最佳连续记录
  getBestStreak: (habit) => {
    const state = get();
    const completedDates = Object.keys(habit.checkIns || {})
      .filter((dateStr) => state.isCompletedOnDate(habit, dateStr))
      .sort();

    if (completedDates.length === 0) return 0;

    let bestStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < completedDates.length; i++) {
      const prevDate = new Date(completedDates[i - 1]);
      const currDate = new Date(completedDates[i]);
      const dayDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dayDiff === 1) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return bestStreak;
  },
}));
