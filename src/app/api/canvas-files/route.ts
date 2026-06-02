import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const CANVAS_DIR = path.join(process.cwd(), 'canvas');

export async function GET() {
  try {
    if (!fs.existsSync(CANVAS_DIR)) {
      return Response.json([]);
    }

    const files = fs.readdirSync(CANVAS_DIR).filter((f) => f.endsWith('.json'));

    const results = files.flatMap((filename) => {
      try {
        const raw = fs.readFileSync(path.join(CANVAS_DIR, filename), 'utf-8');
        const content = JSON.parse(raw) as Record<string, unknown>;
        return [{ filename, content }];
      } catch {
        return [];
      }
    });

    return Response.json(results);
  } catch (err) {
    console.error('[canvas-files]', err);
    return Response.json([], { status: 500 });
  }
}
