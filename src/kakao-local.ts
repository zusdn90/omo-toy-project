import type { CandidateReport, EnrichedRestaurant, Neighborhood, NeighborhoodSnapshot, NeighborhoodView } from './lib/types';
import { SCORE_WEIGHTS } from './lib/scoring';

const KAKAO_LOCAL_BASE_URL = 'https://dapi.kakao.com/v2/local';

type KakaoSearchDocument = {
  id: string;
  place_name: string;
  category_name?: string;
  category_group_name?: string;
  address_name?: string;
  road_address_name?: string;
  phone?: string;
  place_url?: string;
  x?: string | number;
  y?: string | number;
  distance?: string | number;
};

type KakaoKeywordSearchPayload = {
  documents?: KakaoSearchDocument[];
};

type KakaoNeighborhoodSnapshot = NeighborhoodSnapshot | null;

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatDistance(distanceMeters: number | null | undefined) {
  if (distanceMeters == null) {
    return '거리 정보 없음';
  }

  return `${distanceMeters.toLocaleString('ko-KR')}m`;
}

function averageBy<T>(items: T[], selector: (item: T) => number) {
  if (items.length === 0) {
    return 0;
  }

  const total = items.reduce((sum, item) => sum + selector(item), 0);
  return Number((total / items.length).toFixed(1));
}

function buildScore(distanceMeters: number | null | undefined, index: number) {
  const distancePenalty = distanceMeters == null ? 0 : Math.min(distanceMeters / 45, 28);
  const rankPenalty = Math.min(index * 3.5, 24.5);
  return Number(Math.max(0, 100 - distancePenalty - rankPenalty).toFixed(1));
}

function normalizePlace(place: KakaoSearchDocument, index: number, neighborhood: Neighborhood): EnrichedRestaurant {
  const lat = toNumber(place.y);
  const lng = toNumber(place.x);
  const distanceMeters = toNumber(place.distance);

  return {
    id: place.id,
    name: place.place_name,
    category: place.category_group_name || place.category_name || '장소',
    addressName: place.address_name || '',
    roadAddressName: place.road_address_name || '',
    phone: place.phone || '',
    placeUrl: place.place_url || '',
    lat: lat ?? undefined,
    lng: lng ?? undefined,
    distanceMeters: distanceMeters ?? undefined,
    score: buildScore(distanceMeters, index),
    reasons: [
      `${formatDistance(distanceMeters)} 안에서 검색된 Kakao 장소예요.`,
      place.road_address_name || place.address_name
        ? '주소와 좌표가 함께 제공돼 지도에 바로 연결할 수 있어요.'
        : '카카오 장소 검색 결과로 마커를 만들 수 있어요.'
    ],
    note: `Kakao place search · ${neighborhood.name}`,
    source: 'kakao'
  };
}

function buildKakaoNeighborhoodView(neighborhood: Neighborhood, documents: KakaoSearchDocument[]): NeighborhoodView {
  const ranked: EnrichedRestaurant[] = documents.map((document, index) => normalizePlace(document, index, neighborhood));
  const top5 = ranked.slice(0, 5);

  return {
    neighborhood,
    source: 'kakao',
    ranked,
    top5,
    selected: ranked[0] ?? null,
    summary: {
      totalPlaces: ranked.length,
      totalRestaurants: ranked.length,
      averageScore: ranked.length > 0 ? averageBy(ranked, (item) => item.score).toFixed(1) : '0.0',
      averageDistance: averageBy(ranked, (item) => item.distanceMeters ?? 0),
      bestEvidenceName: ranked[0]?.name ?? '-',
      lowestPriceLabel: '-',
      nearestPlaceName: ranked[0]?.name ?? '-',
      nearestPlaceLabel: ranked[0]
        ? `${ranked[0].name} · ${formatDistance(ranked[0].distanceMeters)}`
        : '-',
      searchQuery: neighborhood.kakaoSearch?.query ?? '',
      searchRadiusMeters: neighborhood.kakaoSearch?.radius ?? null,
      searchSort: neighborhood.kakaoSearch?.sort ?? 'distance'
    }
  };
}

function buildKakaoCandidateReport(view: NeighborhoodView): CandidateReport {
  const ranked = view.ranked;
  const topCandidate = ranked[0] ?? null;
  const averageDistance = averageBy(ranked, (item) => item.distanceMeters ?? 0);

  return {
    neighborhood: view.neighborhood,
    source: 'kakao',
    summary: {
      candidateCount: ranked.length,
      shortlistCount: view.top5.length,
      averageDistance,
      nearestDistance: topCandidate?.distanceMeters ?? undefined,
      averageScore: ranked.length > 0 ? averageBy(ranked, (item) => item.score) : 0
    },
    instrumentation: {
      source: 'kakao-local-api',
      query: view.summary.searchQuery,
      radiusMeters: view.summary.searchRadiusMeters ?? undefined,
      sort: view.summary.searchSort,
      weights: SCORE_WEIGHTS,
      strategy: 'Kakao Local keyword search 결과를 거리 기준으로 정렬한 뒤 상위 후보를 지도와 리스트에 동기화합니다.',
      thresholds: {
        affordableMealPrice: 10000,
        evidenceStrong: 70,
        highConfidenceRatio: 0.91
      }
    },
    shortlist: view.top5.map((place, index) => ({
      rank: index + 1,
      id: place.id,
      name: place.name,
      score: place.score,
      category: place.category,
      addressName: place.addressName,
      roadAddressName: place.roadAddressName,
      distanceMeters: place.distanceMeters,
      placeUrl: place.placeUrl,
      primaryReason: place.reasons[0] ?? `거리 ${formatDistance(place.distanceMeters)} 기준 후보예요.`
    })),
    candidates: ranked.map((place, index) => ({
      rank: index + 1,
      id: place.id,
      name: place.name,
      score: place.score,
      category: place.category,
      addressName: place.addressName,
      roadAddressName: place.roadAddressName,
      phone: place.phone,
      placeUrl: place.placeUrl,
      distanceMeters: place.distanceMeters,
      signals: {
        affordable: false,
        evidenceStrong: false,
        highConfidence: false
      },
      primaryReason: place.reasons[0] ?? `거리 ${formatDistance(place.distanceMeters)} 기준 후보예요.`
    })),
    narrative: topCandidate
      ? `${topCandidate.name}을(를) 중심으로 Kakao 장소 검색 결과 ${ranked.length}개를 확보했습니다.`
      : 'Kakao 장소 검색 결과가 없어 리포트를 생성할 수 없습니다.'
  };
}

async function fetchKakaoKeywordSearch({
  apiKey,
  neighborhood,
  fetchImpl = fetch
}: {
  apiKey: string;
  neighborhood: Neighborhood;
  fetchImpl?: typeof fetch;
}): Promise<KakaoSearchDocument[]> {
  const search = neighborhood.kakaoSearch;
  if (!search?.query) {
    return [];
  }

  const url = new URL(`${KAKAO_LOCAL_BASE_URL}/search/keyword.json`);
  url.searchParams.set('query', search.query);
  url.searchParams.set('x', String(neighborhood.mapCenter.lng));
  url.searchParams.set('y', String(neighborhood.mapCenter.lat));
  url.searchParams.set('radius', String(search.radius ?? 1500));
  url.searchParams.set('sort', search.sort ?? 'distance');

  const response = await fetchImpl(url, {
    headers: {
      Authorization: `KakaoAK ${apiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Kakao Local API request failed: ${response.status} ${response.statusText}`.trim());
  }

  const payload = (await response.json()) as KakaoKeywordSearchPayload;
  return payload.documents ?? [];
}

export function createKakaoNeighborhoodLoader({
  apiKey,
  fetchImpl = fetch
}: {
  apiKey?: string;
  fetchImpl?: typeof fetch;
}) {
  const cache = new Map<string, NeighborhoodSnapshot>();
  const inFlight = new Map<string, Promise<KakaoNeighborhoodSnapshot>>();

  async function loadNeighborhoodSnapshot(neighborhood: Neighborhood): Promise<KakaoNeighborhoodSnapshot> {
    if (!apiKey || !neighborhood.kakaoSearch?.query) {
      return null;
    }

    const cachedSnapshot = cache.get(neighborhood.id);
    if (cachedSnapshot) {
      return cachedSnapshot;
    }

    const inFlightSnapshot = inFlight.get(neighborhood.id);
    if (inFlightSnapshot) {
      return inFlightSnapshot;
    }

    const request = (async () => {
      try {
        const documents = await fetchKakaoKeywordSearch({ apiKey, neighborhood, fetchImpl });
        if (documents.length === 0) {
          return null;
        }

        const view = buildKakaoNeighborhoodView(neighborhood, documents);
        const snapshot = {
          view,
          report: buildKakaoCandidateReport(view)
        };
        cache.set(neighborhood.id, snapshot);
        return snapshot;
      } catch {
        return null;
      } finally {
        inFlight.delete(neighborhood.id);
      }
    })();

    inFlight.set(neighborhood.id, request);
    return request;
  }

  return {
    async loadNeighborhoodSnapshot(neighborhood: Neighborhood) {
      return loadNeighborhoodSnapshot(neighborhood);
    }
  };
}

export { buildKakaoCandidateReport, buildKakaoNeighborhoodView, fetchKakaoKeywordSearch };
