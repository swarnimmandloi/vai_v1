'use client';

import { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import type { KnowledgeSection, SectionColor } from '@/types/canvas';

export interface SectionNodeData extends Record<string, unknown> {
  section: KnowledgeSection;
}

const COLOR_MAP: Record<SectionColor, { bg: string; border: string; label: string }> = {
  blue:   { bg: '#0f1f3d', border: '#3b82f6', label: '#93c5fd' },
  green:  { bg: '#0f2318', border: '#22c55e', label: '#86efac' },
  purple: { bg: '#1a0f3d', border: '#8b5cf6', label: '#c4b5fd' },
  orange: { bg: '#2d1500', border: '#f97316', label: '#fdba74' },
  teal:   { bg: '#0f2a2a', border: '#14b8a6', label: '#5eead4' },
  red:    { bg: '#2d0f0f', border: '#ef4444', label: '#fca5a5' },
};

export const SectionNode = memo(function SectionNode({
  data,
}: NodeProps<Node<SectionNodeData>>) {
  const { section } = data;
  const colors = COLOR_MAP[section.color] ?? COLOR_MAP.blue;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '6px 12px',
          borderBottom: `1px solid ${colors.border}`,
          background: `${colors.border}18`,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: colors.label,
          }}
        >
          {section.label}
        </span>
      </div>
    </div>
  );
});
