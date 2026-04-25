import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';

import next from 'next';

import { buildCandidateReport, buildNeighborhoodView, neighborhoods } from './domain';
import { loadDotEnv } from './env';
import { createKakaoNeighborhoodLoader } from './kakao-local';
import type { Neighborhood, NeighborhoodSnapshot, NeighborhoodView } from './lib/types';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));

type Logger = {
  error?: (...args: unknown[]) => void;
};

type SnapshotResolver = {
  getSnapshot(neighborhoodId: string): Promise<NeighborhoodSnapshot | null>;
  getView(neighborhoodId: string): Promise<NeighborhoodView | null>;
  getReport(neighborhoodId: string): Promise<NeighborhoodSnapshot['report'] | null>;
};

function sendJson(response: ServerResponse<IncomingMessage>, statusCode: number, payload: unknown) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

function sendJavaScript(response: ServerResponse<IncomingMessage>, payload: string) {
  response.writeHead(200, {
    'content-type': 'application/javascript; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(payload);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error;
}

function createNeighborhoodSnapshotResolver({
  kakaoLoader
}: {
  kakaoLoader?: {
    loadNeighborhoodSnapshot(neighborhood: Neighborhood): Promise<NeighborhoodSnapshot | { error: string } | null>;
  };
} = {}): SnapshotResolver {
  const snapshotCache = new Map<string, NeighborhoodSnapshot>();

  function buildSeededSnapshot(neighborhoodId: string, fallbackReason?: string): NeighborhoodSnapshot {
    return {
      view: buildNeighborhoodView(neighborhoodId, fallbackReason),
      report: buildCandidateReport(neighborhoodId, fallbackReason)
    };
  }

  async function resolveNeighborhoodSnapshot(neighborhoodId: string): Promise<NeighborhoodSnapshot | null> {
    const neighborhood = neighborhoods.find((item) => item.id === neighborhoodId);
    if (!neighborhood) {
      return null;
    }

    if (snapshotCache.has(neighborhoodId)) {
      return snapshotCache.get(neighborhoodId) ?? null;
    }

    const kakaoSnapshot = await kakaoLoader?.loadNeighborhoodSnapshot(neighborhood);
    if (kakaoSnapshot && 'view' in kakaoSnapshot && 'report' in kakaoSnapshot) {
      snapshotCache.set(neighborhoodId, kakaoSnapshot);
      return kakaoSnapshot;
    }

    return buildSeededSnapshot(neighborhoodId, 'Kakao snapshot unavailable');
  }

  return {
    async getSnapshot(neighborhoodId: string) {
      return resolveNeighborhoodSnapshot(neighborhoodId);
    },
    async getView(neighborhoodId: string) {
      const snapshot = await resolveNeighborhoodSnapshot(neighborhoodId);
      return snapshot?.view ?? null;
    },
    async getReport(neighborhoodId: string) {
      const snapshot = await resolveNeighborhoodSnapshot(neighborhoodId);
      return snapshot?.report ?? null;
    }
  };
}

function handleApiRequest(response: ServerResponse<IncomingMessage>, pathname: string, snapshotResolver: SnapshotResolver) {
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
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Failed to load neighborhood view';
        sendJson(response, 500, { error: message });
      });
    return true;
  }

  const snapshotMatch = pathname.match(/^\/api\/neighborhoods\/([^/]+)\/snapshot$/);
  if (snapshotMatch) {
    const neighborhoodId = decodeURIComponent(snapshotMatch[1]);
    snapshotResolver
      .getSnapshot(neighborhoodId)
      .then((snapshot) => {
        if (!snapshot) {
          sendJson(response, 404, { error: 'Not found' });
          return;
        }

        sendJson(response, 200, snapshot);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Failed to load neighborhood snapshot';
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
      .catch((error: unknown) => {
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
  kakaoRestApiKey,
  dev = false
}: {
  rootDir?: string;
  logger?: Logger;
  fetchImpl?: typeof fetch;
  kakaoJsKey?: string;
  kakaoRestApiKey?: string;
  dev?: boolean;
} = {}) {
  loadDotEnv({ cwd: rootDir });
  const resolvedKakaoJsKey = kakaoJsKey ?? process.env.KAKAO_JS_KEY ?? '';
  const resolvedKakaoRestApiKey = kakaoRestApiKey ?? process.env.KAKAO_REST_API_KEY ?? '';
  const kakaoLoader = createKakaoNeighborhoodLoader({
    apiKey: resolvedKakaoRestApiKey,
    fetchImpl
  });
  const snapshotResolver = createNeighborhoodSnapshotResolver({ kakaoLoader });
  const nextApp = next({ dev, dir: rootDir });
  const nextHandle = nextApp.getRequestHandler();
  const preparePromise = nextApp.prepare();

  function buildRuntimeConfigScript() {
    return `window.__OMO_APP_CONFIG__ = Object.freeze(${JSON.stringify({ kakaoJsKey: resolvedKakaoJsKey })});\n`;
  }

  const server = createServer(async (request, response) => {
    const method = request.method ?? 'GET';
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');

    try {
      await preparePromise;

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

      await nextHandle(request, response);
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }

      logger.error?.('local server error', error);
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Internal server error');
    }
  });

  server.on('close', () => {
    void nextApp.close?.();
  });

  return server;
}

export async function startLocalServer(options: {
  rootDir?: string;
  logger?: Logger;
  fetchImpl?: typeof fetch;
  kakaoJsKey?: string;
  kakaoRestApiKey?: string;
  dev?: boolean;
  port?: number;
  host?: string;
} = {}) {
  const server = createLocalServer({
    ...options,
    dev: options.dev ?? process.env.NODE_ENV !== 'production'
  });
  const port = options.port ?? Number(process.env.PORT ?? '4173');
  const host = options.host ?? process.env.HOST ?? '0.0.0.0';

  await new Promise<void>((resolve) => {
    server.listen(port, host, resolve);
  });

  return {
    server,
    url: `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}`
  };
}
