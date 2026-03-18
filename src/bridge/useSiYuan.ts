import { useCallback } from 'react';
import { useSiYuanPlugin } from './SiYuanContext';

// Re-export all API functions from the original api.ts
export * from '../api';

/**
 * Hook to access SiYuan API with plugin context
 */
export function useSiYuanAPI() {
  const plugin = useSiYuanPlugin();
  
  const loadData = useCallback(async (key: string): Promise<any> => {
    if (!plugin) throw new Error('Plugin not available');
    return plugin.loadData(key);
  }, [plugin]);
  
  const saveData = useCallback(async (key: string, value: any): Promise<void> => {
    if (!plugin) throw new Error('Plugin not available');
    return plugin.saveData(key, value);
  }, [plugin]);
  
  const loadSettings = useCallback(async (): Promise<any> => {
    if (!plugin) throw new Error('Plugin not available');
    return plugin.loadSettings();
  }, [plugin]);
  
  const saveSettings = useCallback(async (settings: any): Promise<void> => {
    if (!plugin) throw new Error('Plugin not available');
    return plugin.saveSettings(settings);
  }, [plugin]);
  
  return {
    plugin,
    loadData,
    saveData,
    loadSettings,
    saveSettings,
  };
}

/**
 * Hook for data operations with specific keys
 */
export function useDataStorage<T = any>(key: string) {
  const { loadData, saveData } = useSiYuanAPI();
  
  const load = useCallback(async (): Promise<T | null> => {
    try {
      return await loadData(key);
    } catch (e) {
      console.warn(`Failed to load data for key: ${key}`, e);
      return null;
    }
  }, [key, loadData]);
  
  const save = useCallback(async (value: T): Promise<void> => {
    try {
      await saveData(key, value);
    } catch (e) {
      console.error(`Failed to save data for key: ${key}`, e);
      throw e;
    }
  }, [key, saveData]);
  
  return { load, save };
}
