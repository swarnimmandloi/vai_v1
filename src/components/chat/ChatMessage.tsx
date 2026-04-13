'use client';

import { ExternalLink } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/types/ai';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  function handleFocusFrame() {
    if (message.frame_id) {
      window.dispatchEvent(
        new CustomEvent('vai:focus-frame', { detail: { frameId: message.frame_id } })
      );
    }
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className="max-w-[88%] rounded-xl px-3 py-2.5"
        style={{
          background: isUser ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
          border: isUser ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>
          {message.content}
        </p>
        {!isUser && message.frame_id && (
          <button
            onClick={handleFocusFrame}
            className="flex items-center gap-1 mt-1.5 text-xs cursor-pointer transition-opacity hover:opacity-80"
            style={{ color: 'var(--accent-hover)' }}
          >
            <ExternalLink size={10} />
            <span>View on canvas</span>
          </button>
        )}
      </div>
    </div>
  );
}
