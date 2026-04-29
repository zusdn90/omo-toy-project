import { neighborhoods, restaurants } from './data';
import { NAVER_SHARED_RESTAURANTS_SOURCE_URL, naverSharedRestaurants } from './naver-shared-restaurants';
import { SCORE_WEIGHTS } from './lib/scoring';
import type {
  CandidateReport,
  EnrichedRestaurant,
  Neighborhood,
  NeighborhoodSnapshot,
  NeighborhoodView,
  SeedRestaurant
} from './lib/types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const MIN_PRICE = 7000;
const PRICE_RANGE = 9000;
const MAX_SCORE = 100;
type RankedSeedRestaurant = SeedRestaurant & EnrichedRestaurant;
const NAVER_SHARED_OVERLAY_NEIGHBORHOOD_IDS = new Set(['seoul-all']);

function getAffordabilityScore(restaurant: SeedRestaurant) {
  return clamp(MAX_SCORE - ((restaurant.avgMealPrice - MIN_PRICE) / PRICE_RANGE) * MAX_SCORE, 0, MAX_SCORE);
}

function getTasteScore(restaurant: SeedRestaurant) {
  return clamp(restaurant.tasteScore * 10, 0, MAX_SCORE);
}

function getEvidenceScore(restaurant: SeedRestaurant) {
  return clamp(restaurant.evidenceCount * 0.9 + restaurant.blogMentions * 1.4, 0, MAX_SCORE);
}

function getSentimentScore(restaurant: SeedRestaurant) {
  return clamp(restaurant.positiveReviewRatio * MAX_SCORE, 0, MAX_SCORE);
}

function formatAverageScore(ranked: Array<{ score: number }>) {
  if (ranked.length === 0) {
    return '0.0';
  }

  const totalScore = ranked.reduce((sum, candidate) => sum + candidate.score, 0);
  return (totalScore / ranked.length).toFixed(1);
}

function shouldOverlayNaverSharedRestaurants(neighborhoodId: string | null | undefined) {
  return Boolean(neighborhoodId && NAVER_SHARED_OVERLAY_NEIGHBORHOOD_IDS.has(neighborhoodId));
}

function sortByScoreThenEvidence(restaurantsToSort: EnrichedRestaurant[]) {
  return [...restaurantsToSort].sort(
    (left, right) =>
      (right.score ?? 0) - (left.score ?? 0) ||
      (right.evidenceCount ?? 0) - (left.evidenceCount ?? 0) ||
      left.name.localeCompare(right.name, 'ko-KR')
  );
}

function summarizeRankedRestaurants(ranked: EnrichedRestaurant[], currentSummary: NeighborhoodView['summary']) {
  const lowestPrice = pickBy(
    ranked.filter((restaurant) => Number.isFinite(restaurant.avgMealPrice)),
    (candidate, current) => (candidate.avgMealPrice ?? Number.POSITIVE_INFINITY) < (current.avgMealPrice ?? Number.POSITIVE_INFINITY)
  );

  return {
    ...currentSummary,
    totalRestaurants: ranked.length,
    totalPlaces: ranked.length,
    averageScore: formatAverageScore(ranked),
    bestEvidenceName: ranked[0]?.name ?? '-',
    lowestPriceLabel: lowestPrice?.avgMealPrice ? formatPrice(lowestPrice.avgMealPrice) : currentSummary.lowestPriceLabel
  };
}

export function withNaverSharedRestaurants(view: NeighborhoodView, neighborhoodId = view.neighborhood?.id): NeighborhoodView {
  if (!shouldOverlayNaverSharedRestaurants(neighborhoodId)) {
    return view;
  }

  const existingIds = new Set(view.ranked.map((restaurant) => restaurant.id));
  const naverOverlay = naverSharedRestaurants.filter((restaurant) => !existingIds.has(restaurant.id));
  if (naverOverlay.length === 0) {
    return view;
  }

  const ranked = sortByScoreThenEvidence([...view.ranked, ...naverOverlay]);

  return {
    ...view,
    ranked,
    top5: ranked.slice(0, 5),
    selected: ranked[0] ?? null,
    summary: summarizeRankedRestaurants(ranked, view.summary)
  };
}

function hasNaverOverlay(view: NeighborhoodView) {
  return view.ranked.some((restaurant) => restaurant.source === 'naver');
}

function buildCandidateRows(ranked: EnrichedRestaurant[]) {
  return ranked.map((restaurant, index) => ({
    rank: index + 1,
    id: restaurant.id,
    name: restaurant.name,
    score: restaurant.score ?? 0,
    avgMealPrice: restaurant.avgMealPrice,
    evidenceCount: restaurant.evidenceCount,
    blogMentions: restaurant.blogMentions,
    positiveReviewRatio: restaurant.positiveReviewRatio,
    signals: {
      affordable: typeof restaurant.avgMealPrice === 'number' ? restaurant.avgMealPrice <= 10000 : false,
      evidenceStrong: (restaurant.evidenceCount ?? 0) >= 70,
      highConfidence: (restaurant.positiveReviewRatio ?? 0) >= 0.91
    },
    primaryReason: restaurant.reasons[0] ?? '-'
  }));
}

function summarizeCandidateReport(view: NeighborhoodView, currentSummary: CandidateReport['summary']) {
  const ranked = view.ranked;
  const priced = ranked.filter((restaurant) => Number.isFinite(restaurant.avgMealPrice));
  const topCandidate = ranked[0] ?? null;
  const lowestCandidate = ranked.at(-1) ?? null;

  return {
    ...currentSummary,
    candidateCount: ranked.length,
    shortlistCount: view.top5.length,
    affordableCount: priced.filter((restaurant) => (restaurant.avgMealPrice ?? 0) <= 10000).length,
    evidenceStrongCount: ranked.filter((restaurant) => (restaurant.evidenceCount ?? 0) >= 70).length,
    highConfidenceCount: ranked.filter((restaurant) => (restaurant.positiveReviewRatio ?? 0) >= 0.91).length,
    averageEvidenceCount: averageBy(ranked, (restaurant) => restaurant.evidenceCount ?? 0),
    averageScore: ranked.length ? Number(view.summary.averageScore) : 0,
    averagePrice: priced.length ? averageBy(priced, (restaurant) => restaurant.avgMealPrice ?? 0) : currentSummary.averagePrice,
    scoreSpread:
      topCandidate && lowestCandidate ? Number(((topCandidate.score ?? 0) - (lowestCandidate.score ?? 0)).toFixed(1)) : 0
  };
}

export function withNaverSharedSnapshot(neighborhoodId: string, snapshot: NeighborhoodSnapshot): NeighborhoodSnapshot {
  const view = withNaverSharedRestaurants(snapshot.view, neighborhoodId);
  if (view === snapshot.view || !hasNaverOverlay(view)) {
    return snapshot;
  }

  return {
    view,
    report: {
      ...snapshot.report,
      summary: summarizeCandidateReport(view, snapshot.report.summary),
      shortlist: view.top5.map((restaurant, index) => ({
        rank: index + 1,
        id: restaurant.id,
        name: restaurant.name,
        score: restaurant.score,
        avgMealPrice: restaurant.avgMealPrice,
        evidenceCount: restaurant.evidenceCount,
        primaryReason: restaurant.reasons[0] ?? '-'
      })),
      candidates: buildCandidateRows(view.ranked),
      narrative: `${snapshot.report.narrative} 네이버 저장 맛집 ${naverSharedRestaurants.length}곳도 빨간 마커로 같은 지도에 함께 표시합니다.`
    }
  };
}

function formatPrice(value: number) {
  return `${value.toLocaleString('ko-KR')}원`;
}

function pickBy<T>(ranked: T[], comparator: (candidate: T, current: T) => boolean) {
  return ranked.reduce((current, candidate) => {
    if (!current || comparator(candidate, current)) {
      return candidate;
    }

    return current;
  }, null as T | null);
}

function averageBy<T>(items: T[], selector: (item: T) => number) {
  if (items.length === 0) {
    return 0;
  }

  const total = items.reduce((sum, item) => sum + selector(item), 0);
  return Number((total / items.length).toFixed(1));
}

export function calculateValueScore(restaurant: SeedRestaurant) {
  const affordability = getAffordabilityScore(restaurant);
  const taste = getTasteScore(restaurant);
  const evidence = getEvidenceScore(restaurant);
  const sentiment = getSentimentScore(restaurant);

  const weightedScore =
    taste * SCORE_WEIGHTS.taste +
    affordability * SCORE_WEIGHTS.affordability +
    evidence * SCORE_WEIGHTS.evidence +
    sentiment * SCORE_WEIGHTS.sentiment;

  return Number(weightedScore.toFixed(1));
}

export function buildReasons(restaurant: SeedRestaurant) {
  const reasons: string[] = [];
  const affordability = getAffordabilityScore(restaurant);
  const evidence = getEvidenceScore(restaurant);

  if (affordability >= 72) {
    reasons.push('식사 가격 부담이 낮아 가성비 접근성이 좋아요.');
  }

  if (restaurant.tasteScore >= 8.5) {
    reasons.push('맛 만족도가 높아 메인 포스팅 후보로 검토할 만해요.');
  }

  if (evidence >= 70) {
    reasons.push('리뷰·블로그 근거량이 충분해 검증 효율이 높아요.');
  }

  if (restaurant.positiveReviewRatio >= 0.91) {
    reasons.push('긍정 반응 비율이 높아 실패 확률이 낮아요.');
  }

  if (restaurant.blogMentions >= 20) {
    reasons.push('블로그화하기 좋은 화제성과 기록량이 확보돼 있어요.');
  }

  return reasons.length > 0
    ? reasons
    : ['핵심 지표는 중간 수준이지만 균형형 후보로 살펴볼 가치가 있어요.'];
}

export function enrichRestaurant(restaurant: SeedRestaurant): RankedSeedRestaurant {
  return {
    ...restaurant,
    score: calculateValueScore(restaurant),
    reasons: buildReasons(restaurant)
  };
}

export function getNeighborhoodById(neighborhoodId: string): Neighborhood | null {
  return neighborhoods.find((item) => item.id === neighborhoodId) ?? null;
}

function buildNaverSharedNeighborhoodView(neighborhood: Neighborhood | null, fallbackReason?: string): NeighborhoodView {
  const ranked = [...naverSharedRestaurants];
  const top5 = ranked.slice(0, 5);

  return {
    neighborhood,
    source: 'naver',
    fallbackReason,
    ranked,
    top5,
    selected: ranked[0] ?? null,
    summary: {
      totalRestaurants: ranked.length,
      totalPlaces: ranked.length,
      averageScore: formatAverageScore(ranked),
      bestEvidenceName: ranked[0]?.name ?? '-',
      lowestPriceLabel: '-',
      searchQuery: '네이버 지도 저장목록 맛집'
    }
  };
}

export function buildNeighborhoodView(neighborhoodId: string, fallbackReason?: string): NeighborhoodView {
  const neighborhood = getNeighborhoodById(neighborhoodId);
  if (neighborhoodId === 'naver-shared') {
    return buildNaverSharedNeighborhoodView(neighborhood, fallbackReason);
  }

  const ranked: RankedSeedRestaurant[] = restaurants
    .filter((restaurant) => (neighborhoodId === 'seoul-all' ? true : restaurant.neighborhoodId === neighborhoodId))
    .map(enrichRestaurant)
    .sort((left, right) => right.score - left.score || right.evidenceCount - left.evidenceCount);

  const top5 = ranked.slice(0, 5);
  const bestEvidence = pickBy(ranked, (candidate, current) => candidate.evidenceCount > current.evidenceCount);
  const lowestPrice = pickBy(ranked, (candidate, current) => candidate.avgMealPrice < current.avgMealPrice);

  return withNaverSharedRestaurants({
    neighborhood,
    source: 'seeded',
    fallbackReason,
    ranked,
    top5,
    selected: ranked[0] ?? null,
    summary: {
      totalRestaurants: ranked.length,
      averageScore: formatAverageScore(ranked),
      bestEvidenceName: bestEvidence?.name ?? '-',
      lowestPriceLabel: lowestPrice ? formatPrice(lowestPrice.avgMealPrice) : '-'
    }
  }, neighborhoodId);
}

function buildSharedListCandidateReport(view: NeighborhoodView, fallbackReason?: string): CandidateReport {
  const ranked = view.ranked;
  const top5 = ranked.slice(0, 5);
  const topCandidate = ranked[0] ?? null;
  const lowestCandidate = ranked.at(-1) ?? null;

  return {
    neighborhood: view.neighborhood,
    source: 'naver',
    fallbackReason,
    summary: {
      candidateCount: ranked.length,
      shortlistCount: top5.length,
      evidenceStrongCount: ranked.filter((restaurant) => (restaurant.evidenceCount ?? 0) >= 70).length,
      highConfidenceCount: ranked.filter((restaurant) => (restaurant.positiveReviewRatio ?? 0) >= 0.91).length,
      averageEvidenceCount: averageBy(ranked, (restaurant) => restaurant.evidenceCount ?? 0),
      averageScore: ranked.length ? Number(view.summary.averageScore) : 0,
      scoreSpread:
        topCandidate && lowestCandidate ? Number(((topCandidate.score ?? 0) - (lowestCandidate.score ?? 0)).toFixed(1)) : 0
    },
    instrumentation: {
      source: 'naver-shared-list',
      query: NAVER_SHARED_RESTAURANTS_SOURCE_URL,
      weights: SCORE_WEIGHTS,
      strategy: '공유받은 네이버 지도 저장목록을 앱 내부 정적 데이터로 보존하고 좌표 기반 지도 마커로 동기화합니다.',
      thresholds: {
        affordableMealPrice: 10000,
        evidenceStrong: 70,
        highConfidenceRatio: 0.91
      }
    },
    shortlist: top5.map((restaurant, index) => ({
      rank: index + 1,
      id: restaurant.id,
      name: restaurant.name,
      score: restaurant.score,
      evidenceCount: restaurant.evidenceCount,
      primaryReason: restaurant.reasons[0] ?? '-'
    })),
    candidates: ranked.map((restaurant, index) => ({
      rank: index + 1,
      id: restaurant.id,
      name: restaurant.name,
      score: restaurant.score ?? 0,
      evidenceCount: restaurant.evidenceCount,
      blogMentions: restaurant.blogMentions,
      positiveReviewRatio: restaurant.positiveReviewRatio,
      signals: {
        affordable: false,
        evidenceStrong: (restaurant.evidenceCount ?? 0) >= 70,
        highConfidence: (restaurant.positiveReviewRatio ?? 0) >= 0.91
      },
      primaryReason: restaurant.reasons[0] ?? '-'
    })),
    narrative: topCandidate
      ? `${topCandidate.name}을(를) 포함해 네이버 지도 공유 저장목록 맛집 ${ranked.length}곳을 저장했습니다.`
      : '네이버 지도 공유 저장목록 후보가 없어 리포트를 생성할 수 없습니다.'
  };
}

export function buildCandidateReport(neighborhoodId: string, fallbackReason?: string): CandidateReport {
  const view = buildNeighborhoodView(neighborhoodId, fallbackReason);
  if (view.source === 'naver') {
    return buildSharedListCandidateReport(view, fallbackReason);
  }

  const ranked = view.ranked;
  const top5 = ranked.slice(0, 5);
  const priced = ranked.filter((restaurant) => Number.isFinite(restaurant.avgMealPrice));
  const affordableCount = priced.filter((restaurant) => (restaurant.avgMealPrice ?? 0) <= 10000).length;
  const evidenceStrongCount = ranked.filter((restaurant) => (restaurant.evidenceCount ?? 0) >= 70).length;
  const highConfidenceCount = ranked.filter((restaurant) => (restaurant.positiveReviewRatio ?? 0) >= 0.91).length;
  const topCandidate = ranked[0] ?? null;
  const lowestCandidate = ranked.at(-1) ?? null;

  return {
    neighborhood: view.neighborhood,
    source: 'seeded',
    fallbackReason,
    summary: {
      candidateCount: ranked.length,
      shortlistCount: view.top5.length,
      affordableCount,
      evidenceStrongCount,
      highConfidenceCount,
      averageEvidenceCount: averageBy(ranked, (restaurant) => restaurant.evidenceCount ?? 0),
      averagePrice: priced.length ? averageBy(priced, (restaurant) => restaurant.avgMealPrice ?? 0) : undefined,
      scoreSpread:
        topCandidate && lowestCandidate ? Number(((topCandidate.score ?? 0) - (lowestCandidate.score ?? 0)).toFixed(1)) : 0
    },
    instrumentation: {
      source: 'seeded',
      weights: SCORE_WEIGHTS,
      strategy: '공개 후기·블로그 근거량을 우선 확인한 뒤 가성비·만족도를 합산해 후보를 정렬합니다.',
      thresholds: {
        affordableMealPrice: 10000,
        evidenceStrong: 70,
        highConfidenceRatio: 0.91
      }
    },
    shortlist: top5.map((restaurant, index) => ({
      rank: index + 1,
      id: restaurant.id,
      name: restaurant.name,
      score: restaurant.score,
      avgMealPrice: restaurant.avgMealPrice,
      evidenceCount: restaurant.evidenceCount,
      primaryReason: restaurant.reasons[0] ?? '-'
    })),
    candidates: buildCandidateRows(ranked),
    narrative: topCandidate
      ? `${topCandidate.name}이(가) 최고 점수 ${topCandidate.score}로 선두이며, 상위 ${top5.length}개 후보를 바로 콘텐츠 검토 대상으로 좁혔습니다.`
      : '시드된 후보가 없어 리포트를 생성할 수 없습니다.'
  };
}

export function createInitialState() {
  return {
    activeNeighborhoodId: neighborhoods[0]?.id ?? null,
    selectedRestaurantId: null
  };
}

export { neighborhoods, restaurants, SCORE_WEIGHTS };
