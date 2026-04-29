import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createVisitKoreaChartLoader } from '../src/visitkorea-chart';
import type { Neighborhood } from '../src/lib/types';

const seongsu = {
  id: 'seongsu',
  name: '성수',
  vibe: 'vibe',
  mapCenter: { lat: 37.5442, lng: 127.0558, level: 4 },
  visitKoreaChart: {
    ctpvNm: '서울특별시',
    sggCds: ['11200'],
    categories: [],
    type: 1
  }
} satisfies Neighborhood;

async function createTempDb(t: test.TestContext) {
  const dir = await mkdtemp(join(tmpdir(), 'omo-visitkorea-'));
  t.after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  return join(dir, 'restaurants.sqlite');
}

test('VisitKorea chart loader maps official chart rows into address-backed restaurants', async (t) => {
  const dbPath = await createTempDb(t);
  const calls: Array<{ input: string; body: string }> = [];
  const fetchImpl = async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ input: String(input), body: String(init.body) });

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
                LON: '127.056',
                INFO_URL_ADDR: 'https://korean.visitkorea.or.kr/detail/detail_view.do?cotid=test',
                CONTENT_STATUS: 2
              }
            ]
          }
        };
      }
    } as Response;
  };

  const loader = createVisitKoreaChartLoader({ fetchImpl, dbPath });
  const snapshot = await loader.loadNeighborhoodSnapshot(seongsu);
  loader.close();

  assert(snapshot);
  assert.equal(snapshot.view.source, 'visitkorea');
  assert.equal(snapshot.view.ranked[0].name, 'RSG 성수');
  assert.equal(snapshot.view.ranked[0].roadAddressName, '서울 성동구 연무장15길 11');
  assert.equal(snapshot.view.ranked[0].lat, 37.541);
  assert.equal(snapshot.view.ranked[0].lng, 127.056);
  assert.equal(snapshot.view.ranked[0].source, 'visitkorea');
  assert.equal(snapshot.report.instrumentation.source, 'visitkorea-chart-api');
  assert.match(calls[0].input, /korean\.visitkorea\.or\.kr\/call/);
  assert.match(calls[0].body, /cmd=AREA_CHART_LIST/);
  assert.match(decodeURIComponent(calls[0].body), /"11200"/);
});

test('VisitKorea chart loader aggregates every selected Seoul district separately', async (t) => {
  const dbPath = await createTempDb(t);
  const calls: string[] = [];
  const fetchImpl = async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push(decodeURIComponent(String(init.body)));
    const body = String(init.body);
    const name = body.includes('11110') ? '종로 맛집' : '중구 맛집';
    const address = body.includes('11110') ? '서울 종로구 종로 1' : '서울 중구 세종대로 1';

    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      async json() {
        return {
          body: {
            chartList: [
              {
                ENT_NM1: name,
                ROAD_NM_ADDR: address,
                SE_CD: '한식',
                LAT: '37.57',
                LON: '126.98'
              }
            ]
          }
        };
      }
    } as Response;
  };

  const loader = createVisitKoreaChartLoader({ fetchImpl, dbPath });
  const snapshot = await loader.loadNeighborhoodSnapshot({
    ...seongsu,
    id: 'seoul-all',
    name: '서울 전체',
    visitKoreaChart: {
      ctpvNm: '서울특별시',
      sggCds: ['11110', '11140'],
      categories: [],
      type: 1
    }
  });

  assert(snapshot);
  assert.equal(calls.length, 2);
  assert(calls[0].includes('"11110"'));
  assert(calls[1].includes('"11140"'));
  assert.equal(snapshot.view.ranked.length, 2);
  assert.deepEqual(snapshot.view.ranked.map((restaurant) => restaurant.name), ['종로 맛집', '중구 맛집']);
  loader.close();
});

test('VisitKorea chart loader reads previously fetched restaurants from SQLite', async (t) => {
  const dbPath = await createTempDb(t);
  let callCount = 0;
  const fetchImpl = async () => {
    callCount += 1;
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      async json() {
        return {
          body: {
            chartList: [
              {
                ENT_NM1: 'SQLite 저장 맛집',
                ROAD_NM_ADDR: '서울 성동구 저장로 1',
                SE_CD: '한식',
                LAT: '37.54',
                LON: '127.05'
              }
            ]
          }
        };
      }
    } as Response;
  };

  const firstLoader = createVisitKoreaChartLoader({ fetchImpl, dbPath });
  const firstSnapshot = await firstLoader.loadNeighborhoodSnapshot(seongsu);
  firstLoader.close();

  const secondLoader = createVisitKoreaChartLoader({
    dbPath,
    fetchImpl: async () => {
      throw new Error('network should not be called when SQLite cache has rows');
    }
  });
  const secondSnapshot = await secondLoader.loadNeighborhoodSnapshot(seongsu);
  secondLoader.close();

  assert.equal(callCount, 1);
  assert.equal(firstSnapshot?.view.ranked[0].name, 'SQLite 저장 맛집');
  assert.equal(secondSnapshot?.view.ranked[0].name, 'SQLite 저장 맛집');
  assert.equal(secondSnapshot?.view.ranked[0].roadAddressName, '서울 성동구 저장로 1');
});
