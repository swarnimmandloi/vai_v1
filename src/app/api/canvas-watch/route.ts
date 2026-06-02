import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const CANVAS_DIR = path.join(process.cwd(), 'canvas');

// SSE live file-watching — dev only.
// On Vercel (production) this returns 404; use /api/canvas-files for initial load instead.
export async function GET(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return new Response('File watching is only available in development', { status: 404 });
  }

  // Dynamically import chokidar (server-only, not bundled for client)
  const { default: chokidar } = await import('chokidar');

  const encoder = new TextEncoder();
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();

  const send = (data: object) => {
    try {
      writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {}
  };

  // Send all existing files immediately on connect
  if (fs.existsSync(CANVAS_DIR)) {
    const files = fs.readdirSync(CANVAS_DIR).filter((f) => f.endsWith('.json'));
    for (const filename of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(CANVAS_DIR, filename), 'utf-8'));
        send({ type: 'file_load', filename, content });
      } catch {}
    }
  }

  // Watch for changes
  const watcher = chokidar.watch(CANVAS_DIR, { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 100 } });

  watcher.on('change', (filePath) => {
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      send({ type: 'file_change', filename: path.basename(filePath), content });
    } catch {}
  });

  watcher.on('add', (filePath) => {
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      send({ type: 'file_add', filename: path.basename(filePath), content });
    } catch {}
  });

  req.signal.addEventListener('abort', () => {
    watcher.close();
    writer.close().catch(() => {});
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
