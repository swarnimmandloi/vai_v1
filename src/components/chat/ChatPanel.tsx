'use client';

import { useEffect, useRef } from 'react';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useUIStore } from '@/store/uiStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface ChatPanelProps {
  onSubmit: (question: string) => void;
}

export function ChatPanel({ onSubmit }: ChatPanelProps) {
  const { messages, isStreaming, streamingText } = useChatStore();
  const { chatPanelOpen, toggleChatPanel } = useUIStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  return (
    <div
      className="flex flex-col h-full shrink-0 transition-all duration-200"
      style={{
        width: chatPanelOpen ? 300 : 40,
        background: 'var(--panel-bg)',
        borderLeft: '1px solid var(--border)',
      }}
    >
      {/* Toggle button */}
      <button
        onClick={toggleChatPanel}
        className="flex items-center gap-2 px-3 py-3 border-b w-full text-left transition-colors cursor-pointer"
        style={{ borderColor: 'var(--border)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
      >
        <MessageSquare size={14} style={{ color: 'var(--muted-fg)', flexShrink: 0 }} />
        {chatPanelOpen && (
          <span className="text-xs font-medium flex-1" style={{ color: 'var(--foreground)' }}>
            Chat
          </span>
        )}
        <ChevronRight
          size={13}
          className="transition-transform duration-200 shrink-0"
          style={{
            color: 'var(--muted-fg)',
            transform: chatPanelOpen ? 'rotate(0deg)' : 'rotate(180deg)',
          }}
        />
      </button>

      {chatPanelOpen && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3">
            {messages.length === 0 && !isStreaming && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <MessageSquare size={24} className="mb-3 opacity-20" style={{ color: 'var(--muted-fg)' }} />
                <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                  Your conversation will appear here. Ask a question to get started.
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {/* Streaming indicator */}
            {isStreaming && streamingText && (
              <div className="flex justify-start mb-3">
                <div
                  className="max-w-[88%] rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>
                    {streamingText}
                    <span className="inline-block w-1 h-3 ml-0.5 rounded-sm animate-pulse" style={{ background: 'var(--accent)' }} />
                  </p>
                </div>
              </div>
            )}
            {isStreaming && !streamingText && (
              <div className="flex gap-1 px-2 mb-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: 'var(--muted-fg)', animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <ChatInput onSubmit={onSubmit} isLoading={isStreaming} />
        </>
      )}
    </div>
  );
}
