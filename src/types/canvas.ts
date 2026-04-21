// Knowledge card — the new canvas primitive
export type KnowledgeCard = {
  id: string;
  heading: string;
  body: string;
};

// Block content payloads
export type IconTextContent = {
  icon: string;
  heading: string;
  body: string;
};

export type ChartContent = {
  chart_type: 'bar' | 'line' | 'pie' | 'area';
  data: { label: string; value: number; color?: string }[];
  x_label?: string;
  y_label?: string;
};

export type ListContent = {
  items: { text: string; sub_items?: string[] }[];
};

export type StatContent = {
  value: string;
  label: string;
  trend?: 'up' | 'down' | 'neutral';
  context?: string;
};

export type ImageContent = {
  url?: string;
  alt: string;
  caption?: string;
};

export type NoteContent = {
  text: string;
  author?: string;
};

export type DiagramType = 'flowchart' | 'sequenceDiagram' | 'classDiagram' | 'stateDiagram-v2' | 'erDiagram';

export type DiagramContent = {
  diagram_type: DiagramType;
  definition: string;
  caption?: string;
};

export type BlockType = 'icon_text' | 'chart' | 'list' | 'stat' | 'image' | 'note' | 'diagram';

export type BlockContent =
  | IconTextContent
  | ChartContent
  | ListContent
  | StatContent
  | ImageContent
  | NoteContent
  | DiagramContent;

export interface Block {
  id: string;
  frame_id: string;
  block_type: BlockType;
  order_index: number;
  content: BlockContent;
}

export type LayoutType = 'grid' | 'linear' | 'mindmap' | 'single';

export interface Frame {
  id: string;
  canvas_id: string;
  title: string;
  position: { x: number; y: number };
  width: number;
  layout_type: LayoutType;
  parent_id: string | null;
  thread_id: string;
  blocks: Block[];
  created_at?: string;
}

export interface Connection {
  id: string;
  canvas_id: string;
  source_frame_id: string;
  target_frame_id: string;
  label?: string;
}

export interface Canvas {
  id: string;
  project_id: string;
  name: string;
  order_index: number;
  created_at?: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
  canvases?: Canvas[];
}
