'use client';

import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import type { IconTextContent } from '@/types/canvas';

type LucideIconComponent = React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
const iconMap: Record<string, LucideIconComponent> = LucideIcons as unknown as Record<string, LucideIconComponent>;

function stableHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return Math.abs(h) % 99991;
}

function getImageUrl(heading: string): string {
  const seed = stableHash(heading);
  const prompt = `${heading.slice(0, 60)}, minimal artistic illustration, dark background`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=80&height=80&nologo=true&seed=${seed}`;
}

export function IconTextBlock({ content }: { content: IconTextContent }) {
  const IconComponent = iconMap[content.icon] ?? LucideIcons.Sparkles;
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Icon + heading inline */}
      <div className="flex items-center gap-2 mb-2">
        <IconComponent size={13} style={{ color: 'var(--accent-hover)', flexShrink: 0 }} />
        <span className="text-sm font-medium leading-snug" style={{ color: 'var(--foreground)' }}>
          {content.heading}
        </span>
      </div>

      {/* Body with AI-generated thumbnail floating right */}
      {content.body && (
        <div className="overflow-hidden">
          {!imgError && (
            <div
              className="float-right ml-3 mb-1 rounded-md overflow-hidden shrink-0"
              style={{ width: 72, height: 72, background: 'rgba(99,102,241,0.1)' }}
            >
              <img
                src={getImageUrl(content.heading)}
                alt=""
                className="w-full h-full object-cover"
                style={{ opacity: imgLoaded ? 0.78 : 0, transition: 'opacity 0.4s' }}
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
            </div>
          )}
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
            {content.body}
          </p>
        </div>
      )}
    </div>
  );
}

