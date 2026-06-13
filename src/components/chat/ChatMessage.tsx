'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage as ChatMessageType } from '@/types/ai';

interface ChatMessageProps {
  message: ChatMessageType;
}

const MD_COMPONENTS = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p style={{ margin: '0 0 8px', lineHeight: 1.65, color: 'var(--foreground)' }}>{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ color: 'var(--foreground)', fontWeight: 650 }}>{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em style={{ opacity: 0.85 }}>{children}</em>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', margin: '4px 0 8px' }}>{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--foreground)', margin: '10px 0 6px' }}>{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', margin: '8px 0 4px' }}>{children}</h3>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul style={{ margin: '0 0 8px', paddingLeft: 18, listStyleType: 'disc' }}>{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol style={{ margin: '0 0 8px', paddingLeft: 18, listStyleType: 'decimal' }}>{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li style={{ marginBottom: 3, lineHeight: 1.6, color: 'var(--foreground)' }}>{children}</li>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code style={{ background: 'rgba(99,102,241,0.12)', padding: '1px 5px', borderRadius: 4, fontSize: '0.88em', fontFamily: 'var(--font-mono, monospace)' }}>{children}</code>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote style={{ margin: '0 0 8px', padding: '3px 0 3px 10px', borderLeft: '2px solid rgba(99,102,241,0.4)', color: 'var(--muted-fg)', fontStyle: 'italic' }}>{children}</blockquote>
  ),
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#a5b4fc', textDecoration: 'underline' }}>{children}</a>
  ),
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  function handleFocusFrame() {
    if (message.frame_id) {
      window.dispatchEvent(
        new CustomEvent('vai:focus-frame', { detail: { frameId: message.frame_id } })
      );
    }
  }

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div
          className="max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed"
          style={{
            background: 'rgba(99,102,241,0.18)',
            border: '1px solid rgba(99,102,241,0.28)',
            color: 'var(--foreground)',
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-5 px-1">
      <div className="max-w-[92%] text-xs" style={{ color: 'var(--foreground)' }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
          {message.content}
        </ReactMarkdown>
        {message.frame_id && (
          <button
            onClick={handleFocusFrame}
            className="mt-1 cursor-pointer transition-opacity hover:opacity-70"
            style={{ color: '#818cf8', fontSize: 11, background: 'none', border: 'none', padding: 0 }}
          >
            View on canvas →
          </button>
        )}
      </div>
    </div>
  );
}
