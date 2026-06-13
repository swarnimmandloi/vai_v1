'use client';

import { Fragment, memo, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useCanvasStore } from '@/store/canvasStore';
import type { MarkdownNodeData } from '@/store/canvasStore';

type Direction = 'top' | 'right' | 'bottom' | 'left';

const DOT_POSITIONS: Record<Direction, React.CSSProperties> = {
  top:    { top: -8,    left: '50%', transform: 'translateX(-50%)' },
  right:  { right: -8,  top: '50%',  transform: 'translateY(-50%)' },
  bottom: { bottom: -8, left: '50%', transform: 'translateX(-50%)' },
  left:   { left: -8,   top: '50%',  transform: 'translateY(-50%)' },
};

const HANDLE_POSITION: Record<Direction, Position> = {
  top:    Position.Top,
  right:  Position.Right,
  bottom: Position.Bottom,
  left:   Position.Left,
};

const HIDDEN_HANDLE_STYLE: React.CSSProperties = {
  width: 1,
  height: 1,
  minWidth: 0,
  minHeight: 0,
  background: 'transparent',
  border: 'none',
  opacity: 0,
  pointerEvents: 'none',
};

function stopAll(e: React.SyntheticEvent) {
  e.stopPropagation();
  e.preventDefault();
}

// Markdown component styling — a readable single-column document.
const MD_COMPONENTS = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--foreground)', margin: '4px 0 12px', lineHeight: 1.25 }}>{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 style={{ fontSize: 17, fontWeight: 650, color: 'var(--foreground)', margin: '18px 0 8px', lineHeight: 1.3 }}>{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--foreground)', margin: '14px 0 6px' }}>{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p style={{ margin: '0 0 10px', lineHeight: 1.6 }}>{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ color: 'var(--foreground)', fontWeight: 650 }}>{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => <em style={{ opacity: 0.85 }}>{children}</em>,
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul style={{ margin: '0 0 10px', paddingLeft: 20, listStyleType: 'disc' }}>{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol style={{ margin: '0 0 10px', paddingLeft: 20, listStyleType: 'decimal' }}>{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li style={{ marginBottom: 4, lineHeight: 1.55 }}>{children}</li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote style={{ margin: '0 0 10px', padding: '4px 0 4px 12px', borderLeft: '3px solid rgba(99,102,241,0.5)', color: 'var(--muted-fg)', fontStyle: 'italic' }}>{children}</blockquote>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code style={{ background: 'rgba(99,102,241,0.12)', padding: '1px 5px', borderRadius: 4, fontSize: '0.88em', fontFamily: 'var(--font-mono, monospace)' }}>{children}</code>
  ),
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#a5b4fc', textDecoration: 'underline' }}>{children}</a>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div style={{ overflowX: 'auto', margin: '0 0 10px' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>{children}</table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th style={{ border: '1px solid var(--border)', padding: '5px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--foreground)' }}>{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td style={{ border: '1px solid var(--border)', padding: '5px 8px' }}>{children}</td>
  ),
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '14px 0' }} />,
};

// Parse markdown into sections split on ## headings.
// Content before the first ## becomes a null-heading intro block.
function parseMarkdownSections(markdown: string): Array<{ heading: string | null; content: string }> {
  const parts = markdown.split(/(?=^## )/m);
  return parts
    .map((part) => {
      const match = part.match(/^## (.+)\n?/);
      if (match) {
        return {
          heading: match[1].trim(),
          content: part.replace(/^## .+\n?/, '').trim(),
        };
      }
      return { heading: null, content: part.trim() };
    })
    .filter((s) => s.heading !== null || s.content !== '');
}

// A single interactive section card within the markdown frame.
function SectionCard({
  heading,
  content,
  isLast,
  frameId,
}: {
  heading: string | null;
  content: string;
  isLast: boolean;
  frameId: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [askText, setAskText] = useState('');

  function handlePlusClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    useCanvasStore.getState().setSelectedFrame(frameId);
    setAskOpen(true);
    setAskText('');
  }

  function handleAskSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const question = askText.trim() || heading || '';
    if (!question) return;
    setAskOpen(false);
    setAskText('');
    window.dispatchEvent(new CustomEvent('vai:follow-up', { detail: { question } }));
  }

  function handleAskKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.stopPropagation(); setAskOpen(false); }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        padding: '14px 16px',
        borderBottom: isLast ? 'none' : '1px solid rgba(99,102,241,0.1)',
        background: (hovered || askOpen) && heading ? 'rgba(99,102,241,0.05)' : 'transparent',
        transition: 'background 0.15s',
        borderRadius: isLast ? '0 0 14px 14px' : 0,
      }}
    >
      {heading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: content ? 10 : 0,
          }}
        >
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 650,
              color: 'var(--foreground)',
              lineHeight: 1.35,
              flex: 1,
            }}
          >
            {heading}
          </span>
          {/* Per-section ask button — shown on hover */}
          <div
            onMouseDown={stopAll}
            onPointerDown={stopAll}
            onClick={handlePlusClick}
            title={`Ask about "${heading}"`}
            style={{
              flexShrink: 0,
              width: 20,
              height: 20,
              borderRadius: 5,
              background: 'rgba(99,102,241,0.22)',
              border: '1px solid rgba(99,102,241,0.3)',
              cursor: 'pointer',
              display: hovered || askOpen ? 'flex' : 'none',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
              fontSize: 14,
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            +
          </div>
        </div>
      )}

      {/* Inline ask input — appears right under the heading when + is clicked */}
      {askOpen && (
        <form
          onSubmit={handleAskSubmit}
          onMouseDown={stopAll}
          onPointerDown={stopAll}
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            gap: 6,
            marginBottom: content ? 10 : 0,
          }}
        >
          <input
            autoFocus
            value={askText}
            onChange={(e) => setAskText(e.target.value)}
            onKeyDown={handleAskKeyDown}
            placeholder={`Ask about "${heading}"…`}
            style={{
              flex: 1,
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.35)',
              borderRadius: 7,
              padding: '5px 9px',
              fontSize: 12,
              color: 'var(--foreground)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              flexShrink: 0,
              padding: '5px 10px',
              borderRadius: 7,
              background: askText.trim() ? '#6366f1' : 'rgba(99,102,241,0.25)',
              border: 'none',
              color: '#fff',
              fontSize: 12,
              cursor: askText.trim() ? 'pointer' : 'default',
              transition: 'background 0.15s',
            }}
          >
            →
          </button>
        </form>
      )}

      {content && (
        <div style={{ fontSize: 13, color: 'var(--muted-fg)' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export const MarkdownNode = memo(function MarkdownNode({
  data,
  id,
  selected,
}: NodeProps<Node<MarkdownNodeData>>) {
  const { topic, markdown } = data;
  const [isHovered, setIsHovered] = useState(false);
  const setSelectedFrame = useCanvasStore((s) => s.setSelectedFrame);

  const sections = parseMarkdownSections(markdown);

  function handleDotClick(e: React.MouseEvent, direction: Direction) {
    e.stopPropagation();
    e.preventDefault();
    const { nodes, setSelectedFrame: sel, setPendingExpansionPosition, setPendingResponseDot } = useCanvasStore.getState();
    const node = nodes.find((n) => n.id === id);
    if (!node) return;

    const w = (node.style?.width as number) ?? 560;
    const h = (node.measured?.height as number) ?? (node.style?.height as number) ?? 500;
    const GAP = 160;

    const positions: Record<Direction, { x: number; y: number }> = {
      right:  { x: node.position.x + w + GAP, y: node.position.y },
      left:   { x: node.position.x - w - GAP, y: node.position.y },
      bottom: { x: node.position.x,           y: node.position.y + h + GAP },
      top:    { x: node.position.x,           y: node.position.y - h - GAP },
    };

    sel(id);
    setPendingExpansionPosition({ ...positions[direction], direction });
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
      {/* Invisible edge anchor handles so branch edges have something to attach to */}
      {(['top', 'right', 'bottom', 'left'] as Direction[]).map((dir) => {
        const pos = HANDLE_POSITION[dir];
        return (
          <Fragment key={`h-${dir}`}>
            <Handle type="target" id={`t-${dir}`} position={pos} isConnectable={false} style={HIDDEN_HANDLE_STYLE} />
            <Handle type="source" id={`s-${dir}`} position={pos} isConnectable={false} style={HIDDEN_HANDLE_STYLE} />
          </Fragment>
        );
      })}

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
        />
      ))}

      {/* Main content box */}
      <div
        style={{
          width: '100%',
          background: 'rgba(15,23,42,0.7)',
          border: selected ? '2px solid rgba(99,102,241,0.7)' : '1.5px solid rgba(99,102,241,0.2)',
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
        {/* Header: topic label + whole-frame ask button */}
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
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: selected ? '#6366f1' : '#6366f180', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: selected ? '#a5b4fc' : '#64748b', letterSpacing: '0.02em' }}>
            {topic}
          </span>
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

        {/* Sectioned document body */}
        <div className="markdown-body">
          {sections.map((section, i) => (
            <SectionCard
              key={i}
              heading={section.heading}
              content={section.content}
              isLast={i === sections.length - 1}
              frameId={id}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
