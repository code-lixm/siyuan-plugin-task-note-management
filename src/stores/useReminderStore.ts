import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface Reminder {
  id: string;
  title: string;
  content?: string;
  date?: string;
  time?: string;
  completed: boolean;
  categoryId?: string;
  projectId?: string;
  blockId?: string;
  repeat?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    interval?: number;
    endDate?: string;
  };
  subtasks?: Reminder[];
  priority?: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

interface ReminderState {
  reminders: Reminder[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setReminders: (reminders: Reminder[]) => void;
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateReminder: (id: string, updates: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  toggleComplete: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Async actions (to be implemented with API)
  loadReminders: () => Promise<void>;
  saveReminders: () => Promise<void>;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],
  isLoading: false,
  error: null,
  
  setReminders: (reminders) => set({ reminders }),
  
  addReminder: (reminderData) => {
    const newReminder: Reminder = {
      ...reminderData,
      id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      reminders: [...state.reminders, newReminder],
    }));
  },
  
  updateReminder: (id, updates) => {
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
      ),
    }));
  },
  
  deleteReminder: (id) => {
    set((state) => ({
      reminders: state.reminders.filter((r) => r.id !== id),
    }));
  },
  
  toggleComplete: (id) => {
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id
          ? { ...r, completed: !r.completed, updatedAt: new Date().toISOString() }
          : r
      ),
    }));
  },
  
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  
  // These will be implemented with actual API calls
  loadReminders: async () => {
    set({ isLoading: true, error: null });
    try {
      // Will be connected to plugin.loadData('reminder.json')
      // For now, just simulate
      set({ isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },
  
  saveReminders: async () => {
    set({ isLoading: true, error: null });
    try {
      // Will be connected to plugin.saveData('reminder.json', reminders)
      set({ isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },
}));
