import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const explorerSource = await readFile(new URL('../src/components/neighborhood-explorer.tsx', import.meta.url), 'utf8');
const shellSource = await readFile(new URL('../src/components/neighborhood-explorer-shell.tsx', import.meta.url), 'utf8');
const mapSource = await readFile(new URL('../src/components/kakao-map-panel.tsx', import.meta.url), 'utf8');
const serverSource = await readFile(new URL('../src/server.ts', import.meta.url), 'utf8');
const kakaoSource = await readFile(new URL('../src/kakao-local.ts', import.meta.url), 'utf8');
const readmeSource = await readFile(new URL('../README.md', import.meta.url), 'utf8');

test('Kakao JS key now flows through runtime config instead of source hardcoding', () => {
  assert.match(mapSource, /window\.__OMO_APP_CONFIG__\?\.kakaoJsKey/);
  assert.doesNotMatch(mapSource, /const kakaoJsKey = '[0-9a-f]{32}';/);
  assert.match(serverSource, /\/runtime-config\.js/);
  assert.match(readmeSource, /\.env/);
});

test('Kakao REST integration is server-side and uses the Local keyword search endpoint', () => {
  assert.match(serverSource, /KAKAO_REST_API_KEY/);
  assert.match(kakaoSource, /search\/keyword\.json/);
  assert.match(kakaoSource, /Authorization: `KakaoAK \$\{apiKey\}`/);
  assert.match(kakaoSource, /createKakaoNeighborhoodLoader/);
});

test('Kakao place normalization keeps marker/list sync data available to the UI', () => {
  assert.match(kakaoSource, /normalizePlace\(place: KakaoSearchDocument, index: number, neighborhood: Neighborhood\)/);
  assert.match(kakaoSource, /const lat = toNumber\(place\.y\);/);
  assert.match(kakaoSource, /const lng = toNumber\(place\.x\);/);
  assert.match(kakaoSource, /distanceMeters/);
  assert.match(shellSource, /KakaoMapPanel/);
  assert.match(mapSource, /getRestaurantLatLng\(restaurant, kakao, view\)/);
  assert.match(mapSource, /function isFiniteNumber\(value: number \| undefined\): value is number/);
  assert.match(mapSource, /if \(isFiniteNumber\(restaurant\.lat\) && isFiniteNumber\(restaurant\.lng\)\)/);
  assert.match(explorerSource, /setSelectedRestaurantId\(id\)/);
});
