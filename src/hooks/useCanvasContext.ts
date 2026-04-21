'use client';

import { useCanvasStore } from '@/store/canvasStore';
import type { CanvasContextSummary, ThreadHistoryItem } from '@/types/ai';
import type { FrameNodeData, CardNodeData } from '@/store/canvasStore';

export function useCanvasContext() {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const selectedFrameId = useCanvasStore((s) => s.selectedFrameId);

  function getCanvasSummary(): CanvasContextSummary {
    const frameNodes = nodes.filter((n) => n.type === 'frame');
    const cardNodes = nodes.filter((n) => n.type === 'card');

    const frameTitles = frameNodes.map((n) => (n.data as FrameNodeData).frame.title);
    const cardHeadings = cardNodes.map((n) => (n.data as CardNodeData).card.heading);
    const allTitles = [...frameTitles, ...cardHeadings];

    return {
      frameCount: allTitles.length,
      topicSummary: allTitles.slice(0, 8).join(', '),
      frameTitles: allTitles,
    };
  }

  function getThreadHistory(): ThreadHistoryItem[] {
    if (!selectedFrameId) return [];

    const selectedNode = nodes.find((n) => n.id === selectedFrameId);
    if (!selectedNode) return [];

    // For card nodes: walk up the edge graph (target → source)
    if (selectedNode.type === 'card') {
      const chain: string[] = [selectedFrameId];
      let current = selectedFrameId;
      let safety = 0;

      while (safety < 8) {
        const parentEdge = edges.find((e) => e.target === current);
        if (!parentEdge) break;
        chain.unshift(parentEdge.source);
        current = parentEdge.source;
        safety++;
      }

      return chain.map((nodeId) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return null;
        if (node.type === 'card') {
          const card = (node.data as CardNodeData).card;
          return { id: nodeId, title: card.heading, blockHeadings: [card.heading] };
        }
        if (node.type === 'frame') {
          const frame = (node.data as FrameNodeData).frame;
          return {
            id: nodeId,
            title: frame.title,
            blockHeadings: frame.blocks
              .filter((b) => b.block_type === 'icon_text')
              .map((b) => (b.content as { heading: string }).heading)
              .slice(0, 5),
          };
        }
        return null;
      }).filter(Boolean) as ThreadHistoryItem[];
    }

    // Legacy frame path
    const frame = (selectedNode.data as FrameNodeData).frame;
    if (!frame) return [];

    return [{
      id: frame.id,
      title: frame.title,
      blockHeadings: frame.blocks
        .filter((b) => b.block_type === 'icon_text')
        .map((b) => (b.content as { heading: string }).heading)
        .slice(0, 5),
    }];
  }

  return { getCanvasSummary, getThreadHistory, selectedFrameId };
}
