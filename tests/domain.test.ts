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


test('buildNeighborhoodView stores every Naver shared-list place with coordinates', () => {
  const view = buildNeighborhoodView('naver-shared');

  assert.equal(view.source, 'naver');
  assert.equal(view.summary.totalRestaurants, 422);
  assert.equal(view.ranked.length, 422);
  assert.equal(view.top5.length, 5);
  assert.equal(view.selected?.name, '회다이');
  assert.equal(view.ranked[0].source, 'naver');
  assert.equal(typeof view.ranked[0].lat, 'number');
  assert.equal(typeof view.ranked[0].lng, 'number');
});

test('buildNeighborhoodView overlays Naver saved-list places onto the Seoul-wide map view', () => {
  const view = buildNeighborhoodView('seoul-all');
  const naverMarkers = view.ranked.filter((restaurant) => restaurant.source === 'naver');

  assert.equal(view.summary.totalRestaurants, restaurants.length + 422);
  assert.equal(view.summary.totalPlaces, restaurants.length + 422);
  assert.equal(naverMarkers.length, 422);
  assert(view.ranked.some((restaurant) => restaurant.source !== 'naver'));
  assert.equal(naverMarkers[0].name, '회다이');
  assert.equal(typeof naverMarkers[0].lat, 'number');
  assert.equal(typeof naverMarkers[0].lng, 'number');
});

test('buildCandidateReport describes the Naver shared-list source', () => {
  const report = buildCandidateReport('naver-shared');

  assert.equal(report.source, 'naver');
  assert.equal(report.summary.candidateCount, 422);
  assert.equal(report.instrumentation.source, 'naver-shared-list');
  assert.equal(report.instrumentation.query, 'https://naver.me/5SKab3tu');
  assert(report.narrative.includes('422곳'));
});

test('buildCandidateReport counts Naver saved-list places in the Seoul-wide candidate report', () => {
  const report = buildCandidateReport('seoul-all');

  assert.equal(report.summary.candidateCount, restaurants.length + 422);
  assert.equal(report.summary.shortlistCount, 5);
  assert(report.candidates.some((candidate) => candidate.id.startsWith('naver-')));
});
