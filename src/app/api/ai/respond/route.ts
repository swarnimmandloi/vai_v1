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
    selectedFrameTitle,
  });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'No text in AI response' }, { status: 500 });
    }

    // Strip markdown code fences if present
    let jsonText = textBlock.text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (fenceMatch) jsonText = fenceMatch[1].trim();

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error('JSON parse failed. Raw text:', jsonText.slice(0, 500));
      return Response.json({ error: 'AI returned invalid JSON' }, { status: 500 });
    }

    // Basic shape check without Zod (avoids Zod v4 compat issues)
    const data = parsed as Record<string, unknown>;
    if (!data.chat_summary || !data.frame) {
      console.error('Missing fields in AI response:', Object.keys(data));
      return Response.json({ error: 'AI response missing required fields' }, { status: 500 });
    }

    return Response.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('AI route error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
