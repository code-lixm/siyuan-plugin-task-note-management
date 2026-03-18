import { create } from 'zustand';

export interface PluginSettings {
  showAdvancedFeatures?: boolean;
  showCompletedSubtasks?: boolean;
  defaultView?: 'list' | 'calendar' | 'kanban';
  theme?: 'light' | 'dark' | 'system';
  notificationEnabled?: boolean;
  pomodoroDuration?: number;
  shortBreakDuration?: number;
  longBreakDuration?: number;
}

interface SettingsState {
  settings: PluginSettings;
  isLoading: boolean;
  
  // Actions
  setSettings: (settings: PluginSettings) => void;
  updateSetting: <K extends keyof PluginSettings>(key: K, value: PluginSettings[K]) => void;
  setLoading: (loading: boolean) => void;
}

const defaultSettings: PluginSettings = {
  showAdvancedFeatures: false,
  showCompletedSubtasks: false,
  defaultView: 'list',
  theme: 'system',
  notificationEnabled: true,
  pomodoroDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  isLoading: false,
  
  setSettings: (settings) => set({ settings }),
  
  updateSetting: (key, value) => {
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    }));
  },
  
  setLoading: (loading) => set({ isLoading: loading }),
}));
