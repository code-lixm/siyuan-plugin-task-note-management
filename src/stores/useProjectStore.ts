import { create } from 'zustand';

export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  milestones?: Milestone[];
  createdAt: string;
  updatedAt: string;
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
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,
  selectedProjectId: null,
  
  setProjects: (projects) => set({ projects }),
  
  addProject: (projectData) => {
    const newProject: Project = {
      ...projectData,
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      projects: [...state.projects, newProject],
    }));
  },
  
  updateProject: (id, updates) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      ),
    }));
  },
  
  deleteProject: (id) => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId,
    }));
  },
  
  selectProject: (id) => set({ selectedProjectId: id }),
  
  addMilestone: (projectId, milestoneData) => {
    const newMilestone: Milestone = {
      ...milestoneData,
      id: `milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? { ...p, milestones: [...(p.milestones || []), newMilestone], updatedAt: new Date().toISOString() }
          : p
      ),
    }));
  },
  
  updateMilestone: (projectId, milestoneId, updates) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              milestones: p.milestones?.map((m) =>
                m.id === milestoneId ? { ...m, ...updates } : m
              ),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    }));
  },
  
  deleteMilestone: (projectId, milestoneId) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              milestones: p.milestones?.filter((m) => m.id !== milestoneId),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    }));
  },
  
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
