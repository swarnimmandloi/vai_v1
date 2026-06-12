'use client';

import { useState, useEffect, useRef } from 'react';
import { useViewport, useInternalNode } from '@xyflow/react';
import { useCanvasStore } from '@/store/canvasStore';
import { useCardExpansion } from '@/hooks/useCardExpansion';
import { estimatedCardHeight, CARD_W } from '@/lib/canvas/layoutHierarchy';
import type { CardNodeData } from '@/store/canvasStore';

export function CardExpansionOverlay() {
  const selectedFrameId = useCanvasStore((s) => s.selectedFrameId);
  const nodes = useCanvasStore((s) => s.nodes);
  const { expand, isExpanding } = useCardExpansion();
  const { x: vpX, y: vpY, zoom } = useViewport();
  const [question, setQuestion] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const prevCardIdRef = useRef<string | null>(null);
  // Persist typed text per card for the session so clicking away doesn't erase work
  const savedTextRef = useRef<Map<string, string>>(new Map());

  const internalNode = useInternalNode(selectedFrameId ?? '');
  const selectedNode = nodes.find((n) => n.id === selectedFrameId && n.type === 'card');

  // Save current text to the per-card map on every keystroke
  useEffect(() => {
    if (selectedNode) {
      savedTextRef.current.set(selectedNode.id, question);
    }
  }, [question, selectedNode]);

  // When a new card is selected, restore its saved text and focus
  useEffect(() => {
    if (selectedNode && selectedNode.id !== prevCardIdRef.current) {
      const saved = savedTextRef.current.get(selectedNode.id) ?? '';
      setQuestion(saved);
      prevCardIdRef.current = selectedNode.id;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!selectedNode) prevCardIdRef.current = null;
  }, [selectedNode]);

  // Dismiss when clicking outside the overlay
  useEffect(() => {
    if (!selectedNode) return;
    function onMouseDown(e: MouseEvent) {
      const overlay = document.getElementById('card-expansion-overlay');
      if (overlay && !overlay.contains(e.target as globalThis.Node)) {
        useCanvasStore.getState().setSelectedFrame(null);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
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
  const absPos = internalNode?.internals.positionAbsolute ?? { x: 0, y: 0 };
  const screenX = absPos.x * zoom + vpX;
  const screenY = absPos.y * zoom + vpY;
  const cardHeightPx = (internalNode?.measured?.height ?? estimatedCardHeight(card)) * zoom;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || isExpanding) return;
    const q = question;
    setQuestion('');
    savedTextRef.current.delete(selectedNode!.id);
    await expand(selectedNode!.id, q);
  }

  return (
    <div
      id="card-expansion-overlay"
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
        <span style={{ fontSize: 12, color: 'var(--muted-fg)', flex: 1 }}>Expanding…</span>
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
