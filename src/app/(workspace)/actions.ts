'use server';

import { createClient } from '@/lib/supabase/server';
import { generateId } from '@/lib/utils';

export async function createProjectAction() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) return { error: authError?.message ?? 'Not authenticated' };

  const projectId = generateId();
  const canvasId = generateId();

  const { error: projErr } = await supabase
    .from('projects')
    .insert({ id: projectId, user_id: user.id, name: 'My Workspace' });

  if (projErr) return { error: projErr.message };

  const { error: canvErr } = await supabase
    .from('canvases')
    .insert({ id: canvasId, project_id: projectId, name: 'Canvas 1' });

  if (canvErr) return { error: canvErr.message };

  return { projectId, canvasId };
}

export async function createNewProjectAction() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) return { error: authError?.message ?? 'Not authenticated' };

  const projectId = generateId();
  const canvasId = generateId();

  const { data: project, error: projErr } = await supabase
    .from('projects')
    .insert({ id: projectId, user_id: user.id, name: 'New Project' })
    .select()
    .single();

  if (projErr || !project) return { error: projErr?.message ?? 'Failed to create project' };

  const { data: canvas, error: canvErr } = await supabase
    .from('canvases')
    .insert({ id: canvasId, project_id: projectId, name: 'Canvas 1' })
    .select()
    .single();

  if (canvErr || !canvas) return { error: canvErr?.message ?? 'Failed to create canvas' };

  return { project, canvas };
}

export async function createCanvasAction(projectId: string, existingCount: number) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) return { error: authError?.message ?? 'Not authenticated' };

  const canvasId = generateId();

  const { data: canvas, error } = await supabase
    .from('canvases')
    .insert({ id: canvasId, project_id: projectId, name: `Canvas ${existingCount + 1}` })
    .select()
    .single();

  if (error || !canvas) return { error: error?.message ?? 'Failed to create canvas' };

  return { canvas };
}

export async function loadProjectsAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { projects: [] };

  const { data: projects, error } = await supabase
    .from('projects')
    .select('*, canvases(*)')
    .order('created_at', { ascending: false });

  if (error) return { projects: [], error: error.message };
  return { projects: projects ?? [] };
}
