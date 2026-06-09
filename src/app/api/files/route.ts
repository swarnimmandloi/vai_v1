import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: authError?.message ?? 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json() as {
    id: string;
    canvasId: string;
    position: { x: number; y: number };
    content: {
      topic: string;
      chat_summary: string;
      sections: unknown[];
      cards: unknown[];
      connections: unknown[];
    };
  };

  const { data: canvas, error: canvErr } = await supabase
    .from('canvases')
    .select('project_id')
    .eq('id', body.canvasId)
    .single();

  if (canvErr || !canvas) {
    return NextResponse.json({ error: canvErr?.message ?? 'Canvas not found' }, { status: 404 });
  }

  const { error } = await supabase.from('files').insert({
    id: body.id,
    user_id: user.id,
    project_id: canvas.project_id,
    canvas_id: body.canvasId,
    path: `${canvas.project_id}/${body.canvasId}/${body.id}.json`,
    type: 'frame',
    content: body.content,
    position_x: body.position.x,
    position_y: body.position.y,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ files: [] });
  }

  const { searchParams } = new URL(request.url);
  const canvasId = searchParams.get('canvasId');
  if (!canvasId) {
    return NextResponse.json({ error: 'canvasId required' }, { status: 400 });
  }

  const { data: files, error } = await supabase
    .from('files')
    .select('*')
    .eq('canvas_id', canvasId)
    .eq('type', 'frame')
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ files: files ?? [] });
}
