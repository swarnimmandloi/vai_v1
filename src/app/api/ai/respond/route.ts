import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildUserMessage } from '@/lib/ai/prompts';
import { normalizeCardGraph, normalizeMarkdownResponse } from '@/lib/ai/normalize';
import type { AIRequestPayload } from '@/types/ai';

export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  const body: AIRequestPayload = await req.json();
  const { question, canvasContext, threadHistory, selectedFrameTitle, parentFormat, canvasSnapshot } = body;

  const userMessage = buildUserMessage({
    question,
    canvasContext,
    threadHistory,
    selectedCardHeading: selectedFrameTitle,
    parentFormat,
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
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: messageContent }],
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
      jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').trim();
      const braceStart = jsonText.indexOf('{');
      const braceEnd = jsonText.lastIndexOf('}');
      if (braceStart !== -1 && braceEnd > braceStart) {
        jsonText = jsonText.slice(braceStart, braceEnd + 1);
      }
    }

    console.log('[VAI] raw AI response:\n', jsonText);

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

    // Format is the discriminator. Fall back to mindmap when absent (back-compat)
    // or infer from a present cards array.
    const format =
      typeof data.format === 'string'
        ? data.format
        : Array.isArray(data.cards)
        ? 'mindmap'
        : undefined;

    if (format === 'chat') {
      console.log('[VAI] Response — chat-only');
      return Response.json({ format: 'chat', chat_summary: String(data.chat_summary) });
    }

    if (format === 'markdown') {
      const markdown = typeof data.markdown === 'string' ? data.markdown.trim() : '';
      if (!markdown) {
        return Response.json({ error: 'AI markdown response missing markdown body' }, { status: 500 });
      }
      const normalized = normalizeMarkdownResponse(data);
      console.log('[VAI] Response — markdown doc, length:', normalized.markdown.length);
      return Response.json(normalized);
    }

    if (format === 'mindmap' && Array.isArray(data.cards)) {
      const normalized = normalizeCardGraph(data);
      console.log(
        '[VAI] Response — cards:', normalized.cards.length,
        '| sections:', normalized.sections.length,
        '| connections:', normalized.connections.length
      );
      return Response.json(normalized);
    }

    return Response.json({ error: 'AI response has no recognizable format/content' }, { status: 500 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('AI route error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
