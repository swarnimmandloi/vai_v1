'use client';

import { useEffect, useRef } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
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

  const fileMap = useRef<Map<string, string>>(new Map());
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

    if (isUpdate && fileMap.current.has(filename)) {
      removeResponseGraph(fileMap.current.get(filename)!);
    }

    const position = isUpdate && fileMap.current.has(filename)
      ? fileMap.current.get(`${filename}:pos`) as unknown as { x: number; y: number } ?? { x: xOffsetRef.current, y: 80 }
      : { x: xOffsetRef.current, y: 80 };

    if (!isUpdate) {
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
    // Dev only: SSE for live file-watching (edit JSON → canvas updates instantly)
    if (process.env.NODE_ENV !== 'development') return;

    const es = new EventSource('/api/canvas-watch');

    es.onmessage = (e) => {
      const event: FileEvent = JSON.parse(e.data);
      if (!event.filename.endsWith('.json')) return;
      renderFile({ filename: event.filename, content: event.content, isUpdate: event.type === 'file_change' });
    };

    es.onerror = () => es.close();

    return () => es.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
