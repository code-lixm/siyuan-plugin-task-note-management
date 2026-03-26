import { create } from 'zustand';
import { getPluginInstance } from '@/pluginInstance';
import { ConflictResolver, VersionedData } from '@/utils/conflictResolver';
import { HistoryAction, useHistoryStore } from './historyStore';

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
  version?: number;
  timestamp?: number;
  deviceId?: string;
}

interface ReminderState {
  reminders: Reminder[];
  isLoading: boolean;
  error: string | null;

  setPlugin: (plugin: SiYuanReminderPlugin | null) => void;
  
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

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

interface SiYuanReminderPlugin {
  loadReminderData: () => Promise<Record<string, any>>;
  saveReminderData: (data: Record<string, any>) => Promise<void>;
}

let reminderPlugin: SiYuanReminderPlugin | null = null;

function getReminderPlugin(): SiYuanReminderPlugin {
  if (reminderPlugin) {
    return reminderPlugin;
  }

  const fallbackPlugin = getPluginInstance() as SiYuanReminderPlugin | null;
  if (fallbackPlugin) {
    reminderPlugin = fallbackPlugin;
    return fallbackPlugin;
  }

  throw new Error('SiYuan plugin not initialized for reminder store');
}

const toTimestamp = (updatedAt?: string, createdAt?: string): number => {
  const parsed = Date.parse(updatedAt || createdAt || '');
  return Number.isNaN(parsed) ? Date.now() : parsed;
};

const normalizeReminder = (reminder: Reminder): Reminder => ({
  ...reminder,
  version: typeof reminder.version === 'number' && reminder.version > 0 ? reminder.version : 1,
  timestamp: typeof reminder.timestamp === 'number' && reminder.timestamp > 0 ? reminder.timestamp : toTimestamp(reminder.updatedAt, reminder.createdAt),
  deviceId: reminder.deviceId || 'unknown',
  subtasks: reminder.subtasks?.map((subtask) => normalizeReminder(subtask)),
});

const touchReminder = (reminder: Reminder, updates: Partial<Reminder> = {}): Reminder => {
  const updatedAt = updates.updatedAt || new Date().toISOString();
  const wrapped = ConflictResolver.wrapWithVersion(reminder);
  return normalizeReminder({
    ...reminder,
    ...updates,
    updatedAt,
    version: wrapped.version,
    timestamp: wrapped.timestamp,
    deviceId: wrapped.deviceId,
  });
};

const toVersionedReminder = (reminder: Reminder): VersionedData<Reminder> => {
  const normalized = normalizeReminder(reminder);
  return {
    data: normalized,
    version: normalized.version || 1,
    timestamp: normalized.timestamp || Date.now(),
    deviceId: normalized.deviceId || 'unknown',
  };
};

const cloneReminderSnapshot = (reminders: Reminder[]): Reminder[] =>
  JSON.parse(JSON.stringify(reminders)) as Reminder[];

const hasReminderChanges = (previousState: Reminder[], nextState: Reminder[]): boolean =>
  JSON.stringify(previousState) !== JSON.stringify(nextState);

const recordReminderHistory = (
  action: HistoryAction['action'],
  description: string,
  itemId: string,
  previousState: Reminder[],
  nextState: Reminder[]
): void => {
  const historyStore = useHistoryStore.getState();
  if (historyStore.isReplaying || !hasReminderChanges(previousState, nextState)) {
    return;
  }

  historyStore.addAction({
    type: 'reminder',
    action,
    description,
    undoData: {
      previousState,
      itemId,
    },
    redoData: {
      newState: nextState,
      itemId,
    },
  });
};

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],
  isLoading: false,
  error: null,

  setPlugin: (plugin) => {
    reminderPlugin = plugin;
  },
  
  setReminders: (reminders) => set({ reminders: reminders.map((item) => normalizeReminder(item)) }),
  
  addReminder: (reminderData) => {
    const previousState = cloneReminderSnapshot(get().reminders);
    const baseReminder: Reminder = {
      ...reminderData,
      id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const newReminder = touchReminder(baseReminder);
    set((state) => ({
      reminders: [...state.reminders, newReminder],
    }));
    const nextState = cloneReminderSnapshot(get().reminders);
    recordReminderHistory('create', `Create reminder: ${newReminder.title}`, newReminder.id, previousState, nextState);
    void get().saveReminders();
  },
  
  updateReminder: (id, updates) => {
    const previousState = cloneReminderSnapshot(get().reminders);
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id ? touchReminder(r, updates) : r
      ),
    }));
    const nextState = cloneReminderSnapshot(get().reminders);
    recordReminderHistory('update', `Update reminder: ${id}`, id, previousState, nextState);
    void get().saveReminders();
  },
  
  deleteReminder: (id) => {
    const previousState = cloneReminderSnapshot(get().reminders);
    set((state) => ({
      reminders: state.reminders.filter((r) => r.id !== id),
    }));
    const nextState = cloneReminderSnapshot(get().reminders);
    recordReminderHistory('delete', `Delete reminder: ${id}`, id, previousState, nextState);
    void get().saveReminders();
  },
  
  toggleComplete: (id) => {
    const previousState = cloneReminderSnapshot(get().reminders);
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id
          ? touchReminder(r, { completed: !r.completed })
          : r
      ),
    }));
    const nextState = cloneReminderSnapshot(get().reminders);
    recordReminderHistory('update', `Toggle reminder completion: ${id}`, id, previousState, nextState);
    void get().saveReminders();
  },
  
  // New actions
  setReminderPriority: (id, priority) => {
    const previousState = cloneReminderSnapshot(get().reminders);
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id
          ? touchReminder(r, { priority: priority ?? undefined })
          : r
      ),
    }));
    const nextState = cloneReminderSnapshot(get().reminders);
    recordReminderHistory('update', `Set reminder priority: ${id}`, id, previousState, nextState);
    void get().saveReminders();
  },
  
  setReminderCategory: (id, categoryId) => {
    const previousState = cloneReminderSnapshot(get().reminders);
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id
          ? touchReminder(r, { categoryId: categoryId ?? undefined })
          : r
      ),
    }));
    const nextState = cloneReminderSnapshot(get().reminders);
    recordReminderHistory('update', `Set reminder category: ${id}`, id, previousState, nextState);
    void get().saveReminders();
  },
  
  setReminderDate: (id, date) => {
    const previousState = cloneReminderSnapshot(get().reminders);
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id
          ? touchReminder(r, { date: date ?? undefined })
          : r
      ),
    }));
    const nextState = cloneReminderSnapshot(get().reminders);
    recordReminderHistory('update', `Set reminder date: ${id}`, id, previousState, nextState);
    void get().saveReminders();
  },
  
  addSubtask: (parentId, title) => {
    const previousState = cloneReminderSnapshot(get().reminders);
    const baseSubtask: Reminder = {
      id: `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const newSubtask = touchReminder(baseSubtask);
    
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === parentId
          ? touchReminder(r, { subtasks: [...(r.subtasks || []), newSubtask] })
          : r
      ),
    }));
    const nextState = cloneReminderSnapshot(get().reminders);
    recordReminderHistory('update', `Add subtask to reminder: ${parentId}`, parentId, previousState, nextState);
    void get().saveReminders();
  },
  
  deleteSubtask: (parentId, subtaskId) => {
    const previousState = cloneReminderSnapshot(get().reminders);
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === parentId
          ? touchReminder(r, { subtasks: r.subtasks?.filter((st) => st.id !== subtaskId) || [] })
          : r
      ),
    }));
    const nextState = cloneReminderSnapshot(get().reminders);
    recordReminderHistory('update', `Delete subtask from reminder: ${parentId}`, parentId, previousState, nextState);
    void get().saveReminders();
  },
  
  duplicateReminder: (id) => {
    const previousState = cloneReminderSnapshot(get().reminders);
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
        ...touchReminder(st),
        id: `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 5)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    };
    const versionedReminder = touchReminder(duplicatedReminder);
    
    set((state) => ({
      reminders: [...state.reminders, versionedReminder],
    }));
    const nextState = cloneReminderSnapshot(get().reminders);
    recordReminderHistory('create', `Duplicate reminder: ${id}`, versionedReminder.id, previousState, nextState);
    void get().saveReminders();
  },
  
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  
  // Batch operations
  batchToggleComplete: (ids, completed) => {
    const previousState = cloneReminderSnapshot(get().reminders);
    set((state) => ({
      reminders: state.reminders.map((r) =>
        ids.includes(r.id)
          ? touchReminder(r, { completed })
          : r
      ),
    }));
    const nextState = cloneReminderSnapshot(get().reminders);
    recordReminderHistory('update', `Batch toggle reminder completion (${ids.length})`, '__all__', previousState, nextState);
    void get().saveReminders();
  },
  
  batchSetPriority: (ids, priority) => {
    const previousState = cloneReminderSnapshot(get().reminders);
    set((state) => ({
      reminders: state.reminders.map((r) =>
        ids.includes(r.id)
          ? touchReminder(r, { priority: priority ?? undefined })
          : r
      ),
    }));
    const nextState = cloneReminderSnapshot(get().reminders);
    recordReminderHistory('update', `Batch set reminder priority (${ids.length})`, '__all__', previousState, nextState);
    void get().saveReminders();
  },
  
  batchSetCategory: (ids, categoryId) => {
    const previousState = cloneReminderSnapshot(get().reminders);
    set((state) => ({
      reminders: state.reminders.map((r) =>
        ids.includes(r.id)
          ? touchReminder(r, { categoryId: categoryId ?? undefined })
          : r
      ),
    }));
    const nextState = cloneReminderSnapshot(get().reminders);
    recordReminderHistory('update', `Batch set reminder category (${ids.length})`, '__all__', previousState, nextState);
    void get().saveReminders();
  },
  
  batchSetDate: (ids, date) => {
    const previousState = cloneReminderSnapshot(get().reminders);
    set((state) => ({
      reminders: state.reminders.map((r) =>
        ids.includes(r.id)
          ? touchReminder(r, { date: date ?? undefined })
          : r
      ),
    }));
    const nextState = cloneReminderSnapshot(get().reminders);
    recordReminderHistory('update', `Batch set reminder date (${ids.length})`, '__all__', previousState, nextState);
    void get().saveReminders();
  },
  
  batchDelete: (ids) => {
    const previousState = cloneReminderSnapshot(get().reminders);
    set((state) => ({
      reminders: state.reminders.filter((r) => !ids.includes(r.id)),
    }));
    const nextState = cloneReminderSnapshot(get().reminders);
    recordReminderHistory('delete', `Batch delete reminders (${ids.length})`, '__all__', previousState, nextState);
    void get().saveReminders();
  },
  
  loadReminders: async () => {
    set({ isLoading: true, error: null });
    try {
      const plugin = getReminderPlugin();
      const data = await plugin.loadReminderData();
      const localReminders = get().reminders.map((item) => normalizeReminder(item));
      const remoteReminders = (Array.isArray(data?.reminders) ? data.reminders : []).map((item) => normalizeReminder(item));

      const localMap = new Map(localReminders.map((item) => [item.id, item]));
      const mergedReminders: Reminder[] = [];
      let hasConflict = false;

      for (const remoteReminder of remoteReminders) {
        const localReminder = localMap.get(remoteReminder.id);
        if (!localReminder) {
          mergedReminders.push(remoteReminder);
          continue;
        }

        const conflict = ConflictResolver.detectConflicts(
          toVersionedReminder(localReminder),
          toVersionedReminder(remoteReminder)
        );

        if (conflict) {
          conflict.type = 'reminder';
          conflict.id = remoteReminder.id;
          hasConflict = true;
          mergedReminders.push(normalizeReminder(ConflictResolver.autoResolve(conflict)));
          console.warn('[ReminderStore] conflict detected:', conflict);
        } else {
          const useLocal = (localReminder.version || 1) > (remoteReminder.version || 1)
            || ((localReminder.version || 1) === (remoteReminder.version || 1)
              && (localReminder.timestamp || 0) >= (remoteReminder.timestamp || 0));
          mergedReminders.push(useLocal ? localReminder : remoteReminder);
        }

        localMap.delete(remoteReminder.id);
      }

      if (localMap.size > 0) {
        for (const reminder of localMap.values()) {
          mergedReminders.push(reminder);
        }
        hasConflict = true;
      }

      set({ reminders: mergedReminders.map((item) => normalizeReminder(item)) });

      if (hasConflict) {
        await plugin.saveReminderData({ reminders: mergedReminders.map((item) => normalizeReminder(item)) });
      }
    } catch (error) {
      console.error('[ReminderStore] loadReminders failed:', error);
      set({ error: String(error) });
    } finally {
      set({ isLoading: false });
    }
  },
  
  saveReminders: async () => {
    set({ error: null });
    try {
      const plugin = getReminderPlugin();
      const { reminders } = get();
      const normalizedReminders = reminders.map((item) => normalizeReminder(item));
      set({ reminders: normalizedReminders });
      await plugin.saveReminderData({ reminders: normalizedReminders });
    } catch (error) {
      console.error('[ReminderStore] saveReminders failed:', error);
      set({ error: String(error) });
    }
  },
}));

useHistoryStore.getState().registerExecutor('reminder', (action, direction) => {
  const snapshot = direction === 'undo' ? action.undoData.previousState : action.redoData.newState;
  if (!Array.isArray(snapshot)) {
    return;
  }

  useReminderStore.setState({ reminders: cloneReminderSnapshot(snapshot) });
  void useReminderStore.getState().saveReminders();
});
