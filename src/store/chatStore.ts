'use client';

import { create } from 'zustand';
import type { ChatMessage } from '@/types/ai';
import { generateId } from '@/lib/utils';

interface ChatStore {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  pendingFrameId: string | null;

  addUserMessage: (text: string) => void;
  setStreamingText: (text: string) => void;
  commitAIMessage: (text: string, frameId: string) => void;
  setStreaming: (streaming: boolean, frameId?: string) => void;
  clearStreaming: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isStreaming: false,
  streamingText: '',
  pendingFrameId: null,

  addUserMessage: (text) =>
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: generateId(),
          role: 'user',
          content: text,
          created_at: new Date().toISOString(),
        },
      ],
    })),

  setStreamingText: (text) => set({ streamingText: text }),

  commitAIMessage: (text, frameId) =>
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: generateId(),
          role: 'assistant',
          content: text,
          frame_id: frameId,
          created_at: new Date().toISOString(),
        },
      ],
      isStreaming: false,
      streamingText: '',
      pendingFrameId: null,
    })),

  setStreaming: (streaming, frameId) =>
    set({ isStreaming: streaming, pendingFrameId: frameId ?? null }),

  clearStreaming: () => set({ isStreaming: false, streamingText: '', pendingFrameId: null }),
}));
