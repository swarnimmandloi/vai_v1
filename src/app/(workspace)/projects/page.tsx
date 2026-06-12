'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createProjectAction } from '../actions';

export default function ProjectsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function createFirstProject() {
    setLoading(true);
    setError('');
    const result = await createProjectAction();
    if ('error' in result && result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    if ('projectId' in result && result.projectId && result.canvasId) {
      router.push(`/${result.projectId}/canvas/${result.canvasId}`);
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center h-full"
      style={{ background: 'var(--background)' }}
    >
      <div className="text-center max-w-sm">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-6"
          style={{ background: 'var(--accent)' }}
        >
          V
        </div>
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
          Welcome to VAI
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--muted-fg)' }}>
          Your AI workspace where ideas become interactive visual maps.
        </p>

        {error && (
          <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ color: '#e53e3e', background: 'rgba(229,62,62,0.08)', border: '1px solid rgba(229,62,62,0.2)' }}>
            {error}
          </p>
        )}

        <button
          onClick={createFirstProject}
          disabled={loading}
          className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          <Plus size={16} />
          {loading ? 'Creating…' : 'Create your first workspace'}
        </button>
      </div>
    </div>
  );
}
