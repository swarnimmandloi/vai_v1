'use client';

import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/store/canvasStore';
import { useChatStore } from '@/store/chatStore';
import { useUIStore } from '@/store/uiStore';
import { useCanvasContext } from './useCanvasContext';
import type { KnowledgeCard, KnowledgeSection, ResponseFormat } from '@/types/canvas';
import type { AIFormattedResponse } from '@/types/ai';
import { generateId } from '@/lib/utils';
import { layoutHierarchy, prefixResponseIds } from '@/lib/canvas/layoutHierarchy';
import { saveRecentCanvas } from '@/lib/recentCanvases';
import { slugify } from '@/lib/utils';

export function useAIResponse() {
  const { getCanvasSummary, getThreadHistory } = useCanvasContext();
  const { getNodes } = useReactFlow();
  const {
    addResponseGraph,
    addMarkdownResponse,
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

      // Resolve parentResponseId first — position depends on it.
      // A "frame" is any top-level answer node: mind-map response or markdown doc.
      let parentResponseId: string | undefined;
      if (selectedFrameId) {
        const sel = nodes.find((n) => n.id === selectedFrameId);
        if (sel && isFrameNode(sel)) {
          parentResponseId = selectedFrameId;
        } else if (sel?.parentId) {
          const parent = nodes.find((n) => n.id === sel.parentId);
          if (parent && isFrameNode(parent)) {
            parentResponseId = parent.id;
          } else if (parent?.parentId) {
            parentResponseId = parent.parentId;
          }
        }
      }
      if (!parentResponseId) {
        const frameNodes = nodes.filter(isFrameNode);
        if (frameNodes.length > 0) {
          parentResponseId = frameNodes[frameNodes.length - 1].id;
        }
      }

      const parentFormat: ResponseFormat | null = parentResponseId
        ? nodes.find((n) => n.id === parentResponseId)?.type === 'markdown'
          ? 'markdown'
          : 'mindmap'
        : null;

      // Determine placement position.
      // Priority: explicit dot position → branch-adjacent-to-parent → tail of chain.
      const pendingPos = useCanvasStore.getState().pendingExpansionPosition;
      if (pendingPos) useCanvasStore.getState().setPendingExpansionPosition(null);

      const allResponseNodes = nodes.filter(isFrameNode);
      const parentIsChainTail = !parentResponseId || allResponseNodes.at(-1)?.id === parentResponseId;

      let clusterOffset: { x: number; y: number };
      if (pendingPos) {
        // Explicit dot click — respect direction, avoid overlap.
        const ideal = { x: pendingPos.x, y: pendingPos.y };
        clusterOffset = pendingPos.direction
          ? findFreePosition(ideal, pendingPos.direction, nodes)
          : ideal;
      } else if (!parentIsChainTail && parentResponseId) {
        // Branching from an earlier frame via chat or card — place adjacent, not at far right.
        const parentNode = nodes.find((n) => n.id === parentResponseId);
        if (parentNode) {
          const pw = (parentNode.style?.width as number | undefined) ?? 700;
          const ideal = { x: parentNode.position.x + pw + 160, y: parentNode.position.y };
          clusterOffset = findFreePosition(ideal, 'right', nodes);
        } else {
          clusterOffset = getMeasuredNextPosition(getNodes());
        }
      } else {
        clusterOffset = getMeasuredNextPosition(getNodes());
      }

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
            parentFormat,
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

        const parsed = JSON.parse(fullText) as AIFormattedResponse;
        const format: ResponseFormat = parsed.format ?? 'mindmap';
        const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
        const shouldPersist = !!canvasId && canvasId !== 'demo' && supabaseConfigured;

        // CHAT — reply in the chat panel only, no canvas frame.
        if (format === 'chat') {
          removeLoadingNode(tempId);
          clearStreaming();
          commitAIMessage(parsed.chat_summary ?? '', '');
          return;
        }

        // MARKDOWN — a single self-sizing document frame.
        if (format === 'markdown') {
          removeLoadingNode(tempId);
          const topic = parsed.topic ?? 'Response';
          const markdown = parsed.markdown ?? '';
          addMarkdownResponse(responseId, topic, markdown, clusterOffset, 560, parentResponseId);

          setSelectedFrame(responseId);
          commitAIMessage(parsed.chat_summary ?? '', responseId);

          if (shouldPersist) {
            persistMarkdownFile(responseId, canvasId!, clusterOffset, {
              topic,
              chat_summary: parsed.chat_summary ?? '',
              markdown,
            }, parentResponseId).catch(console.error);
          }

          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent('vai:focus-frame', { detail: { frameId: responseId } })
            );
          }, 100);
          return;
        }

        // MINDMAP (default) — the section/card knowledge graph.
        const mindmap = {
          chat_summary: parsed.chat_summary ?? '',
          topic: parsed.topic ?? 'Response',
          sections: parsed.sections ?? [],
          cards: parsed.cards ?? [],
          connections: parsed.connections ?? [],
        };

        console.log(
          '[VAI] Response — cards:', mindmap.cards.length,
          '| sections:', mindmap.sections.length,
          '| connections:', mindmap.connections.length
        );

        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const { sections: pfxSections, cards: pfxCards, connections: pfxConnections } =
          prefixResponseIds(responseId, mindmap.sections, mindmap.cards, mindmap.connections);
        const { positionedSections, positionedCards, responseWidth, responseHeight } =
          layoutHierarchy(responseId, pfxSections, pfxCards, pfxConnections, undefined, isMobile ? 'TB' : 'LR');

        removeLoadingNode(tempId);

        addResponseGraph(
          responseId,
          mindmap.topic,
          positionedSections,
          positionedCards,
          pfxConnections,
          clusterOffset,
          responseWidth,
          responseHeight,
          parentResponseId
        );

        setSelectedFrame(responseId);
        commitAIMessage(mindmap.chat_summary, responseId);
        saveRecentCanvas(question, mindmap);

        // Dev only: persist to canvas/[slug].json so it survives reloads + shows in Recent
        if (process.env.NODE_ENV === 'development') {
          fetch('/api/canvas-save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: `${slugify(mindmap.topic)}.json`,
              content: { ...mindmap, format: 'mindmap', question, position: clusterOffset },
            }),
          }).catch(console.error);
        }

        if (shouldPersist) {
          persistFile(responseId, canvasId!, clusterOffset, mindmap, parentResponseId).catch(console.error);
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
      addMarkdownResponse,
      addLoadingNode,
      removeLoadingNode,
      setSelectedFrame,
      setFirstVisitComplete,
    ]
  );

  return { submit };
}

import type { Node } from '@xyflow/react';

// A "frame" is any top-level answer node — mind-map response or markdown doc.
// Both participate in placement, collision, and branching.
function isFrameNode(n: Node): boolean {
  return n.type === 'response' || n.type === 'markdown';
}

function findFreePosition(
  ideal: { x: number; y: number },
  direction: string,
  allNodes: Node[]
): { x: number; y: number } {
  const W = 700, H = 500, PAD = 100;
  const responseNodes = allNodes.filter(isFrameNode);

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
  const responseNodes = allNodes.filter(isFrameNode);

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
        format: 'mindmap',
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

async function persistMarkdownFile(
  responseId: string,
  canvasId: string,
  position: { x: number; y: number },
  parsed: { topic: string; chat_summary: string; markdown: string },
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
        format: 'markdown',
        topic: parsed.topic,
        chat_summary: parsed.chat_summary,
        markdown: parsed.markdown,
        parent_response_id: parentResponseId,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[VAI] persistMarkdownFile failed:', err);
  }
}
