import { useState, useEffect, useCallback } from 'react';
import { useSiYuanAPI } from '@/bridge';

/**
 * Generic hook for loading and saving data from SiYuan plugin storage
 */
export function useSiYuanData<T = any>(key: string, defaultValue: T | null = null) {
  const { loadData, saveData } = useSiYuanAPI();
  const [data, setData] = useState<T | null>(defaultValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await loadData(key);
        if (result !== null && result !== undefined) {
          setData(result);
        }
      } catch (err) {
        setError(String(err));
        console.error(`Error loading data for key "${key}":`, err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [key, loadData]);

  // Save data function
  const save = useCallback(async (newData: T) => {
    setIsLoading(true);
    setError(null);
    try {
      await saveData(key, newData);
      setData(newData);
      return true;
    } catch (err) {
      setError(String(err));
      console.error(`Error saving data for key "${key}":`, err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [key, saveData]);

  return { data, setData, save, isLoading, error };
}

/**
 * Hook specifically for reminder data
 */
export function useRemindersData() {
  return useSiYuanData<Record<string, any>>('reminder.json', {});
}

/**
 * Hook specifically for project data
 */
export function useProjectsData() {
  return useSiYuanData<Record<string, any>>('project.json', {});
}

/**
 * Hook specifically for habit data
 */
export function useHabitsData() {
  return useSiYuanData<Record<string, any>>('habit.json', {});
}

/**
 * Hook specifically for settings
 */
export function usePluginSettings() {
  return useSiYuanData<Record<string, any>>('reminder-settings.json', {});
}
