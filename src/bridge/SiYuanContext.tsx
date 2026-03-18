import React, { createContext, useContext, ReactNode } from 'react';

// Type definitions for SiYuan plugin instance
export interface SiYuanPlugin {
  loadData: (key: string) => Promise<any>;
  saveData: (key: string, value: any) => Promise<void>;
  loadSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<void>;
  i18n: { [key: string]: string };
  name: string;
  // Add other plugin methods as needed
}

interface SiYuanContextType {
  plugin: SiYuanPlugin | null;
}

const SiYuanContext = createContext<SiYuanContextType>({ plugin: null });

interface SiYuanProviderProps {
  plugin: SiYuanPlugin | null;
  children: ReactNode;
}

export function SiYuanProvider({ plugin, children }: SiYuanProviderProps) {
  return (
    <SiYuanContext.Provider value={{ plugin }}>
      {children}
    </SiYuanContext.Provider>
  );
}

export function useSiYuanPlugin() {
  const context = useContext(SiYuanContext);
  if (!context) {
    throw new Error('useSiYuanPlugin must be used within SiYuanProvider');
  }
  return context.plugin;
}

export function useSiYuan() {
  const context = useContext(SiYuanContext);
  if (!context) {
    throw new Error('useSiYuan must be used within SiYuanProvider');
  }
  return context;
}
