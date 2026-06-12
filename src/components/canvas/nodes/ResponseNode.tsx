'use client';

import { memo, useState } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import { useCanvasStore } from '@/store/canvasStore';

export interface ResponseNodeData extends Record<string, unknown> {
  topic: string;
}

type Direction = 'top' | 'right' | 'bottom' | 'left';

const DOT_POSITIONS: Record<Direction, React.CSSProperties> = {
  top:    { top: -7,  left: '50%', transform: 'translateX(-50%)' },
  right:  { right: -7, top: '50%', transform: 'translateY(-50%)' },
  bottom: { bottom: -7, left: '50%', transform: 'translateX(-50%)' },
  left:   { left: -7,  top: '50%', transform: 'translateY(-50%)' },
};

export const ResponseNode = memo(function ResponseNode({
  data,
  id,
  selected,
}: NodeProps<Node<ResponseNodeData>>) {
  const { topic } = data;
  const [followUpText, setFollowUpText] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const setSelectedFrame = useCanvasStore((s) => s.setSelectedFrame);

  function handleFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!followUpText.trim()) return;
    setSelectedFrame(id);
    window.dispatchEvent(
      new CustomEvent('vai:follow-up', { detail: { question: followUpText, frameId: id } })
    );
    setFollowUpText('');
  }

  function handleDotClick(e: React.MouseEvent, direction: Direction) {
    e.stopPropagation();
    const { nodes, setSelectedFrame: sel, setPendingExpansionPosition, setPendingResponseDot } = useCanvasStore.getState();
    const node = nodes.find((n) => n.id === id);
    if (!node) return;

    const w = (node.style?.width as number) ?? 700;
    const h = (node.style?.height as number) ?? 500;
    const GAP = 160;

    const positions: Record<Direction, { x: number; y: number }> = {
      right:  { x: node.position.x + w + GAP,     y: node.position.y },
      left:   { x: node.position.x - w - GAP,     y: node.position.y },
      bottom: { x: node.position.x,               y: node.position.y + h + GAP },
      top:    { x: node.position.x,               y: node.position.y - h - GAP },
    };

    sel(id);
    setPendingExpansionPosition(positions[direction]);
    setPendingResponseDot({ responseId: id, direction });
  }

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setSelectedFrame(id)}
    >
      {/* 4 expansion dots — always visible so users can discover branching */}
      {(['top', 'right', 'bottom', 'left'] as Direction[]).map((dir) => (
        <div
          key={dir}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => handleDotClick(e, dir)}
          style={{
            position: 'absolute',
            ...DOT_POSITIONS[dir],
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: isHovered || selected ? '#818cf8' : 'rgba(99,102,241,0.35)',
            border: '2.5px solid #0f172a',
            cursor: 'pointer',
            zIndex: 20,
            transition: 'transform 0.12s, background 0.15s',
            boxShadow: isHovered || selected
              ? '0 0 0 3px rgba(129,140,248,0.35)'
              : '0 0 0 2px rgba(99,102,241,0.15)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform =
              DOT_POSITIONS[dir].transform?.toString().replace(')', '') + ' scale(1.35)' || 'scale(1.35)';
            (e.currentTarget as HTMLDivElement).style.background = '#a5b4fc';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform = DOT_POSITIONS[dir].transform as string ?? '';
            (e.currentTarget as HTMLDivElement).style.background = isHovered || selected ? '#818cf8' : 'rgba(99,102,241,0.35)';
          }}
        />
      ))}

      {/* Main content box */}
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'rgba(15,23,42,0.7)',
          border: selected
            ? '2px solid rgba(99,102,241,0.7)'
            : '1.5px solid rgba(99,102,241,0.2)',
          borderRadius: 16,
          boxShadow: selected
            ? '0 0 0 3px rgba(99,102,241,0.15), 0 8px 32px rgba(0,0,0,0.5)'
            : '0 4px 24px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        {/* Topic header */}
        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid rgba(99,102,241,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: selected ? '#6366f1' : '#6366f180',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: selected ? '#a5b4fc' : '#64748b',
              letterSpacing: '0.02em',
            }}
          >
            {topic}
          </span>
        </div>

        {/* Spacer — cards and sections fill this area */}
        <div style={{ flex: 1 }} />

        {/* Follow-up input at bottom */}
        <div
          style={{
            padding: '8px 12px',
            borderTop: '1px solid rgba(99,102,241,0.12)',
            flexShrink: 0,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleFollowUp} className="flex items-center gap-2">
            <input
              type="text"
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              placeholder="Ask a follow-up about this response..."
              className="flex-1 text-xs bg-transparent outline-none placeholder:opacity-30"
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
