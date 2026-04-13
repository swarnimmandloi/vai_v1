'use client';

import { useCanvasStore } from '@/store/canvasStore';
import type { CanvasContextSummary, ThreadHistoryItem } from '@/types/ai';
import type { FrameNodeData } from '@/store/canvasStore';
import type { Frame } from '@/types/canvas';

export function useCanvasContext() {
  const nodes = useCanvasStore((s) => s.nodes);
  const selectedFrameId = useCanvasStore((s) => s.selectedFrameId);

  function getCanvasSummary(): CanvasContextSummary {
    const frameNodes = nodes.filter((n) => n.type === 'frame');
    const titles = frameNodes.map((n) => (n.data as FrameNodeData).frame.title);
    return {
      frameCount: frameNodes.length,
      topicSummary: titles.slice(0, 8).join(', '),
      frameTitles: titles,
    };
  }

  function getThreadHistory(): ThreadHistoryItem[] {
    if (!selectedFrameId) return [];

    const frameNodes = nodes.filter((n) => n.type === 'frame');
    const frameMap = new Map<string, Frame>(
      frameNodes.map((n) => [(n.data as FrameNodeData).frame.id, (n.data as FrameNodeData).frame])
    );

    const selectedFrame = frameMap.get(selectedFrameId);
    if (!selectedFrame) return [];

    // Walk up the parent chain
    const chain: Frame[] = [selectedFrame];
    let current = selectedFrame;
    let safety = 0;
    while (current.parent_id && safety < 10) {
      const parent = frameMap.get(current.parent_id);
      if (!parent) break;
      chain.unshift(parent);
      current = parent;
      safety++;
    }

    return chain.map((f) => ({
      id: f.id,
      title: f.title,
      blockHeadings: f.blocks
        .filter((b) => b.block_type === 'icon_text')
        .map((b) => (b.content as { heading: string }).heading)
        .slice(0, 5),
    }));
  }

  return { getCanvasSummary, getThreadHistory, selectedFrameId };
}
