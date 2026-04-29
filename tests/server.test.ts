import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createLocalServer } from '../src/server';

async function withServer(run: (baseUrl: string) => Promise<void>, options: Parameters<typeof createLocalServer>[0] = {}) {
  const server = createLocalServer({
    logger: {
      error() {}
    },
    ...options
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve server address');
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
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

async function createTempDb(t: test.TestContext) {
  const dir = await mkdtemp(join(tmpdir(), 'omo-server-db-'));
  t.after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  return join(dir, 'restaurants.sqlite');
}

test('local server serves the Next page shell', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert(html.includes('로컬 API에서 시드 데이터를 불러오는 중입니다'));
    assert(html.includes('/runtime-config.js'));
    assert(html.includes('__next'));
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

test('local server exposes neighborhoods and ranked snapshot APIs', async () => {
  await withServer(async (baseUrl) => {
    const neighborhoodsResponse = await fetch(`${baseUrl}/api/neighborhoods`);
    const neighborhoodsPayload = await neighborhoodsResponse.json();
    const snapshotResponse = await fetch(`${baseUrl}/api/neighborhoods/seongsu/snapshot`);
    const snapshotPayload = await snapshotResponse.json();

    assert.equal(neighborhoodsResponse.status, 200);
    assert.equal(neighborhoodsPayload.neighborhoods.length, 7);
    assert.deepEqual(
      neighborhoodsPayload.neighborhoods.map((neighborhood: { id: string }) => neighborhood.id),
      ['seoul-all', 'seongsu', 'mangwon', 'euljiro', 'gwangjin', 'dongdaemun', 'naver-shared']
    );
    assert.equal(neighborhoodsPayload.neighborhoods[0].name, '서울 전체');
    assert.equal(neighborhoodsPayload.neighborhoods[0].visitKoreaChart.sggCds.length, 25);
    assert.equal(neighborhoodsPayload.neighborhoods.at(-1).name, '네이버 저장 맛집');
    assert.deepEqual(
      neighborhoodsPayload.neighborhoods
        .filter((neighborhood: { visitKoreaChart?: { sggCds: string[] } }) => neighborhood.visitKoreaChart)
        .slice(-2)
        .map((neighborhood: { visitKoreaChart: { sggCds: string[] } }) => neighborhood.visitKoreaChart.sggCds[0]),
      ['11215', '11230']
    );
    assert.equal(snapshotResponse.status, 200);
    assert.equal(snapshotPayload.view.top5.length, 5);
    assert.equal(snapshotPayload.view.selected.id, snapshotPayload.view.ranked[0].id);
  }, {
    kakaoJsKey: '',
    kakaoRestApiKey: ''
  });
});

test('local server can use VisitKorea chart data when Kakao data is unavailable', async (t) => {
  const visitKoreaDbPath = await createTempDb(t);
  const calls: string[] = [];
  const fetchImpl = async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push(`${String(input)} ${String(init.body)}`);

    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      async json() {
        return {
          body: {
            chartList: [
              {
                ENT_NM1: 'RSG 성수',
                ROAD_NM_ADDR: '서울 성동구 연무장15길 11',
                SE_CD: '양식',
                LAT: '37.541',
                LON: '127.056'
              }
            ]
          }
        };
      }
    } as Response;
  };

  await withServer(async (baseUrl) => {
    const snapshotResponse = await fetch(`${baseUrl}/api/neighborhoods/seongsu/snapshot`);
    const snapshotPayload = await snapshotResponse.json();

    assert.equal(snapshotResponse.status, 200);
    assert.equal(snapshotPayload.view.source, 'visitkorea');
    assert.equal(snapshotPayload.view.ranked[0].name, 'RSG 성수');
    assert.equal(snapshotPayload.view.ranked[0].roadAddressName, '서울 성동구 연무장15길 11');
    assert.equal(snapshotPayload.view.ranked[0].lat, 37.541);
    assert.equal(snapshotPayload.report.instrumentation.source, 'visitkorea-chart-api');
    assert.match(calls[0], /AREA_CHART_LIST/);
  }, {
    fetchImpl,
    kakaoJsKey: '',
    kakaoRestApiKey: '',
    visitKoreaDbPath,
    visitKoreaEnabled: true
  });
});

test('local server can return Kakao-backed neighborhood snapshots when REST key and fetch impl are present', async () => {
  const kakaoCalls: Array<{ input: string; headers?: { Authorization?: string } }> = [];

  const kakaoFetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    kakaoCalls.push({
      input: String(input),
      headers: init.headers && !Array.isArray(init.headers) && !(init.headers instanceof Headers) ? init.headers : undefined
    });

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
      } as Response;
    }

    throw new Error(`Unexpected Kakao fetch: ${input}`);
  };

  await withServer(
    async (baseUrl) => {
      const snapshotResponse = await fetch(`${baseUrl}/api/neighborhoods/seongsu/snapshot`);
      const snapshotPayload = await snapshotResponse.json();

      assert.equal(snapshotResponse.status, 200);
      assert.equal(snapshotPayload.view.source, 'kakao');
      assert.equal(snapshotPayload.view.ranked[0].id, 'place-1');
      assert.equal(snapshotPayload.view.ranked[0].distanceMeters, 123);
      assert.equal(snapshotPayload.report.source, 'kakao');
      assert.equal(snapshotPayload.report.instrumentation.source, 'kakao-local-api');
      assert.equal(snapshotPayload.report.summary.candidateCount, 1);
      assert.equal(kakaoCalls.length, 1);
      assert.match(kakaoCalls[0].input, /search\/keyword\.json/);
      assert.equal(kakaoCalls[0].headers?.Authorization, 'KakaoAK test-rest-key');
    },
    { fetchImpl: kakaoFetch, kakaoJsKey: 'test-js-key', kakaoRestApiKey: 'test-rest-key' }
  );
});

test('local server reports disabled Kakao Maps SDK service without exposing the JS key', async () => {
  const kakaoFetch = async (input: string | URL | Request) => {
    assert.match(String(input), /maps\/sdk\.js/);
    assert.match(String(input), /appkey=/);

    return {
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      async text() {
        return JSON.stringify({
          errorType: 'NotAuthorizedError',
          message: 'App disabled OPEN_MAP_AND_LOCAL service.'
        });
      }
    } as Response;
  };

  await withServer(
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/kakao/maps-sdk/status`);
      const payload = await response.json();
      const serialized = JSON.stringify(payload);

      assert.equal(response.status, 200);
      assert.equal(payload.ok, false);
      assert.equal(payload.reason, 'service-disabled');
      assert.match(payload.message, /OPEN_MAP_AND_LOCAL/);
      assert.doesNotMatch(serialized, /test-js-key/);
    },
    { fetchImpl: kakaoFetch, kakaoJsKey: 'test-js-key', kakaoRestApiKey: '' }
  );
});

test('local server exposes candidate instrumentation reports', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/neighborhoods/mangwon/snapshot`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.report.summary.candidateCount, 6);
    assert.equal(payload.report.summary.shortlistCount, 5);
    assert.equal(payload.report.shortlist[0].rank, 1);
    assert.equal(typeof payload.report.instrumentation.weights.taste, 'number');
  }, {
    kakaoJsKey: '',
    kakaoRestApiKey: ''
  });
});
