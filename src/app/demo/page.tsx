'use client';

import { ReactFlowProvider } from '@xyflow/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useAIResponse } from '@/hooks/useAIResponse';
import { CanvasView } from '@/components/canvas/CanvasView';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { FirstVisitOverlay } from '@/components/first-visit/FirstVisitOverlay';

function DemoInner() {
  const { hasSubmittedFirstQuestion, setFirstVisitComplete } = useUIStore();
  const { submit } = useAIResponse();

  async function handleFirstQuestion(question: string) {
    setFirstVisitComplete();
    await submit(question);
  }

  return (
    <div className="relative flex h-full" style={{ background: 'var(--background)' }}>
      {/* First-visit overlay */}
      <AnimatePresence>
        {!hasSubmittedFirstQuestion && (
          <FirstVisitOverlay onSubmit={handleFirstQuestion} />
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
