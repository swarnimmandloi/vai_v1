'use client';

import { useCallback } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { useChatStore } from '@/store/chatStore';
import { useUIStore } from '@/store/uiStore';
import { useCanvasContext } from './useCanvasContext';
import type { KnowledgeCard, KnowledgeSection } from '@/types/canvas';
import { generateId } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { layoutHierarchy, CARD_W } from '@/lib/canvas/layoutHierarchy';

export function useAIResponse() {
  const { getCanvasSummary, getThreadHistory, selectedFrameId } = useCanvasContext();
  const {
    addResponseGraph,
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

      const responseId = generateId();
      const clusterOffset = getNextFramePosition(selectedFrameId ?? undefined);
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

        const { positionedSections, positionedCards, responseWidth, responseHeight } =
          layoutHierarchy(responseId, parsed.sections ?? [], parsed.cards, parsed.connections ?? []);

        removeLoadingNode(tempId);

        addResponseGraph(
          responseId,
          parsed.topic ?? 'Response',
          positionedSections,
          positionedCards,
          parsed.connections ?? [],
          clusterOffset,
          responseWidth,
          responseHeight,
          parentResponseId
        );

        setSelectedFrame(responseId);
        commitAIMessage(parsed.chat_summary, responseId);

        const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (canvasId && canvasId !== 'demo' && supabaseConfigured) {
          persistCards(parsed.cards, positionedCards, canvasId).catch(console.error);
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
      selectedFrameId,
      canvasId,
      nodes,
      getCanvasSummary,
      getThreadHistory,
      addUserMessage,
      setStreaming,
      commitAIMessage,
      clearStreaming,
      addResponseGraph,
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
