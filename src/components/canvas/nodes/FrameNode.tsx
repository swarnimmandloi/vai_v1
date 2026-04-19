'use client';

import { memo, useState, useRef, useCallback } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { MoreHorizontal, GitBranch, Maximize2, Trash2, MessageSquarePlus } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FrameNodeData } from '@/store/canvasStore';
import { useCanvasStore } from '@/store/canvasStore';
import { BlockRenderer } from '../blocks/BlockRenderer';
import type { Block, BlockContent } from '@/types/canvas';

interface SortableBlockProps {
  block: Block;
  frameId: string;
}

function SortableBlock({ block, frameId }: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const removeBlock = useCanvasStore((s) => s.removeBlock);
  const updateBlockContent = useCanvasStore((s) => s.updateBlockContent);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <BlockRenderer
        block={block}
        frameId={frameId}
        onDelete={(id) => removeBlock(frameId, id)}
        onUpdateContent={(id, content) => updateBlockContent(frameId, id, content)}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export const FrameNode = memo(function FrameNode({ data, selected, id }: NodeProps<Node<FrameNodeData>>) {
  const { frame } = data;
  const [followUpText, setFollowUpText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const setSelectedFrame = useCanvasStore((s) => s.setSelectedFrame);
  const deleteFrame = useCanvasStore((s) => s.deleteFrame);
  const reorderBlocks = useCanvasStore((s) => s.reorderBlocks);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const blocks = frame.blocks;
      const fromIndex = blocks.findIndex((b) => b.id === active.id);
      const toIndex = blocks.findIndex((b) => b.id === over.id);
      if (fromIndex !== -1 && toIndex !== -1) {
        reorderBlocks(id, fromIndex, toIndex);
      }
    },
    [frame.blocks, id, reorderBlocks]
  );

  const sortedBlocks = [...frame.blocks].sort((a, b) => a.order_index - b.order_index);
  const regularBlocks = sortedBlocks.filter((b) => b.block_type !== 'diagram');
  const diagramBlocks = sortedBlocks.filter((b) => b.block_type === 'diagram');
  const isGrid = frame.layout_type === 'grid' && regularBlocks.length > 1;

  // Dispatch follow-up — we'll wire this to useAIResponse in Phase 5
  function handleFollowUpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!followUpText.trim()) return;
    setSelectedFrame(id);
    // Fire custom event to be handled by ChatInput
    window.dispatchEvent(
      new CustomEvent('vai:follow-up', { detail: { question: followUpText, frameId: id } })
    );
    setFollowUpText('');
  }

  return (
    <div
      className="relative group"
      style={{ width: frame.width, minWidth: 300, maxWidth: 640 }}
      onClick={() => setSelectedFrame(id)}
    >
      {/* Connection handles */}
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !rounded-full" style={{ background: 'var(--accent)', border: '2px solid var(--panel-bg)' }} />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !rounded-full" style={{ background: 'var(--accent)', border: '2px solid var(--panel-bg)' }} />

      {/* Frame card */}
      <div
        className="rounded-xl overflow-hidden transition-all duration-150"
        style={{
          background: 'var(--panel-bg)',
          border: selected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
          boxShadow: selected
            ? '0 0 0 2px rgba(99,102,241,0.2), 0 8px 32px rgba(0,0,0,0.4)'
            : '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        {/* Frame header */}
        <div
          className="flex items-center justify-between px-4 py-3 cursor-grab active:cursor-grabbing"
          data-drag-handle
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
              {frame.title}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded shrink-0"
              style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--accent-hover)' }}
            >
              {frame.layout_type}
            </span>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(
                  new CustomEvent('vai:follow-up', { detail: { question: `Expand on "${frame.title}"`, frameId: id } })
                );
              }}
              className="p-1 rounded transition-colors cursor-pointer"
              style={{ color: 'var(--muted-fg)' }}
              title="Ask about this frame"
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-fg)'; }}
            >
              <MessageSquarePlus size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFrame(id);
                window.dispatchEvent(
                  new CustomEvent('vai:branch', { detail: { frameId: id } })
                );
              }}
              className="p-1 rounded transition-colors cursor-pointer"
              style={{ color: 'var(--muted-fg)' }}
              title="Branch from this frame"
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-fg)'; }}
            >
              <GitBranch size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${frame.title}"?`)) deleteFrame(id);
              }}
              className="p-1 rounded transition-colors cursor-pointer"
              style={{ color: 'var(--muted-fg)' }}
              title="Delete frame"
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-fg)'; }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Text blocks — grid or linear layout */}
        {regularBlocks.length > 0 && (
          <div className={`p-4 ${isGrid ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}`}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={regularBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                {regularBlocks.map((block) => (
                  <SortableBlock key={block.id} block={block} frameId={id} />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* Diagram blocks — always full-width below text blocks */}
        {diagramBlocks.length > 0 && (
          <div
            className="px-4 pb-4 flex flex-col gap-3"
            style={regularBlocks.length > 0 ? { borderTop: '1px solid var(--border)', paddingTop: '1rem' } : { paddingTop: '1rem' }}
          >
            {diagramBlocks.map((block) => (
              <BlockRenderer key={block.id} block={block} frameId={id} />
            ))}
          </div>
        )}

        {/* Follow-up input */}
        <div
          className="px-4 py-3"
          style={{ borderTop: '1px solid var(--border)' }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleFollowUpSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              placeholder="Ask a follow-up..."
              className="flex-1 text-xs bg-transparent outline-none placeholder:opacity-40"
              style={{ color: 'var(--foreground)' }}
              onFocus={() => setSelectedFrame(id)}
            />
            {followUpText && (
              <button
                type="submit"
                className="text-xs px-2 py-1 rounded cursor-pointer transition-colors"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                Ask
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
});
