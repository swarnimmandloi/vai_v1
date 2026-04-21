'use client';

import { useCallback } from 'react';
import dagre from '@dagrejs/dagre';
import { useCanvasStore } from '@/store/canvasStore';
import { useChatStore } from '@/store/chatStore';
import { useUIStore } from '@/store/uiStore';
import { useCanvasContext } from './useCanvasContext';
import type { KnowledgeCard } from '@/types/canvas';
import { generateId } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { captureCanvas } from '@/lib/canvas/captureCanvas';

const CARD_W = 240;
const CARD_H = 290; // image(140) + content(~100) + input(~50)
const H_GAP = 60;
const V_GAP = 40;

function layoutCards(
  cards: KnowledgeCard[],
  connections: Array<{ from: string; to: string }>,
  offset: { x: number; y: number }
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: V_GAP, ranksep: H_GAP, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));

  const validIds = new Set(cards.map((c) => c.id));
  cards.forEach((c) => g.setNode(c.id, { width: CARD_W, height: CARD_H }));
  connections
    .filter(({ from, to }) => validIds.has(from) && validIds.has(to))
    .forEach(({ from, to }) => g.setEdge(from, to));

  dagre.layout(g);

  // Collect raw positions and find min for normalization
  const raw = new Map<string, { x: number; y: number }>();
  let minX = Infinity;
  let minY = Infinity;
  cards.forEach((c) => {
    const node = g.node(c.id);
    if (node) {
      const x = node.x - CARD_W / 2;
      const y = node.y - CARD_H / 2;
      raw.set(c.id, { x, y });
      if (x < minX) minX = x;
      if (y < minY) minY = y;
    }
  });

  const result = new Map<string, { x: number; y: number }>();
  raw.forEach((pos, id) => {
    result.set(id, { x: pos.x - minX + offset.x, y: pos.y - minY + offset.y });
  });
  return result;
}

export function useAIResponse() {
  const { getCanvasSummary, getThreadHistory, selectedFrameId } = useCanvasContext();
  const {
    addCardGraph,
    addLoadingNode,
    removeLoadingNode,
    getNextFramePosition,
    setSelectedFrame,
    canvasId,
    nodes,
  } = useCanvasStore();
  const { addUserMessage, setStreaming, commitAIMessage, clearStreaming } = useChatStore();
  const { setFirstVisitComplete } = useUIStore();

  const submit = useCallback(
    async (question: string) => {
      if (!question.trim()) return;
      setFirstVisitComplete();
      addUserMessage(question);

      const tempId = `loading-${generateId()}`;
      const clusterOffset = getNextFramePosition(selectedFrameId ?? undefined);
      addLoadingNode(tempId, clusterOffset);
      setStreaming(true, tempId);

      // Build context
      const canvasContext = getCanvasSummary();
      const threadHistory = getThreadHistory();

      // Find heading of selected card/frame for context
      const selectedNode = selectedFrameId
        ? nodes.find((n) => n.id === selectedFrameId)
        : null;
      const selectedCardHeading = selectedNode
        ? ((selectedNode.data as { card?: { heading: string } })?.card?.heading ??
           (selectedNode.data as { frame?: { title: string } })?.frame?.title ??
           null)
        : null;

      // Capture canvas screenshot for AI context
      const canvasSnapshot = await captureCanvas();

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
            canvasSnapshot,
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
          cards: KnowledgeCard[];
          connections: Array<{ from: string; to: string; label?: string }>;
        };

        console.log('[VAI] Card graph — cards:', parsed.cards?.length, '| connections:', parsed.connections?.length);

        // Run dagre layout
        const positions = layoutCards(parsed.cards, parsed.connections ?? [], clusterOffset);

        const positionedCards = parsed.cards.map((card) => ({
          card,
          position: positions.get(card.id) ?? clusterOffset,
        }));

        removeLoadingNode(tempId);

        // Add cards + edges to canvas
        addCardGraph(positionedCards, parsed.connections ?? [], selectedFrameId ?? undefined);

        // Select the first card
        if (parsed.cards.length > 0) {
          setSelectedFrame(parsed.cards[0].id);
        }

        // Commit chat message
        commitAIMessage(parsed.chat_summary, parsed.cards[0]?.id ?? '');

        // Persist to Supabase (skip in demo mode)
        const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (canvasId && canvasId !== 'demo' && supabaseConfigured) {
          persistCards(parsed.cards, positionedCards, canvasId).catch(console.error);
        }

        // Focus first card
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('vai:focus-frame', { detail: { frameId: parsed.cards[0]?.id } })
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
      selectedFrameId,
      canvasId,
      nodes,
      getCanvasSummary,
      getThreadHistory,
      addUserMessage,
      setStreaming,
      commitAIMessage,
      clearStreaming,
      addCardGraph,
      addLoadingNode,
      removeLoadingNode,
      getNextFramePosition,
      setSelectedFrame,
      setFirstVisitComplete,
    ]
  );

  return { submit };
}

async function persistCards(
  cards: KnowledgeCard[],
  positionedCards: Array<{ card: KnowledgeCard; position: { x: number; y: number } }>,
  canvasId: string
) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  const supabase = createClient();

  const posMap = new Map(positionedCards.map((p) => [p.card.id, p.position]));

  await supabase.from('frames').insert(
    cards.map((c) => ({
      id: c.id,
      canvas_id: canvasId,
      title: c.heading,
      position_x: posMap.get(c.id)?.x ?? 0,
      position_y: posMap.get(c.id)?.y ?? 0,
      width: CARD_W,
      layout_type: 'single',
      parent_id: null,
      thread_id: generateId(),
    }))
  );
}
