'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { StatContent } from '@/types/canvas';

export function StatBlock({ content }: { content: StatContent }) {
  const TrendIcon = content.trend === 'up' ? TrendingUp : content.trend === 'down' ? TrendingDown : Minus;
  const trendColor = content.trend === 'up' ? '#22c55e' : content.trend === 'down' ? '#ef4444' : 'var(--muted-fg)';

  return (
    <div
      className="p-4 rounded-lg text-center"
      style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
    >
      <div className="flex items-center justify-center gap-2 mb-1">
        <span className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
          {content.value}
        </span>
        {content.trend && (
          <TrendIcon size={18} style={{ color: trendColor }} />
        )}
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--accent-hover)' }}>
        {content.label}
      </p>
      {content.context && (
        <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
          {content.context}
        </p>
      )}
    </div>
  );
}
