'use client';

import { useEffect, useRef, useState, useId } from 'react';
import type { DiagramContent } from '@/types/canvas';

interface DiagramBlockProps {
  content: DiagramContent;
  frameId: string;
}

interface Popup {
  label: string;
  x: number;
  y: number;
}

const NODE_SELECTORS: Record<string, string> = {
  flowchart: '.node',
  sequenceDiagram: '.actor',
  classDiagram: '.classGroup',
  'stateDiagram-v2': '.stateGroup, .node',
  erDiagram: '.er.entityBox',
};

const LABEL_SELECTORS: Record<string, string[]> = {
  flowchart: ['.nodeLabel', 'foreignObject div', 'text'],
  sequenceDiagram: ['text'],
  classDiagram: ['.classTitle text', 'text'],
  'stateDiagram-v2': ['.stateTitle', 'text'],
  erDiagram: ['.er.entityLabel', 'text'],
};

function extractLabel(el: Element, diagramType: string): string {
  const candidates = LABEL_SELECTORS[diagramType] ?? ['text'];
  for (const sel of candidates) {
    const found = el.querySelector(sel);
    if (found?.textContent?.trim()) return found.textContent.trim();
  }
  return el.textContent?.trim() ?? '';
}

let mermaidInitialized = false;

async function getMermaid() {
  const mermaid = (await import('mermaid')).default;
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#6366f1',
        primaryTextColor: '#e2e8f0',
        primaryBorderColor: '#6366f1',
        lineColor: '#94a3b8',
        secondaryColor: '#1e1b4b',
        tertiaryColor: '#312e81',
        background: '#0f172a',
        mainBkg: '#1e293b',
        nodeBorder: '#6366f1',
        clusterBkg: '#1e293b',
        titleColor: '#e2e8f0',
        edgeLabelBackground: '#1e293b',
        actorBkg: '#1e293b',
        actorBorder: '#6366f1',
        actorTextColor: '#e2e8f0',
        actorLineColor: '#94a3b8',
        signalColor: '#94a3b8',
        signalTextColor: '#e2e8f0',
        labelBoxBkgColor: '#1e293b',
        labelBoxBorderColor: '#6366f1',
        labelTextColor: '#e2e8f0',
        loopTextColor: '#e2e8f0',
      },
      securityLevel: 'loose',
    });
    mermaidInitialized = true;
  }
  return mermaid;
}

export function DiagramBlock({ content, frameId }: DiagramBlockProps) {
  const { diagram_type, definition, caption } = content;
  const containerRef = useRef<HTMLDivElement>(null);
  const rawId = useId();
  const baseId = 'mmd' + rawId.replace(/[^a-zA-Z0-9]/g, '');
  const renderCount = useRef(0);
  const [popup, setPopup] = useState<Popup | null>(null);
  const [popupInput, setPopupInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !definition) return;
    const container = containerRef.current;
    container.innerHTML = '';
    setError(null);
    setPopup(null);
    let cancelled = false;
    const renderId = `${baseId}-${++renderCount.current}`;

    async function render() {
      try {
        const mermaid = await getMermaid();
        if (cancelled) return;
        const { svg } = await mermaid.render(renderId, definition);
        if (cancelled || !container) return;
        container.innerHTML = svg;

        const selector = NODE_SELECTORS[diagram_type] ?? '.node';
        container.querySelectorAll(selector).forEach((node) => {
          (node as HTMLElement).style.cursor = 'pointer';
          (node as HTMLElement).style.transition = 'opacity 0.15s';
          node.addEventListener('mouseenter', () => { (node as HTMLElement).style.opacity = '0.75'; });
          node.addEventListener('mouseleave', () => { (node as HTMLElement).style.opacity = '1'; });
          node.addEventListener('click', (e) => {
            e.stopPropagation();
            const label = extractLabel(node, diagram_type);
            if (!label) return;
            const rect = (node as HTMLElement).getBoundingClientRect();
            setPopup({ label, x: rect.left + rect.width / 2, y: rect.bottom + 8 });
            setPopupInput(`Tell me more about ${label}`);
          });
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    }

    render();
    return () => { cancelled = true; };
  }, [definition, diagram_type, baseId]);

  function handlePopupSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!popupInput.trim()) return;
    window.dispatchEvent(
      new CustomEvent('vai:follow-up', { detail: { question: popupInput, frameId } })
    );
    setPopup(null);
    setPopupInput('');
  }

  return (
    <div className="diagram-block">
      <div
        ref={containerRef}
        className="overflow-x-auto"
        style={{ maxWidth: '100%' }}
      />

      {error && (
        <div className="mt-2">
          <p className="text-xs mb-1" style={{ color: '#fca5a5' }}>Invalid diagram syntax:</p>
          <pre
            className="text-xs p-3 rounded overflow-x-auto whitespace-pre-wrap"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            {definition}
          </pre>
        </div>
      )}

      {caption && !error && (
        <p className="text-xs mt-2 text-center" style={{ color: 'var(--muted-fg)' }}>
          {caption}
        </p>
      )}

      {popup && (
        <div
          className="fixed z-[9999] rounded-xl shadow-2xl p-4"
          style={{
            left: Math.max(8, Math.min(popup.x - 144, (typeof window !== 'undefined' ? window.innerWidth : 800) - 304)),
            top: popup.y,
            width: 288,
            background: 'var(--panel-bg)',
            border: '1.5px solid var(--accent)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className="absolute top-2 right-2 p-1 rounded cursor-pointer"
            style={{ color: 'var(--muted-fg)' }}
            onClick={() => setPopup(null)}
            onMouseDown={(e) => e.stopPropagation()}
          >
            ✕
          </button>
          <p className="text-xs font-semibold mb-2 pr-5 truncate" style={{ color: 'var(--accent-hover)' }}>
            Ask about: {popup.label}
          </p>
          <form onSubmit={handlePopupSubmit} className="flex gap-2">
            <input
              autoFocus
              value={popupInput}
              onChange={(e) => setPopupInput(e.target.value)}
              className="flex-1 text-xs rounded-lg px-3 py-2 outline-none min-w-0"
              style={{ background: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
            />
            <button
              type="submit"
              className="text-xs px-3 py-2 rounded-lg cursor-pointer shrink-0"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              Ask
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
