import { readFile } from 'node:fs/promises';
import { neighborhoods, restaurants, buildNeighborhoodView } from '../src/domain.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
assert(html.includes('id="app"'), 'index.html must provide #app mount point');
assert(html.includes('src="src/main.js"'), 'index.html must load src/main.js as the entry module');

const neighborhoodIds = new Set(neighborhoods.map((item) => item.id));
assert(neighborhoodIds.size === neighborhoods.length, 'Neighborhood IDs must be unique');

const restaurantIds = new Set();
for (const restaurant of restaurants) {
  assert(!restaurantIds.has(restaurant.id), `Duplicate restaurant id: ${restaurant.id}`);
  restaurantIds.add(restaurant.id);
  assert(neighborhoodIds.has(restaurant.neighborhoodId), `${restaurant.name} references unknown neighborhood`);
  assert(restaurant.x >= 0 && restaurant.x <= 100, `${restaurant.name} x coordinate must stay inside map bounds`);
  assert(restaurant.y >= 0 && restaurant.y <= 100, `${restaurant.name} y coordinate must stay inside map bounds`);
}

for (const neighborhood of neighborhoods) {
  const view = buildNeighborhoodView(neighborhood.id);
  assert(view.ranked.length > 0, `${neighborhood.name} should have seeded restaurants`);
  assert(view.top5.length <= 5, `${neighborhood.name} top5 must not exceed 5 items`);
  assert(view.selected?.id === view.ranked[0]?.id, `${neighborhood.name} should default to the top-ranked restaurant`);
}

console.log('Lint checks passed.');
