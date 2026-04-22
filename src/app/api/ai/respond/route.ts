import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildUserMessage } from '@/lib/ai/prompts';
import type { AIRequestPayload } from '@/types/ai';
import type { SectionColor } from '@/types/canvas';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const VALID_COLORS: SectionColor[] = ['blue', 'green', 'purple', 'orange', 'teal', 'red'];

export async function POST(req: Request) {
  const body: AIRequestPayload = await req.json();
  const { question, canvasContext, threadHistory, selectedFrameTitle, canvasSnapshot } = body;

  const userMessage = buildUserMessage({
    question,
    canvasContext,
    threadHistory,
    selectedCardHeading: selectedFrameTitle,
  });

  type MessageContent = Anthropic.MessageParam['content'];
  const messageContent: MessageContent = canvasSnapshot
    ? [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: canvasSnapshot,
          },
        },
        { type: 'text', text: userMessage },
      ]
    : userMessage;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: messageContent }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'No text in AI response' }, { status: 500 });
    }

    let jsonText = textBlock.text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (fenceMatch) jsonText = fenceMatch[1].trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error('JSON parse failed. Raw text:', jsonText.slice(0, 500));
      return Response.json({ error: 'AI returned invalid JSON' }, { status: 500 });
    }

    const data = parsed as Record<string, unknown>;
    if (!data.chat_summary) {
      return Response.json({ error: 'AI response missing chat_summary' }, { status: 500 });
    }

    if (Array.isArray(data.cards)) {
      const normalized = normalizeCardGraph(data);
      console.log(
        '[VAI] Response — cards:', normalized.cards.length,
        '| sections:', normalized.sections.length,
        '| connections:', normalized.connections.length
      );
      return Response.json(normalized);
    }

    return Response.json({ error: 'AI response missing cards array' }, { status: 500 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('AI route error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

function normalizeCardGraph(data: Record<string, unknown>) {
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
    chat_summary: String(data.chat_summary),
    topic,
    sections,
    cards,
    connections,
  };
}
