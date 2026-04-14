'use client';

import { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';

export const FrameLoadingNode = memo(function FrameLoadingNode(_props: NodeProps<Node>) {
  return (
    <div
      className="rounded-xl p-4 animate-pulse"
      style={{
        width: 380,
        background: 'var(--panel-bg)',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header skeleton */}
      <div
        className="h-5 w-48 rounded mb-4"
        style={{ background: 'var(--muted)' }}
      />
      {/* Block skeletons */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-lg p-3 mb-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-md" style={{ background: 'var(--muted)' }} />
            <div className="h-3 rounded flex-1" style={{ background: 'var(--muted)', maxWidth: '60%' }} />
          </div>
          <div className="space-y-1.5 pl-9">
            <div className="h-2.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', width: '90%' }} />
            <div className="h-2.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', width: '70%' }} />
          </div>
        </div>
      ))}
    </div>
  );
});
