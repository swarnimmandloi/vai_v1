'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const router = useRouter();
  useEffect(() => {
    async function redirect() {
      const supabase = createClient();
      const { data: canvases } = await supabase
        .from('canvases')
        .select('id')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true })
        .limit(1);

      if (canvases && canvases.length > 0) {
        router.replace(`/${projectId}/canvas/${canvases[0].id}`);
      } else {
        router.replace('/projects');
      }
    }
    redirect();
  }, [projectId]);

  return (
    <div className="flex items-center justify-center h-full" style={{ color: 'var(--muted-fg)' }}>
      <span className="text-sm">Loading...</span>
    </div>
  );
}
