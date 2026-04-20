import test from 'node:test';
import assert from 'node:assert/strict';

import { createLocalServer } from '../src/server.js';

async function withServer(run) {
  const server = createLocalServer({
    logger: {
      error() {}
    }
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

test('local server serves the static shell', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert(html.includes('<main id="app" class="layout" aria-live="polite"></main>'));
    assert(html.includes('src="src/main.js"'));
  });
});

test('local server exposes neighborhoods and ranked view APIs', async () => {
  await withServer(async (baseUrl) => {
    const neighborhoodsResponse = await fetch(`${baseUrl}/api/neighborhoods`);
    const neighborhoodsPayload = await neighborhoodsResponse.json();
    const viewResponse = await fetch(`${baseUrl}/api/neighborhoods/seongsu/view`);
    const viewPayload = await viewResponse.json();

    assert.equal(neighborhoodsResponse.status, 200);
    assert.equal(neighborhoodsPayload.neighborhoods.length, 3);
    assert.equal(viewResponse.status, 200);
    assert.equal(viewPayload.top5.length, 5);
    assert.equal(viewPayload.selected.id, viewPayload.ranked[0].id);
  });
});

test('local server exposes candidate instrumentation reports', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/neighborhoods/mangwon/report`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.summary.candidateCount, 6);
    assert.equal(payload.summary.shortlistCount, 5);
    assert.equal(payload.shortlist[0].rank, 1);
    assert.equal(typeof payload.instrumentation.weights.taste, 'number');
  });
});
