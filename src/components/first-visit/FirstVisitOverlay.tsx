'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Clock, ChevronRight, X, FolderOpen } from 'lucide-react';
import { getRecentCanvases, type RecentCanvas } from '@/lib/recentCanvases';

interface CanvasFile {
  filename: string;
  topic: string;
  content: Record<string, unknown>;
}

interface FirstVisitOverlayProps {
  onSubmit: (question: string) => void;
  onOpenRecent?: (canvas: RecentCanvas) => void;
  onLoadAllFiles?: () => void;
}

export function FirstVisitOverlay({ onSubmit, onOpenRecent, onLoadAllFiles }: FirstVisitOverlayProps) {
  const [value, setValue] = useState('');
  const [recentOpen, setRecentOpen] = useState(false);
  const [recents, setRecents] = useState<RecentCanvas[]>([]);
  const [canvasFiles, setCanvasFiles] = useState<CanvasFile[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!recentOpen) return;
    setRecents(getRecentCanvases());
    fetch('/api/canvas-files')
      .then((r) => r.json())
      .then((files: Array<{ filename: string; content: Record<string, unknown> }>) => {
        setCanvasFiles(
          files.map((f) => ({
            filename: f.filename,
            topic: String(f.content.topic ?? f.filename.replace('.json', '')),
            content: f.content,
          }))
        );
      })
      .catch(() => {});
  }, [recentOpen]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSubmit(value.trim());
    }
  }

  function handleLoadAll() {
    setRecentOpen(false);
    onLoadAllFiles?.();
  }

  function handleRecentClick(canvas: RecentCanvas) {
    setRecentOpen(false);
    onOpenRecent?.(canvas);
  }

  function formatTime(ts: number) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${d}d ago`;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--background)' }}
    >
      {/* Recent button — top right */}
      <motion.button
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onClick={() => setRecentOpen(true)}
        className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all"
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--border)',
          color: 'var(--muted-fg)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-fg)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
        }}
      >
        <Clock size={13} />
        Recent
      </motion.button>

      {/* Logo / brand */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="flex flex-col items-center mb-12"
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mb-5"
          style={{ background: 'var(--accent)', boxShadow: '0 0 40px rgba(99,102,241,0.4)' }}
        >
          V
        </div>
        <h1 className="text-4xl font-bold mb-3 tracking-tight" style={{ color: 'var(--foreground)' }}>
          What do you want to explore?
        </h1>
        <p className="text-base" style={{ color: 'var(--muted-fg)' }}>
          Ask anything. Your answer will become an interactive visual map.
        </p>
      </motion.div>

      {/* Input area */}
      <motion.form
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        onSubmit={handleSubmit}
        className="w-full max-w-2xl"
      >
        <div
          className="relative rounded-2xl p-1"
          style={{
            background: 'var(--panel-bg)',
            border: '1.5px solid var(--border)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
          }}
        >
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. How does the human immune system work? Or: Compare React vs Vue..."
            autoFocus
            rows={3}
            className="w-full px-5 pt-4 pb-2 bg-transparent outline-none resize-none text-base leading-relaxed placeholder:opacity-30"
            style={{ color: 'var(--foreground)' }}
          />
          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} style={{ color: 'var(--muted-fg)' }} />
              <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                Powered by Claude
              </span>
            </div>
            <button
              type="submit"
              disabled={!value.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all cursor-pointer disabled:opacity-40"
              style={{ background: 'var(--accent)' }}
              onMouseEnter={(e) => {
                if (value.trim()) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-hover)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)';
              }}
            >
              Explore
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
        <p className="text-xs text-center mt-3" style={{ color: 'var(--muted-fg)' }}>
          Press Enter to explore · Shift+Enter for new line
        </p>
      </motion.form>

      {/* Recent panel */}
      <AnimatePresence>
        {recentOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              onClick={() => setRecentOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="absolute top-0 right-0 bottom-0 z-20 flex flex-col"
              style={{
                width: 'min(380px, 100vw)',
                background: 'var(--panel-bg)',
                borderLeft: '1px solid var(--border)',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2">
                  <Clock size={15} style={{ color: 'var(--accent)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                    Recent
                  </span>
                </div>
                <button
                  onClick={() => setRecentOpen(false)}
                  className="p-1 rounded-lg cursor-pointer"
                  style={{ color: 'var(--muted-fg)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--foreground)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-fg)')}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Saved canvas files */}
                {canvasFiles.length > 0 && (
                  <div>
                    <div
                      className="flex items-center justify-between px-5 py-3"
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <div className="flex items-center gap-2">
                        <FolderOpen size={12} style={{ color: 'var(--muted-fg)' }} />
                        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                          Saved canvases
                        </span>
                      </div>
                      <button
                        onClick={handleLoadAll}
                        className="text-xs px-2.5 py-1 rounded-lg cursor-pointer font-medium"
                        style={{ background: 'var(--accent)', color: 'white' }}
                      >
                        Load all
                      </button>
                    </div>

                    {canvasFiles.map((f) => (
                      <button
                        key={f.filename}
                        onClick={handleLoadAll}
                        className="w-full text-left px-5 py-3.5 flex items-center gap-3 cursor-pointer"
                        style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.06)')
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')
                        }
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                            {f.topic}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>
                            {f.filename}
                          </p>
                        </div>
                        <ChevronRight size={14} style={{ color: 'var(--muted-fg)' }} />
                      </button>
                    ))}
                  </div>
                )}

                {/* AI sessions from localStorage */}
                {recents.length > 0 && (
                  <div>
                    <div
                      className="px-5 py-3 flex items-center gap-2"
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <Clock size={12} style={{ color: 'var(--muted-fg)' }} />
                      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                        Your sessions
                      </span>
                    </div>

                    {recents.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleRecentClick(c)}
                        className="w-full text-left px-5 py-3.5 flex items-center gap-3 cursor-pointer"
                        style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.06)')
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')
                        }
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                            {c.topic}
                          </p>
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted-fg)' }}>
                            {c.question}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                            {formatTime(c.timestamp)}
                          </span>
                          <ChevronRight size={14} style={{ color: 'var(--muted-fg)' }} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {canvasFiles.length === 0 && recents.length === 0 && (
                  <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--muted-fg)' }}>
                    No recent canvases yet
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
