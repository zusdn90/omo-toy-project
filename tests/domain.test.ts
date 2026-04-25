import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCandidateReport,
  buildNeighborhoodView,
  buildReasons,
  calculateValueScore,
  restaurants,
  SCORE_WEIGHTS
} from '../src/domain';

test('calculateValueScore rewards strong taste/evidence without exceeding a usable range', () => {
  const restaurant = restaurants.find((item) => item.id === 'mangwon-bbq-alley');
  const score = calculateValueScore(restaurant!);

  assert.equal(typeof score, 'number');
  assert(score > 75);
  assert(score <= 100);
});

test('buildReasons explains why a strong candidate is recommended', () => {
  const restaurant = restaurants.find((item) => item.id === 'euljiro-roast-house');
  const reasons = buildReasons(restaurant!);

  assert(reasons.some((reason) => reason.includes('근거량')));
  assert(reasons.some((reason) => reason.includes('맛 만족도')));
});

test('buildNeighborhoodView sorts restaurants and returns only top 5', () => {
  const view = buildNeighborhoodView('seongsu');
  const scores: number[] = view.ranked.map((restaurant) => restaurant.score);

  assert.equal(view.top5.length, 5);
  assert.equal(view.selected?.id, view.ranked[0]?.id);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
});

test('buildNeighborhoodView handles neighborhoods with no restaurants gracefully', () => {
  const view = buildNeighborhoodView('missing-neighborhood');

  assert.equal(view.neighborhood, null);
  assert.deepEqual(view.ranked, []);
  assert.deepEqual(view.top5, []);
  assert.equal(view.selected, null);
  assert.equal(view.summary.averageScore, '0.0');
});

test('top 5 order mirrors the full ranking order', () => {
  const view = buildNeighborhoodView('mangwon');

  assert.deepEqual(
    view.top5.map((restaurant) => restaurant.id),
    view.ranked.slice(0, 5).map((restaurant) => restaurant.id)
  );
});

test('buildCandidateReport exposes measurable shortlist instrumentation', () => {
  const report = buildCandidateReport('euljiro');

  assert.equal(report.summary.candidateCount, 6);
  assert.equal(report.summary.shortlistCount, 5);
  assert.equal(report.instrumentation.weights.evidence, SCORE_WEIGHTS.evidence);
  assert(report.shortlist[0].primaryReason.length > 0);
  assert(report.candidates.every((candidate) => typeof candidate.signals.affordable === 'boolean'));
});
