import test from 'node:test';
import assert from 'node:assert/strict';

import { buildExplorerMetrics, getPlaceBadge, getPlaceLocationLabel, getPlaceSubtitle } from '../src/lib/explorer-display';
import type { CandidateReport, NeighborhoodView } from '../src/lib/types';

test('display helpers prioritize the strongest place metadata for labels and badges', () => {
  assert.equal(getPlaceLocationLabel({ roadAddressName: '도로명 주소', addressName: '지번 주소', note: '메모' }), '도로명 주소');
  assert.equal(getPlaceLocationLabel({ addressName: '지번 주소', note: '메모' }), '지번 주소');
  assert.equal(getPlaceLocationLabel({ note: '메모' }), '메모');
  assert.equal(getPlaceLocationLabel({}), '-');

  assert.equal(getPlaceSubtitle({ distanceMeters: 1234, category: '한식' }), '1,234m · 한식');
  assert.equal(getPlaceSubtitle({ avgMealPrice: 9800, category: '한식' }), '한식 · 평균 9,800원');
  assert.equal(getPlaceSubtitle({ category: '한식', note: '메모' }), '한식');
  assert.equal(getPlaceSubtitle({ note: '메모' }), '메모');

  assert.equal(getPlaceBadge({ score: 91.2, distanceMeters: 300 }), 91.2);
  assert.equal(getPlaceBadge({ distanceMeters: 300 }), 300);
  assert.equal(getPlaceBadge({}), '-');
});

test('buildExplorerMetrics switches labels for kakao-backed and seeded neighborhoods', () => {
  const kakaoView = {
    source: 'kakao',
    ranked: [{ id: 'a', name: 'A' }],
    top5: [{ id: 'a', name: 'A' }],
    selected: null,
    summary: {
      totalPlaces: 12,
      averageScore: '88.1',
      bestEvidenceName: '후보 A',
      lowestPriceLabel: '9,500원',
      averageDistance: 1234,
      searchQuery: '을지로 맛집'
    },
    neighborhood: null
  } as NeighborhoodView;
  const kakaoReport = {
    source: 'kakao',
    neighborhood: null,
    summary: { candidateCount: 12, shortlistCount: 5, averageDistance: 1234, nearestDistance: 250 },
    instrumentation: {
      source: 'kakao-local-api',
      query: '을지로 맛집',
      radiusMeters: 1500,
      sort: 'distance',
      weights: { taste: 0.34, affordability: 0.26, evidence: 0.25, sentiment: 0.15 },
      strategy: '전략',
      thresholds: { affordableMealPrice: 10000, evidenceStrong: 70, highConfidenceRatio: 0.91 }
    },
    shortlist: [],
    candidates: [],
    narrative: 'narrative'
  } as CandidateReport;

  const kakaoMetrics = buildExplorerMetrics(kakaoView, kakaoReport);
  assert.deepEqual(kakaoMetrics, [
    { label: '탐색 결과', value: '12' },
    { label: '평균 점수', value: '88.1' },
    { label: 'Top 5 압축', value: '5/12' },
    { label: '평균 거리', value: '1,234m' }
  ]);

  const seededView = {
    source: 'seeded',
    ranked: [{ id: 'a', name: 'A' }],
    top5: [{ id: 'a', name: 'A' }],
    selected: null,
    summary: {
      totalRestaurants: 1,
      averageScore: '82.0',
      bestEvidenceName: '후보 A',
      lowestPriceLabel: '8,500원'
    },
    neighborhood: null
  } as NeighborhoodView;

  const seededMetrics = buildExplorerMetrics(seededView, null);
  assert.deepEqual(seededMetrics, [
    { label: '탐색 결과', value: '1' },
    { label: '평균 가성비 점수', value: '82.0' },
    { label: 'Top 5 압축', value: '1/1' },
    { label: '데이터 소스', value: 'Seeded fallback' }
  ]);
});


test('buildExplorerMetrics labels Naver shared-list data separately', () => {
  const naverView = {
    source: 'naver',
    ranked: [{ id: 'a', name: 'A', score: 100, reasons: ['네이버'] }],
    top5: [{ id: 'a', name: 'A', score: 100, reasons: ['네이버'] }],
    selected: null,
    summary: {
      totalRestaurants: 422,
      totalPlaces: 422,
      averageScore: '79.0',
      bestEvidenceName: '회다이',
      lowestPriceLabel: '-',
      searchQuery: '네이버 지도 저장목록 맛집'
    },
    neighborhood: null
  } as NeighborhoodView;

  assert.deepEqual(buildExplorerMetrics(naverView, null), [
    { label: '탐색 결과', value: '422' },
    { label: '평균 점수', value: '79.0' },
    { label: 'Top 5 압축', value: '1/1' },
    { label: '데이터 소스', value: 'Naver saved list' }
  ]);
});
