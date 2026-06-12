'use client';

import { memo, useState } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import { useCanvasStore } from '@/store/canvasStore';

export interface ResponseNodeData extends Record<string, unknown> {
  topic: string;
}

type Direction = 'top' | 'right' | 'bottom' | 'left';

const DOT_POSITIONS: Record<Direction, React.CSSProperties> = {
  top:    { top: -8,   left: '50%', transform: 'translateX(-50%)' },
  right:  { right: -8, top: '50%',  transform: 'translateY(-50%)' },
  bottom: { bottom: -8, left: '50%', transform: 'translateX(-50%)' },
  left:   { left: -8,  top: '50%',  transform: 'translateY(-50%)' },
};

function stopAll(e: React.SyntheticEvent) {
  e.stopPropagation();
  e.preventDefault();
}

export const ResponseNode = memo(function ResponseNode({
  data,
  id,
  selected,
}: NodeProps<Node<ResponseNodeData>>) {
  const { topic } = data;
  const [isHovered, setIsHovered] = useState(false);
  const setSelectedFrame = useCanvasStore((s) => s.setSelectedFrame);

  function handleDotClick(e: React.MouseEvent, direction: Direction) {
    e.stopPropagation();
    e.preventDefault();
    const { nodes, setSelectedFrame: sel, setPendingExpansionPosition, setPendingResponseDot } = useCanvasStore.getState();
    const node = nodes.find((n) => n.id === id);
    if (!node) return;

    const w = (node.style?.width as number) ?? 700;
    const h = (node.style?.height as number) ?? 500;
    const GAP = 160;

    const positions: Record<Direction, { x: number; y: number }> = {
      right:  { x: node.position.x + w + GAP, y: node.position.y },
      left:   { x: node.position.x - w - GAP, y: node.position.y },
      bottom: { x: node.position.x,            y: node.position.y + h + GAP },
      top:    { x: node.position.x,            y: node.position.y - h - GAP },
    };

    sel(id);
    setPendingExpansionPosition(positions[direction]);
    setPendingResponseDot({ responseId: id, direction });
  }

  function handleAskClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setSelectedFrame(id);
    useCanvasStore.getState().setPendingResponseDot({ responseId: id, direction: 'top' });
  }

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setSelectedFrame(id)}
    >
      {/* 4 directional expansion dots */}
      {(['top', 'right', 'bottom', 'left'] as Direction[]).map((dir) => (
        <div
          key={dir}
          onMouseDown={stopAll}
          onPointerDown={stopAll}
          onClick={(e) => handleDotClick(e, dir)}
          style={{
            position: 'absolute',
            ...DOT_POSITIONS[dir],
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: isHovered || selected ? '#818cf8' : 'rgba(99,102,241,0.3)',
            border: '2.5px solid #0f172a',
            cursor: 'pointer',
            zIndex: 20,
            transition: 'transform 0.12s, background 0.15s',
            boxShadow: isHovered || selected
              ? '0 0 0 3px rgba(129,140,248,0.3)'
              : '0 0 0 1px rgba(99,102,241,0.15)',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            const base = DOT_POSITIONS[dir].transform as string ?? '';
            el.style.transform = base.replace(')', '') + (base.includes('(') ? ' scale(1.35)' : 'scale(1.35)');
            el.style.background = '#a5b4fc';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.transform = DOT_POSITIONS[dir].transform as string ?? '';
            el.style.background = isHovered || selected ? '#818cf8' : 'rgba(99,102,241,0.3)';
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
        {/* Header: topic label + ask button */}
        <div
          style={{
            padding: '10px 12px 10px 16px',
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
              flex: 1,
              fontSize: 12,
              fontWeight: 600,
              color: selected ? '#a5b4fc' : '#64748b',
              letterSpacing: '0.02em',
            }}
          >
            {topic}
          </span>

          {/* Ask follow-up button — top-right corner */}
          <div
            onMouseDown={stopAll}
            onPointerDown={stopAll}
            onClick={handleAskClick}
            title="Ask a follow-up"
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: isHovered || selected ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.25)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s',
              color: '#818cf8',
              fontSize: 14,
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            +
          </div>
        </div>

        {/* Spacer — cards and sections fill this area */}
        <div style={{ flex: 1 }} />
      </div>
    </div>
  );
});
