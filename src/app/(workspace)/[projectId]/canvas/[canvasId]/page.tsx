'use client';

import { use, useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useCanvasStore } from '@/store/canvasStore';
import { useAIResponse } from '@/hooks/useAIResponse';
import { CanvasView } from '@/components/canvas/CanvasView';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { FirstVisitOverlay } from '@/components/first-visit/FirstVisitOverlay';
import { useChatStore } from '@/store/chatStore';
import { normalizeCardGraph } from '@/lib/ai/normalize';
import { layoutHierarchy } from '@/lib/canvas/layoutHierarchy';

interface PageProps {
  params: Promise<{ projectId: string; canvasId: string }>;
}

function CanvasPageInner({ canvasId }: { canvasId: string }) {
  const { hasSubmittedFirstQuestion, setFirstVisitComplete } = useUIStore();
  const { addResponseGraph, clearCanvas } = useCanvasStore();
  const { commitAIMessage } = useChatStore();
  const { submit } = useAIResponse();
  const [loaded, setLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileCanvasOpen, setMobileCanvasOpen] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    function handleFocusFrame() {
      if (window.innerWidth < 768) setMobileCanvasOpen(true);
    }
    window.addEventListener('vai:focus-frame', handleFocusFrame);
    return () => window.removeEventListener('vai:focus-frame', handleFocusFrame);
  }, []);

  useEffect(() => {
    clearCanvas();
    loadCanvasData();
  }, [canvasId]);

  async function loadCanvasData() {
    const res = await fetch(`/api/files?canvasId=${canvasId}`);
    const { files } = res.ok ? await res.json() : { files: [] };

    if (files && files.length > 0) {
      const isMobile = window.innerWidth < 768;
      for (const file of files) {
        const normalized = normalizeCardGraph(file.content);
        const { positionedSections, positionedCards, responseWidth, responseHeight } =
          layoutHierarchy(file.id, normalized.sections, normalized.cards, normalized.connections ?? [], undefined, isMobile ? 'TB' : 'LR');
        addResponseGraph(
          file.id,
          normalized.topic,
          positionedSections,
          positionedCards,
          normalized.connections ?? [],
          { x: file.position_x, y: file.position_y },
          responseWidth,
          responseHeight
        );
        commitAIMessage(normalized.chat_summary ?? '', file.id);
      }
      setFirstVisitComplete();
    }

    setLoaded(true);
  }

  async function handleFirstQuestion(question: string) {
    setFirstVisitComplete();
    await submit(question);
  }

  return (
    <div className="relative h-full">
      {/* First-visit overlay */}
      <AnimatePresence>
        {!hasSubmittedFirstQuestion && loaded && (
          <FirstVisitOverlay onSubmit={handleFirstQuestion} />
        )}
      </AnimatePresence>

      {/* Canvas + Chat layout */}
      <motion.div
        className="h-full"
        style={{ display: isMobile ? 'block' : 'flex' }}
        initial={false}
        animate={{ opacity: hasSubmittedFirstQuestion ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Canvas — absolute overlay on mobile, flex child on desktop */}
        <div
          className={
            isMobile
              ? mobileCanvasOpen
                ? 'absolute inset-0 z-10 h-full'
                : 'hidden'
              : 'flex-1 min-w-0 h-full'
          }
        >
          {isMobile && mobileCanvasOpen && (
            <button
              onClick={() => setMobileCanvasOpen(false)}
              className="absolute top-3 left-3 z-20 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            >
              <ChevronLeft size={14} />
              Back
            </button>
          )}
          <CanvasView canvasId={canvasId} />
        </div>

        {/* Chat panel — full width on mobile, fixed width on desktop */}
        <div
          className={
            isMobile && mobileCanvasOpen
              ? 'hidden'
              : isMobile
              ? 'w-full h-full'
              : ''
          }
        >
          <ChatPanel onSubmit={submit} isMobile={isMobile} />
        </div>
      </motion.div>
    </div>
  );
}

export default function CanvasPage({ params }: PageProps) {
  const { canvasId } = use(params);

  return (
    <ReactFlowProvider>
      <CanvasPageInner canvasId={canvasId} />
    </ReactFlowProvider>
  );
}
