'use client';

import { memo, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { CardNodeData } from '@/store/canvasStore';
import { useCanvasStore } from '@/store/canvasStore';

function stableHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return Math.abs(h);
}

const handleStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: 'var(--accent)',
  border: '2px solid var(--panel-bg)',
};

export const CardNode = memo(function CardNode({
  data,
  id,
  selected,
}: NodeProps<Node<CardNodeData>>) {
  const { card } = data;
  const [followUpText, setFollowUpText] = useState('');
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const setSelectedFrame = useCanvasStore((s) => s.setSelectedFrame);

  const imageUrl = `https://picsum.photos/seed/${stableHash(card.heading)}/240/140`;

  function handleFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!followUpText.trim()) return;
    setSelectedFrame(id);
    window.dispatchEvent(
      new CustomEvent('vai:follow-up', { detail: { question: followUpText, frameId: id } })
    );
    setFollowUpText('');
  }

  return (
    <div
      className="relative"
      style={{ width: 240 }}
      onClick={() => setSelectedFrame(id)}
    >
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Right} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />

      <div
        className="rounded-xl overflow-hidden transition-all duration-150"
        style={{
          background: 'var(--panel-bg)',
          border: selected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
          boxShadow: selected
            ? '0 0 0 2px rgba(99,102,241,0.2), 0 8px 24px rgba(0,0,0,0.4)'
            : '0 4px 16px rgba(0,0,0,0.3)',
        }}
      >
        {/* Image */}
        {!imgError && (
          <div
            style={{
              height: 140,
              background: 'rgba(99,102,241,0.08)',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <img
              src={imageUrl}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: imgLoaded ? 0.85 : 0,
                transition: 'opacity 0.4s',
              }}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </div>
        )}

        {/* Content */}
        <div className="p-3">
          <h3
            className="text-sm font-semibold leading-snug mb-1.5"
            style={{ color: 'var(--foreground)' }}
          >
            {card.heading}
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
            {card.body}
          </p>
        </div>

        {/* Follow-up input */}
        <div
          className="px-3 py-2"
          style={{ borderTop: '1px solid var(--border)' }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleFollowUp} className="flex items-center gap-2">
            <input
              type="text"
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              placeholder="Ask about this..."
              className="flex-1 text-xs bg-transparent outline-none placeholder:opacity-40"
              style={{ color: 'var(--foreground)' }}
              onFocus={() => setSelectedFrame(id)}
            />
            {followUpText && (
              <button
                type="submit"
                className="text-xs px-2 py-0.5 rounded cursor-pointer shrink-0"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                Ask
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
});
