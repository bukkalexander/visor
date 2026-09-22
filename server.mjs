import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'public');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 5194);
const basePath = `/${(process.env.ORC_BASE_PATH || '/').replace(/^\/+|\/+$/g, '')}`.replace('//', '/');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json' };

createServer(async (request, response) => {
  try {
    let pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    if (basePath !== '/' && pathname.startsWith(basePath)) pathname = pathname.slice(basePath.length) || '/';
    const relative = normalize(pathname).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
    let path = join(root, relative || 'index.html');
    if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
    const body = await readFile(path);
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    response.end(body);
  } catch {
    try {
      response.writeHead(200, { 'Content-Type': types['.html'] });
      response.end(await readFile(join(root, 'index.html')));
    } catch {
      response.writeHead(404).end('Not found');
    }
  }
}).listen(port, host, () => console.log(`Visor listening at http://${host}:${port}${basePath}`));
