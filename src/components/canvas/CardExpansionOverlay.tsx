'use client';

import { useState, useEffect, useRef } from 'react';
import { useReactFlow, useOnViewportChange } from '@xyflow/react';
import type { Node, Viewport } from '@xyflow/react';
import { useCanvasStore } from '@/store/canvasStore';
import { useCardExpansion } from '@/hooks/useCardExpansion';
import { estimatedCardHeight, CARD_W } from '@/lib/canvas/layoutHierarchy';
import type { CardNodeData } from '@/store/canvasStore';

function getAbsoluteFlowPos(nodeId: string, allNodes: Node[]): { x: number; y: number } {
  const node = allNodes.find((n) => n.id === nodeId);
  if (!node) return { x: 0, y: 0 };
  if (!node.parentId) return { x: node.position.x, y: node.position.y };
  const parentPos = getAbsoluteFlowPos(node.parentId, allNodes);
  return { x: parentPos.x + node.position.x, y: parentPos.y + node.position.y };
}

export function CardExpansionOverlay() {
  const selectedFrameId = useCanvasStore((s) => s.selectedFrameId);
  const nodes = useCanvasStore((s) => s.nodes);
  const { getViewport } = useReactFlow();
  const { expand, isExpanding } = useCardExpansion();
  const [viewport, setViewport] = useState<Viewport>(() => getViewport());
  const [question, setQuestion] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const prevCardIdRef = useRef<string | null>(null);

  useOnViewportChange({ onChange: setViewport });

  const selectedNode = nodes.find(
    (n) => n.id === selectedFrameId && n.type === 'card',
  );

  // Clear input and focus when switching to a new card
  useEffect(() => {
    if (selectedNode && selectedNode.id !== prevCardIdRef.current) {
      setQuestion('');
      prevCardIdRef.current = selectedNode.id;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!selectedNode) prevCardIdRef.current = null;
  }, [selectedNode]);

  // Dismiss on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && selectedNode) {
        useCanvasStore.getState().setSelectedFrame(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedNode]);

  if (!selectedNode) return null;

  const card = (selectedNode.data as CardNodeData).card;
  const absPos = getAbsoluteFlowPos(selectedNode.id, nodes);
  const { x: vpX, y: vpY, zoom } = viewport;

  const screenX = absPos.x * zoom + vpX;
  const screenY = absPos.y * zoom + vpY;
  const cardHeightPx = (selectedNode.measured?.height ?? estimatedCardHeight(card)) * zoom;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || isExpanding) return;
    const q = question;
    setQuestion('');
    await expand(selectedNode!.id, q);
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY + cardHeightPx + 8,
        width: CARD_W,
        zIndex: 50,
        background: 'var(--panel-bg)',
        border: '1px solid var(--accent)',
        borderRadius: 8,
        padding: '7px 10px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {isExpanding ? (
        <span style={{ fontSize: 12, color: 'var(--muted-fg)', flex: 1 }}>
          Expanding…
        </span>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 8 }}
        >
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about this card…"
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
      )}
    </div>
  );
}
