'use client';

import * as LucideIcons from 'lucide-react';
import type { IconTextContent } from '@/types/canvas';

type LucideIconComponent = React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
const iconMap: Record<string, LucideIconComponent> = LucideIcons as unknown as Record<string, LucideIconComponent>;

export function IconTextBlock({ content }: { content: IconTextContent }) {
  const IconComponent = iconMap[content.icon] ?? LucideIcons.Sparkles;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ background: 'rgba(99,102,241,0.15)' }}
        >
          <IconComponent size={14} style={{ color: 'var(--accent-hover)' }} />
        </div>
        <span className="text-sm font-medium leading-snug" style={{ color: 'var(--foreground)' }}>
          {content.heading}
        </span>
      </div>
      {content.body && (
        <p className="text-xs leading-relaxed pl-9" style={{ color: 'var(--muted-fg)' }}>
          {content.body}
        </p>
      )}
    </div>
  );
}
