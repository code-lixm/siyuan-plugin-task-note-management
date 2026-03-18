import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { SiYuanProvider, SiYuanPlugin } from './SiYuanContext';

interface MountOptions {
  plugin: SiYuanPlugin;
  props?: Record<string, any>;
}

interface MountedInstance {
  root: Root;
  destroy: () => void;
}

/**
 * Mount a React component into a SiYuan container
 */
export function mountReact<P = {}>(
  container: HTMLElement,
  Component: React.ComponentType<P>,
  options: MountOptions
): MountedInstance {
  const root = createRoot(container);
  
  const CombinedComponent = () => (
    <SiYuanProvider plugin={options.plugin}>
      <Component {...(options.props as P)} />
    </SiYuanProvider>
  );
  
  root.render(<CombinedComponent />);
  
  return {
    root,
    destroy: () => {
      root.unmount();
    }
  };
}

/**
 * Mount a React component for a SiYuan Dock panel
 */
export function mountDockComponent<P = {}>(
  container: HTMLElement,
  Component: React.ComponentType<P>,
  plugin: SiYuanPlugin,
  props?: Record<string, any>
): () => void {
  const { destroy } = mountReact(container, Component, { plugin, props });
  return destroy;
}

/**
 * Mount a React component for a SiYuan Tab
 */
export function mountTabComponent<P = {}>(
  container: HTMLElement,
  Component: React.ComponentType<P>,
  plugin: SiYuanPlugin,
  props?: Record<string, any>
): MountedInstance {
  return mountReact(container, Component, { plugin, props });
}

/**
 * Mount a React component for a SiYuan Dialog
 */
export function mountDialogComponent<P = {}>(
  container: HTMLElement,
  Component: React.ComponentType<P>,
  plugin: SiYuanPlugin,
  props?: Record<string, any>
): MountedInstance {
  return mountReact(container, Component, { plugin, props });
}
