const KAKAO_LOCAL_BASE_URL = 'https://dapi.kakao.com/v2/local';

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDistance(distanceMeters) {
  if (distanceMeters == null) {
    return '거리 정보 없음';
  }

  return `${distanceMeters.toLocaleString('ko-KR')}m`;
}

function averageBy(items, selector) {
  if (items.length === 0) {
    return 0;
  }

  const total = items.reduce((sum, item) => sum + selector(item), 0);
  return Number((total / items.length).toFixed(1));
}

function buildScore(distanceMeters, index) {
  const distancePenalty = distanceMeters == null ? 0 : Math.min(distanceMeters / 45, 28);
  const rankPenalty = Math.min(index * 3.5, 24.5);
  return Number(Math.max(0, 100 - distancePenalty - rankPenalty).toFixed(1));
}

function normalizePlace(place, index, neighborhood) {
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
    lat,
    lng,
    distanceMeters,
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

function buildKakaoNeighborhoodView(neighborhood, documents) {
  const ranked = documents.map((document, index) => normalizePlace(document, index, neighborhood));
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

function buildKakaoCandidateReport(view) {
  const ranked = view.ranked;
  const topCandidate = ranked[0] ?? null;
  const averageDistance = averageBy(ranked, (item) => item.distanceMeters ?? 0);

  return {
    neighborhood: view.neighborhood,
    summary: {
      candidateCount: ranked.length,
      shortlistCount: view.top5.length,
      averageDistance,
      nearestDistance: topCandidate?.distanceMeters ?? null,
      averageScore: ranked.length > 0 ? averageBy(ranked, (item) => item.score) : 0
    },
    instrumentation: {
      source: 'kakao-local-api',
      query: view.summary.searchQuery,
      radiusMeters: view.summary.searchRadiusMeters,
      sort: view.summary.searchSort,
      strategy: 'Kakao Local keyword search 결과를 거리 기준으로 정렬한 뒤 상위 후보를 지도와 리스트에 동기화합니다.'
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
      placeUrl: place.placeUrl
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
      distanceMeters: place.distanceMeters
    })),
    narrative: topCandidate
      ? `${topCandidate.name}을(를) 중심으로 Kakao 장소 검색 결과 ${ranked.length}개를 확보했습니다.`
      : 'Kakao 장소 검색 결과가 없어 리포트를 생성할 수 없습니다.'
  };
}

async function fetchKakaoKeywordSearch({ apiKey, neighborhood, fetchImpl = fetch }) {
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

  const payload = await response.json();
  return payload.documents ?? [];
}

export function createKakaoNeighborhoodLoader({ apiKey, fetchImpl = fetch }) {
  const cache = new Map();

  async function loadNeighborhoodSnapshot(neighborhood) {
    if (!apiKey || !neighborhood?.kakaoSearch?.query) {
      return null;
    }

    if (!cache.has(neighborhood.id)) {
      cache.set(
        neighborhood.id,
        (async () => {
          try {
            const documents = await fetchKakaoKeywordSearch({ apiKey, neighborhood, fetchImpl });
            if (documents.length === 0) {
              return null;
            }

            const view = buildKakaoNeighborhoodView(neighborhood, documents);
            return {
              view,
              report: buildKakaoCandidateReport(view)
            };
          } catch (error) {
            return {
              error: error instanceof Error ? error.message : 'Kakao Local API를 불러오지 못했습니다.'
            };
          }
        })()
      );
    }

    return cache.get(neighborhood.id);
  }

  return {
    async loadNeighborhoodSnapshot(neighborhood) {
      return loadNeighborhoodSnapshot(neighborhood);
    }
  };
}

export { buildKakaoCandidateReport, buildKakaoNeighborhoodView, fetchKakaoKeywordSearch };
