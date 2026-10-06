import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(join(dirname(fileURLToPath(import.meta.url)), '..'));
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT ?? '4173');

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error('PORT deve essere un intero tra 0 e 65535.');
  process.exit(1);
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function isPublicPath(pathname) {
  const segments = pathname.split('/');
  return !segments.some((segment) => segment.startsWith('.'))
    && (pathname === '/index.html'
      || pathname.startsWith('/src/')
      || pathname.startsWith('/assets/'));
}

function sendError(request, response, status, message, extraHeaders = {}) {
  const body = Buffer.from(`${message}\n`);
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  response.end(request.method === 'HEAD' ? undefined : body);
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendError(request, response, 405, 'Metodo non consentito', { Allow: 'GET, HEAD' });
    return;
  }

  let pathname;
  try {
    // Parse the raw path before URL normalization so encoded traversal is rejected.
    pathname = decodeURIComponent((request.url ?? '/').split('?')[0]);
  } catch {
    sendError(request, response, 400, 'Percorso non valido');
    return;
  }

  if (!pathname.startsWith('/') || pathname.includes('\0')) {
    sendError(request, response, 400, 'Percorso non valido');
    return;
  }
  if (pathname.includes('\\') || pathname.split('/').some((segment) => segment === '..')) {
    sendError(request, response, 403, 'Accesso negato');
    return;
  }
  if (pathname === '/') pathname = '/index.html';
  if (!isPublicPath(pathname)) {
    sendError(request, response, 404, 'File non trovato');
    return;
  }

  try {
    const filePath = await realpath(join(root, pathname));
    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile()) {
      sendError(request, response, 404, 'File non trovato');
      return;
    }
    const relativePath = relative(root, filePath);
    const resolvedPublicPath = `/${relativePath.split(sep).join('/')}`;
    if (relativePath.startsWith(`..${sep}`) || relativePath === '..'
      || !isPublicPath(resolvedPublicPath)) {
      sendError(request, response, 403, 'Accesso negato');
      return;
    }

    const body = request.method === 'HEAD' ? undefined : await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': body?.length ?? fileInfo.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(body);
  } catch (error) {
    if (['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code)) {
      sendError(request, response, 404, 'File non trovato');
    } else if (['EACCES', 'EPERM'].includes(error.code)) {
      sendError(request, response, 403, 'Accesso negato');
    } else {
      sendError(request, response, 500, 'Errore del server');
    }
  }
});

server.on('error', (error) => {
  console.error(`Impossibile avviare il server: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  const address = server.address();
  const displayHost = host.includes(':') ? `[${host}]` : host;
  console.log(`Adventuregame: http://${displayHost}:${address.port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close());
}
