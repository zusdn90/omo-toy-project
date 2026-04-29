import test from 'node:test';
import assert from 'node:assert/strict';

import { filterNeighborhoodViewByRestaurantName, resolveSelectedRestaurant } from '../src/lib/explorer-state';
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

test('filterNeighborhoodViewByRestaurantName narrows current neighborhood results by restaurant name', () => {
  const view = {
    source: 'seeded',
    ranked: [
      { id: 'first', name: '성수 갈비집', score: 99, avgMealPrice: 12000, reasons: ['첫 번째'] },
      { id: 'second', name: '누들랩 성수', score: 88, avgMealPrice: 9000, reasons: ['두 번째'] }
    ],
    top5: [
      { id: 'first', name: '성수 갈비집', score: 99, avgMealPrice: 12000, reasons: ['첫 번째'] },
      { id: 'second', name: '누들랩 성수', score: 88, avgMealPrice: 9000, reasons: ['두 번째'] }
    ],
    selected: { id: 'first', name: '성수 갈비집', score: 99, avgMealPrice: 12000, reasons: ['첫 번째'] },
    summary: {
      totalRestaurants: 2,
      averageScore: '93.5',
      bestEvidenceName: '성수 갈비집',
      lowestPriceLabel: '9,000원'
    },
    neighborhood: null
  } as NeighborhoodView;

  const filtered = filterNeighborhoodViewByRestaurantName(view, '누들');
  assert.equal(filtered.ranked.length, 1);
  assert.equal(filtered.ranked[0].id, 'second');
  assert.equal(filtered.top5.length, 1);
  assert.equal(filtered.selected?.id, 'second');
  assert.equal(filtered.summary.totalRestaurants, 1);
  assert.equal(filtered.summary.averageScore, '88.0');

  const empty = filterNeighborhoodViewByRestaurantName(view, '없는 식당');
  assert.equal(empty.ranked.length, 0);
  assert.equal(empty.selected, null);
  assert.equal(empty.summary.totalRestaurants, 0);
});
