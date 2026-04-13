'use client';

import { useState } from 'react';
import { StickyNote } from 'lucide-react';
import type { NoteContent } from '@/types/canvas';

interface NoteBlockProps {
  content: NoteContent;
  onUpdate?: (content: NoteContent) => void;
}

export function NoteBlock({ content, onUpdate }: NoteBlockProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(content.text);

  function handleBlur() {
    setEditing(false);
    if (text !== content.text) {
      onUpdate?.({ ...content, text });
    }
  }

  return (
    <div
      className="p-3 rounded-lg"
      style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <StickyNote size={12} style={{ color: '#eab308' }} />
        <span className="text-xs font-medium" style={{ color: '#eab308' }}>
          Note
        </span>
      </div>
      {editing ? (
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          className="w-full text-sm bg-transparent outline-none resize-none"
          style={{ color: 'var(--foreground)', minHeight: '60px' }}
          rows={3}
        />
      ) : (
        <p
          className="text-sm leading-relaxed cursor-text"
          style={{ color: 'var(--foreground)' }}
          onClick={() => setEditing(true)}
        >
          {text || <span style={{ color: 'var(--muted-fg)' }}>Click to add a note...</span>}
        </p>
      )}
    </div>
  );
}
