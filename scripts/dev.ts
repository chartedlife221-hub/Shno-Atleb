// Tiny static server for dist/. Run `bun run build` first, or `bun run dev` which builds then serves.
import { join } from 'node:path';

const proc = Bun.spawnSync(['bun', join(import.meta.dir, 'build.ts')], { stdout: 'inherit', stderr: 'inherit' });
if (proc.exitCode !== 0) process.exit(proc.exitCode);

const dist = join(import.meta.dir, '..', 'dist');
const port = Number(process.env['PORT'] ?? 4173);
Bun.serve({
  port,
  async fetch(req) {
    const path = decodeURIComponent(new URL(req.url).pathname);
    const safe = path.split('/').filter((p) => p && p !== '..').join('/');
    const file = Bun.file(join(dist, safe === '' ? 'index.html' : safe));
    return (await file.exists()) ? new Response(file) : new Response('Not found', { status: 404 });
  },
});
console.log(`http://localhost:${port}`);
