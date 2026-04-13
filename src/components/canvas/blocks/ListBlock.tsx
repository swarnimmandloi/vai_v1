'use client';

import type { ListContent } from '@/types/canvas';

export function ListBlock({ content }: { content: ListContent }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <ul className="space-y-2">
        {content.items.map((item, i) => (
          <li key={i}>
            <div className="flex items-start gap-2">
              <span
                className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: 'var(--accent)' }}
              />
              <span className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
                {item.text}
              </span>
            </div>
            {item.sub_items && item.sub_items.length > 0 && (
              <ul className="ml-5 mt-1 space-y-1">
                {item.sub_items.map((sub, j) => (
                  <li key={j} className="flex items-start gap-1.5">
                    <span className="mt-2 w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--muted-fg)' }} />
                    <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>{sub}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
