import test from 'node:test';
import assert from 'node:assert/strict';

import { createLocalServer } from '../src/server.js';

async function withServer(run, options = {}) {
  const server = createLocalServer({
    logger: {
      error() {}
    },
    ...options
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
    assert(html.includes('<script src="/runtime-config.js"></script>'));
    assert(html.includes('src="src/main.js"'));
  }, {
    kakaoJsKey: '',
    kakaoRestApiKey: ''
  });
});

test('local server exposes runtime config with the Kakao JS key', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/runtime-config.js`);
    const script = await response.text();

    assert.equal(response.status, 200);
    assert.match(script, /window\.__OMO_APP_CONFIG__/);
    assert.match(script, /"kakaoJsKey":"test-js-key"/);
  }, {
    kakaoJsKey: 'test-js-key',
    kakaoRestApiKey: ''
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
  }, {
    kakaoJsKey: '',
    kakaoRestApiKey: ''
  });
});

test('local server can return Kakao-backed neighborhood snapshots when REST key and fetch impl are present', async () => {
  const kakaoCalls = [];

  const kakaoFetch = async (input, init = {}) => {
    kakaoCalls.push({ input: String(input), init });

    if (String(input).includes('/search/keyword.json')) {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        async json() {
          return {
            documents: [
              {
                id: 'place-1',
                place_name: '실제 장소',
                category_name: '음식점',
                category_group_name: '한식',
                address_name: '서울 성동구 어딘가',
                road_address_name: '서울 성동구 성수동1가 123-4',
                phone: '02-0000-0000',
                place_url: 'https://place.map.kakao.com/1',
                x: '127.0558',
                y: '37.5442',
                distance: '123'
              }
            ]
          };
        }
      };
    }

    throw new Error(`Unexpected Kakao fetch: ${input}`);
  };

  await withServer(
    async (baseUrl) => {
      const viewResponse = await fetch(`${baseUrl}/api/neighborhoods/seongsu/view`);
      const viewPayload = await viewResponse.json();
      const reportResponse = await fetch(`${baseUrl}/api/neighborhoods/seongsu/report`);
      const reportPayload = await reportResponse.json();

      assert.equal(viewResponse.status, 200);
      assert.equal(viewPayload.source, 'kakao');
      assert.equal(viewPayload.ranked[0].id, 'place-1');
      assert.equal(viewPayload.ranked[0].distanceMeters, 123);
      assert.equal(reportResponse.status, 200);
      assert.equal(reportPayload.instrumentation.source, 'kakao-local-api');
      assert.equal(reportPayload.summary.candidateCount, 1);
      assert.equal(kakaoCalls.length, 1);
      assert.match(kakaoCalls[0].input, /search\/keyword\.json/);
      assert.equal(kakaoCalls[0].init.headers.Authorization, 'KakaoAK test-rest-key');
    },
    { fetchImpl: kakaoFetch, kakaoJsKey: 'test-js-key', kakaoRestApiKey: 'test-rest-key' }
  );
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
  }, {
    kakaoJsKey: '',
    kakaoRestApiKey: ''
  });
});
