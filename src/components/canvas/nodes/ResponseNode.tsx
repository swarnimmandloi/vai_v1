'use client';

import { memo, useState } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import { useCanvasStore } from '@/store/canvasStore';

export interface ResponseNodeData extends Record<string, unknown> {
  topic: string;
}

export const ResponseNode = memo(function ResponseNode({
  data,
  id,
  selected,
}: NodeProps<Node<ResponseNodeData>>) {
  const { topic } = data;
  const [followUpText, setFollowUpText] = useState('');
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

  return (
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
      onClick={() => setSelectedFrame(id)}
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
  );
});
