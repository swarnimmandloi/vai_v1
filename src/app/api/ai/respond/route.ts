import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildUserMessage } from '@/lib/ai/prompts';
import type { AIRequestPayload } from '@/types/ai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  const body: AIRequestPayload = await req.json();
  const { question, canvasContext, threadHistory, selectedFrameTitle } = body;

  const userMessage = buildUserMessage({
    question,
    canvasContext,
    threadHistory,
    selectedCardHeading: selectedFrameTitle,
  });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
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

    // Card-graph format (new)
    if (Array.isArray(data.cards)) {
      const normalized = normalizeCardGraph(data);
      console.log('[VAI] Card graph — cards:', normalized.cards.length, '| connections:', normalized.connections.length);
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
  const rawCards = (data.cards ?? []) as Record<string, unknown>[];
  const rawConnections = (data.connections ?? data.edges ?? []) as Record<string, unknown>[];

  const cards = rawCards.map((c, i) => ({
    id: String(c.id ?? `card_${i}`),
    heading: String(c.heading ?? c.title ?? c.name ?? ''),
    body: String(c.body ?? c.description ?? c.text ?? c.content ?? ''),
  }));

  const cardIds = new Set(cards.map((c) => c.id));

  const connections = rawConnections
    .map((conn) => ({
      from: String(conn.from ?? conn.source ?? ''),
      to: String(conn.to ?? conn.target ?? ''),
      label: conn.label ? String(conn.label) : undefined,
    }))
    .filter(({ from, to }) => cardIds.has(from) && cardIds.has(to));

  return {
    chat_summary: String(data.chat_summary),
    cards,
    connections,
  };
}
