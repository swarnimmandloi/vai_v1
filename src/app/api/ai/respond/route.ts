import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildUserMessage } from '@/lib/ai/prompts';
import { AIFrameResponseSchema } from '@/lib/ai/schema';
import type { AIRequestPayload } from '@/types/ai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  const body: AIRequestPayload = await req.json();
  const { question, canvasContext, threadHistory, selectedFrameId, selectedFrameTitle } = body;

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
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return new Response(JSON.stringify({ error: 'No text response' }), { status: 500 });
    }

    // Extract JSON from the response (handle markdown code fences if present)
    let jsonText = textBlock.text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (fenceMatch) jsonText = fenceMatch[1].trim();

    // Validate with Zod
    const parsed = AIFrameResponseSchema.safeParse(JSON.parse(jsonText));
    if (!parsed.success) {
      console.error('Schema validation failed:', parsed.error);
      return new Response(JSON.stringify({ error: 'Invalid AI response format' }), { status: 500 });
    }

    return new Response(JSON.stringify(parsed.data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Anthropic API error:', err);
    return new Response(JSON.stringify({ error: 'AI request failed' }), { status: 500 });
  }
}
