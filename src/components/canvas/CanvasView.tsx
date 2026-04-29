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
    setSelectedFrame, setCanvasId,
  } = useCanvasStore();

  const { fitView, getNodes, setNodes, getEdges } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const relaidOutRef = useRef(new Set<string>());

  useEffect(() => {
    setCanvasId(canvasId);
  }, [canvasId, setCanvasId]);

  // Post-render re-layout: re-run dagre with actual measured card heights
  useEffect(() => {
    if (!nodesInitialized) return;

    const allNodes = getNodes();
    const allEdges = getEdges();

    // Only process response nodes not yet re-laid out
    const newResponses = allNodes.filter(
      (n) => n.type === 'response' && !relaidOutRef.current.has(n.id)
    );
    if (newResponses.length === 0) return;

    const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
    let didUpdate = false;
    const updatedNodes = allNodes.map((n) => ({ ...n }));
    const updatedMap = new Map(updatedNodes.map((n) => [n.id, n]));

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

      // Build measured heights from React Flow's measured property
      const measuredHeights = new Map<string, number>();
      cardNodes.forEach((n) => {
        if (n.measured?.height) measuredHeights.set(n.id, n.measured.height);
      });

      // Skip re-layout if no measurements available yet
      if (measuredHeights.size === 0) return;

      // Check if any card differs from estimate by more than 24px
      const needsRelayout = cardNodes.some((n) => {
        const measured = measuredHeights.get(n.id);
        if (!measured) return false;
        const card = (n.data as CardNodeData).card;
        const estimated = card.has_image !== false ? 340 : 210;
        return Math.abs(measured - estimated) > 24;
      });
      if (!needsRelayout) return;

      // Reconstruct cards, sections, connections for this response
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

      const { positionedSections, positionedCards, responseWidth, responseHeight } =
        layoutHierarchy(responseNode.id, sections, cards, connections, measuredHeights);

      // Apply updates
      const rn = updatedMap.get(responseNode.id);
      if (rn) {
        rn.style = { ...rn.style, width: responseWidth, height: responseHeight };
        didUpdate = true;
      }

      positionedSections.forEach(({ section, position, width, height }) => {
        const sn = updatedMap.get(section.id);
        if (sn) {
          sn.position = position;
          sn.style = { ...sn.style, width, height };
          didUpdate = true;
        }
      });

      positionedCards.forEach(({ card, position, parentId }) => {
        const cn = updatedMap.get(card.id);
        if (cn) {
          cn.position = position;
          cn.parentId = parentId;
          didUpdate = true;
        }
      });
    });

    if (didUpdate) setNodes(updatedNodes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesInitialized]);

  // Pan to a frame when requested (e.g., clicking a chat message)
  useEffect(() => {
    function handleFocusFrame(e: Event) {
      const { frameId } = (e as CustomEvent).detail;
      fitView({ nodes: [{ id: frameId }], duration: 500, padding: 0.3 });
    }
    window.addEventListener('vai:focus-frame', handleFocusFrame);
    return () => window.removeEventListener('vai:focus-frame', handleFocusFrame);
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
        minZoom={0.1}
        maxZoom={2}
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
