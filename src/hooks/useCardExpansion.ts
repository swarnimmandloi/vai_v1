'use client';

import { useCallback, useState } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { layoutHierarchy } from '@/lib/canvas/layoutHierarchy';
import { generateId } from '@/lib/utils';
import type { KnowledgeCard, KnowledgeSection, SectionColor } from '@/types/canvas';
import type { CardNodeData, SectionNodeData, ResponseNodeData } from '@/store/canvasStore';

export function useCardExpansion() {
  const [isExpanding, setIsExpanding] = useState(false);
  const { applyRelayout, addExpansionNodes } = useCanvasStore();

  const expand = useCallback(
    async (
      cardNodeId: string,
      question: string,
      _startPosition?: { x: number; y: number }, // hook for future drag-to-place
    ) => {
      if (isExpanding) return;
      setIsExpanding(true);

      try {
        const { nodes, edges, canvasId } = useCanvasStore.getState();

        // 1. Find card node + ancestor response
        const cardNode = nodes.find((n) => n.id === cardNodeId && n.type === 'card');
        if (!cardNode) return;

        let responseId: string | undefined;
        const directParent = nodes.find((n) => n.id === cardNode.parentId);
        if (directParent?.type === 'response') {
          responseId = directParent.id;
        } else if (directParent?.parentId) {
          const grandParent = nodes.find((n) => n.id === directParent.parentId);
          if (grandParent?.type === 'response') responseId = grandParent.id;
        }
        if (!responseId) return;

        // 2. Collect all cards and sections in this response
        const sectionNodes = nodes.filter(
          (n) => n.type === 'section' && n.parentId === responseId,
        );
        const sectionIdSet = new Set(sectionNodes.map((n) => n.id));
        const allCardNodes = nodes.filter(
          (n) =>
            n.type === 'card' &&
            (n.parentId === responseId || sectionIdSet.has(n.parentId ?? '')),
        );

        // 3. Strip the responseId_ prefix to get raw IDs for AI
        const prefix = `${responseId}_`;
        const stripPrefix = (id: string) =>
          id.startsWith(prefix) ? id.slice(prefix.length) : id;

        const rawCards: KnowledgeCard[] = allCardNodes.map((n) => {
          const card = (n.data as CardNodeData).card;
          return {
            ...card,
            id: stripPrefix(card.id),
            section: card.section ? stripPrefix(card.section) : undefined,
          };
        });

        const rawSections: KnowledgeSection[] = sectionNodes.map((n) => {
          const sec = (n.data as SectionNodeData).section;
          return { ...sec, id: stripPrefix(sec.id) };
        });

        const sourceRawCard = rawCards.find((c) => `${prefix}${c.id}` === cardNodeId);
        if (!sourceRawCard) return;

        const responseTopic =
          (nodes.find((n) => n.id === responseId)?.data as ResponseNodeData | undefined)?.topic ?? '';

        // 4. Call AI expand endpoint
        const res = await fetch('/api/ai/expand-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            sourceCard: sourceRawCard,
            responseTopic,
            currentCards: rawCards,
            currentSections: rawSections,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(`expand-card API ${res.status}: ${errBody.error ?? 'unknown'}`);
        }

        const data = await res.json() as {
          new_cards: Array<{ id: string; heading: string; body: string; section?: string; has_image?: boolean }>;
          new_sections?: Array<{ id: string; label: string; color: string }>;
          new_connections: Array<{ from: string; to: string; label?: string }>;
        };

        // 5. Assign client-side store IDs to new cards and sections
        const newCardIdMap = new Map<string, string>(); // aiId → storeId
        const newSectionIdMap = new Map<string, string>(); // aiId → storeId

        const newPrefixedSections: KnowledgeSection[] = (data.new_sections ?? []).map((s) => {
          const storeId = `${prefix}expsec_${generateId()}`;
          newSectionIdMap.set(s.id, storeId);
          return { id: storeId, label: s.label, color: s.color as SectionColor };
        });

        const newPrefixedCards: KnowledgeCard[] = data.new_cards.map((c) => {
          const storeId = `${prefix}exp_${generateId()}`;
          newCardIdMap.set(c.id, storeId);
          const section = c.section
            ? (newSectionIdMap.get(c.section) ?? `${prefix}${c.section}`)
            : undefined;
          return { ...c, id: storeId, section };
        });

        // 6. Translate connections: ai raw IDs → store IDs
        const resolveId = (aiId: string): string =>
          newCardIdMap.get(aiId) ?? `${prefix}${aiId}`;

        const newEdges = data.new_connections.map((c) => ({
          from: resolveId(c.from),
          to: resolveId(c.to),
          label: c.label,
        }));

        // 7. Build full merged arrays for layout (all IDs are store IDs)
        const existingPrefixedSections: KnowledgeSection[] = rawSections.map((s) => ({
          ...s,
          id: `${prefix}${s.id}`,
        }));
        const existingPrefixedCards: KnowledgeCard[] = rawCards.map((c) => ({
          ...c,
          id: `${prefix}${c.id}`,
          section: c.section ? `${prefix}${c.section}` : undefined,
        }));

        const allSections = [...existingPrefixedSections, ...newPrefixedSections];
        const allCards = [...existingPrefixedCards, ...newPrefixedCards];

        // Existing card-to-card edges from the store
        const allCardIdSet = new Set(allCards.map((c) => c.id));
        const existingEdges = edges
          .filter((e) => allCardIdSet.has(e.source) && allCardIdSet.has(e.target))
          .map((e) => ({
            from: e.source,
            to: e.target,
            label: typeof e.label === 'string' ? e.label : undefined,
          }));

        const allConnections = [...existingEdges, ...newEdges];

        // 8. Run full layout on merged data
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const { positionedSections, positionedCards, responseWidth, responseHeight } =
          layoutHierarchy(
            responseId,
            allSections,
            allCards,
            allConnections,
            undefined,
            isMobile ? 'TB' : 'LR',
          );

        // 9. Split into existing (applyRelayout) vs new (addExpansionNodes)
        const existingNodeIds = new Set(nodes.map((n) => n.id));
        const newCardStoreIds = new Set(newPrefixedCards.map((c) => c.id));
        const newSectionStoreIds = new Set(newPrefixedSections.map((s) => s.id));

        const relayoutUpdates: Array<{
          id: string;
          position?: { x: number; y: number };
          style?: Record<string, unknown>;
          parentId?: string;
        }> = [{ id: responseId, style: { width: responseWidth, height: responseHeight } }];

        positionedSections.forEach(({ section, position, width, height }) => {
          if (!newSectionStoreIds.has(section.id) && existingNodeIds.has(section.id)) {
            relayoutUpdates.push({ id: section.id, position, style: { width, height } });
          }
        });

        positionedCards.forEach(({ card, position, parentId }) => {
          if (!newCardStoreIds.has(card.id) && existingNodeIds.has(card.id)) {
            relayoutUpdates.push({ id: card.id, position, parentId });
          }
        });

        applyRelayout(relayoutUpdates);

        const newPositionedSections = positionedSections.filter((ps) =>
          newSectionStoreIds.has(ps.section.id),
        );
        const newPositionedCards = positionedCards.filter((pc) =>
          newCardStoreIds.has(pc.card.id),
        );

        addExpansionNodes(
          responseId,
          newPositionedSections,
          newPositionedCards,
          newEdges,
          { width: responseWidth, height: responseHeight },
        );

        // 10. Persist to Supabase if configured
        const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (canvasId && canvasId !== 'demo' && supabaseConfigured) {
          const allSectionsRaw = allSections.map((s) => ({
            ...s,
            id: stripPrefix(s.id),
          }));
          const allCardsRaw = allCards.map((c) => ({
            ...c,
            id: stripPrefix(c.id),
            section: c.section ? stripPrefix(c.section) : undefined,
          }));
          const allConnectionsRaw = allConnections.map((e) => ({
            from: stripPrefix(e.from),
            to: stripPrefix(e.to),
            label: e.label,
          }));

          fetch('/api/files', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: responseId,
              content: {
                sections: allSectionsRaw,
                cards: allCardsRaw,
                connections: allConnectionsRaw,
              },
            }),
          }).catch(console.error);
        }
      } catch (err) {
        console.error('[VAI] useCardExpansion error:', err);
      } finally {
        setIsExpanding(false);
      }
    },
    [isExpanding, applyRelayout, addExpansionNodes],
  );

  return { expand, isExpanding };
}
