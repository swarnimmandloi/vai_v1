import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EXPAND_SYSTEM_PROMPT = `You are expanding a specific card in a knowledge mind map. The user wants to drill deeper into one card's topic.

Return ONLY a raw JSON object — no markdown fences, no explanation, no text before or after — with EXACTLY this shape:
{
  "new_cards": [
    { "id": "nc1", "heading": "Short heading here", "body": "Two to four sentence explanation.", "has_image": false }
  ],
  "new_sections": [],
  "new_connections": [
    { "from": "SOURCE_CARD_ID_GOES_HERE", "to": "nc1", "label": "explains" }
  ]
}

Rules:
- 2–4 new_cards maximum
- heading: max 8 words, noun-phrase style
- body: 2–4 sentences, concrete and informative, markdown allowed (**bold**, *italic*, bullet lists)
- has_image: true only for concrete physical things (anatomy, objects, places), false for concepts/code/process
- new_connections: "from" must be the exact source card id given to you; "to" must be an id from new_cards
- new_sections: include ONLY if the new cards form a clearly distinct group worth labeling; otherwise use []
- Connection labels: "causes", "enables", "requires", "leads to", "part of", "feeds into", "triggers", "contrasts with", "example of"
- Do NOT repeat content already covered by existing cards
- IMPORTANT: return ONLY the JSON object, starting with { and ending with }`;

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      question: string;
      sourceCard: { id: string; heading: string; body: string };
      responseTopic: string;
      currentCards: Array<{ id: string; heading: string; body: string }>;
    };

    const { question, sourceCard, responseTopic, currentCards } = body;

    if (!question || !sourceCard?.id || !sourceCard?.heading) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingCardSummary = (currentCards ?? [])
      .filter((c) => c.id !== sourceCard.id)
      .map((c) => `- "${c.heading}"`)
      .join('\n');

    const userMessage = `Mind map topic: "${responseTopic ?? ''}"

Source card to expand:
ID: ${sourceCard.id}
Heading: ${sourceCard.heading}
Content: ${sourceCard.body ?? ''}

Existing cards already on the map (do not repeat these):
${existingCardSummary || '(none)'}

User question: ${question}

Return new_cards that answer this question, branching from the source card (ID: ${sourceCard.id}).`;

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
    // Strip markdown fences if present
    const fenceMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
    } else {
      // Extract first JSON object
      const braceStart = jsonText.indexOf('{');
      const braceEnd = jsonText.lastIndexOf('}');
      if (braceStart !== -1 && braceEnd > braceStart) {
        jsonText = jsonText.slice(braceStart, braceEnd + 1);
      }
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText) as Record<string, unknown>;
    } catch {
      console.error('[VAI] expand-card JSON parse failed. Raw:', jsonText.slice(0, 500));
      return Response.json({ error: 'AI returned invalid JSON', raw: jsonText.slice(0, 200) }, { status: 500 });
    }

    // Accept both new_cards and cards as the array key (Claude sometimes varies)
    const newCards = parsed.new_cards ?? parsed.cards;
    const newConnections = parsed.new_connections ?? parsed.connections ?? [];
    const newSections = parsed.new_sections ?? parsed.sections ?? [];

    if (!Array.isArray(newCards) || newCards.length === 0) {
      console.error('[VAI] expand-card: no new_cards in response:', JSON.stringify(parsed).slice(0, 300));
      return Response.json({ error: 'AI response missing new_cards array', parsed }, { status: 500 });
    }

    return Response.json({
      new_cards: newCards,
      new_sections: newSections,
      new_connections: newConnections,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[VAI] expand-card error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
