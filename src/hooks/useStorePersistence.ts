/*
 * Copyright (c) 2024 by OpenCode. All Rights Reserved.
 * @Author       : OpenCode
 * @Date         : 2024-03-19
 * @FilePath     : /src/hooks/useStorePersistence.ts
 * @Description  : 自动保存 store 数据到 SiYuan 存储
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSiYuanPlugin } from '@/bridge';

interface PersistenceConfig {
  debounceMs: number;
  maxRetries: number;
  retryDelayMs: number;
  saveOnUnmount: boolean;
}

const DEFAULT_CONFIG: PersistenceConfig = {
  debounceMs: 1000,      // 1秒后自动保存
  maxRetries: 3,         // 最多重试3次
  retryDelayMs: 5000,    // 重试间隔5秒
  saveOnUnmount: true,   // 组件卸载时保存
};

interface UseStorePersistenceOptions<T> {
  storeName: 'reminder' | 'project' | 'habit';
  getData: () => T;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
  config?: Partial<PersistenceConfig>;
}

/**
 * 自动保存 store 数据到 SiYuan 存储
 * 
 * @example
 * ```typescript
 * // 在 ReminderPanel 中使用
 * useStorePersistence({
 *   storeName: 'reminder',
 *   getData: () => ({ reminders: useReminderStore.getState().reminders }),
 * });
 * ```
 */
export function useStorePersistence<T>({
  storeName,
  getData,
  onError,
  onSuccess,
  config: userConfig,
}: UseStorePersistenceOptions<T>) {
  const plugin = useSiYuanPlugin();
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const lastSavedDataRef = useRef<string>('');
  const isSavingRef = useRef(false);

  const getSaveMethod = useCallback(() => {
    switch (storeName) {
      case 'reminder':
        return plugin?.saveReminderData.bind(plugin);
      case 'project':
        return plugin?.saveProjectData.bind(plugin);
      case 'habit':
        return plugin?.saveHabitData.bind(plugin);
      default:
        return null;
    }
  }, [plugin, storeName]);

  const saveData = useCallback(async () => {
    if (!plugin || isSavingRef.current) return;

    const saveMethod = getSaveMethod();
    if (!saveMethod) {
      console.warn(`[useStorePersistence] Unknown store: ${storeName}`);
      return;
    }

    const data = getData();
    const dataJson = JSON.stringify(data);

    // 如果数据没有变化，跳过保存
    if (dataJson === lastSavedDataRef.current) {
      return;
    }

    isSavingRef.current = true;

    try {
      await saveMethod(data);
      lastSavedDataRef.current = dataJson;
      retryCountRef.current = 0;
      onSuccess?.();
    } catch (error) {
      console.error(`[useStorePersistence] Failed to save ${storeName}:`, error);
      
      if (retryCountRef.current < config.maxRetries) {
        retryCountRef.current++;
        console.log(`[useStorePersistence] Retrying ${storeName} save (${retryCountRef.current}/${config.maxRetries})...`);
        
        setTimeout(() => {
          isSavingRef.current = false;
          saveData();
        }, config.retryDelayMs);
      } else {
        isSavingRef.current = false;
        onError?.(error as Error);
      }
    } finally {
      if (retryCountRef.current >= config.maxRetries) {
        isSavingRef.current = false;
      }
    }
  }, [plugin, storeName, getData, getSaveMethod, config.maxRetries, config.retryDelayMs, onSuccess, onError]);

  const debouncedSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      saveData();
    }, config.debounceMs);
  }, [saveData, config.debounceMs]);

  // 组件卸载时保存
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (config.saveOnUnmount) {
        saveData();
      }
    };
  }, [saveData, config.saveOnUnmount]);

  return {
    save: saveData,
    debouncedSave,
    isSaving: () => isSavingRef.current,
  };
}

/**
 * 手动保存所有 store 数据的辅助函数
 * 用于在插件卸载时调用
 */
export async function saveAllStores(
  plugin: ReturnType<typeof useSiYuanPlugin>,
  stores: {
    reminder?: { reminders: any[] };
    project?: { projects: any[] };
    habit?: { habits: any[]; groups: any[] };
  }
): Promise<void> {
  if (!plugin) {
    console.warn('[saveAllStores] No plugin instance available');
    return;
  }

  const savePromises: Promise<void>[] = [];

  if (stores.reminder) {
    savePromises.push(
      plugin.saveReminderData(stores.reminder).catch((error) => {
        console.error('[saveAllStores] Failed to save reminders:', error);
      })
    );
  }

  if (stores.project) {
    savePromises.push(
      plugin.saveProjectData(stores.project).catch((error) => {
        console.error('[saveAllStores] Failed to save projects:', error);
      })
    );
  }

  if (stores.habit) {
    savePromises.push(
      plugin.saveHabitData(stores.habit).catch((error) => {
        console.error('[saveAllStores] Failed to save habits:', error);
      })
    );
  }

  await Promise.all(savePromises);
}
