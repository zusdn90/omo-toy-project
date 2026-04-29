import { SCORE_WEIGHTS } from './lib/scoring';
import type { CandidateReport, EnrichedRestaurant, Neighborhood, NeighborhoodSnapshot, NeighborhoodView } from './lib/types';
import { VisitKoreaChartStore, defaultVisitKoreaDbPath } from './visitkorea-chart-store';

const VISITKOREA_CHART_URL = 'https://korean.visitkorea.or.kr/call';

type VisitKoreaChartItem = {
  ENT_NM1?: string;
  ROAD_NM_ADDR?: string;
  SE_CD?: string;
  SE_ICO?: string;
  LAT?: string;
  LON?: string;
  INFO_URL_ADDR?: string;
  CONTENT_STATUS?: number;
};

type VisitKoreaChartResponse = {
  body?: {
    chartList?: VisitKoreaChartItem[];
  };
};

function toNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildVisitKoreaId(neighborhood: Neighborhood, item: VisitKoreaChartItem, index: number) {
  const normalizedName = (item.ENT_NM1 ?? `place-${index + 1}`).replace(/[^\p{Letter}\p{Number}]+/gu, '-').replace(/^-|-$/g, '');
  return `visitkorea-${neighborhood.id}-${index + 1}-${normalizedName || 'place'}`;
}

function getVisitKoreaPlaceUrl(item: VisitKoreaChartItem) {
  if (!item.INFO_URL_ADDR || item.CONTENT_STATUS !== 2) {
    return undefined;
  }

  try {
    const url = new URL(item.INFO_URL_ADDR);
    return url.protocol === 'https:' && url.hostname.endsWith('visitkorea.or.kr') ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function normalizeVisitKoreaItem(neighborhood: Neighborhood, item: VisitKoreaChartItem, index: number): EnrichedRestaurant {
  const rankScore = Number(Math.max(50, 100 - index * 0.2).toFixed(1));
  const address = item.ROAD_NM_ADDR ?? '주소 정보 없음';

  return {
    id: buildVisitKoreaId(neighborhood, item, index),
    neighborhoodId: neighborhood.id,
    name: item.ENT_NM1 ?? `맛집 후보 ${index + 1}`,
    category: item.SE_CD ?? '맛집',
    roadAddressName: address,
    addressName: address,
    lat: toNumber(item.LAT),
    lng: toNumber(item.LON),
    placeUrl: getVisitKoreaPlaceUrl(item),
    evidenceCount: Math.max(10, 100 - Math.floor(index * 0.4)),
    blogMentions: Math.max(0, 30 - Math.floor(index * 0.15)),
    positiveReviewRatio: Number(Math.max(0.7, 0.96 - index * 0.001).toFixed(2)),
    note: `대한민국 구석구석 맛집차트 현지인 랭킹 ${index + 1}위`,
    score: rankScore,
    reasons: [
      `대한민국 구석구석 맛집차트에서 ${index + 1}위로 노출된 후보예요.`,
      address === '주소 정보 없음' ? '주소 정보는 제공되지 않았습니다.' : `주소: ${address}`
    ],
    source: 'visitkorea'
  };
}

function buildVisitKoreaViewFromRestaurants(neighborhood: Neighborhood, ranked: EnrichedRestaurant[]): NeighborhoodView {
  const top5 = ranked.slice(0, 5);

  return {
    neighborhood,
    source: 'visitkorea',
    ranked,
    top5,
    selected: ranked[0] ?? null,
    summary: {
      totalRestaurants: ranked.length,
      totalPlaces: ranked.length,
      averageScore: ranked.length ? (ranked.reduce((sum, item) => sum + item.score, 0) / ranked.length).toFixed(1) : '0.0',
      bestEvidenceName: ranked[0]?.name ?? '-',
      lowestPriceLabel: '-',
      searchQuery: `${neighborhood.visitKoreaChart?.ctpvNm ?? ''} 맛집차트`.trim()
    }
  };
}

function buildVisitKoreaView(neighborhood: Neighborhood, chartList: VisitKoreaChartItem[]): NeighborhoodView {
  return buildVisitKoreaViewFromRestaurants(
    neighborhood,
    chartList.map((item, index) => normalizeVisitKoreaItem(neighborhood, item, index))
  );
}

function buildVisitKoreaReport(view: NeighborhoodView): CandidateReport {
  const ranked = view.ranked;

  return {
    neighborhood: view.neighborhood,
    source: 'visitkorea',
    summary: {
      candidateCount: ranked.length,
      shortlistCount: view.top5.length,
      averageScore: ranked.length ? Number(view.summary.averageScore) : 0,
      averageEvidenceCount: ranked.length ? Number((ranked.reduce((sum, item) => sum + (item.evidenceCount ?? 0), 0) / ranked.length).toFixed(1)) : 0
    },
    instrumentation: {
      source: 'visitkorea-chart-api',
      query: view.summary.searchQuery,
      weights: SCORE_WEIGHTS,
      strategy: '대한민국 구석구석 맛집차트의 티맵 내비게이션 기반 식음료 인기 목적지 순위를 지도와 추천 목록에 동기화합니다.',
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
      evidenceCount: restaurant.evidenceCount,
      primaryReason: restaurant.reasons[0] ?? '-'
    })),
    candidates: ranked.map((restaurant, index) => ({
      rank: index + 1,
      id: restaurant.id,
      name: restaurant.name,
      score: restaurant.score,
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
    narrative: ranked[0]
      ? `${ranked[0].name}이(가) 대한민국 구석구석 맛집차트 기준 최상위 후보입니다.`
      : '대한민국 구석구석 맛집차트 후보가 없어 리포트를 생성할 수 없습니다.'
  };
}

async function fetchVisitKoreaChartRequest({
  neighborhood,
  fetchImpl,
  sggCds
}: {
  neighborhood: Neighborhood;
  fetchImpl: typeof fetch;
  sggCds: string[];
}) {
  const chart = neighborhood.visitKoreaChart;
  if (!chart) {
    return [];
  }

  const body = new URLSearchParams({
    cmd: 'AREA_CHART_LIST',
    ctpvNm: chart.ctpvNm,
    sggCds: JSON.stringify(sggCds),
    categories: JSON.stringify(chart.categories ?? []),
    type: String(chart.type ?? 1)
  });

  const response = await fetchImpl(VISITKOREA_CHART_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      origin: 'https://korean.visitkorea.or.kr',
      referer: 'https://korean.visitkorea.or.kr/main/area_chart.do'
    },
    body
  });

  if (!response.ok) {
    throw new Error(`VisitKorea chart request failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as VisitKoreaChartResponse;
  return payload.body?.chartList ?? [];
}

async function fetchVisitKoreaChart({
  neighborhood,
  fetchImpl
}: {
  neighborhood: Neighborhood;
  fetchImpl: typeof fetch;
}) {
  const sggCds = neighborhood.visitKoreaChart?.sggCds ?? [];
  if (sggCds.length <= 1) {
    return fetchVisitKoreaChartRequest({ neighborhood, fetchImpl, sggCds });
  }

  const responses = await Promise.allSettled(
    sggCds.map((sggCd) => fetchVisitKoreaChartRequest({ neighborhood, fetchImpl, sggCds: [sggCd] }))
  );
  const chartList = responses.flatMap((response) => (response.status === 'fulfilled' ? response.value : []));
  const seen = new Set<string>();

  return chartList.filter((item) => {
    const key = `${item.ENT_NM1 ?? ''}|${item.ROAD_NM_ADDR ?? ''}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function createVisitKoreaChartLoader({
  dbPath = defaultVisitKoreaDbPath,
  fetchImpl = globalThis.fetch
}: {
  dbPath?: string;
  fetchImpl?: typeof fetch;
} = {}) {
  const cache = new Map<string, NeighborhoodSnapshot>();
  const inFlight = new Map<string, Promise<NeighborhoodSnapshot | null>>();
  const store = new VisitKoreaChartStore(dbPath);

  async function loadNeighborhoodSnapshot(neighborhood: Neighborhood): Promise<NeighborhoodSnapshot | null> {
    if (!neighborhood.visitKoreaChart) {
      return null;
    }

    const cached = cache.get(neighborhood.id);
    if (cached) {
      return cached;
    }

    const pending = inFlight.get(neighborhood.id);
    if (pending) {
      return pending;
    }

    const request = (async () => {
      try {
        const stored = store.read(neighborhood.id);
        if (stored) {
          const view = buildVisitKoreaViewFromRestaurants(neighborhood, stored.restaurants);
          const snapshot = { view, report: buildVisitKoreaReport(view) };
          cache.set(neighborhood.id, snapshot);
          return snapshot;
        }

        const chartList = await fetchVisitKoreaChart({ neighborhood, fetchImpl });
        if (chartList.length === 0) {
          return null;
        }

        const view = buildVisitKoreaView(neighborhood, chartList);
        const snapshot = { view, report: buildVisitKoreaReport(view) };
        store.write(neighborhood.id, view.ranked);
        cache.set(neighborhood.id, snapshot);
        return snapshot;
      } finally {
        inFlight.delete(neighborhood.id);
      }
    })();

    inFlight.set(neighborhood.id, request);
    return request;
  }

  return {
    loadNeighborhoodSnapshot,
    close() {
      store.close();
    }
  };
}
