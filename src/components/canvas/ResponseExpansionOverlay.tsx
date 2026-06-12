'use client';

import { useState, useEffect, useRef } from 'react';
import { useReactFlow, useOnViewportChange } from '@xyflow/react';
import type { Viewport } from '@xyflow/react';
import { useCanvasStore } from '@/store/canvasStore';

type Direction = 'top' | 'right' | 'bottom' | 'left';

function getOverlayPosition(
  nodeX: number,
  nodeY: number,
  nodeW: number,
  nodeH: number,
  direction: Direction,
  zoom: number,
  vpX: number,
  vpY: number,
): { left: number; top: number } {
  const GAP = 12;
  const OVERLAY_W = 260;
  const OVERLAY_H = 44;

  // Absolute flow-space anchor point at the dot
  let anchorX = nodeX;
  let anchorY = nodeY;

  switch (direction) {
    case 'right':  anchorX = nodeX + nodeW; anchorY = nodeY + nodeH / 2; break;
    case 'left':   anchorX = nodeX;         anchorY = nodeY + nodeH / 2; break;
    case 'bottom': anchorX = nodeX + nodeW / 2; anchorY = nodeY + nodeH; break;
    case 'top':    anchorX = nodeX + nodeW / 2; anchorY = nodeY;         break;
  }

  // Convert to screen coords
  const sx = anchorX * zoom + vpX;
  const sy = anchorY * zoom + vpY;

  switch (direction) {
    case 'right':  return { left: sx + GAP, top: sy - OVERLAY_H / 2 };
    case 'left':   return { left: sx - OVERLAY_W - GAP, top: sy - OVERLAY_H / 2 };
    case 'bottom': return { left: sx - OVERLAY_W / 2, top: sy + GAP };
    case 'top':    return { left: sx - OVERLAY_W / 2, top: sy - OVERLAY_H - GAP };
  }
}

export function ResponseExpansionOverlay() {
  const pendingDot = useCanvasStore((s) => s.pendingResponseDot);
  const setPendingResponseDot = useCanvasStore((s) => s.setPendingResponseDot);
  const nodes = useCanvasStore((s) => s.nodes);
  const { getViewport } = useReactFlow();
  const [viewport, setViewport] = useState<Viewport>(() => getViewport());
  const [question, setQuestion] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useOnViewportChange({ onChange: setViewport });

  // Auto-focus when a dot is clicked
  useEffect(() => {
    if (pendingDot) {
      setQuestion('');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [pendingDot?.responseId, pendingDot?.direction]);

  // Dismiss on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && pendingDot) {
        setPendingResponseDot(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingDot, setPendingResponseDot]);

  // Dismiss on click outside
  useEffect(() => {
    if (!pendingDot) return;
    function onMouseDown(e: MouseEvent) {
      const overlay = document.getElementById('response-expansion-overlay');
      if (overlay && !overlay.contains(e.target as Node)) {
        setPendingResponseDot(null);
      }
    }
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [pendingDot, setPendingResponseDot]);

  if (!pendingDot) return null;

  const responseNode = nodes.find((n) => n.id === pendingDot.responseId);
  if (!responseNode) return null;

  const nodeW = (responseNode.style?.width as number) ?? 700;
  const nodeH = (responseNode.style?.height as number) ?? 500;
  const { x: vpX, y: vpY, zoom } = viewport;

  const { left, top } = getOverlayPosition(
    responseNode.position.x,
    responseNode.position.y,
    nodeW,
    nodeH,
    pendingDot.direction,
    zoom,
    vpX,
    vpY,
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question;
    setPendingResponseDot(null);
    window.dispatchEvent(
      new CustomEvent('vai:follow-up', {
        detail: { question: q, frameId: pendingDot!.responseId },
      }),
    );
  }

  return (
    <div
      id="response-expansion-overlay"
      style={{
        position: 'absolute',
        left,
        top,
        width: 260,
        zIndex: 50,
        background: 'var(--panel-bg)',
        border: '1px solid rgba(129,140,248,0.6)',
        borderRadius: 8,
        padding: '7px 10px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 8 }}
      >
        <input
          ref={inputRef}
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a follow-up…"
          style={{
            flex: 1,
            fontSize: 12,
            background: 'transparent',
            outline: 'none',
            border: 'none',
            color: 'var(--foreground)',
            minWidth: 0,
          }}
        />
        {question.trim() && (
          <button
            type="submit"
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              padding: '3px 10px',
              fontSize: 12,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Ask
          </button>
        )}
      </form>
    </div>
  );
}
