import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSelectedRestaurant } from '../src/lib/explorer-state';
import type { NeighborhoodView } from '../src/lib/types';

test('resolveSelectedRestaurant keeps the preferred restaurant when it still exists in the new view', () => {
  const view = {
    source: 'seeded',
    ranked: [
      { id: 'first', name: '첫 번째', score: 99, reasons: ['첫 번째'] },
      { id: 'second', name: '두 번째', score: 98, reasons: ['두 번째'] }
    ],
    top5: [],
    selected: { id: 'first', name: '첫 번째', score: 99, reasons: ['첫 번째'] },
    summary: {
      totalRestaurants: 2,
      averageScore: '90.0',
      bestEvidenceName: '첫 번째',
      lowestPriceLabel: '9,000원'
    },
    neighborhood: null
  } as NeighborhoodView;

  assert.equal(resolveSelectedRestaurant(view, ['second'])?.id, 'second');
  assert.equal(resolveSelectedRestaurant(view, ['missing'])?.id, 'first');
  assert.equal(resolveSelectedRestaurant(view, [])?.id, 'first');
});
