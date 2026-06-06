'use client';

import { useState } from 'react';

type State = 'idle' | 'saving' | 'success' | 'error';

const LABELS: Record<State, string> = {
  idle: 'Save',
  saving: 'Saving…',
  success: 'Saved!',
  error: 'Error',
};

export function SaveButton() {
  const [state, setState] = useState<State>('idle');

  async function handleSave() {
    if (state === 'saving') return;
    setState('saving');
    try {
      const res = await fetch('/api/canvas-commit', { method: 'POST' });
      const json = await res.json();
      setState(json.ok ? 'success' : 'error');
    } catch {
      setState('error');
    } finally {
      setTimeout(() => setState('idle'), 2000);
    }
  }

  const bg =
    state === 'success' ? 'var(--accent)' :
    state === 'error' ? '#e53e3e' :
    'var(--panel-bg)';

  return (
    <button
      onClick={handleSave}
      disabled={state === 'saving'}
      style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        zIndex: 10,
        padding: '6px 16px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 500,
        cursor: state === 'saving' ? 'wait' : 'pointer',
        background: bg,
        color: 'var(--text)',
        border: '1px solid var(--border)',
        transition: 'background 0.2s',
      }}
    >
      {LABELS[state]}
    </button>
  );
}
