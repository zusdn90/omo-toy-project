import { currency, formatDistance } from './format';
import type { CandidateReport, NeighborhoodView, Restaurant } from './types';

export type ExplorerMetric = {
  label: string;
  value: string;
};

export function getPlaceLocationLabel(place: Pick<Restaurant, 'roadAddressName' | 'addressName' | 'note'>) {
  return place.roadAddressName || place.addressName || place.note || '-';
}

export function getPlaceSubtitle(place: Pick<Restaurant, 'distanceMeters' | 'category' | 'avgMealPrice' | 'note'>) {
  if (Number.isFinite(place.distanceMeters ?? Number.NaN)) {
    return `${formatDistance(place.distanceMeters)} · ${place.category ?? '-'}`;
  }

  if (Number.isFinite(place.avgMealPrice ?? Number.NaN)) {
    return `${place.category ?? '-'} · 평균 ${currency(place.avgMealPrice)}`;
  }

  return place.category || place.note || '-';
}

export function getPlaceBadge(place: Pick<Restaurant, 'score' | 'distanceMeters'>) {
  if (Number.isFinite(place.score ?? Number.NaN)) {
    return place.score;
  }

  if (Number.isFinite(place.distanceMeters ?? Number.NaN)) {
    return place.distanceMeters;
  }

  return '-';
}

export function buildExplorerMetrics(view: NeighborhoodView, report: CandidateReport | null) {
  const totalPlaces = view.summary.totalPlaces ?? view.summary.totalRestaurants ?? view.ranked.length;
  const scoreLabel = view.source === 'seeded' ? '평균 가성비 점수' : '평균 점수';
  const sourceLabel = view.source === 'kakao' ? '평균 거리' : '데이터 소스';
  const sourceValue = view.source === 'kakao'
    ? formatDistance(report?.summary.averageDistance ?? view.summary.averageDistance)
    : view.source === 'naver'
      ? 'Naver saved list'
      : view.source === 'visitkorea'
        ? 'VisitKorea chart'
        : 'Seeded fallback';

  return [
    { label: '탐색 결과', value: String(totalPlaces) },
    { label: scoreLabel, value: String(view.summary.averageScore ?? '0.0') },
    { label: 'Top 5 압축', value: `${String(report?.summary.shortlistCount ?? view.top5.length)}/${String(report?.summary.candidateCount ?? view.ranked.length)}` },
    { label: sourceLabel, value: sourceValue }
  ] satisfies ExplorerMetric[];
}
