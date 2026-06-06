import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return Response.json({ error: 'dev only' }, { status: 403 });
  }
  try {
    await execAsync('git add canvas/');
    const { stdout } = await execAsync(
      'git diff --cached --quiet && echo "nothing" || git commit -m "chore: update canvas files [auto]"'
    );
    if (stdout.trim() === 'nothing') {
      return Response.json({ ok: true, message: 'Nothing to commit' });
    }
    const branch = (await execAsync('git rev-parse --abbrev-ref HEAD')).stdout.trim();
    await execAsync(`git push origin ${branch}`);
    return Response.json({ ok: true, message: 'Saved & pushed' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
