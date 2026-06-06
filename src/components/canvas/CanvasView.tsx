'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
  useReactFlow,
  useNodesInitialized,
} from '@xyflow/react';
import { useCanvasStore } from '@/store/canvasStore';
import { FrameNode } from './nodes/FrameNode';
import { FrameLoadingNode } from './nodes/FrameLoadingNode';
import { CardNode } from './nodes/CardNode';
import { SectionNode } from './nodes/SectionNode';
import { ResponseNode } from './nodes/ResponseNode';
import type { CardNodeData, SectionNodeData, ResponseNodeData } from '@/store/canvasStore';
import { layoutHierarchy } from '@/lib/canvas/layoutHierarchy';

const nodeTypes: NodeTypes = {
  frame: FrameNode as NodeTypes['frame'],
  loading: FrameLoadingNode,
  card: CardNode as NodeTypes['card'],
  section: SectionNode as NodeTypes['section'],
  response: ResponseNode as NodeTypes['response'],
};

interface CanvasViewProps {
  canvasId: string;
}

export function CanvasView({ canvasId }: CanvasViewProps) {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    setSelectedFrame, setCanvasId, applyRelayout,
  } = useCanvasStore();

  const { fitView, getNodes, getEdges } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const relaidOutRef = useRef(new Set<string>());

  useEffect(() => {
    setCanvasId(canvasId);
  }, [canvasId, setCanvasId]);

  // Post-render re-layout: re-run dagre with actual measured card heights.
  // We write back into the Zustand store (applyRelayout) so positions persist
  // across renders — calling React Flow's setNodes() doesn't work in controlled mode.
  useEffect(() => {
    if (!nodesInitialized) return;

    const allNodes = getNodes();
    const allEdges = getEdges();

    const newResponses = allNodes.filter(
      (n) => n.type === 'response' && !relaidOutRef.current.has(n.id)
    );
    if (newResponses.length === 0) return;

    const updates: Array<{
      id: string;
      position?: { x: number; y: number };
      style?: Record<string, unknown>;
      parentId?: string;
    }> = [];

    newResponses.forEach((responseNode) => {
      relaidOutRef.current.add(responseNode.id);

      const sectionNodes = allNodes.filter(
        (n) => n.type === 'section' && n.parentId === responseNode.id
      );
      const sectionIdSet = new Set(sectionNodes.map((n) => n.id));
      const cardNodes = allNodes.filter(
        (n) =>
          n.type === 'card' &&
          (n.parentId === responseNode.id || sectionIdSet.has(n.parentId ?? ''))
      );

      // Collect actual measured heights — skip this response if not yet measured
      const measuredHeights = new Map<string, number>();
      cardNodes.forEach((n) => {
        if (n.measured?.height) measuredHeights.set(n.id, n.measured.height);
      });
      if (measuredHeights.size < cardNodes.length) return;

      const cards = cardNodes.map((n) => (n.data as CardNodeData).card);
      const sections = sectionNodes.map((n) => (n.data as SectionNodeData).section);
      const cardIdSet = new Set(cardNodes.map((n) => n.id));
      const connections = allEdges
        .filter((e) => cardIdSet.has(e.source) && cardIdSet.has(e.target))
        .map((e) => ({
          from: e.source,
          to: e.target,
          label: typeof e.label === 'string' ? e.label : undefined,
        }));

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const { positionedSections, positionedCards, responseWidth, responseHeight } =
        layoutHierarchy(responseNode.id, sections, cards, connections, measuredHeights, isMobile ? 'TB' : 'LR');

      updates.push({
        id: responseNode.id,
        style: { width: responseWidth, height: responseHeight },
      });

      positionedSections.forEach(({ section, position, width, height }) => {
        updates.push({ id: section.id, position, style: { width, height } });
      });

      positionedCards.forEach(({ card, position, parentId }) => {
        updates.push({ id: card.id, position, parentId });
      });
    });

    if (updates.length > 0) applyRelayout(updates);
  // getNodes/getEdges/applyRelayout are stable refs — safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesInitialized]);

  // Pan to a frame when requested (e.g., clicking a chat message)
  useEffect(() => {
    function handleFocusFrame(e: Event) {
      const { frameId } = (e as CustomEvent).detail;
      fitView({ nodes: [{ id: frameId }], duration: 500, padding: 0.3 });
    }
    function handleFitView() {
      fitView({ duration: 600, padding: 0.25 });
    }
    window.addEventListener('vai:focus-frame', handleFocusFrame);
    window.addEventListener('vai:fit-view', handleFitView);
    return () => {
      window.removeEventListener('vai:focus-frame', handleFocusFrame);
      window.removeEventListener('vai:fit-view', handleFitView);
    };
  }, [fitView]);

  const handlePaneClick = useCallback(() => {
    setSelectedFrame(null);
  }, [setSelectedFrame]);

  return (
    <div className="w-full h-full" style={{ background: 'var(--canvas-bg)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.05}
        maxZoom={2}
        zoomOnDoubleClick={false}
        deleteKeyCode="Delete"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255,255,255,0.06)"
          style={{ background: 'var(--canvas-bg)' }}
        />
        <Controls
          showZoom
          showFitView
          showInteractive={false}
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        />
        <MiniMap
          nodeColor="var(--accent)"
          maskColor="rgba(0,0,0,0.6)"
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
          }}
        />
      </ReactFlow>
    </div>
  );
}
