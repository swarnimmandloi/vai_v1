'use client';

import { memo } from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import type { Block, BlockContent } from '@/types/canvas';
import { IconTextBlock } from './IconTextBlock';
import { ChartBlock } from './ChartBlock';
import { ListBlock } from './ListBlock';
import { StatBlock } from './StatBlock';
import { NoteBlock } from './NoteBlock';
import { DiagramBlock } from './DiagramBlock';
import type { IconTextContent, ChartContent, ListContent, StatContent, NoteContent, DiagramContent } from '@/types/canvas';

interface BlockRendererProps {
  block: Block;
  frameId?: string;
  onDelete?: (blockId: string) => void;
  onUpdateContent?: (blockId: string, content: BlockContent) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export const BlockRenderer = memo(function BlockRenderer({
  block,
  frameId,
  onDelete,
  onUpdateContent,
  dragHandleProps,
}: BlockRendererProps) {
  function renderBlock() {
    switch (block.block_type) {
      case 'icon_text':
        return <IconTextBlock content={block.content as IconTextContent} />;
      case 'chart':
        return <ChartBlock content={block.content as ChartContent} />;
      case 'list':
        return <ListBlock content={block.content as ListContent} />;
      case 'stat':
        return <StatBlock content={block.content as StatContent} />;
      case 'note':
        return (
          <NoteBlock
            content={block.content as NoteContent}
            onUpdate={(c) => onUpdateContent?.(block.id, c)}
          />
        );
      case 'diagram':
        return <DiagramBlock content={block.content as DiagramContent} frameId={frameId ?? ''} />;
      default:
        return null;
    }
  }

  return (
    <div className="relative group/block">
      {/* Drag handle + delete — appear on block hover */}
      <div className="absolute -left-5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover/block:opacity-100 transition-opacity">
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            className="cursor-grab p-0.5 rounded"
            style={{ color: 'var(--muted-fg)' }}
          >
            <GripVertical size={12} />
          </div>
        )}
      </div>
      <div className="absolute -right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover/block:opacity-100 transition-opacity">
        {onDelete && (
          <button
            onClick={() => onDelete(block.id)}
            className="p-0.5 rounded transition-colors cursor-pointer"
            style={{ color: 'var(--muted-fg)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-fg)';
            }}
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>
      {renderBlock()}
    </div>
  );
});
