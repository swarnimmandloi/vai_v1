import type { SectionColor } from '@/types/canvas';

const VALID_COLORS: SectionColor[] = ['blue', 'green', 'purple', 'orange', 'teal', 'red'];

export function normalizeCardGraph(data: Record<string, unknown>) {
  const topic = String(data.topic ?? data.title ?? data.heading ?? 'Response');

  const rawSections = (data.sections ?? []) as Record<string, unknown>[];
  const sections = rawSections.map((s, i) => ({
    id: String(s.id ?? `sec_${i}`),
    label: String(s.label ?? s.title ?? s.name ?? ''),
    color: (VALID_COLORS.includes(s.color as SectionColor)
      ? s.color
      : VALID_COLORS[i % VALID_COLORS.length]) as SectionColor,
  }));

  const sectionIds = new Set(sections.map((s) => s.id));

  const rawCards = (data.cards ?? []) as Record<string, unknown>[];
  const cards = rawCards.map((c, i) => ({
    id: String(c.id ?? `card_${i}`),
    heading: String(c.heading ?? c.title ?? c.name ?? ''),
    body: String(c.body ?? c.description ?? c.text ?? c.content ?? ''),
    section: c.section && sectionIds.has(String(c.section)) ? String(c.section) : undefined,
    has_image: c.has_image !== false,
    ...(c.image_url ? { image_url: String(c.image_url) } : {}),
    ...(c.type === 'action' ? { type: 'action' as const } : {}),
    ...(c.type === 'action' && typeof c.question === 'string' ? { question: c.question } : {}),
  }));

  const cardIds = new Set(cards.map((c) => c.id));

  const rawConnections = (data.connections ?? data.edges ?? []) as Record<string, unknown>[];
  const connections = rawConnections
    .map((conn) => ({
      from: String(conn.from ?? conn.source ?? ''),
      to: String(conn.to ?? conn.target ?? ''),
      label: conn.label ? String(conn.label) : undefined,
    }))
    .filter(({ from, to }) => cardIds.has(from) && cardIds.has(to));

  return {
    format: 'mindmap' as const,
    chat_summary: String(data.chat_summary ?? ''),
    topic,
    sections,
    cards,
    connections,
  };
}

export function normalizeMarkdownResponse(data: Record<string, unknown>) {
  const topic = String(data.topic ?? data.title ?? data.heading ?? 'Response');
  return {
    format: 'markdown' as const,
    chat_summary: String(data.chat_summary ?? ''),
    topic,
    markdown: String(data.markdown ?? data.content ?? data.body ?? ''),
  };
}
