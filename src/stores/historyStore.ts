import { create } from 'zustand';

export interface HistoryAction {
  id: string;
  type: 'reminder' | 'project' | 'habit';
  action: 'create' | 'update' | 'delete';
  timestamp: number;
  description: string;
  undoData: {
    previousState?: any;
    itemId: string;
  };
  redoData: {
    newState?: any;
    itemId: string;
  };
}

export interface HistoryState {
  actions: HistoryAction[];
  currentIndex: number;
  maxSize: number;
}

type HistoryDirection = 'undo' | 'redo';
type HistoryExecutor = (action: HistoryAction, direction: HistoryDirection) => void;

const executors: Record<HistoryAction['type'], HistoryExecutor | null> = {
  reminder: null,
  project: null,
  habit: null,
};

const isEditableElement = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || target.isContentEditable;
};

let hasBoundHistoryShortcuts = false;

const bindHistoryShortcuts = (): void => {
  if (hasBoundHistoryShortcuts || typeof document === 'undefined') {
    return;
  }

  document.addEventListener('keydown', (event) => {
    if (isEditableElement(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();
    const withPrimary = event.metaKey || event.ctrlKey;
    const isUndo = withPrimary && !event.shiftKey && key === 'z';
    const isRedo = (event.metaKey && event.shiftKey && key === 'z') || (event.ctrlKey && key === 'y');

    if (!isUndo && !isRedo) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const historyState = useHistoryStore.getState();
    if (isUndo) {
      historyState.performUndo();
      return;
    }
    historyState.performRedo();
  });

  hasBoundHistoryShortcuts = true;
};

export const useHistoryStore = create<HistoryState & {
  isReplaying: boolean;
  addAction: (action: Omit<HistoryAction, 'id' | 'timestamp'>) => void;
  undo: () => HistoryAction | null;
  redo: () => HistoryAction | null;
  performUndo: () => HistoryAction | null;
  performRedo: () => HistoryAction | null;
  registerExecutor: (type: HistoryAction['type'], executor: HistoryExecutor) => void;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getHistory: () => HistoryAction[];
}>((set, get) => ({
  actions: [],
  currentIndex: -1,
  maxSize: 50,
  isReplaying: false,

  addAction: (action) => {
    const actionId = `history_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const nextAction: HistoryAction = {
      ...action,
      id: actionId,
      timestamp: Date.now(),
    };

    set((state) => {
      const truncatedActions = state.actions.slice(0, state.currentIndex + 1);
      const withNewAction = [...truncatedActions, nextAction];
      const overflowCount = Math.max(withNewAction.length - state.maxSize, 0);
      const boundedActions = overflowCount > 0 ? withNewAction.slice(overflowCount) : withNewAction;

      return {
        actions: boundedActions,
        currentIndex: boundedActions.length - 1,
      };
    });
  },

  undo: () => {
    const { actions, currentIndex } = get();
    if (currentIndex < 0 || actions.length === 0) {
      return null;
    }

    const action = actions[currentIndex] ?? null;
    if (!action) {
      return null;
    }

    set({ currentIndex: currentIndex - 1 });
    return action;
  },

  redo: () => {
    const { actions, currentIndex } = get();
    const nextIndex = currentIndex + 1;
    if (nextIndex >= actions.length || actions.length === 0) {
      return null;
    }

    const action = actions[nextIndex] ?? null;
    if (!action) {
      return null;
    }

    set({ currentIndex: nextIndex });
    return action;
  },

  performUndo: () => {
    const action = get().undo();
    if (!action) {
      return null;
    }

    const executor = executors[action.type];
    if (!executor) {
      return null;
    }

    set({ isReplaying: true });
    try {
      executor(action, 'undo');
    } finally {
      set({ isReplaying: false });
    }

    return action;
  },

  performRedo: () => {
    const action = get().redo();
    if (!action) {
      return null;
    }

    const executor = executors[action.type];
    if (!executor) {
      return null;
    }

    set({ isReplaying: true });
    try {
      executor(action, 'redo');
    } finally {
      set({ isReplaying: false });
    }

    return action;
  },

  registerExecutor: (type, executor) => {
    executors[type] = executor;
  },

  clear: () => set({ actions: [], currentIndex: -1 }),

  canUndo: () => get().currentIndex >= 0,

  canRedo: () => get().currentIndex < get().actions.length - 1,

  getHistory: () => get().actions,
}));

bindHistoryShortcuts();
