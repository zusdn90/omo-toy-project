import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import { NeighborhoodExplorerShell } from '../src/components/neighborhood-explorer-shell';
import type { CandidateReport, Neighborhood, NeighborhoodView } from '../src/lib/types';

const neighborhoods = [
  { id: 'seongsu', name: '성수', vibe: 'vibe', mapCenter: { lat: 37.5, lng: 127.0, level: 4 } },
  { id: 'mangwon', name: '망원', vibe: 'vibe', mapCenter: { lat: 37.5, lng: 127.0, level: 4 } }
] as Neighborhood[];

const view = {
  source: 'seeded',
  neighborhood: neighborhoods[0],
  ranked: [
    {
      id: 'first',
      name: '첫 번째',
      category: '한식',
      avgMealPrice: 9000,
      score: 91.2,
      distanceMeters: 120,
      note: '메모'
    }
  ],
  top5: [
    {
      id: 'first',
      name: '첫 번째',
      category: '한식',
      avgMealPrice: 9000,
      score: 91.2,
      distanceMeters: 120,
      note: '메모'
    }
  ],
  selected: {
    id: 'first',
    name: '첫 번째',
    category: '한식',
    avgMealPrice: 9000,
    score: 91.2,
    distanceMeters: 120,
    note: '메모'
  },
  summary: {
    totalRestaurants: 1,
    averageScore: '91.2',
    bestEvidenceName: '첫 번째',
    lowestPriceLabel: '9,000원'
  }
} as NeighborhoodView;

const report = {
  source: 'seeded',
  neighborhood: neighborhoods[0],
  summary: {
    candidateCount: 1,
    shortlistCount: 1,
    affordableCount: 1,
    evidenceStrongCount: 1,
    highConfidenceCount: 1
  },
  instrumentation: {
    source: 'seeded',
    weights: { taste: 0.34, affordability: 0.26, evidence: 0.25, sentiment: 0.15 },
    strategy: 'strategy',
    thresholds: { affordableMealPrice: 10000, evidenceStrong: 70, highConfidenceRatio: 0.91 }
  },
  shortlist: [
    {
      rank: 1,
      id: 'first',
      name: '첫 번째',
      score: 91.2,
      avgMealPrice: 9000,
      evidenceCount: 80,
      primaryReason: '좋음'
    }
  ],
  candidates: [
    {
      rank: 1,
      id: 'first',
      name: '첫 번째',
      score: 91.2,
      avgMealPrice: 9000,
      evidenceCount: 80,
      blogMentions: 20,
      positiveReviewRatio: 0.95,
      signals: { affordable: true, evidenceStrong: true, highConfidence: true },
      primaryReason: '좋음'
    }
  ],
  narrative: '리포트'
} as CandidateReport;

test('NeighborhoodExplorerShell renders the main sections for manual review', () => {
  const markup = renderToStaticMarkup(
    <NeighborhoodExplorerShell
      neighborhoods={neighborhoods}
      activeNeighborhood={neighborhoods[0]}
      activeNeighborhoodId="seongsu"
      view={view}
      report={report}
      selectedRestaurant={view.selected}
      selectedRestaurantId="first"
      onSelectNeighborhood={() => {}}
      onSelectRestaurant={() => {}}
    />
  );

  assert(markup.includes('동네를 빠르게 전환'));
  assert(markup.includes('자동 추천 Top 5'));
  assert(markup.includes('전체 후보 랭킹'));
  assert(markup.includes('Kakao Map'));
  assert(markup.includes('후보 탐색 리포트'));
});
