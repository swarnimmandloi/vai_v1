'use client';

import { memo, useState } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import type { CardNodeData } from '@/store/canvasStore';
import { useCanvasStore } from '@/store/canvasStore';
import { useCardExpansion } from '@/hooks/useCardExpansion';

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
  const [imgLoaded, setImgLoaded] = useState(false);
  const setSelectedFrame = useCanvasStore((s) => s.setSelectedFrame);
  const { expand, isExpanding } = useCardExpansion();

  if (card.type === 'action') {
    return (
      <div
        onClick={(e) => { e.stopPropagation(); if (!isExpanding) expand(id, card.question ?? card.heading); }}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: 240,
          height: '100%',
          background: isExpanding ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.08)',
          border: `1px solid ${isExpanding ? 'rgba(20,184,166,0.5)' : 'rgba(20,184,166,0.25)'}`,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          cursor: isExpanding ? 'wait' : 'pointer',
          gap: 8,
          transition: 'background 0.15s, border-color 0.15s',
          boxSizing: 'border-box',
        }}
        onMouseEnter={(e) => { if (!isExpanding) { e.currentTarget.style.background = 'rgba(20,184,166,0.16)'; e.currentTarget.style.borderColor = 'rgba(20,184,166,0.5)'; } }}
        onMouseLeave={(e) => { if (!isExpanding) { e.currentTarget.style.background = 'rgba(20,184,166,0.08)'; e.currentTarget.style.borderColor = 'rgba(20,184,166,0.25)'; } }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: '#99f6e4', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {card.heading}
        </span>
        {isExpanding
          ? <Loader2 size={13} style={{ color: '#5eead4', flexShrink: 0, animation: 'spin 1s linear infinite' }} />
          : <ChevronRight size={14} style={{ color: '#5eead4', flexShrink: 0 }} />
        }
      </div>
    );
  }

  const showImage = !!(card.image_url || card.has_image !== false);
  const picsumUrl = `https://picsum.photos/seed/${stableHash(card.heading)}/240/140`;
  const primaryUrl = card.image_url
    ?? `https://image.pollinations.ai/prompt/${encodeURIComponent(card.heading)}?width=240&height=140&nologo=true&seed=${stableHash(card.heading)}`;
  const [imgSrc, setImgSrc] = useState(primaryUrl);

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
        {showImage && (
          <div
            style={{
              height: 140,
              background: 'rgba(99,102,241,0.08)',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <img
              src={imgSrc}
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
              onError={() => {
                if (imgSrc !== picsumUrl) {
                  setImgSrc(picsumUrl);
                  setImgLoaded(false);
                }
              }}
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
          <div
            className="text-xs leading-relaxed card-body-md"
            style={{ color: 'var(--muted-fg)' }}
          >
            <ReactMarkdown
              components={{
                p: ({ children }) => <p style={{ margin: '0 0 4px' }}>{children}</p>,
                strong: ({ children }) => (
                  <strong style={{ color: 'var(--foreground)', fontWeight: 600 }}>{children}</strong>
                ),
                em: ({ children }) => <em style={{ opacity: 0.8 }}>{children}</em>,
                ul: ({ children }) => (
                  <ul style={{ margin: '4px 0', paddingLeft: 14, listStyleType: 'disc' }}>{children}</ul>
                ),
                li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
              }}
            >
              {card.body}
            </ReactMarkdown>
          </div>
        </div>

      </div>
    </div>
  );
});
