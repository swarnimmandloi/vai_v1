'use client';

import { ReactFlowProvider } from '@xyflow/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useAIResponse } from '@/hooks/useAIResponse';
import { useCanvasFiles } from '@/hooks/useCanvasFiles';
import { useCanvasStore } from '@/store/canvasStore';
import { useChatStore } from '@/store/chatStore';
import { CanvasView } from '@/components/canvas/CanvasView';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { FirstVisitOverlay } from '@/components/first-visit/FirstVisitOverlay';
import { normalizeCardGraph } from '@/lib/ai/normalize';
import { layoutHierarchy } from '@/lib/canvas/layoutHierarchy';
import { generateId } from '@/lib/utils';
import type { RecentCanvas } from '@/lib/recentCanvases';

function DemoInner() {
  const { hasSubmittedFirstQuestion, setFirstVisitComplete } = useUIStore();
  const { submit } = useAIResponse();
  const { addResponseGraph, setSelectedFrame } = useCanvasStore();
  const { commitAIMessage } = useChatStore();
  useCanvasFiles();

  async function handleFirstQuestion(question: string) {
    setFirstVisitComplete();
    await submit(question);
  }

  // Load all canvas JSON files and show them side by side
  async function handleLoadAllFiles() {
    try {
      const res = await fetch('/api/canvas-files');
      if (!res.ok) return;
      const files: Array<{ filename: string; content: Record<string, unknown> }> = await res.json();
      if (!files.length) return;

      setFirstVisitComplete();

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      let xOffset = 0;

      for (const { content } of files) {
        const normalized = normalizeCardGraph(content);
        const responseId = generateId();

        // Prefix all IDs with responseId so multiple files with the same
        // card IDs (c1, c2, sec1…) don't collide in the React Flow node store
        const p = responseId;
        const sections = normalized.sections.map((s) => ({ ...s, id: `${p}-${s.id}` }));
        const cards = normalized.cards.map((c) => ({
          ...c,
          id: `${p}-${c.id}`,
          section: c.section ? `${p}-${c.section}` : undefined,
        }));
        const connections = normalized.connections.map((conn) => ({
          ...conn,
          from: `${p}-${conn.from}`,
          to: `${p}-${conn.to}`,
        }));

        const { positionedSections, positionedCards, responseWidth, responseHeight } =
          layoutHierarchy(responseId, sections, cards, connections, undefined, isMobile ? 'TB' : 'LR');

        addResponseGraph(responseId, normalized.topic, positionedSections, positionedCards, connections, { x: xOffset, y: 80 }, responseWidth, responseHeight);
        commitAIMessage(normalized.chat_summary, responseId);
        xOffset += responseWidth + 100;
      }

      setTimeout(() => window.dispatchEvent(new CustomEvent('vai:fit-view')), 700);
    } catch {}
  }

  // Load a single AI session from localStorage
  function handleOpenRecent(canvas: RecentCanvas) {
    setFirstVisitComplete();

    const responseId = generateId();
    const { data } = canvas;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const { positionedSections, positionedCards, responseWidth, responseHeight } =
      layoutHierarchy(responseId, data.sections ?? [], data.cards, data.connections ?? [], undefined, isMobile ? 'TB' : 'LR');

    addResponseGraph(responseId, data.topic, positionedSections, positionedCards, data.connections ?? [], { x: 0, y: 0 }, responseWidth, responseHeight);
    setSelectedFrame(responseId);
    commitAIMessage(data.chat_summary, responseId);

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('vai:focus-frame', { detail: { frameId: responseId } }));
    }, 100);
  }

  return (
    <div className="relative flex h-full" style={{ background: 'var(--background)' }}>
      <AnimatePresence>
        {!hasSubmittedFirstQuestion && (
          <FirstVisitOverlay
            onSubmit={handleFirstQuestion}
            onOpenRecent={handleOpenRecent}
            onLoadAllFiles={handleLoadAllFiles}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="flex flex-1 min-w-0 h-full"
        initial={false}
        animate={{ opacity: hasSubmittedFirstQuestion ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex-1 min-w-0 h-full">
          <CanvasView canvasId="demo" />
        </div>
        <ChatPanel onSubmit={submit} />
      </motion.div>
    </div>
  );
}

export default function DemoPage() {
  return (
    <ReactFlowProvider>
      <DemoInner />
    </ReactFlowProvider>
  );
}
