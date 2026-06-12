import Anthropic from '@anthropic-ai/sdk';
import type { KnowledgeCard, KnowledgeSection } from '@/types/canvas';

export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EXPAND_SYSTEM_PROMPT = `You are expanding a specific card in a knowledge mind map. The user wants to drill deeper into one card's topic.

Return ONLY a JSON object — no markdown, no explanation — with this exact shape:
{
  "new_cards": [
    { "id": "nc1", "heading": "...", "body": "...", "has_image": false }
  ],
  "new_sections": [],
  "new_connections": [
    { "from": "<sourceCardId>", "to": "nc1", "label": "explains" }
  ]
}

Rules:
- 2–4 new cards maximum
- heading: max 8 words, noun-phrase style
- body: 2–4 sentences, concrete and informative, markdown allowed (**bold**, *italic*, bullet lists)
- has_image: true only for concrete physical things (anatomy, objects, places), false for concepts/code
- new_connections: "from" must be the source card's id; "to" must be an id from new_cards
- new_sections: include only if the new cards form a clearly distinct group worth labeling; otherwise leave as []
- Connection labels: "causes", "enables", "requires", "leads to", "part of", "feeds into", "triggers", "contrasts with", "example of"
- Do not repeat content already covered by existing cards
- Return ONLY the JSON object`;

export async function POST(req: Request) {
  const body = await req.json() as {
    question: string;
    sourceCard: { id: string; heading: string; body: string };
    responseTopic: string;
    currentCards: KnowledgeCard[];
    currentSections: KnowledgeSection[];
  };

  const { question, sourceCard, responseTopic, currentCards, currentSections } = body;

  const existingCardSummary = currentCards
    .filter((c) => c.id !== sourceCard.id)
    .map((c) => `- "${c.heading}"`)
    .join('\n');

  const userMessage = `Mind map topic: "${responseTopic}"

Source card to expand:
ID: ${sourceCard.id}
Heading: ${sourceCard.heading}
Content: ${sourceCard.body}

Existing cards already on the map (do not repeat these):
${existingCardSummary || '(none)'}

User's question: ${question}

Return new cards that answer this question, branching from the source card.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: EXPAND_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'No text in AI response' }, { status: 500 });
    }

    let jsonText = textBlock.text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
    } else {
      const braceStart = jsonText.indexOf('{');
      const braceEnd = jsonText.lastIndexOf('}');
      if (braceStart !== -1 && braceEnd > braceStart) {
        jsonText = jsonText.slice(braceStart, braceEnd + 1);
      }
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error('[VAI] expand-card JSON parse failed:', jsonText.slice(0, 300));
      return Response.json({ error: 'AI returned invalid JSON' }, { status: 500 });
    }

    const data = parsed as {
      new_cards?: unknown[];
      new_sections?: unknown[];
      new_connections?: unknown[];
    };

    if (!Array.isArray(data.new_cards)) {
      return Response.json({ error: 'AI response missing new_cards' }, { status: 500 });
    }

    return Response.json({
      new_cards: data.new_cards,
      new_sections: data.new_sections ?? [],
      new_connections: data.new_connections ?? [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[VAI] expand-card route error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
