import { create } from 'zustand';
import { getPluginInstance } from '@/pluginInstance';
import { ConflictResolver, VersionedData } from '@/utils/conflictResolver';
import { HistoryAction, useHistoryStore } from './historyStore';

export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  milestones?: Milestone[];
  createdAt: string;
  updatedAt: string;
  version?: number;
  timestamp?: number;
  deviceId?: string;
}

export interface Milestone {
  id: string;
  name: string;
  description?: string;
  dueDate?: string;
  completed: boolean;
}

interface ProjectState {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  selectedProjectId: string | null;
  
  // Actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  selectProject: (id: string | null) => void;
  addMilestone: (projectId: string, milestone: Omit<Milestone, 'id'>) => void;
  updateMilestone: (projectId: string, milestoneId: string, updates: Partial<Milestone>) => void;
  deleteMilestone: (projectId: string, milestoneId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadProjects: () => Promise<void>;
  saveProjects: () => Promise<void>;
}

interface ProjectStorePayload {
  projects?: Project[];
}

interface ProjectPluginLike {
  loadProjectData?: () => Promise<ProjectStorePayload>;
  saveProjectData?: (data: ProjectStorePayload) => Promise<void>;
}

function getProjectPlugin(): ProjectPluginLike | null {
  return getPluginInstance() as ProjectPluginLike | null;
}

const toTimestamp = (updatedAt?: string, createdAt?: string): number => {
  const parsed = Date.parse(updatedAt || createdAt || '');
  return Number.isNaN(parsed) ? Date.now() : parsed;
};

const normalizeProject = (project: Project): Project => ({
  ...project,
  version: typeof project.version === 'number' && project.version > 0 ? project.version : 1,
  timestamp: typeof project.timestamp === 'number' && project.timestamp > 0 ? project.timestamp : toTimestamp(project.updatedAt, project.createdAt),
  deviceId: project.deviceId || 'unknown',
});

const touchProject = (project: Project, updates: Partial<Project> = {}): Project => {
  const updatedAt = updates.updatedAt || new Date().toISOString();
  const wrapped = ConflictResolver.wrapWithVersion(project);
  return normalizeProject({
    ...project,
    ...updates,
    updatedAt,
    version: wrapped.version,
    timestamp: wrapped.timestamp,
    deviceId: wrapped.deviceId,
  });
};

const toVersionedProject = (project: Project): VersionedData<Project> => {
  const normalized = normalizeProject(project);
  return {
    data: normalized,
    version: normalized.version || 1,
    timestamp: normalized.timestamp || Date.now(),
    deviceId: normalized.deviceId || 'unknown',
  };
};

interface ProjectHistorySnapshot {
  projects: Project[];
  selectedProjectId: string | null;
}

const buildProjectSnapshot = (state: Pick<ProjectState, 'projects' | 'selectedProjectId'>): ProjectHistorySnapshot => ({
  projects: state.projects,
  selectedProjectId: state.selectedProjectId,
});

const cloneProjectSnapshot = (snapshot: ProjectHistorySnapshot): ProjectHistorySnapshot =>
  JSON.parse(JSON.stringify(snapshot)) as ProjectHistorySnapshot;

const hasProjectChanges = (previousState: ProjectHistorySnapshot, nextState: ProjectHistorySnapshot): boolean =>
  JSON.stringify(previousState) !== JSON.stringify(nextState);

const recordProjectHistory = (
  action: HistoryAction['action'],
  description: string,
  itemId: string,
  previousState: ProjectHistorySnapshot,
  nextState: ProjectHistorySnapshot
): void => {
  const historyStore = useHistoryStore.getState();
  if (historyStore.isReplaying || !hasProjectChanges(previousState, nextState)) {
    return;
  }

  historyStore.addAction({
    type: 'project',
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

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,
  selectedProjectId: null,
  
  setProjects: (projects) => set({ projects: projects.map((item) => normalizeProject(item)) }),
  
  addProject: (projectData) => {
    const previousState = cloneProjectSnapshot(buildProjectSnapshot(get()));
    const baseProject: Project = {
      ...projectData,
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const newProject = touchProject(baseProject);
    set((state) => ({
      projects: [...state.projects, newProject],
    }));
    const nextState = cloneProjectSnapshot(buildProjectSnapshot(get()));
    recordProjectHistory('create', `Create project: ${newProject.name}`, newProject.id, previousState, nextState);
    void get().saveProjects();
  },
  
  updateProject: (id, updates) => {
    const previousState = cloneProjectSnapshot(buildProjectSnapshot(get()));
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? touchProject(p, updates) : p
      ),
    }));
    const nextState = cloneProjectSnapshot(buildProjectSnapshot(get()));
    recordProjectHistory('update', `Update project: ${id}`, id, previousState, nextState);
    void get().saveProjects();
  },
  
  deleteProject: (id) => {
    const previousState = cloneProjectSnapshot(buildProjectSnapshot(get()));
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId,
    }));
    const nextState = cloneProjectSnapshot(buildProjectSnapshot(get()));
    recordProjectHistory('delete', `Delete project: ${id}`, id, previousState, nextState);
    void get().saveProjects();
  },
  
  selectProject: (id) => set({ selectedProjectId: id }),
  
  addMilestone: (projectId, milestoneData) => {
    const previousState = cloneProjectSnapshot(buildProjectSnapshot(get()));
    const newMilestone: Milestone = {
      ...milestoneData,
      id: `milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? touchProject(p, { milestones: [...(p.milestones || []), newMilestone] })
          : p
      ),
    }));
    const nextState = cloneProjectSnapshot(buildProjectSnapshot(get()));
    recordProjectHistory('update', `Add milestone: ${projectId}`, projectId, previousState, nextState);
    void get().saveProjects();
  },
  
  updateMilestone: (projectId, milestoneId, updates) => {
    const previousState = cloneProjectSnapshot(buildProjectSnapshot(get()));
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? touchProject(p, {
              milestones: p.milestones?.map((m) =>
                m.id === milestoneId ? { ...m, ...updates } : m
              ),
            })
          : p
      ),
    }));
    const nextState = cloneProjectSnapshot(buildProjectSnapshot(get()));
    recordProjectHistory('update', `Update milestone: ${projectId}/${milestoneId}`, projectId, previousState, nextState);
    void get().saveProjects();
  },
  
  deleteMilestone: (projectId, milestoneId) => {
    const previousState = cloneProjectSnapshot(buildProjectSnapshot(get()));
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? touchProject(p, {
              milestones: p.milestones?.filter((m) => m.id !== milestoneId),
            })
          : p
      ),
    }));
    const nextState = cloneProjectSnapshot(buildProjectSnapshot(get()));
    recordProjectHistory('update', `Delete milestone: ${projectId}/${milestoneId}`, projectId, previousState, nextState);
    void get().saveProjects();
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const plugin = getProjectPlugin();
      if (!plugin?.loadProjectData) {
        throw new Error('Plugin loadProjectData is not available');
      }

      const data = await plugin.loadProjectData();
      const localProjects = get().projects.map((item) => normalizeProject(item));
      const remoteProjects = (Array.isArray(data?.projects) ? data.projects : []).map((item) => normalizeProject(item));

      const localMap = new Map(localProjects.map((item) => [item.id, item]));
      const mergedProjects: Project[] = [];
      let hasConflict = false;

      for (const remoteProject of remoteProjects) {
        const localProject = localMap.get(remoteProject.id);
        if (!localProject) {
          mergedProjects.push(remoteProject);
          continue;
        }

        const conflict = ConflictResolver.detectConflicts(
          toVersionedProject(localProject),
          toVersionedProject(remoteProject)
        );

        if (conflict) {
          conflict.type = 'project';
          conflict.id = remoteProject.id;
          hasConflict = true;
          mergedProjects.push(normalizeProject(ConflictResolver.autoResolve(conflict)));
          console.warn('[ProjectStore] conflict detected:', conflict);
        } else {
          const useLocal = (localProject.version || 1) > (remoteProject.version || 1)
            || ((localProject.version || 1) === (remoteProject.version || 1)
              && (localProject.timestamp || 0) >= (remoteProject.timestamp || 0));
          mergedProjects.push(useLocal ? localProject : remoteProject);
        }

        localMap.delete(remoteProject.id);
      }

      if (localMap.size > 0) {
        for (const project of localMap.values()) {
          mergedProjects.push(project);
        }
        hasConflict = true;
      }

      set({ projects: mergedProjects.map((item) => normalizeProject(item)), isLoading: false });

      if (hasConflict) {
        await plugin.saveProjectData({ projects: mergedProjects.map((item) => normalizeProject(item)) });
      }
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  saveProjects: async () => {
    set({ error: null });
    try {
      const plugin = getProjectPlugin();
      if (!plugin?.saveProjectData) {
        throw new Error('Plugin saveProjectData is not available');
      }

      const { projects } = get();
      const normalizedProjects = projects.map((item) => normalizeProject(item));
      set({ projects: normalizedProjects });
      await plugin.saveProjectData({ projects: normalizedProjects });
    } catch (error) {
      set({ error: String(error) });
    }
  },
}));

useHistoryStore.getState().registerExecutor('project', (action, direction) => {
  const snapshot = direction === 'undo' ? action.undoData.previousState : action.redoData.newState;
  if (!snapshot || typeof snapshot !== 'object') {
    return;
  }

  const typedSnapshot = snapshot as ProjectHistorySnapshot;
  if (!Array.isArray(typedSnapshot.projects)) {
    return;
  }

  const cloned = cloneProjectSnapshot(typedSnapshot);
  useProjectStore.setState({
    projects: cloned.projects,
    selectedProjectId: cloned.selectedProjectId ?? null,
  });
  void useProjectStore.getState().saveProjects();
});
