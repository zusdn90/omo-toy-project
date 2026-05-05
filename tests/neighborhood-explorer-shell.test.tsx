import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ExplorerHero } from '../src/components/explorer-intro';
import { SelectedRestaurantPanel } from '../src/components/explorer-detail';
import { TopFivePanel } from '../src/components/explorer-overview';
import { KakaoMapPanel } from '../src/components/kakao-map-panel';
import { NeighborhoodExplorerShell } from '../src/components/neighborhood-explorer-shell';
import type { CandidateReport, Neighborhood, NeighborhoodView } from '../src/lib/types';

const neighborhoods = [
  { id: 'seoul-all', name: '서울 전체', vibe: 'vibe', mapCenter: { lat: 37.5, lng: 127.0, level: 4 } },
  { id: 'seongsu', name: '성수', vibe: 'vibe', mapCenter: { lat: 37.5, lng: 127.0, level: 4 } },
  { id: 'mangwon', name: '망원', vibe: 'vibe', mapCenter: { lat: 37.5, lng: 127.0, level: 4 } },
  { id: 'gwangjin', name: '광진구', vibe: 'vibe', mapCenter: { lat: 37.5, lng: 127.0, level: 4 } },
  { id: 'dongdaemun', name: '동대문구', vibe: 'vibe', mapCenter: { lat: 37.5, lng: 127.0, level: 4 } }
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
      searchQuery=""
      onSearchQueryChange={() => {}}
      onSelectNeighborhood={() => {}}
      onSelectRestaurant={() => {}}
    />
  );

  assert(markup.includes('동네 맛집 탐방'));
  assert(!markup.includes('맛집 탐색 노트'));
  assert(!markup.includes('Dining atlas'));
  assert(markup.includes('surface-grid'));
  assert(markup.includes('후보 1곳'));
  assert(markup.includes('선택한 맛집 자세히 보기'));
  assert(!markup.includes('id="restaurant-detail"'));
  assert(!markup.includes('네이버 저장 맛집'));
  assert(markup.includes('서울 전체'));
  assert(markup.includes('광진구'));
  assert(markup.includes('동대문구'));
  assert(markup.includes('aria-pressed'));
  assert(markup.includes('rounded-['));
  assert(!markup.includes('전환하기'));
  assert(!markup.includes('현재 탐색'));
  assert(!markup.includes('Dashboard'));
  assert(!markup.includes('Workspace'));
  assert(!markup.includes('활성 동네'));
  assert(!markup.includes('모바일 앱 홈'));
  assert(!markup.includes('실시간 탐색'));
  assert(!markup.includes('Local data'));
  assert(!markup.includes('블로그 후보 탐색 시간을 줄이기 위한 개인용 MVP'));
  assert(!markup.includes('Kakao Map powered'));
  assert(markup.includes('자동 추천 Top 5'));
  assert(markup.includes('Kakao Map'));
  assert(!markup.includes('지도 + 추천'));
  assert(!markup.includes('seeded fallback'));
  assert(!markup.includes('kakao local'));
  assert(markup.includes('상세정보'));
  assert(markup.includes('식당 이름으로 검색'));
  assert(!markup.includes('Neighborhood switcher'));
  assert(!markup.includes('동네 선택'));
  assert(!markup.includes('탐색 결과'));
  assert(!markup.includes('평균 가성비 점수'));
  assert(!markup.includes('Top 5 압축'));
  assert(!markup.includes('데이터 소스'));
  assert(!markup.includes('전체 후보 랭킹'));
  assert(!markup.includes('후보 탐색 리포트'));
});

test('TopFivePanel keeps recommendation scores out of the card surface', () => {
  const markup = renderToStaticMarkup(<TopFivePanel restaurants={view.top5} selectedRestaurantId="first" onSelectRestaurant={() => {}} />);

  assert(markup.includes('자동 추천 Top 5'));
  assert(!markup.includes('Shortlist'));
  assert(!markup.includes('지도와 동기화'));
  assert(markup.includes('overflow-x-auto'));
  assert(markup.includes('min-w-['));
  assert(markup.includes('Curated'));
  assert(markup.includes('한식'));
  assert(!markup.includes('91.2'));
});

test('ExplorerHero removes implementation badges from the visible hero copy', () => {
  const markup = renderToStaticMarkup(<ExplorerHero />);

  assert(!markup.includes('개인용 블로그 후보 발굴 대시보드'));
  assert(!markup.includes('Next.js + React + TypeScript'));
});

test('KakaoMapPanel lets the map canvas fill the card body instead of leaving bottom whitespace', () => {
  const markup = renderToStaticMarkup(<KakaoMapPanel view={view} selectedRestaurant={view.selected} onSelectRestaurant={() => {}} />);

  assert(markup.includes('flex min-h-['));
  assert(markup.includes('flex-1'));
  assert(markup.includes('지도 탐색'));
  assert(markup.includes('aria-label="카카오 지도"'));
});

test('SelectedRestaurantPanel shows readable unique address details without duplicated VisitKorea text', () => {
  const markup = renderToStaticMarkup(
    <SelectedRestaurantPanel
      selectedRestaurant={{
        id: 'visitkorea-place',
        name: '서울 맛집',
        category: '한식',
        score: 100,
        roadAddressName: '서울 종로구 종로 1',
        addressName: '서울 종로구 종로 1',
        note: '대한민국 구석구석 맛집차트 현지인 랭킹 1위',
        reasons: ['대한민국 구석구석 맛집차트에서 1위로 노출된 후보예요.', '주소: 서울 종로구 종로 1'],
        placeUrl: 'https://korean.visitkorea.or.kr/detail/detail_view.do?cotid=test',
        source: 'visitkorea'
      }}
    />
  );

  assert(markup.includes('맛집차트'));
  assert(!markup.includes('차트 점수'));
  assert(markup.includes('도로명 주소'));
  assert(markup.includes('서울 종로구 종로 1'));
  assert(markup.includes('대한민국 구석구석 상세 페이지 열기'));
  assert(!markup.includes('주소: 서울 종로구 종로 1'));
  assert.equal((markup.match(/서울 종로구 종로 1/g) ?? []).length, 1);
});


test('SelectedRestaurantPanel renders a restaurant review form and saved review summary', () => {
  const markup = renderToStaticMarkup(
    <SelectedRestaurantPanel
      selectedRestaurant={{
        id: 'first',
        name: '첫 번째',
        category: '한식',
        score: 91.2
      }}
      reviews={[
        {
          id: 'review-1',
          restaurantId: 'first',
          reviewerName: '오모',
          rating: 5,
          content: '다시 방문하고 싶은 집이에요.',
          createdAt: '2026-04-29T12:00:00.000Z'
        }
      ]}
      onSubmitReview={() => ({ ok: true })}
    />
  );

  assert(markup.includes('방문 리뷰'));
  assert(markup.includes('리뷰 평균'));
  assert(markup.includes('5.0/5'));
  assert(markup.includes('남겨진 리뷰'));
  assert(markup.includes('1개'));
  assert(markup.includes('작성자'));
  assert(markup.includes('별점'));
  assert(markup.includes('리뷰 내용'));
  assert(markup.includes('리뷰 남기기'));
  assert(markup.includes('오모'));
  assert(markup.includes('다시 방문하고 싶은 집이에요.'));
});


test('SelectedRestaurantPanel labels Naver saved places and links to Naver map', () => {
  const markup = renderToStaticMarkup(
    <SelectedRestaurantPanel
      selectedRestaurant={{
        id: 'naver-place',
        name: '네이버 맛집',
        category: '음식점',
        score: 100,
        roadAddressName: '서울 중랑구 봉우재로 129',
        addressName: '서울 중랑구 봉우재로 129',
        reasons: ['네이버 지도 공유 저장목록 "맛집"에 저장된 후보예요.'],
        placeUrl: 'https://map.naver.com/p/entry/place/1848165574',
        source: 'naver'
      }}
    />
  );

  assert(markup.includes('Naver saved'));
  assert(markup.includes('저장목록 점수'));
  assert(markup.includes('네이버 지도 장소 상세 페이지 열기'));
});
