import type { KnowledgeCard, KnowledgeSection } from '@/types/canvas';

export interface RecentCanvas {
  id: string;
  topic: string;
  question: string;
  timestamp: number;
  data: {
    chat_summary: string;
    topic: string;
    sections: KnowledgeSection[];
    cards: KnowledgeCard[];
    connections: Array<{ from: string; to: string; label?: string }>;
  };
}

const KEY = 'vai:recent';
const MAX = 10;

export function saveRecentCanvas(
  question: string,
  data: RecentCanvas['data']
): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getRecentCanvases();
    const entry: RecentCanvas = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      topic: data.topic,
      question,
      timestamp: Date.now(),
      data,
    };
    const updated = [entry, ...existing].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export function getRecentCanvases(): RecentCanvas[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentCanvas[];
  } catch {
    return [];
  }
}
