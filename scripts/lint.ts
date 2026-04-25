import { readFile } from 'node:fs/promises';

import { neighborhoods, restaurants, buildNeighborhoodView } from '../src/domain';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const layout = await readFile(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');
const page = await readFile(new URL('../src/app/page.tsx', import.meta.url), 'utf8');
const explorer = await readFile(new URL('../src/components/neighborhood-explorer.tsx', import.meta.url), 'utf8');
const shell = await readFile(new URL('../src/components/neighborhood-explorer-shell.tsx', import.meta.url), 'utf8');
assert(layout.includes('runtime-config.js'), 'layout.tsx must load the runtime config script');
assert(page.includes('NeighborhoodExplorer'), 'page.tsx must render the explorer component');
assert(explorer.includes('NeighborhoodExplorerShell'), 'neighborhood-explorer.tsx must compose the shell component');
assert(shell.includes('KakaoMapPanel'), 'neighborhood-explorer-shell.tsx must compose the Kakao map panel');

const neighborhoodIds = new Set(neighborhoods.map((item) => item.id));
assert(neighborhoodIds.size === neighborhoods.length, 'Neighborhood IDs must be unique');

const restaurantIds = new Set<string>();
for (const restaurant of restaurants) {
  assert(!restaurantIds.has(restaurant.id), `Duplicate restaurant id: ${restaurant.id}`);
  restaurantIds.add(restaurant.id);
  assert(restaurant.neighborhoodId && neighborhoodIds.has(restaurant.neighborhoodId), `${restaurant.name} references unknown neighborhood`);
  assert(restaurant.x !== undefined && restaurant.x >= 0 && restaurant.x <= 100, `${restaurant.name} x coordinate must stay inside map bounds`);
  assert(restaurant.y !== undefined && restaurant.y >= 0 && restaurant.y <= 100, `${restaurant.name} y coordinate must stay inside map bounds`);
}

for (const neighborhood of neighborhoods) {
  const view = buildNeighborhoodView(neighborhood.id);
  assert(view.ranked.length > 0, `${neighborhood.name} should have seeded restaurants`);
  assert(view.top5.length <= 5, `${neighborhood.name} top5 must not exceed 5 items`);
  assert(view.selected?.id === view.ranked[0]?.id, `${neighborhood.name} should default to the top-ranked restaurant`);
}

console.log('Lint checks passed.');
