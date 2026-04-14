'use client';

import { create } from 'zustand';
import type { Project, Canvas } from '@/types/canvas';

interface ProjectStore {
  projects: Project[];
  activeProjectId: string | null;
  activeCanvasId: string | null;

  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  setActiveProject: (id: string) => void;
  setActiveCanvas: (id: string) => void;
  addCanvas: (canvas: Canvas) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  activeProjectId: null,
  activeCanvasId: null,

  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((s) => ({ projects: [...s.projects, project] })),
  setActiveProject: (id) => set({ activeProjectId: id }),
  setActiveCanvas: (id) => set({ activeCanvasId: id }),
  addCanvas: (canvas) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === canvas.project_id
          ? { ...p, canvases: [...(p.canvases ?? []), canvas] }
          : p
      ),
    })),
}));
