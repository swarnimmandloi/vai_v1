'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSubmit: (question: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSubmit, isLoading, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Listen for follow-up events from FrameNode
  useEffect(() => {
    function handleFollowUp(e: Event) {
      const { question } = (e as CustomEvent).detail;
      onSubmit(question);
    }
    window.addEventListener('vai:follow-up', handleFollowUp);
    return () => window.removeEventListener('vai:follow-up', handleFollowUp);
  }, [onSubmit]);

  // Listen for branch focus requests
  useEffect(() => {
    function handleBranch(e: Event) {
      const { frameId } = (e as CustomEvent).detail;
      if (textareaRef.current) {
        textareaRef.current.placeholder = `Ask a follow-up from this frame...`;
        textareaRef.current.focus();
      }
    }
    window.addEventListener('vai:branch', handleBranch);
    return () => window.removeEventListener('vai:branch', handleBranch);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleSubmit() {
    if (!value.trim() || isLoading || disabled) return;
    onSubmit(value.trim());
    setValue('');
  }

  return (
    <div
      className="p-3 border-t"
      style={{ borderColor: 'var(--border)' }}
    >
      <div
        className="relative rounded-xl p-1"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          rows={2}
          disabled={isLoading || disabled}
          className="w-full px-3 pt-2.5 pb-1 bg-transparent outline-none resize-none text-xs leading-relaxed placeholder:opacity-30 disabled:opacity-50"
          style={{ color: 'var(--foreground)' }}
        />
        <div className="flex justify-end px-2 pb-1.5">
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || isLoading || disabled}
            className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer transition-all disabled:opacity-30"
            style={{ background: value.trim() ? 'var(--accent)' : 'var(--muted)' }}
          >
            {isLoading ? (
              <Loader2 size={12} className="animate-spin text-white" />
            ) : (
              <ArrowUp size={12} className="text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
