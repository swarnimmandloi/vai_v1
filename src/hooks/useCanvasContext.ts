'use client';

import { useCanvasStore } from '@/store/canvasStore';
import type { CanvasContextSummary, ThreadHistoryItem } from '@/types/ai';
import type { FrameNodeData, CardNodeData, ResponseNodeData } from '@/store/canvasStore';

export function useCanvasContext() {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const selectedFrameId = useCanvasStore((s) => s.selectedFrameId);

  function getCanvasSummary(): CanvasContextSummary {
    const frameNodes = nodes.filter((n) => n.type === 'frame');
    const cardNodes = nodes.filter((n) => n.type === 'card');
    const responseNodes = nodes.filter((n) => n.type === 'response');

    const frameTitles = frameNodes.map((n) => (n.data as FrameNodeData).frame.title);
    const cardHeadings = cardNodes.map((n) => (n.data as CardNodeData).card.heading);
    const responseTopics = responseNodes.map((n) => (n.data as ResponseNodeData).topic);
    const allTitles = [...responseTopics, ...frameTitles, ...cardHeadings];

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

    // Response node: return topic + headings of cards within it
    if (selectedNode.type === 'response') {
      const topic = (selectedNode.data as ResponseNodeData).topic;
      const childCards = nodes.filter(
        (n) => n.type === 'card' && (n.parentId === selectedFrameId || (() => {
          // cards whose section is a child of this response
          const parent = nodes.find((p) => p.id === n.parentId);
          return parent?.parentId === selectedFrameId;
        })())
      );
      return [{
        id: selectedFrameId,
        title: topic,
        blockHeadings: childCards.slice(0, 5).map((n) => (n.data as CardNodeData).card.heading),
      }];
    }

    // Card node: walk up parentId chain to find the response, then use edge graph for response chain
    if (selectedNode.type === 'card') {
      const card = (selectedNode.data as CardNodeData).card;

      // Find response ancestor
      let responseId: string | null = null;
      const directParent = nodes.find((n) => n.id === selectedNode.parentId);
      if (directParent?.type === 'response') {
        responseId = directParent.id;
      } else if (directParent?.parentId) {
        const grandParent = nodes.find((n) => n.id === directParent.parentId);
        if (grandParent?.type === 'response') responseId = grandParent.id;
      }

      const items: ThreadHistoryItem[] = [
        { id: selectedFrameId, title: card.heading, blockHeadings: [card.heading] },
      ];

      if (responseId) {
        const responseTopic = (nodes.find((n) => n.id === responseId)?.data as ResponseNodeData)?.topic ?? '';
        items.unshift({ id: responseId, title: responseTopic, blockHeadings: [] });
      }

      return items;
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
