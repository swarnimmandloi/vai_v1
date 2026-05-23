'use client';

import * as LucideIcons from 'lucide-react';
import type { IconTextContent } from '@/types/canvas';

type LucideIconComponent = React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
const iconMap: Record<string, LucideIconComponent> = LucideIcons as unknown as Record<string, LucideIconComponent>;

function stableHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return Math.abs(h);
}

// picsum.photos: fast CDN, free, no API key, consistent per seed, never rate-limits
function getImageUrl(heading: string): string {
  const seed = stableHash(heading);
  return `https://picsum.photos/seed/${seed}/72/72`;
}

export function IconTextBlock({ content }: { content: IconTextContent }) {
  const IconComponent = iconMap[content.icon] ?? LucideIcons.Sparkles;

  return (
    <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Icon + heading inline */}
      <div className="flex items-center gap-2 mb-2">
        <IconComponent size={13} style={{ color: 'var(--accent-hover)', flexShrink: 0 }} />
        <span className="text-sm font-medium leading-snug" style={{ color: 'var(--foreground)' }}>
          {content.heading}
        </span>
      </div>

      {/* Body with thumbnail floating right — text wraps around it */}
      {content.body && (
        <div className="overflow-hidden">
          <img
            src={getImageUrl(content.heading)}
            alt=""
            className="float-right ml-3 mb-1 rounded-md object-cover"
            style={{ width: 72, height: 72, opacity: 0.7 }}
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
            {content.body}
          </p>
        </div>
      )}
    </div>
  );
}


