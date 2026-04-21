import type { LayoutType, BlockType, ChartContent, ListContent } from './canvas';

export interface AIBlockResponse {
  block_type: BlockType;
  content: Record<string, unknown>;
}

export interface AIFrameResponse {
  title: string;
  layout_type: LayoutType;
  blocks: AIBlockResponse[];
}

export interface AIResponse {
  chat_summary: string;
  frame: AIFrameResponse;
}

export interface CanvasContextSummary {
  frameCount: number;
  topicSummary: string;
  frameTitles: string[];
}

export interface ThreadHistoryItem {
  id: string;
  title: string;
  blockHeadings: string[];
}

export interface AIRequestPayload {
  question: string;
  canvasContext: CanvasContextSummary;
  threadHistory: ThreadHistoryItem[];
  selectedFrameId: string | null;
  selectedFrameTitle: string | null;
  canvasSnapshot?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  frame_id?: string;
  created_at: string;
}
