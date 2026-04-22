'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import type { Frame, Block, BlockContent, KnowledgeCard, KnowledgeSection } from '@/types/canvas';
import { generateId } from '@/lib/utils';

export interface FrameNodeData extends Record<string, unknown> {
  frame: Frame;
}

export interface CardNodeData extends Record<string, unknown> {
  card: KnowledgeCard;
}

export interface SectionNodeData extends Record<string, unknown> {
  section: KnowledgeSection;
}

export interface ResponseNodeData extends Record<string, unknown> {
  topic: string;
}

export type FrameNode = Node<FrameNodeData, 'frame'>;
export type CardNode = Node<CardNodeData, 'card'>;
export type SectionNode = Node<SectionNodeData, 'section'>;
export type ResponseNode = Node<ResponseNodeData, 'response'>;
export type LoadingNode = Node<Record<string, unknown>, 'loading'>;

interface CanvasStore {
  nodes: Node[];
  edges: Edge[];
  selectedFrameId: string | null;
  canvasId: string | null;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  setSelectedFrame: (id: string | null) => void;
  addFrame: (frame: Frame, parentId?: string) => void;
  addLoadingNode: (tempId: string, position: { x: number; y: number }) => void;
  removeLoadingNode: (tempId: string) => void;
  updateFrame: (id: string, updates: Partial<Frame>) => void;
  deleteFrame: (id: string) => void;
  addBlock: (frameId: string, block: Block) => void;
  updateBlockContent: (frameId: string, blockId: string, content: BlockContent) => void;
  removeBlock: (frameId: string, blockId: string) => void;
  reorderBlocks: (frameId: string, fromIndex: number, toIndex: number) => void;

  addCardGraph: (
    positionedCards: Array<{ card: KnowledgeCard; position: { x: number; y: number } }>,
    cardEdges: Array<{ from: string; to: string; label?: string }>,
    parentNodeId?: string
  ) => void;

  addResponseGraph: (
    responseId: string,
    topic: string,
    positionedSections: Array<{
      section: KnowledgeSection;
      position: { x: number; y: number };
      width: number;
      height: number;
    }>,
    positionedCards: Array<{
      card: KnowledgeCard;
      position: { x: number; y: number };
      parentId: string;
    }>,
    cardEdges: Array<{ from: string; to: string; label?: string }>,
    absolutePosition: { x: number; y: number },
    responseWidth: number,
    responseHeight: number,
    parentResponseId?: string
  ) => void;

  setCanvasId: (id: string) => void;
  loadFrames: (frames: Frame[], connections: { id: string; source_frame_id: string; target_frame_id: string; label?: string }[]) => void;
  clearCanvas: () => void;
  getNextFramePosition: (parentId?: string) => { x: number; y: number };
}

export const useCanvasStore = create<CanvasStore>()(
  immer((set, get) => ({
    nodes: [],
    edges: [],
    selectedFrameId: null,
    canvasId: null,

    onNodesChange: (changes) =>
      set((s) => {
        s.nodes = applyNodeChanges(changes, s.nodes);
      }),

    onEdgesChange: (changes) =>
      set((s) => {
        s.edges = applyEdgeChanges(changes, s.edges);
      }),

    onConnect: (connection) =>
      set((s) => {
        s.edges = addEdge({ ...connection, type: 'manual', animated: false }, s.edges);
      }),

    setSelectedFrame: (id) => set((s) => { s.selectedFrameId = id; }),

    addFrame: (frame, parentId) =>
      set((s) => {
        const node: FrameNode = {
          id: frame.id,
          type: 'frame',
          position: frame.position,
          data: { frame },
          selected: false,
        };
        s.nodes.push(node);

        if (parentId) {
          const edgeId = generateId();
          s.edges.push({
            id: edgeId,
            source: parentId,
            target: frame.id,
            type: 'thread',
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 },
          });
        }
      }),

    addLoadingNode: (tempId, position) =>
      set((s) => {
        s.nodes.push({
          id: tempId,
          type: 'loading',
          position,
          data: {},
          draggable: false,
        });
      }),

    removeLoadingNode: (tempId) =>
      set((s) => {
        s.nodes = s.nodes.filter((n) => n.id !== tempId);
      }),

    updateFrame: (id, updates) =>
      set((s) => {
        const node = s.nodes.find((n) => n.id === id);
        if (node && node.type === 'frame') {
          (node.data as FrameNodeData).frame = {
            ...(node.data as FrameNodeData).frame,
            ...updates,
          };
        }
      }),

    deleteFrame: (id) =>
      set((s) => {
        s.nodes = s.nodes.filter((n) => n.id !== id);
        s.edges = s.edges.filter((e) => e.source !== id && e.target !== id);
        if (s.selectedFrameId === id) s.selectedFrameId = null;
      }),

    addBlock: (frameId, block) =>
      set((s) => {
        const node = s.nodes.find((n) => n.id === frameId);
        if (node && node.type === 'frame') {
          (node.data as FrameNodeData).frame.blocks.push(block);
        }
      }),

    updateBlockContent: (frameId, blockId, content) =>
      set((s) => {
        const node = s.nodes.find((n) => n.id === frameId);
        if (node && node.type === 'frame') {
          const block = (node.data as FrameNodeData).frame.blocks.find(
            (b) => b.id === blockId
          );
          if (block) block.content = content as typeof block.content;
        }
      }),

    removeBlock: (frameId, blockId) =>
      set((s) => {
        const node = s.nodes.find((n) => n.id === frameId);
        if (node && node.type === 'frame') {
          (node.data as FrameNodeData).frame.blocks = (
            node.data as FrameNodeData
          ).frame.blocks.filter((b) => b.id !== blockId);
        }
      }),

    reorderBlocks: (frameId, fromIndex, toIndex) =>
      set((s) => {
        const node = s.nodes.find((n) => n.id === frameId);
        if (node && node.type === 'frame') {
          const blocks = (node.data as FrameNodeData).frame.blocks;
          const [moved] = blocks.splice(fromIndex, 1);
          blocks.splice(toIndex, 0, moved);
          blocks.forEach((b, i) => { b.order_index = i; });
        }
      }),

    addCardGraph: (positionedCards, cardEdges, parentNodeId) =>
      set((s) => {
        positionedCards.forEach(({ card, position }) => {
          s.nodes.push({
            id: card.id,
            type: 'card',
            position,
            data: { card },
          } as CardNode);
        });

        const cardIdSet = new Set(positionedCards.map((c) => c.card.id));

        cardEdges
          .filter(({ from, to }) => cardIdSet.has(from) && cardIdSet.has(to))
          .forEach(({ from, to, label }) => {
            s.edges.push({
              id: generateId(),
              source: from,
              target: to,
              type: 'smoothstep',
              animated: false,
              label: label ?? undefined,
              style: { stroke: '#6366f1', strokeWidth: 1.5 },
              labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 500 },
              labelBgStyle: { fill: '#0f172a', fillOpacity: 0.9 },
              labelBgPadding: [4, 6],
              labelBgBorderRadius: 4,
            });
          });

        // Edge connecting parent node to the first card in this cluster
        if (parentNodeId && positionedCards.length > 0) {
          s.edges.push({
            id: generateId(),
            source: parentNodeId,
            target: positionedCards[0].card.id,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#6366f166', strokeWidth: 1.5, strokeDasharray: '6 4' },
          });
        }
      }),

    addResponseGraph: (
      responseId,
      topic,
      positionedSections,
      positionedCards,
      cardEdges,
      absolutePosition,
      responseWidth,
      responseHeight,
      parentResponseId
    ) =>
      set((s) => {
        // Response node (outermost wrapper)
        s.nodes.push({
          id: responseId,
          type: 'response',
          position: absolutePosition,
          data: { topic },
          style: { width: responseWidth, height: responseHeight },
          zIndex: 0,
        } as ResponseNode);

        // Section nodes (children of response)
        positionedSections.forEach(({ section, position, width, height }) => {
          s.nodes.push({
            id: section.id,
            type: 'section',
            position,
            parentId: responseId,
            data: { section },
            style: { width, height },
            zIndex: 1,
            extent: 'parent' as const,
            draggable: false,
          } as SectionNode);
        });

        // Card nodes (children of section or response)
        positionedCards.forEach(({ card, position, parentId }) => {
          s.nodes.push({
            id: card.id,
            type: 'card',
            position,
            parentId,
            data: { card },
            zIndex: 2,
            extent: 'parent' as const,
            draggable: false,
          } as CardNode);
        });

        // Card-to-card edges
        const cardIdSet = new Set(positionedCards.map((c) => c.card.id));
        cardEdges
          .filter(({ from, to }) => cardIdSet.has(from) && cardIdSet.has(to))
          .forEach(({ from, to, label }) => {
            s.edges.push({
              id: generateId(),
              source: from,
              target: to,
              type: 'smoothstep',
              animated: false,
              label: label ?? undefined,
              style: { stroke: '#6366f1', strokeWidth: 1.5 },
              labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 500 },
              labelBgStyle: { fill: '#0f172a', fillOpacity: 0.9 },
              labelBgPadding: [4, 6] as [number, number],
              labelBgBorderRadius: 4,
              zIndex: 10,
            });
          });

        // Response-to-response edge (branching)
        if (parentResponseId) {
          s.edges.push({
            id: generateId(),
            source: parentResponseId,
            target: responseId,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#6366f166', strokeWidth: 2, strokeDasharray: '8 4' },
            zIndex: 5,
          });
        }
      }),

    setCanvasId: (id) => set((s) => { s.canvasId = id; }),

    loadFrames: (frames, connections) =>
      set((s) => {
        s.nodes = frames.map((frame) => ({
          id: frame.id,
          type: 'frame' as const,
          position: frame.position,
          data: { frame },
        }));
        s.edges = connections.map((conn) => ({
          id: conn.id,
          source: conn.source_frame_id,
          target: conn.target_frame_id,
          type: 'thread',
          animated: true,
          style: { stroke: '#6366f1', strokeWidth: 2 },
          label: conn.label,
        }));
      }),

    clearCanvas: () => set((s) => { s.nodes = []; s.edges = []; s.selectedFrameId = null; }),

    getNextFramePosition: (parentId) => {
      const { nodes } = get();
      if (parentId) {
        const parent = nodes.find((n) => n.id === parentId);
        if (parent) {
          return { x: parent.position.x + 440, y: parent.position.y };
        }
      }
      if (nodes.length === 0) return { x: 100, y: 100 };
      const maxX = Math.max(...nodes.map((n) => n.position.x + 400));
      return { x: maxX + 60, y: 100 };
    },
  }))
);
