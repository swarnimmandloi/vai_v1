import dagre from '@dagrejs/dagre';
import type { KnowledgeCard, KnowledgeSection } from '@/types/canvas';

export const CARD_W = 240;
export const CARD_H_IMAGE = 340;    // conservative: image(140) + long body(~120) + input(~60) + padding(~20)
export const CARD_H_NO_IMAGE = 210; // conservative: long body(~120) + input(~60) + padding(~30)
export const H_GAP = 60;
export const V_GAP = 40;
export const SECTION_PADDING = 40;
export const SECTION_LABEL_H = 36;
export const RESPONSE_PADDING = 52;
export const RESPONSE_LABEL_H = 44;
export const RESPONSE_FOOTER_H = 48;

export function estimatedCardHeight(card: KnowledgeCard): number {
  return card.has_image !== false ? CARD_H_IMAGE : CARD_H_NO_IMAGE;
}

export interface PositionedSection {
  section: KnowledgeSection;
  position: { x: number; y: number };
  width: number;
  height: number;
}

export interface PositionedCard {
  card: KnowledgeCard;
  position: { x: number; y: number };
  parentId: string;
}

export interface LayoutResult {
  positionedSections: PositionedSection[];
  positionedCards: PositionedCard[];
  responseWidth: number;
  responseHeight: number;
}

export function layoutHierarchy(
  responseId: string,
  sections: KnowledgeSection[],
  cards: KnowledgeCard[],
  connections: Array<{ from: string; to: string; label?: string }>,
  measuredHeights?: Map<string, number>
): LayoutResult {
  function cardH(card: KnowledgeCard): number {
    return measuredHeights?.get(card.id) ?? estimatedCardHeight(card);
  }

  // Step 1: layout cards within each section
  const sectionLayouts = new Map<
    string,
    { cardPositions: Map<string, { x: number; y: number }>; width: number; height: number }
  >();

  for (const section of sections) {
    const sectionCards = cards.filter((c) => c.section === section.id);
    if (sectionCards.length === 0) {
      sectionLayouts.set(section.id, {
        cardPositions: new Map(),
        width: CARD_W + SECTION_PADDING * 2,
        height: SECTION_LABEL_H + SECTION_PADDING * 2,
      });
      continue;
    }

    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR', nodesep: V_GAP, ranksep: H_GAP, marginx: 0, marginy: 0 });
    g.setDefaultEdgeLabel(() => ({}));

    const validIds = new Set(sectionCards.map((c) => c.id));
    sectionCards.forEach((c) => g.setNode(c.id, { width: CARD_W, height: cardH(c) }));
    connections
      .filter(({ from, to }) => validIds.has(from) && validIds.has(to))
      .forEach(({ from, to }) => g.setEdge(from, to));

    dagre.layout(g);

    let minX = Infinity;
    let minY = Infinity;
    const raw = new Map<string, { x: number; y: number }>();
    sectionCards.forEach((c) => {
      const node = g.node(c.id);
      if (node) {
        const x = node.x - CARD_W / 2;
        const y = node.y - cardH(c) / 2;
        raw.set(c.id, { x, y });
        if (x < minX) minX = x;
        if (y < minY) minY = y;
      }
    });

    const cardPositions = new Map<string, { x: number; y: number }>();
    let maxRight = 0;
    let maxBottom = 0;
    raw.forEach((pos, id) => {
      const card = sectionCards.find((c) => c.id === id)!;
      const nx = pos.x - minX + SECTION_PADDING;
      const ny = pos.y - minY + SECTION_LABEL_H + SECTION_PADDING;
      cardPositions.set(id, { x: nx, y: ny });
      if (nx + CARD_W > maxRight) maxRight = nx + CARD_W;
      if (ny + cardH(card) > maxBottom) maxBottom = ny + cardH(card);
    });

    sectionLayouts.set(section.id, {
      cardPositions,
      width: maxRight + SECTION_PADDING,
      height: maxBottom + SECTION_PADDING,
    });
  }

  // Step 2: layout ungrouped cards
  const ungroupedCards = cards.filter((c) => !c.section);
  const ungroupedLayout = new Map<string, { x: number; y: number }>();
  let ungroupedWidth = 0;
  let ungroupedHeight = 0;

  if (ungroupedCards.length > 0) {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR', nodesep: V_GAP, ranksep: H_GAP, marginx: 0, marginy: 0 });
    g.setDefaultEdgeLabel(() => ({}));
    const validIds = new Set(ungroupedCards.map((c) => c.id));
    ungroupedCards.forEach((c) => g.setNode(c.id, { width: CARD_W, height: cardH(c) }));
    connections
      .filter(({ from, to }) => validIds.has(from) && validIds.has(to))
      .forEach(({ from, to }) => g.setEdge(from, to));
    dagre.layout(g);

    let minX = Infinity;
    let minY = Infinity;
    const raw = new Map<string, { x: number; y: number }>();
    ungroupedCards.forEach((c) => {
      const node = g.node(c.id);
      if (node) {
        const x = node.x - CARD_W / 2;
        const y = node.y - cardH(c) / 2;
        raw.set(c.id, { x, y });
        if (x < minX) minX = x;
        if (y < minY) minY = y;
      }
    });
    raw.forEach((pos, id) => {
      const card = ungroupedCards.find((c) => c.id === id)!;
      const nx = pos.x - minX;
      const ny = pos.y - minY;
      ungroupedLayout.set(id, { x: nx, y: ny });
      if (nx + CARD_W > ungroupedWidth) ungroupedWidth = nx + CARD_W;
      if (ny + cardH(card) > ungroupedHeight) ungroupedHeight = ny + cardH(card);
    });
  }

  // Step 3: layout sections + ungrouped block within response
  const UNGROUPED_ID = '__ungrouped__';
  const topG = new dagre.graphlib.Graph();
  topG.setGraph({
    rankdir: 'LR',
    nodesep: V_GAP * 2,
    ranksep: H_GAP * 2,
    marginx: 0,
    marginy: 0,
  });
  topG.setDefaultEdgeLabel(() => ({}));

  sections.forEach((sec) => {
    const layout = sectionLayouts.get(sec.id)!;
    topG.setNode(sec.id, { width: layout.width, height: layout.height });
  });

  if (ungroupedCards.length > 0) {
    topG.setNode(UNGROUPED_ID, { width: ungroupedWidth, height: ungroupedHeight });
  }

  const sectionIdSet = new Set(sections.map((s) => s.id));
  const addedEdges = new Set<string>();
  connections.forEach(({ from, to }) => {
    const fromSec = cards.find((c) => c.id === from)?.section;
    const toSec = cards.find((c) => c.id === to)?.section;
    if (
      fromSec &&
      toSec &&
      fromSec !== toSec &&
      sectionIdSet.has(fromSec) &&
      sectionIdSet.has(toSec)
    ) {
      const key = `${fromSec}->${toSec}`;
      if (!addedEdges.has(key)) {
        addedEdges.add(key);
        topG.setEdge(fromSec, toSec);
      }
    }
  });

  dagre.layout(topG);

  const topInnerStartX = RESPONSE_PADDING;
  const topInnerStartY = RESPONSE_LABEL_H + RESPONSE_PADDING;

  let topMinX = Infinity;
  let topMinY = Infinity;
  const allTopIds = [
    ...sections.map((s) => s.id),
    ...(ungroupedCards.length > 0 ? [UNGROUPED_ID] : []),
  ];
  const topRaw = new Map<string, { x: number; y: number }>();

  allTopIds.forEach((nid) => {
    const node = topG.node(nid);
    if (node) {
      const layout =
        nid === UNGROUPED_ID
          ? { width: ungroupedWidth, height: ungroupedHeight }
          : sectionLayouts.get(nid)!;
      const x = node.x - layout.width / 2;
      const y = node.y - layout.height / 2;
      topRaw.set(nid, { x, y });
      if (x < topMinX) topMinX = x;
      if (y < topMinY) topMinY = y;
    }
  });

  if (!isFinite(topMinX)) topMinX = 0;
  if (!isFinite(topMinY)) topMinY = 0;

  const positionedSections: PositionedSection[] = [];
  const positionedCards: PositionedCard[] = [];
  let maxRight = 0;
  let maxBottom = 0;

  sections.forEach((sec) => {
    const raw = topRaw.get(sec.id);
    if (!raw) return;
    const layout = sectionLayouts.get(sec.id)!;
    const x = raw.x - topMinX + topInnerStartX;
    const y = raw.y - topMinY + topInnerStartY;
    positionedSections.push({
      section: sec,
      position: { x, y },
      width: layout.width,
      height: layout.height,
    });
    if (x + layout.width > maxRight) maxRight = x + layout.width;
    if (y + layout.height > maxBottom) maxBottom = y + layout.height;

    layout.cardPositions.forEach((pos, cardId) => {
      const card = cards.find((c) => c.id === cardId)!;
      positionedCards.push({ card, position: pos, parentId: sec.id });
    });
  });

  if (ungroupedCards.length > 0) {
    const ungroupedRaw = topRaw.get(UNGROUPED_ID);
    const originX = ungroupedRaw
      ? ungroupedRaw.x - topMinX + topInnerStartX
      : topInnerStartX;
    const originY = ungroupedRaw
      ? ungroupedRaw.y - topMinY + topInnerStartY
      : topInnerStartY;

    ungroupedCards.forEach((card) => {
      const pos = ungroupedLayout.get(card.id) ?? { x: 0, y: 0 };
      const absX = originX + pos.x;
      const absY = originY + pos.y;
      positionedCards.push({ card, position: { x: absX, y: absY }, parentId: responseId });
      if (absX + CARD_W > maxRight) maxRight = absX + CARD_W;
      if (absY + cardH(card) > maxBottom) maxBottom = absY + cardH(card);
    });
  }

  return {
    positionedSections,
    positionedCards,
    responseWidth: maxRight + RESPONSE_PADDING,
    responseHeight: maxBottom + RESPONSE_PADDING + RESPONSE_FOOTER_H,
  };
}
