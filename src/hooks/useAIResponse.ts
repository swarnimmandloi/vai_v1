'use client';

import { useCallback } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { useChatStore } from '@/store/chatStore';
import { useUIStore } from '@/store/uiStore';
import { useCanvasContext } from './useCanvasContext';
import type { Frame, Block } from '@/types/canvas';
import type { AIFrameResponseType } from '@/lib/ai/schema';
import { generateId } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export function useAIResponse() {
  const { getCanvasSummary, getThreadHistory, selectedFrameId } = useCanvasContext();
  const { addFrame, addLoadingNode, removeLoadingNode, getNextFramePosition, canvasId } = useCanvasStore();
  const { addUserMessage, setStreaming, setStreamingText, commitAIMessage, clearStreaming } = useChatStore();
  const { setFirstVisitComplete } = useUIStore();

  const submit = useCallback(
    async (question: string) => {
      if (!question.trim()) return;

      // Mark first visit as complete
      setFirstVisitComplete();

      // Add user message to chat
      addUserMessage(question);

      // Generate a temp ID for loading node
      const tempId = `loading-${generateId()}`;
      const position = getNextFramePosition(selectedFrameId ?? undefined);

      // Show loading node on canvas immediately
      addLoadingNode(tempId, position);
      setStreaming(true, tempId);

      // Build context
      const canvasContext = getCanvasSummary();
      const threadHistory = getThreadHistory();
      const selectedFrameTitle = selectedFrameId
        ? (useCanvasStore.getState().nodes.find((n) => n.id === selectedFrameId)
            ?.data as { frame: Frame } | undefined)?.frame?.title ?? null
        : null;

      try {
        const response = await fetch('/api/ai/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            canvasContext,
            threadHistory,
            selectedFrameId,
            selectedFrameTitle,
          }),
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        // Stream the response text
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullText += decoder.decode(value, { stream: true });
          }
        }

        // Parse the JSON response
        const parsed: AIFrameResponseType = JSON.parse(fullText);

        // Build the frame object
        const frameId = generateId();
        const threadId = selectedFrameId
          ? (() => {
              const parentNode = useCanvasStore.getState().nodes.find(
                (n) => n.id === selectedFrameId
              );
              return (parentNode?.data as { frame: Frame } | undefined)?.frame?.thread_id ?? generateId();
            })()
          : generateId();

        const blocks: Block[] = parsed.frame.blocks.map((b, i) => ({
          id: generateId(),
          frame_id: frameId,
          block_type: b.block_type,
          order_index: i,
          content: b.content as Block['content'],
        }));

        const frame: Frame = {
          id: frameId,
          canvas_id: canvasId ?? '',
          title: parsed.frame.title,
          position,
          width: 380,
          layout_type: parsed.frame.layout_type,
          parent_id: selectedFrameId,
          thread_id: threadId,
          blocks,
        };

        // Remove loading node, add real frame
        removeLoadingNode(tempId);
        addFrame(frame, selectedFrameId ?? undefined);

        // Commit AI message to chat
        commitAIMessage(parsed.chat_summary, frameId);

        // Persist to Supabase in background (skip if not configured / demo mode)
        const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (canvasId && supabaseConfigured) {
          persistFrame(frame, canvasId).catch(console.error);
        }

        // Notify canvas to focus new frame
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('vai:focus-frame', { detail: { frameId } })
          );
        }, 100);
      } catch (err) {
        console.error('AI response error:', err);
        removeLoadingNode(tempId);
        clearStreaming();
        commitAIMessage(
          'Something went wrong. Please try again.',
          ''
        );
      }
    },
    [
      selectedFrameId,
      canvasId,
      getCanvasSummary,
      getThreadHistory,
      addUserMessage,
      setStreaming,
      setStreamingText,
      commitAIMessage,
      clearStreaming,
      addFrame,
      addLoadingNode,
      removeLoadingNode,
      getNextFramePosition,
      setFirstVisitComplete,
    ]
  );

  return { submit };
}

async function persistFrame(frame: Frame, canvasId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  const supabase = createClient();

  const { error: frameError } = await supabase.from('frames').insert({
    id: frame.id,
    canvas_id: canvasId,
    title: frame.title,
    position_x: frame.position.x,
    position_y: frame.position.y,
    width: frame.width,
    layout_type: frame.layout_type,
    parent_id: frame.parent_id,
    thread_id: frame.thread_id,
  });

  if (frameError) {
    console.error('Failed to persist frame:', frameError);
    return;
  }

  if (frame.blocks.length > 0) {
    await supabase.from('blocks').insert(
      frame.blocks.map((b) => ({
        id: b.id,
        frame_id: frame.id,
        block_type: b.block_type,
        order_index: b.order_index,
        content: b.content,
      }))
    );
  }
}
