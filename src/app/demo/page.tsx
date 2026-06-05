'use client';

import { ReactFlowProvider } from '@xyflow/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useAIResponse } from '@/hooks/useAIResponse';
import { useCanvasStore } from '@/store/canvasStore';
import { useChatStore } from '@/store/chatStore';
import { CanvasView } from '@/components/canvas/CanvasView';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { FirstVisitOverlay } from '@/components/first-visit/FirstVisitOverlay';
import { layoutHierarchy } from '@/lib/canvas/layoutHierarchy';
import { generateId } from '@/lib/utils';
import type { RecentCanvas } from '@/lib/recentCanvases';

function DemoInner() {
  const { hasSubmittedFirstQuestion, setFirstVisitComplete } = useUIStore();
  const { submit } = useAIResponse();
  const { addResponseGraph, setSelectedFrame } = useCanvasStore();
  const { commitAIMessage } = useChatStore();

  async function handleFirstQuestion(question: string) {
    setFirstVisitComplete();
    await submit(question);
  }

  function handleOpenRecent(canvas: RecentCanvas) {
    setFirstVisitComplete();

    const responseId = generateId();
    const { data } = canvas;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const { positionedSections, positionedCards, responseWidth, responseHeight } =
      layoutHierarchy(
        responseId,
        data.sections ?? [],
        data.cards,
        data.connections ?? [],
        undefined,
        isMobile ? 'TB' : 'LR'
      );

    addResponseGraph(
      responseId,
      data.topic,
      positionedSections,
      positionedCards,
      data.connections ?? [],
      { x: 0, y: 0 },
      responseWidth,
      responseHeight
    );

    setSelectedFrame(responseId);
    commitAIMessage(data.chat_summary, responseId);

    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('vai:focus-frame', { detail: { frameId: responseId } })
      );
    }, 100);
  }

  return (
    <div className="relative flex h-full" style={{ background: 'var(--background)' }}>
      {/* First-visit overlay */}
      <AnimatePresence>
        {!hasSubmittedFirstQuestion && (
          <FirstVisitOverlay
            onSubmit={handleFirstQuestion}
            onOpenRecent={handleOpenRecent}
          />
        )}
      </AnimatePresence>

      {/* Canvas + Chat */}
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
