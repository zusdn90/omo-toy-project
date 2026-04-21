import test from 'node:test';
import assert from 'node:assert/strict';

import { createApiClient } from '../src/api.js';

function createJsonResponse(payload, { ok = true, status = 200, statusText = 'OK' } = {}) {
  return {
    ok,
    status,
    statusText,
    async json() {
      return payload;
    }
  };
}

test('createApiClient.fetchNeighborhoods reads the local neighborhoods endpoint', async (t) => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return createJsonResponse({ neighborhoods: [{ id: 'seongsu' }] });
  };

  const api = createApiClient('http://127.0.0.1:4173');
  const neighborhoods = await api.fetchNeighborhoods();

  assert.deepEqual(neighborhoods, [{ id: 'seongsu' }]);
  assert.deepEqual(calls, ['http://127.0.0.1:4173/api/neighborhoods']);
});

test('createApiClient.fetchNeighborhoodSnapshot reads the seeded view/report endpoints that drive the Kakao map UI', async (t) => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (url) => {
    calls.push(String(url));

    if (String(url).endsWith('/view')) {
      return createJsonResponse({ ranked: [{ id: 'first' }], selected: { id: 'first' } });
    }

    if (String(url).endsWith('/report')) {
      return createJsonResponse({ summary: { shortlistCount: 1 } });
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  const api = createApiClient('http://127.0.0.1:4173');
  const snapshot = await api.fetchNeighborhoodSnapshot('mangwon special');

  assert.deepEqual(calls, [
    'http://127.0.0.1:4173/api/neighborhoods/mangwon%20special/view',
    'http://127.0.0.1:4173/api/neighborhoods/mangwon%20special/report'
  ]);
  assert.deepEqual(snapshot, {
    view: { ranked: [{ id: 'first' }], selected: { id: 'first' } },
    report: { summary: { shortlistCount: 1 } }
  });
});
