import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.argv[2] ?? 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.ogg': 'audio/ogg', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const segments = pathname.replaceAll('\\', '/').split('/');
    if (segments.some(segment => segment.startsWith('.') && segment !== '')) { response.writeHead(403); response.end(); return; }
    const resolved = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!resolved.startsWith(root) || !(await stat(resolved)).isFile()) { response.writeHead(404); response.end(); return; }
    const contents = await readFile(resolved);
    response.writeHead(200, { 'Content-Type': types[path.extname(resolved)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache', 'Content-Length': contents.length, 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : contents);
  } catch { response.writeHead(404); response.end(); }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Space Attack: http://127.0.0.1:${port}`));
