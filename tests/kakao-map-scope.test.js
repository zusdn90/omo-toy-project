import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const apiSource = await readFile(new URL('../src/api.js', import.meta.url), 'utf8');
const readmeSource = await readFile(new URL('../README.md', import.meta.url), 'utf8');
const docSource = await readFile(new URL('../docs/kakao-map-integration.md', import.meta.url), 'utf8');

test('Kakao Maps stays a client-side SDK integration over seeded restaurant coordinates', () => {
  assert.match(mainSource, /const NEIGHBORHOOD_MAP_CENTERS = \{/);
  assert.match(mainSource, /const RESTAURANT_LAT_SPAN = 0\.00036;/);
  assert.match(mainSource, /const RESTAURANT_LNG_SPAN = 0\.00044;/);
  assert.match(mainSource, /function getRestaurantLatLng\(restaurant, kakao, neighborhoodId\)/);
  assert.match(mainSource, /return new kakao\.maps\.LatLng\(lat, lng\);/);
  assert.match(mainSource, /const markers = view\.ranked\.map\(\(restaurant\) => \{/);
});

test('Kakao SDK loader remains browser-side and marker clicks reuse the shared selection state', () => {
  assert.match(mainSource, /https:\/\/dapi\.kakao\.com\/v2\/maps\/sdk\.js\?appkey=\$\{KAKAO_JS_KEY\}&autoload=false/);
  assert.match(mainSource, /window\.kakao\.maps\.load\(\(\) => resolve\(window\.kakao\)\)/);
  assert.match(mainSource, /kakao\.maps\.event\.addListener\(marker, 'click', \(\) => \{/);
  assert.match(mainSource, /state\.selectedRestaurantId = restaurant\.id;/);
  assert.match(mainSource, /infoWindow\.open\(map, selectedEntry\.marker\);/);
});

test('UI data loading remains local-API backed rather than Kakao place search backed', () => {
  assert.match(apiSource, /\/api\/neighborhoods/);
  assert.match(apiSource, /\/api\/neighborhoods\/\$\{safeNeighborhoodId\}\/view/);
  assert.match(apiSource, /\/api\/neighborhoods\/\$\{safeNeighborhoodId\}\/report/);
  assert.doesNotMatch(mainSource, /kakao\.maps\.services/);
  assert.doesNotMatch(mainSource, /keywordSearch|categorySearch|Geocoder|Places/);
  assert.doesNotMatch(apiSource, /kakao/i);
});

test('repository docs point to the verified Kakao Map scope baseline', () => {
  assert.match(readmeSource, /docs\/kakao-map-integration\.md/);
  assert.match(docSource, /seeded restaurant 데이터/);
  assert.match(docSource, /marker\/list synchronization/);
  assert.match(docSource, /Kakao Places keyword\/category search/);
});
