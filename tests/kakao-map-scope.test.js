import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const serverSource = await readFile(new URL('../src/server.js', import.meta.url), 'utf8');
const kakaoSource = await readFile(new URL('../src/kakao-local.js', import.meta.url), 'utf8');
const readmeSource = await readFile(new URL('../README.md', import.meta.url), 'utf8');

test('Kakao JS key now flows through runtime config instead of source hardcoding', () => {
  assert.match(mainSource, /window\.__OMO_APP_CONFIG__/);
  assert.match(mainSource, /KAKAO_JS_KEY = runtimeConfig\.kakaoJsKey \?\? ''/);
  assert.doesNotMatch(mainSource, /const KAKAO_JS_KEY = '[0-9a-f]{32}';/);
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
  assert.match(kakaoSource, /normalizePlace\(place, index, neighborhood\)/);
  assert.match(kakaoSource, /const lat = toNumber\(place\.y\);/);
  assert.match(kakaoSource, /const lng = toNumber\(place\.x\);/);
  assert.match(kakaoSource, /distanceMeters/);
  assert.match(mainSource, /getRestaurantLatLng\(restaurant, kakao, neighborhoodId\)/);
  assert.match(mainSource, /if \(Number\.isFinite\(restaurant\.lat\) && Number\.isFinite\(restaurant\.lng\)\)/);
  assert.match(mainSource, /state\.selectedRestaurantId = restaurant\.id;/);
});
