'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, Layers } from 'lucide-react';
import { generateId } from '@/lib/utils';

export default function ProjectsPage() {
  const router = useRouter();

  async function createFirstProject() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const projectId = generateId();
    const canvasId = generateId();

    await supabase.from('projects').insert({ id: projectId, user_id: user.id, name: 'My Workspace' });
    await supabase.from('canvases').insert({ id: canvasId, project_id: projectId, name: 'Canvas 1' });

    router.push(`/${projectId}/canvas/${canvasId}`);
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
        <button
          onClick={createFirstProject}
          className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          <Plus size={16} />
          Create your first workspace
        </button>
      </div>
    </div>
  );
}
