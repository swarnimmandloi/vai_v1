'use client';

import * as LucideIcons from 'lucide-react';
import type { IconTextContent } from '@/types/canvas';

type LucideIconComponent = React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
const iconMap: Record<string, LucideIconComponent> = LucideIcons as unknown as Record<string, LucideIconComponent>;

function getImageUrl(heading: string): string {
  const keyword = heading.split(/\s+/).slice(0, 3).join(' ');
  return `https://source.unsplash.com/80x80/?${encodeURIComponent(keyword)}`;
}

export function IconTextBlock({ content }: { content: IconTextContent }) {
  const IconComponent = iconMap[content.icon] ?? LucideIcons.Sparkles;
  const imageUrl = getImageUrl(content.heading);

  return (
    <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Icon + heading inline — no left column gap */}
      <div className="flex items-center gap-2 mb-2">
        <IconComponent size={13} style={{ color: 'var(--accent-hover)', flexShrink: 0 }} />
        <span className="text-sm font-medium leading-snug" style={{ color: 'var(--foreground)' }}>
          {content.heading}
        </span>
      </div>

      {/* Body with float image — text wraps around the thumbnail */}
      {content.body && (
        <div className="overflow-hidden">
          <img
            src={imageUrl}
            alt=""
            className="float-right ml-3 mb-1 rounded-md object-cover"
            style={{ width: 72, height: 72, opacity: 0.72 }}
            loading="lazy"
            referrerPolicy="no-referrer"
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

