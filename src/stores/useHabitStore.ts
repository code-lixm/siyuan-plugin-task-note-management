import { create } from 'zustand';

export interface Habit {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  frequency: 'daily' | 'weekly' | 'custom';
  customDays?: number[]; // 0-6 for weekly
  targetPerPeriod?: number;
  checkIns: { [date: string]: boolean | string }; // date -> emoji or true
  groupId?: string;
  createdAt: string;
  updatedAt: string;
}

interface HabitState {
  habits: Habit[];
  isLoading: boolean;
  error: string | null;
  selectedDate: string;
  
  // Actions
  setHabits: (habits: Habit[]) => void;
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'checkIns'>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  checkIn: (habitId: string, date: string, value?: string) => void;
  uncheck: (habitId: string, date: string) => void;
  setSelectedDate: (date: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  isLoading: false,
  error: null,
  selectedDate: new Date().toISOString().split('T')[0],
  
  setHabits: (habits) => set({ habits }),
  
  addHabit: (habitData) => {
    const newHabit: Habit = {
      ...habitData,
      checkIns: {},
      id: `habit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      habits: [...state.habits, newHabit],
    }));
  },
  
  updateHabit: (id, updates) => {
    set((state) => ({
      habits: state.habits.map((h) =>
        h.id === id ? { ...h, ...updates, updatedAt: new Date().toISOString() } : h
      ),
    }));
  },
  
  deleteHabit: (id) => {
    set((state) => ({
      habits: state.habits.filter((h) => h.id !== id),
    }));
  },
  
  checkIn: (habitId, date, value = 'true') => {
    set((state) => ({
      habits: state.habits.map((h) =>
        h.id === habitId
          ? {
              ...h,
              checkIns: { ...h.checkIns, [date]: value },
              updatedAt: new Date().toISOString(),
            }
          : h
      ),
    }));
  },
  
  uncheck: (habitId, date) => {
    set((state) => ({
      habits: state.habits.map((h) => {
        if (h.id !== habitId) return h;
        const { [date]: _, ...rest } = h.checkIns;
        return { ...h, checkIns: rest, updatedAt: new Date().toISOString() };
      }),
    }));
  },
  
  setSelectedDate: (date) => set({ selectedDate: date }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
