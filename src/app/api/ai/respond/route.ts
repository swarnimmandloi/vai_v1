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
      max_tokens: 4000,
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

    // Normalize block structure in case Claude drifts from the schema
    const normalized = normalizeResponse(data);

    const frame = normalized.frame as Record<string, unknown>;
    console.log('[VAI] Claude response OK — title:', frame.title, '| layout:', frame.layout_type, '| blocks:', Array.isArray(frame.blocks) ? (frame.blocks as unknown[]).length : 'NOT AN ARRAY');

    return Response.json(normalized);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('AI route error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

// Normalize Claude's response to our expected schema regardless of field name drift
function normalizeResponse(data: Record<string, unknown>) {
  const frame = data.frame as Record<string, unknown>;
  const rawBlocks = (frame.blocks ?? frame.items ?? []) as Record<string, unknown>[];

  const blocks = rawBlocks.map((b) => {
    // Normalize block_type: accept "type" or "block_type"
    const blockType = (b.block_type ?? b.type ?? 'icon_text') as string;

    // If content is already a nested object, use it; otherwise build it from flat fields
    let content = b.content as Record<string, unknown> | undefined;
    if (!content || typeof content !== 'object') {
      // Claude returned flat fields — wrap them into content
      if (blockType === 'icon_text') {
        content = {
          icon: b.icon ?? 'Sparkles',
          heading: b.heading ?? b.title ?? b.name ?? '',
          body: b.body ?? b.description ?? b.text ?? '',
        };
      } else if (blockType === 'list') {
        const items = (b.items ?? b.steps ?? []) as unknown[];
        content = {
          items: items.map((item) =>
            typeof item === 'string' ? { text: item } : item
          ),
        };
      } else if (blockType === 'stat') {
        content = {
          value: b.value ?? '',
          label: b.label ?? '',
          trend: b.trend,
          context: b.context,
        };
      } else if (blockType === 'chart') {
        content = {
          chart_type: b.chart_type ?? 'bar',
          data: b.data ?? [],
        };
      } else if (blockType === 'diagram') {
        const rawDef = (b.definition ?? b.code ?? b.mermaid ?? b.diagram ?? '') as string;
        const definition = rawDef.replace(/\\n/g, '\n');
        const DIAGRAM_TYPES = ['flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram-v2', 'erDiagram'];
        const inferredType = (b.diagram_type as string | undefined) ??
          (DIAGRAM_TYPES.find((t) => definition.trimStart().startsWith(t)) ?? 'flowchart');
        content = { diagram_type: inferredType, definition, caption: b.caption };
      } else {
        content = b;
      }
    } else {
      // content exists but might use "title" instead of "heading"
      if (blockType === 'icon_text' && content.title && !content.heading) {
        content = { ...content, heading: content.title };
      }
      // content exists but definition might be under an alias
      if (blockType === 'diagram') {
        const rawDef = ((content.definition ?? content.code ?? content.mermaid ?? '') as string);
        const definition = rawDef.replace(/\\n/g, '\n');
        const DIAGRAM_TYPES = ['flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram-v2', 'erDiagram'];
        const inferredType = (content.diagram_type as string | undefined) ??
          (DIAGRAM_TYPES.find((t) => definition.trimStart().startsWith(t)) ?? 'flowchart');
        content = { ...content, diagram_type: inferredType, definition };
      }
    }

    return { block_type: blockType, content };
  });

  return {
    ...data,
    frame: {
      ...frame,
      blocks,
    },
  };
}
