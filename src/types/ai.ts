import type { LayoutType, BlockType, ChartContent, ListContent, ResponseFormat, KnowledgeSection, KnowledgeCard } from './canvas';

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

// The shape returned by /api/ai/respond, discriminated by `format`.
// All variants carry `chat_summary`; the rest depends on the chosen format.
export interface AIFormattedResponse {
  format: ResponseFormat;
  chat_summary: string;
  topic?: string;
  // markdown format
  markdown?: string;
  // mindmap format
  sections?: KnowledgeSection[];
  cards?: KnowledgeCard[];
  connections?: Array<{ from: string; to: string; label?: string }>;
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
  parentFormat?: ResponseFormat | null;
  canvasSnapshot?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  frame_id?: string;
  created_at: string;
}
