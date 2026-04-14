'use client';

import { create } from 'zustand';

interface UIStore {
  sidebarOpen: boolean;
  chatPanelOpen: boolean;
  hasSubmittedFirstQuestion: boolean;
  hoveredFrameId: string | null;

  toggleSidebar: () => void;
  toggleChatPanel: () => void;
  setFirstVisitComplete: () => void;
  setHoveredFrame: (id: string | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  chatPanelOpen: true,
  hasSubmittedFirstQuestion: false,
  hoveredFrameId: null,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleChatPanel: () => set((s) => ({ chatPanelOpen: !s.chatPanelOpen })),
  setFirstVisitComplete: () => set({ hasSubmittedFirstQuestion: true }),
  setHoveredFrame: (id) => set({ hoveredFrameId: id }),
}));
