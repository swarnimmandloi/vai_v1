'use client';

import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/store/canvasStore';
import { useChatStore } from '@/store/chatStore';
import { useUIStore } from '@/store/uiStore';
import { useCanvasContext } from './useCanvasContext';
import type { KnowledgeCard, KnowledgeSection } from '@/types/canvas';
import { generateId } from '@/lib/utils';
import { layoutHierarchy, prefixResponseIds } from '@/lib/canvas/layoutHierarchy';
import { saveRecentCanvas } from '@/lib/recentCanvases';
import { slugify } from '@/lib/utils';

export function useAIResponse() {
  const { getCanvasSummary, getThreadHistory } = useCanvasContext();
  const { getNodes } = useReactFlow();
  const {
    addResponseGraph,
    addLoadingNode,
    removeLoadingNode,
    setSelectedFrame,
  } = useCanvasStore();
  const { addUserMessage, setStreaming, commitAIMessage, clearStreaming } = useChatStore();
  const { setFirstVisitComplete } = useUIStore();

  const submit = useCallback(
    async (question: string) => {
      if (!question.trim()) return;
      setFirstVisitComplete();
      addUserMessage(question);

      // Read selectedFrameId and nodes fresh from store at submission time.
      // The vai:follow-up event fires synchronously after setSelectedFrame(),
      // so the React closure would have a stale value.
      const { selectedFrameId, nodes, canvasId } = useCanvasStore.getState();

      const responseId = generateId();
      const pendingPos = useCanvasStore.getState().pendingExpansionPosition;
      if (pendingPos) useCanvasStore.getState().setPendingExpansionPosition(null);
      const rawOffset = pendingPos ?? getMeasuredNextPosition(getNodes());
      // Use store nodes (always in sync) rather than getNodes() for collision check
      const storeNodes = useCanvasStore.getState().nodes;
      const clusterOffset = pendingPos?.direction
        ? findFreePosition(rawOffset, pendingPos.direction, storeNodes)
        : rawOffset;
      console.log('[VAI] branch placement — pendingPos:', pendingPos, '→ clusterOffset:', clusterOffset);
      const tempId = `loading-${generateId()}`;
      addLoadingNode(tempId, clusterOffset);
      setStreaming(true, tempId);

      const canvasContext = getCanvasSummary();
      const threadHistory = getThreadHistory();

      const selectedNode = selectedFrameId ? nodes.find((n) => n.id === selectedFrameId) : null;
      const selectedCardHeading = selectedNode
        ? ((selectedNode.data as { card?: { heading: string } })?.card?.heading ??
           (selectedNode.data as { topic?: string })?.topic ??
           (selectedNode.data as { frame?: { title: string } })?.frame?.title ??
           null)
        : null;

      // Resolve the parent response node id for branching
      let parentResponseId: string | undefined;
      if (selectedFrameId) {
        const sel = nodes.find((n) => n.id === selectedFrameId);
        if (sel?.type === 'response') {
          parentResponseId = selectedFrameId;
        } else if (sel?.parentId) {
          const parent = nodes.find((n) => n.id === sel.parentId);
          if (parent?.type === 'response') {
            parentResponseId = parent.id;
          } else if (parent?.parentId) {
            parentResponseId = parent.parentId;
          }
        }
      }

      // Every new response chains to the previous one — the connecting line
      // between mind maps is core to the canvas story (per Figma design).
      if (!parentResponseId) {
        const responseNodes = nodes.filter((n) => n.type === 'response');
        if (responseNodes.length > 0) {
          parentResponseId = responseNodes[responseNodes.length - 1].id;
        }
      }

      try {
        const response = await fetch('/api/ai/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            canvasContext,
            threadHistory,
            selectedFrameId,
            selectedFrameTitle: selectedCardHeading,
          }),
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullText += decoder.decode(value, { stream: true });
          }
        }

        const parsed = JSON.parse(fullText) as {
          chat_summary: string;
          topic: string;
          sections: KnowledgeSection[];
          cards: KnowledgeCard[];
          connections: Array<{ from: string; to: string; label?: string }>;
        };

        console.log(
          '[VAI] Response — cards:', parsed.cards?.length,
          '| sections:', parsed.sections?.length ?? 0,
          '| connections:', parsed.connections?.length
        );

        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const { sections: pfxSections, cards: pfxCards, connections: pfxConnections } =
          prefixResponseIds(responseId, parsed.sections ?? [], parsed.cards, parsed.connections ?? []);
        const { positionedSections, positionedCards, responseWidth, responseHeight } =
          layoutHierarchy(responseId, pfxSections, pfxCards, pfxConnections, undefined, isMobile ? 'TB' : 'LR');

        removeLoadingNode(tempId);

        addResponseGraph(
          responseId,
          parsed.topic ?? 'Response',
          positionedSections,
          positionedCards,
          pfxConnections,
          clusterOffset,
          responseWidth,
          responseHeight,
          parentResponseId
        );

        setSelectedFrame(responseId);
        commitAIMessage(parsed.chat_summary, responseId);
        saveRecentCanvas(question, parsed);

        // Dev only: persist to canvas/[slug].json so it survives reloads + shows in Recent
        if (process.env.NODE_ENV === 'development') {
          fetch('/api/canvas-save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: `${slugify(parsed.topic)}.json`,
              content: { ...parsed, question, position: clusterOffset },
            }),
          }).catch(console.error);
        }

        const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (canvasId && canvasId !== 'demo' && supabaseConfigured) {
          persistFile(responseId, canvasId, clusterOffset, parsed, parentResponseId).catch(console.error);
        }

        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('vai:focus-frame', { detail: { frameId: responseId } })
          );
        }, 100);
      } catch (err) {
        console.error('AI response error:', err);
        removeLoadingNode(tempId);
        clearStreaming();
        commitAIMessage('Something went wrong. Please try again.', '');
      }
    },
    [
      getNodes,
      getCanvasSummary,
      getThreadHistory,
      addUserMessage,
      setStreaming,
      commitAIMessage,
      clearStreaming,
      addResponseGraph,
      addLoadingNode,
      removeLoadingNode,
      setSelectedFrame,
      setFirstVisitComplete,
    ]
  );

  return { submit };
}

import type { Node } from '@xyflow/react';

function findFreePosition(
  ideal: { x: number; y: number },
  direction: string,
  allNodes: Node[]
): { x: number; y: number } {
  const W = 700, H = 500, PAD = 100;
  const responseNodes = allNodes.filter((n) => n.type === 'response');

  function overlaps(pos: { x: number; y: number }): boolean {
    return responseNodes.some((n) => {
      const nw = (n.measured?.width as number | undefined) ?? (n.style?.width as number | undefined) ?? W;
      const nh = (n.measured?.height as number | undefined) ?? (n.style?.height as number | undefined) ?? H;
      return (
        pos.x < n.position.x + nw + PAD &&
        pos.x + W > n.position.x - PAD &&
        pos.y < n.position.y + nh + PAD &&
        pos.y + H > n.position.y - PAD
      );
    });
  }

  if (!overlaps(ideal)) return ideal;

  const isHorizontal = direction === 'right' || direction === 'left';
  const STEP = (isHorizontal ? H : W) + PAD;

  for (let i = 1; i <= 6; i++) {
    const a = isHorizontal
      ? { x: ideal.x, y: ideal.y + STEP * i }
      : { x: ideal.x + STEP * i, y: ideal.y };
    if (!overlaps(a)) return a;

    const b = isHorizontal
      ? { x: ideal.x, y: ideal.y - STEP * i }
      : { x: ideal.x - STEP * i, y: ideal.y };
    if (!overlaps(b)) return b;
  }
  return ideal;
}

/**
 * Always place the next response to the right of the rightmost existing response,
 * using React Flow's measured widths (post-relayout) so there's never overlap.
 * The dashed edge from parent → child already shows branching visually.
 */
function getMeasuredNextPosition(allNodes: Node[]): { x: number; y: number } {
  const GAP = 200;
  const DEFAULT_WIDTH = 700;
  const responseNodes = allNodes.filter((n) => n.type === 'response');

  if (responseNodes.length === 0) return { x: 100, y: 100 };

  const nodeWidth = (n: Node) =>
    (n.measured?.width as number | undefined) ??
    (n.style?.width as number | undefined) ??
    DEFAULT_WIDTH;

  const rightmost = responseNodes.reduce((max, n) =>
    n.position.x + nodeWidth(n) > max.position.x + nodeWidth(max) ? n : max
  );

  return { x: rightmost.position.x + nodeWidth(rightmost) + GAP, y: 100 };
}

async function persistFile(
  responseId: string,
  canvasId: string,
  position: { x: number; y: number },
  parsed: {
    topic: string;
    chat_summary: string;
    sections: KnowledgeSection[];
    cards: KnowledgeCard[];
    connections: Array<{ from: string; to: string; label?: string }>;
  },
  parentResponseId?: string
) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;

  const res = await fetch('/api/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: responseId,
      canvasId,
      position,
      content: {
        topic: parsed.topic,
        chat_summary: parsed.chat_summary,
        sections: parsed.sections ?? [],
        cards: parsed.cards,
        connections: parsed.connections ?? [],
        parent_response_id: parentResponseId,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[VAI] persistFile failed:', err);
  }
}
