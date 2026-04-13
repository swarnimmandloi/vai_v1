import { z } from 'zod';

const IconTextBlockSchema = z.object({
  block_type: z.literal('icon_text'),
  content: z.object({
    icon: z.string().describe('A valid Lucide icon name in camelCase, e.g. Brain, Zap, Star'),
    heading: z.string().max(80),
    body: z.string().max(350),
  }),
});

const ChartBlockSchema = z.object({
  block_type: z.literal('chart'),
  content: z.object({
    chart_type: z.enum(['bar', 'line', 'pie', 'area']),
    data: z.array(z.object({ label: z.string(), value: z.number(), color: z.string().optional() })).min(2).max(12),
    x_label: z.string().optional(),
    y_label: z.string().optional(),
  }),
});

const ListBlockSchema = z.object({
  block_type: z.literal('list'),
  content: z.object({
    items: z.array(z.object({
      text: z.string(),
      sub_items: z.array(z.string()).optional(),
    })).min(2).max(10),
  }),
});

const StatBlockSchema = z.object({
  block_type: z.literal('stat'),
  content: z.object({
    value: z.string().max(20),
    label: z.string().max(80),
    trend: z.enum(['up', 'down', 'neutral']).optional(),
    context: z.string().max(150).optional(),
  }),
});

const ImageBlockSchema = z.object({
  block_type: z.literal('image'),
  content: z.object({
    alt: z.string(),
    caption: z.string().optional(),
  }),
});

export const BlockSchema = z.discriminatedUnion('block_type', [
  IconTextBlockSchema,
  ChartBlockSchema,
  ListBlockSchema,
  StatBlockSchema,
  ImageBlockSchema,
]);

export const AIFrameResponseSchema = z.object({
  chat_summary: z.string().max(500).describe('2-3 sentences guiding the user to the canvas. Warm and direct. No markdown.'),
  frame: z.object({
    title: z.string().max(80).describe('Short descriptive title for this frame'),
    layout_type: z.enum(['grid', 'linear', 'mindmap', 'single']).describe('grid=comparisons, linear=steps/sequences, mindmap=exploration, single=one main visual'),
    blocks: z.array(BlockSchema).min(1).max(12),
  }),
});

export type AIFrameResponseType = z.infer<typeof AIFrameResponseSchema>;
export type BlockSchemaType = z.infer<typeof BlockSchema>;
