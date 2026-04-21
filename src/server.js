import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { basename, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCandidateReport, buildNeighborhoodView, neighborhoods } from './domain.js';
import { loadDotEnv } from './env.js';
import { createKakaoNeighborhoodLoader } from './kakao-local.js';

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

function sendJavaScript(response, payload) {
  response.writeHead(200, {
    'content-type': 'application/javascript; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(payload);
}

function getStaticPath(rootDir, pathname) {
  const requestPath = pathname === '/' ? '/index.html' : pathname;
  const absolutePath = resolve(rootDir, `.${requestPath}`);
  const relPath = relative(rootDir, absolutePath);

  if (relPath.startsWith('..') || relPath === '' || basename(absolutePath).startsWith('.')) {
    return null;
  }

  return absolutePath;
}

function getContentType(filePath) {
  return contentTypes[extname(filePath)] ?? 'application/octet-stream';
}

function createNeighborhoodSnapshotResolver({ kakaoLoader } = {}) {
  const snapshotCache = new Map();

  async function resolveNeighborhoodSnapshot(neighborhoodId) {
    const neighborhood = neighborhoods.find((item) => item.id === neighborhoodId);
    if (!neighborhood) {
      return null;
    }

    if (snapshotCache.has(neighborhoodId)) {
      return snapshotCache.get(neighborhoodId);
    }

    const kakaoSnapshot = await kakaoLoader?.loadNeighborhoodSnapshot(neighborhood);
    if (kakaoSnapshot?.view && kakaoSnapshot?.report) {
      snapshotCache.set(neighborhoodId, kakaoSnapshot);
      return kakaoSnapshot;
    }

    return {
      view: buildNeighborhoodView(neighborhoodId),
      report: buildCandidateReport(neighborhoodId)
    };
  }

  return {
    async getView(neighborhoodId) {
      const snapshot = await resolveNeighborhoodSnapshot(neighborhoodId);
      return snapshot?.view ?? null;
    },
    async getReport(neighborhoodId) {
      const snapshot = await resolveNeighborhoodSnapshot(neighborhoodId);
      return snapshot?.report ?? null;
    }
  };
}

function handleApiRequest(response, pathname, snapshotResolver) {
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
    snapshotResolver
      .getView(neighborhoodId)
      .then((view) => {
        if (!view) {
          sendJson(response, 404, { error: 'Not found' });
          return;
        }

        sendJson(response, 200, view);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to load neighborhood view';
        sendJson(response, 500, { error: message });
      });
    return true;
  }

  const reportMatch = pathname.match(/^\/api\/neighborhoods\/([^/]+)\/report$/);
  if (reportMatch) {
    const neighborhoodId = decodeURIComponent(reportMatch[1]);
    snapshotResolver
      .getReport(neighborhoodId)
      .then((report) => {
        if (!report) {
          sendJson(response, 404, { error: 'Not found' });
          return;
        }

        sendJson(response, 200, report);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to load neighborhood report';
        sendJson(response, 500, { error: message });
      });
    return true;
  }

  return false;
}

export function createLocalServer({
  rootDir = projectRoot,
  logger = console,
  fetchImpl = globalThis.fetch,
  kakaoJsKey,
  kakaoRestApiKey
} = {}) {
  loadDotEnv({ cwd: rootDir });
  const resolvedKakaoJsKey = kakaoJsKey ?? process.env.KAKAO_JS_KEY ?? '';
  const resolvedKakaoRestApiKey = kakaoRestApiKey ?? process.env.KAKAO_REST_API_KEY ?? '';
  const kakaoLoader = createKakaoNeighborhoodLoader({
    apiKey: resolvedKakaoRestApiKey,
    fetchImpl
  });
  const snapshotResolver = createNeighborhoodSnapshotResolver({ kakaoLoader });

  function buildRuntimeConfigScript() {
    return `window.__OMO_APP_CONFIG__ = Object.freeze(${JSON.stringify({ kakaoJsKey: resolvedKakaoJsKey })});\n`;
  }

  return createServer(async (request, response) => {
    const method = request.method ?? 'GET';
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');

    try {
      if (requestUrl.pathname === '/runtime-config.js') {
        if (method !== 'GET' && method !== 'HEAD') {
          response.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
          response.end('Method not allowed');
          return;
        }

        const script = buildRuntimeConfigScript();
        sendJavaScript(response, method === 'HEAD' ? '' : script);
        return;
      }

      if (requestUrl.pathname.startsWith('/api/')) {
        if (method !== 'GET' && method !== 'HEAD') {
          sendJson(response, 405, { error: 'Method not allowed' });
          return;
        }

        const handled = handleApiRequest(response, requestUrl.pathname, snapshotResolver);
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
