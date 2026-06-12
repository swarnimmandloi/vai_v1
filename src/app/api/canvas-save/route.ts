import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return Response.json({ error: 'dev only' }, { status: 403 });
  }
  try {
    const { filename, content } = (await req.json()) as {
      filename: string;
      content: unknown;
    };
    if (!filename || typeof filename !== 'string' || !filename.endsWith('.json')) {
      return Response.json({ error: 'invalid filename' }, { status: 400 });
    }
    const dir = path.join(process.cwd(), 'canvas');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), JSON.stringify(content, null, 2), 'utf-8');
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[canvas-save]', err);
    return Response.json({ error: 'write failed' }, { status: 500 });
  }
}
