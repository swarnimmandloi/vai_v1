'use client';

import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
  useReactFlow,
} from '@xyflow/react';
import { useCanvasStore } from '@/store/canvasStore';
import { FrameNode } from './nodes/FrameNode';
import { FrameLoadingNode } from './nodes/FrameLoadingNode';

const nodeTypes: NodeTypes = {
  frame: FrameNode as NodeTypes['frame'],
  loading: FrameLoadingNode,
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

  const { fitView } = useReactFlow();

  useEffect(() => {
    setCanvasId(canvasId);
  }, [canvasId, setCanvasId]);

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
