'use client';

import { useEffect, useRef } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { useUIStore } from '@/store/uiStore';
import { normalizeCardGraph } from '@/lib/ai/normalize';
import { layoutHierarchy } from '@/lib/canvas/layoutHierarchy';
import { generateId } from '@/lib/utils';

type FileEvent = {
  type: 'file_load' | 'file_add' | 'file_change';
  filename: string;
  content: Record<string, unknown>;
};

export function useCanvasFiles() {
  const { addResponseGraph, removeResponseGraph } = useCanvasStore();
  const { setFirstVisitComplete } = useUIStore();

  // Map filename → responseId so changes replace rather than duplicate
  const fileMap = useRef<Map<string, string>>(new Map());
  // Track cumulative x offset for initial left→right placement
  const xOffsetRef = useRef(80);

  function renderFile({ filename, content, isUpdate }: { filename: string; content: Record<string, unknown>; isUpdate: boolean }) {
    const normalized = normalizeCardGraph(content);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const responseId = isUpdate
      ? (fileMap.current.get(filename) ?? generateId())
      : generateId();

    const { positionedSections, positionedCards, responseWidth, responseHeight } =
      layoutHierarchy(
        responseId,
        normalized.sections,
        normalized.cards,
        normalized.connections,
        undefined,
        isMobile ? 'TB' : 'LR'
      );

    // Remove old graph if this is an update
    if (isUpdate && fileMap.current.has(filename)) {
      removeResponseGraph(fileMap.current.get(filename)!);
    }

    const position = isUpdate && fileMap.current.has(filename)
      ? fileMap.current.get(`${filename}:pos`) as unknown as { x: number; y: number } ?? { x: xOffsetRef.current, y: 80 }
      : { x: xOffsetRef.current, y: 80 };

    if (!isUpdate) {
      // Store position for future updates
      (fileMap.current as unknown as Map<string, unknown>).set(`${filename}:pos`, position);
      xOffsetRef.current += responseWidth + 80;
    }

    fileMap.current.set(filename, responseId);

    addResponseGraph(
      responseId,
      normalized.topic,
      positionedSections,
      positionedCards,
      normalized.connections,
      position,
      responseWidth,
      responseHeight
    );
  }

  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // Dev: use SSE for instant live updates
      const es = new EventSource('/api/canvas-watch');
      let hasFiles = false;

      es.onmessage = (e) => {
        const event: FileEvent = JSON.parse(e.data);
        if (!event.filename.endsWith('.json')) return;

        const isUpdate = event.type === 'file_change';
        renderFile({ filename: event.filename, content: event.content, isUpdate });

        if (!hasFiles) {
          hasFiles = true;
          setFirstVisitComplete();
        }
      };

      es.onerror = () => {
        // SSE failed, fall back to static load
        es.close();
        loadStatic();
      };

      return () => es.close();
    } else {
      // Production (Vercel): load files once on mount
      loadStatic();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStatic() {
    try {
      const res = await fetch('/api/canvas-files');
      if (!res.ok) return;
      const files: Array<{ filename: string; content: Record<string, unknown> }> = await res.json();
      if (files.length === 0) return;

      for (const { filename, content } of files) {
        renderFile({ filename, content, isUpdate: false });
      }
      setFirstVisitComplete();
    } catch {}
  }
}
