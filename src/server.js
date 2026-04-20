import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCandidateReport, buildNeighborhoodView, neighborhoods } from './domain.js';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

function getStaticPath(rootDir, pathname) {
  const requestPath = pathname === '/' ? '/index.html' : pathname;
  const absolutePath = resolve(rootDir, `.${requestPath}`);

  if (!absolutePath.startsWith(rootDir)) {
    return null;
  }

  return absolutePath;
}

function getContentType(filePath) {
  return contentTypes[extname(filePath)] ?? 'application/octet-stream';
}

function handleApiRequest(response, pathname) {
  if (pathname === '/api/health') {
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (pathname === '/api/neighborhoods') {
    sendJson(response, 200, { neighborhoods });
    return true;
  }

  const viewMatch = pathname.match(/^\/api\/neighborhoods\/([^/]+)\/view$/);
  if (viewMatch) {
    const neighborhoodId = decodeURIComponent(viewMatch[1]);
    sendJson(response, 200, buildNeighborhoodView(neighborhoodId));
    return true;
  }

  const reportMatch = pathname.match(/^\/api\/neighborhoods\/([^/]+)\/report$/);
  if (reportMatch) {
    const neighborhoodId = decodeURIComponent(reportMatch[1]);
    sendJson(response, 200, buildCandidateReport(neighborhoodId));
    return true;
  }

  return false;
}

export function createLocalServer({ rootDir = projectRoot, logger = console } = {}) {
  return createServer(async (request, response) => {
    const method = request.method ?? 'GET';
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');

    try {
      if (requestUrl.pathname.startsWith('/api/')) {
        if (method !== 'GET' && method !== 'HEAD') {
          sendJson(response, 405, { error: 'Method not allowed' });
          return;
        }

        const handled = handleApiRequest(response, requestUrl.pathname);
        if (!handled) {
          sendJson(response, 404, { error: 'Not found' });
        }
        return;
      }

      if (method !== 'GET' && method !== 'HEAD') {
        response.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Method not allowed');
        return;
      }

      const filePath = getStaticPath(rootDir, requestUrl.pathname);
      if (!filePath) {
        response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Forbidden');
        return;
      }

      const fileContents = await readFile(filePath);
      response.writeHead(200, { 'content-type': getContentType(filePath) });
      response.end(method === 'HEAD' ? undefined : fileContents);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }

      logger.error?.('local server error', error);
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Internal server error');
    }
  });
}

export function startLocalServer({ port = 4173, host = '127.0.0.1', logger = console } = {}) {
  const server = createLocalServer({ logger });

  return new Promise((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(port, host, () => {
      resolvePromise({
        host,
        port,
        server,
        url: `http://${host}:${port}`
      });
    });
  });
}
