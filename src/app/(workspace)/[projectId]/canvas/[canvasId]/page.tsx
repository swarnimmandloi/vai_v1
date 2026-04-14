'use client';

import { use, useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useCanvasStore } from '@/store/canvasStore';
import { useAIResponse } from '@/hooks/useAIResponse';
import { CanvasView } from '@/components/canvas/CanvasView';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { FirstVisitOverlay } from '@/components/first-visit/FirstVisitOverlay';
import { createClient } from '@/lib/supabase/client';
import type { Frame, Block } from '@/types/canvas';

interface PageProps {
  params: Promise<{ projectId: string; canvasId: string }>;
}

function CanvasPageInner({ canvasId }: { canvasId: string }) {
  const { hasSubmittedFirstQuestion, setFirstVisitComplete } = useUIStore();
  const { loadFrames, clearCanvas } = useCanvasStore();
  const { submit } = useAIResponse();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    clearCanvas();
    loadCanvasData();
  }, [canvasId]);

  async function loadCanvasData() {
    const supabase = createClient();
    const { data: frames } = await supabase
      .from('frames')
      .select('*, blocks(*)')
      .eq('canvas_id', canvasId)
      .order('created_at', { ascending: true });

    const { data: connections } = await supabase
      .from('connections')
      .select('*')
      .eq('canvas_id', canvasId);

    if (frames && frames.length > 0) {
      const mappedFrames: Frame[] = frames.map((f) => ({
        id: f.id,
        canvas_id: f.canvas_id,
        title: f.title,
        position: { x: f.position_x, y: f.position_y },
        width: f.width,
        layout_type: f.layout_type,
        parent_id: f.parent_id,
        thread_id: f.thread_id,
        blocks: (f.blocks ?? [])
          .sort((a: Block, b: Block) => a.order_index - b.order_index)
          .map((b: Block) => ({
            id: b.id,
            frame_id: b.frame_id,
            block_type: b.block_type,
            order_index: b.order_index,
            content: b.content,
          })),
      }));

      loadFrames(mappedFrames, connections ?? []);
      // If there are existing frames, skip first visit
      setFirstVisitComplete();
    }

    setLoaded(true);
  }

  async function handleFirstQuestion(question: string) {
    setFirstVisitComplete();
    await submit(question);
  }

  return (
    <div className="relative flex h-full">
      {/* First-visit overlay */}
      <AnimatePresence>
        {!hasSubmittedFirstQuestion && loaded && (
          <FirstVisitOverlay onSubmit={handleFirstQuestion} />
        )}
      </AnimatePresence>

      {/* Canvas + Chat layout */}
      <motion.div
        className="flex flex-1 min-w-0 h-full"
        initial={false}
        animate={{ opacity: hasSubmittedFirstQuestion ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Canvas */}
        <div className="flex-1 min-w-0 h-full">
          <CanvasView canvasId={canvasId} />
        </div>

        {/* Chat panel */}
        <ChatPanel onSubmit={submit} />
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
