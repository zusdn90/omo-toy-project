import test from 'node:test';
import assert from 'node:assert/strict';

import { createApiClient } from '../src/api';

function createJsonResponse<T>(payload: T, { ok = true, status = 200, statusText = 'OK' } = {}): Response {
  return {
    ok,
    status,
    statusText,
    async json() {
      return payload;
    }
  } as Response;
}

test('createApiClient.fetchNeighborhoods reads the local neighborhoods endpoint', async (t) => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (url: string | URL | Request) => {
    calls.push(String(url));
    return createJsonResponse({ neighborhoods: [{ id: 'seongsu' }] });
  };

  const api = createApiClient('http://127.0.0.1:4173');
  const neighborhoods = await api.fetchNeighborhoods();

  assert.deepEqual(neighborhoods, [{ id: 'seongsu' }]);
  assert.deepEqual(calls, ['http://127.0.0.1:4173/api/neighborhoods']);
});

test('createApiClient.fetchNeighborhoodSnapshot reads the seeded snapshot endpoint that drives the Kakao map UI', async (t) => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (url: string | URL | Request) => {
    calls.push(String(url));

    if (String(url).endsWith('/snapshot')) {
      return createJsonResponse({
        view: { ranked: [{ id: 'first' }], selected: { id: 'first' }, source: 'seeded', summary: { averageScore: '1.0', bestEvidenceName: '-', lowestPriceLabel: '-' } },
        report: { source: 'seeded', summary: { shortlistCount: 1, candidateCount: 1 }, instrumentation: { source: 'seeded', weights: { taste: 0.34, affordability: 0.26, evidence: 0.25, sentiment: 0.15 }, strategy: 'x', thresholds: { affordableMealPrice: 10000, evidenceStrong: 70, highConfidenceRatio: 0.91 } }, shortlist: [], candidates: [], narrative: 'ok' }
      });
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  const api = createApiClient('http://127.0.0.1:4173');
  const snapshot = await api.fetchNeighborhoodSnapshot('mangwon special');

  assert.deepEqual(calls, [
    'http://127.0.0.1:4173/api/neighborhoods/mangwon%20special/snapshot'
  ]);
  assert.deepEqual(snapshot, {
    view: { ranked: [{ id: 'first' }], selected: { id: 'first' }, source: 'seeded', summary: { averageScore: '1.0', bestEvidenceName: '-', lowestPriceLabel: '-' } },
    report: { source: 'seeded', summary: { shortlistCount: 1, candidateCount: 1 }, instrumentation: { source: 'seeded', weights: { taste: 0.34, affordability: 0.26, evidence: 0.25, sentiment: 0.15 }, strategy: 'x', thresholds: { affordableMealPrice: 10000, evidenceStrong: 70, highConfidenceRatio: 0.91 } }, shortlist: [], candidates: [], narrative: 'ok' }
  });
});
