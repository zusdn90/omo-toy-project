import { neighborhoods, restaurants } from './data.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const MIN_PRICE = 7000;
const PRICE_RANGE = 9000;
const MAX_SCORE = 100;
const SCORE_WEIGHTS = Object.freeze({
  taste: 0.34,
  affordability: 0.26,
  evidence: 0.25,
  sentiment: 0.15
});

function getAffordabilityScore(restaurant) {
  return clamp(MAX_SCORE - ((restaurant.avgMealPrice - MIN_PRICE) / PRICE_RANGE) * MAX_SCORE, 0, MAX_SCORE);
}

function getTasteScore(restaurant) {
  return clamp(restaurant.tasteScore * 10, 0, MAX_SCORE);
}

function getEvidenceScore(restaurant) {
  return clamp(restaurant.evidenceCount * 0.9 + restaurant.blogMentions * 1.4, 0, MAX_SCORE);
}

function getSentimentScore(restaurant) {
  return clamp(restaurant.positiveReviewRatio * MAX_SCORE, 0, MAX_SCORE);
}

function formatAverageScore(ranked) {
  if (ranked.length === 0) {
    return '0.0';
  }

  const totalScore = ranked.reduce((sum, candidate) => sum + candidate.score, 0);
  return (totalScore / ranked.length).toFixed(1);
}

function formatPrice(value) {
  return `${value.toLocaleString('ko-KR')}원`;
}

function pickBy(ranked, comparator) {
  return ranked.reduce((current, candidate) => {
    if (!current || comparator(candidate, current)) {
      return candidate;
    }

    return current;
  }, null);
}

function averageBy(items, selector) {
  if (items.length === 0) {
    return 0;
  }

  const total = items.reduce((sum, item) => sum + selector(item), 0);
  return Number((total / items.length).toFixed(1));
}

export function calculateValueScore(restaurant) {
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

export function buildReasons(restaurant) {
  const reasons = [];
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

export function enrichRestaurant(restaurant) {
  return {
    ...restaurant,
    score: calculateValueScore(restaurant),
    reasons: buildReasons(restaurant)
  };
}

export function getNeighborhoodById(neighborhoodId) {
  return neighborhoods.find((item) => item.id === neighborhoodId) ?? null;
}

export function buildNeighborhoodView(neighborhoodId) {
  const neighborhood = getNeighborhoodById(neighborhoodId);
  const ranked = restaurants
    .filter((restaurant) => restaurant.neighborhoodId === neighborhoodId)
    .map(enrichRestaurant)
    .sort((left, right) => right.score - left.score || right.evidenceCount - left.evidenceCount);

  const top5 = ranked.slice(0, 5);
  const bestEvidence = pickBy(ranked, (candidate, current) => candidate.evidenceCount > current.evidenceCount);
  const lowestPrice = pickBy(ranked, (candidate, current) => candidate.avgMealPrice < current.avgMealPrice);

  return {
    neighborhood,
    ranked,
    top5,
    selected: ranked[0] ?? null,
    summary: {
      totalRestaurants: ranked.length,
      averageScore: formatAverageScore(ranked),
      bestEvidenceName: bestEvidence?.name ?? '-',
      lowestPriceLabel: lowestPrice ? formatPrice(lowestPrice.avgMealPrice) : '-'
    }
  };
}

export function buildCandidateReport(neighborhoodId) {
  const view = buildNeighborhoodView(neighborhoodId);
  const ranked = view.ranked;
  const affordableCount = ranked.filter((restaurant) => restaurant.avgMealPrice <= 10000).length;
  const evidenceStrongCount = ranked.filter((restaurant) => restaurant.evidenceCount >= 70).length;
  const highConfidenceCount = ranked.filter((restaurant) => restaurant.positiveReviewRatio >= 0.91).length;
  const topCandidate = ranked[0] ?? null;
  const lowestCandidate = ranked.at(-1) ?? null;

  return {
    neighborhood: view.neighborhood,
    summary: {
      candidateCount: ranked.length,
      shortlistCount: view.top5.length,
      affordableCount,
      evidenceStrongCount,
      highConfidenceCount,
      averageEvidenceCount: averageBy(ranked, (restaurant) => restaurant.evidenceCount),
      averagePrice: averageBy(ranked, (restaurant) => restaurant.avgMealPrice),
      scoreSpread:
        topCandidate && lowestCandidate ? Number((topCandidate.score - lowestCandidate.score).toFixed(1)) : 0
    },
    instrumentation: {
      weights: SCORE_WEIGHTS,
      strategy: '공개 후기·블로그 근거량을 우선 확인한 뒤 가성비·만족도를 합산해 후보를 정렬합니다.',
      thresholds: {
        affordableMealPrice: 10000,
        evidenceStrong: 70,
        highConfidenceRatio: 0.91
      }
    },
    shortlist: view.top5.map((restaurant, index) => ({
      rank: index + 1,
      id: restaurant.id,
      name: restaurant.name,
      score: restaurant.score,
      avgMealPrice: restaurant.avgMealPrice,
      evidenceCount: restaurant.evidenceCount,
      primaryReason: restaurant.reasons[0]
    })),
    candidates: ranked.map((restaurant, index) => ({
      rank: index + 1,
      id: restaurant.id,
      name: restaurant.name,
      score: restaurant.score,
      avgMealPrice: restaurant.avgMealPrice,
      evidenceCount: restaurant.evidenceCount,
      blogMentions: restaurant.blogMentions,
      positiveReviewRatio: restaurant.positiveReviewRatio,
      signals: {
        affordable: restaurant.avgMealPrice <= 10000,
        evidenceStrong: restaurant.evidenceCount >= 70,
        highConfidence: restaurant.positiveReviewRatio >= 0.91
      },
      primaryReason: restaurant.reasons[0]
    })),
    narrative: topCandidate
      ? `${topCandidate.name}이(가) 최고 점수 ${topCandidate.score}로 선두이며, 상위 ${view.top5.length}개 후보를 바로 콘텐츠 검토 대상으로 좁혔습니다.`
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
