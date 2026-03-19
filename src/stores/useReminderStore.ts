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
  parentId?: string;
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
  
  // New actions
  setReminderPriority: (id: string, priority: 'high' | 'medium' | 'low' | null) => void;
  setReminderCategory: (id: string, categoryId: string | null) => void;
  setReminderDate: (id: string, date: string | null) => void;
  addSubtask: (parentId: string, title: string) => void;
  deleteSubtask: (parentId: string, subtaskId: string) => void;
  duplicateReminder: (id: string) => void;
  
  // Batch operations
  batchToggleComplete: (ids: string[], completed: boolean) => void;
  batchSetPriority: (ids: string[], priority: 'high' | 'medium' | 'low' | null) => void;
  batchSetCategory: (ids: string[], categoryId: string | null) => void;
  batchSetDate: (ids: string[], date: string | null) => void;
  batchDelete: (ids: string[]) => void;
  
  // Async actions
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
  
  // New actions
  setReminderPriority: (id, priority) => {
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id
          ? { ...r, priority: priority ?? undefined, updatedAt: new Date().toISOString() }
          : r
      ),
    }));
  },
  
  setReminderCategory: (id, categoryId) => {
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id
          ? { ...r, categoryId: categoryId ?? undefined, updatedAt: new Date().toISOString() }
          : r
      ),
    }));
  },
  
  setReminderDate: (id, date) => {
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id
          ? { ...r, date: date ?? undefined, updatedAt: new Date().toISOString() }
          : r
      ),
    }));
  },
  
  addSubtask: (parentId, title) => {
    const newSubtask: Reminder = {
      id: `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === parentId
          ? { 
              ...r, 
              subtasks: [...(r.subtasks || []), newSubtask],
              updatedAt: new Date().toISOString()
            }
          : r
      ),
    }));
  },
  
  deleteSubtask: (parentId, subtaskId) => {
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === parentId
          ? { 
              ...r, 
              subtasks: r.subtasks?.filter((st) => st.id !== subtaskId) || [],
              updatedAt: new Date().toISOString()
            }
          : r
      ),
    }));
  },
  
  duplicateReminder: (id) => {
    const { reminders } = get();
    const originalReminder = reminders.find((r) => r.id === id);
    if (!originalReminder) return;
    
    const duplicatedReminder: Reminder = {
      ...originalReminder,
      id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `${originalReminder.title} (Copy)`,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subtasks: originalReminder.subtasks?.map((st) => ({
        ...st,
        id: `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 5)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    };
    
    set((state) => ({
      reminders: [...state.reminders, duplicatedReminder],
    }));
  },
  
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  
  // Batch operations
  batchToggleComplete: (ids, completed) => {
    set((state) => ({
      reminders: state.reminders.map((r) =>
        ids.includes(r.id)
          ? { ...r, completed, updatedAt: new Date().toISOString() }
          : r
      ),
    }));
  },
  
  batchSetPriority: (ids, priority) => {
    set((state) => ({
      reminders: state.reminders.map((r) =>
        ids.includes(r.id)
          ? { ...r, priority: priority ?? undefined, updatedAt: new Date().toISOString() }
          : r
      ),
    }));
  },
  
  batchSetCategory: (ids, categoryId) => {
    set((state) => ({
      reminders: state.reminders.map((r) =>
        ids.includes(r.id)
          ? { ...r, categoryId: categoryId ?? undefined, updatedAt: new Date().toISOString() }
          : r
      ),
    }));
  },
  
  batchSetDate: (ids, date) => {
    set((state) => ({
      reminders: state.reminders.map((r) =>
        ids.includes(r.id)
          ? { ...r, date: date ?? undefined, updatedAt: new Date().toISOString() }
          : r
      ),
    }));
  },
  
  batchDelete: (ids) => {
    set((state) => ({
      reminders: state.reminders.filter((r) => !ids.includes(r.id)),
    }));
  },
  
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
