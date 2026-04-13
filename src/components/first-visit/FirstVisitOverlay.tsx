'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

interface FirstVisitOverlayProps {
  onSubmit: (question: string) => void;
}

export function FirstVisitOverlay({ onSubmit }: FirstVisitOverlayProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--background)' }}
    >
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
    </motion.div>
  );
}
