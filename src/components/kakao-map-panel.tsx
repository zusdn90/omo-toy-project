'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistance } from '@/lib/format';
import type { KakaoInfoWindow, KakaoLatLng, KakaoMapInstance, KakaoMarker, KakaoNamespace } from '@/lib/kakao-types';
import type { NeighborhoodView, Restaurant } from '@/lib/types';
import { cn } from '@/lib/utils';

const RESTAURANT_LAT_SPAN = 0.00036;
const RESTAURANT_LNG_SPAN = 0.00044;

const MARKER_COLORS = {
  seeded: '#0f172a',
  kakao: '#0284c7',
  visitkorea: '#16a34a',
  naver: '#e11d48'
} as const;

function getRestaurantSource(restaurant: Restaurant) {
  return restaurant.source ?? 'seeded';
}

function getMarkerColor(restaurant: Restaurant) {
  return MARKER_COLORS[getRestaurantSource(restaurant)];
}

function getMarkerSourceLabel(source: keyof typeof MARKER_COLORS) {
  if (source === 'kakao') {
    return 'Kakao';
  }

  if (source === 'visitkorea') {
    return 'VisitKorea';
  }

  if (source === 'naver') {
    return 'Naver 저장';
  }

  return 'Seeded';
}

function createMarkerImage(kakao: KakaoNamespace, restaurant: Restaurant) {
  const color = encodeURIComponent(getMarkerColor(restaurant));
  const stroke = encodeURIComponent('#ffffff');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44"><path fill="${color}" stroke="${stroke}" stroke-width="3" d="M17 2.5c8.008 0 14.5 6.492 14.5 14.5 0 10.875-14.5 24.5-14.5 24.5S2.5 27.875 2.5 17C2.5 8.992 8.992 2.5 17 2.5Z"/><circle cx="17" cy="17" r="5.5" fill="${stroke}"/></svg>`;
  return new kakao.maps.MarkerImage(`data:image/svg+xml;charset=UTF-8,${svg}`, new kakao.maps.Size(34, 44), {
    offset: new kakao.maps.Point(17, 44)
  });
}

let kakaoSdkPromise: Promise<KakaoNamespace> | null = null;

type MarkerEntry = {
  restaurant: Restaurant;
  marker: KakaoMarker;
  position: KakaoLatLng;
};

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isFiniteNumber(value: number | undefined): value is number {
  return Number.isFinite(value);
}

function getNeighborhoodCenter(view: NeighborhoodView) {
  return view.neighborhood?.mapCenter ?? { lat: 37.5442, lng: 127.0558, level: 4 };
}

function getRestaurantLatLng(restaurant: Restaurant, kakao: KakaoNamespace, view: NeighborhoodView) {
  if (isFiniteNumber(restaurant.lat) && isFiniteNumber(restaurant.lng)) {
    return new kakao.maps.LatLng(restaurant.lat, restaurant.lng);
  }

  const center = getNeighborhoodCenter(view);
  const lat = center.lat + (50 - (restaurant.y ?? 50)) * RESTAURANT_LAT_SPAN;
  const lng = center.lng + ((restaurant.x ?? 50) - 50) * RESTAURANT_LNG_SPAN;
  return new kakao.maps.LatLng(lat, lng);
}

function buildInfoWindowContent(restaurant: Restaurant) {
  const address = restaurant.roadAddressName || restaurant.addressName || '주소 정보 없음';
  const sourceLabel = getMarkerSourceLabel(getRestaurantSource(restaurant));

  return `
    <div style="padding:12px 14px;min-width:180px;font-family:Arial,sans-serif;">
      <strong style="display:block;font-size:14px;margin-bottom:4px;">${escapeHtml(restaurant.name)}</strong>
      <div style="font-size:12px;line-height:1.4;opacity:0.9;">${escapeHtml(restaurant.category ?? '-')}</div>
      <div style="margin-top:4px;font-size:12px;line-height:1.4;opacity:0.9;">출처 · ${escapeHtml(sourceLabel)}</div>
      <div style="margin-top:4px;font-size:12px;line-height:1.4;opacity:0.9;">주소 · ${escapeHtml(address)}</div>
    </div>
  `;
}

function getRestaurantAddress(restaurant: Restaurant | null) {
  return restaurant?.roadAddressName || restaurant?.addressName || '주소 정보 없음';
}

async function createKakaoSdkLoadError(fallbackMessage: string) {
  try {
    const response = await fetch('/api/kakao/maps-sdk/status', { cache: 'no-store' });
    const payload = (await response.json()) as { ok?: boolean; message?: string };
    if (payload.ok === false && payload.message) {
      return new Error(payload.message);
    }
  } catch {
    // Keep the original browser script-load error when the diagnostic endpoint is unavailable.
  }

  return new Error(fallbackMessage);
}

function syncSelectedMarkerState({
  map,
  infoWindow,
  markers,
  selectedRestaurantId
}: {
  map: KakaoMapInstance;
  infoWindow: KakaoInfoWindow;
  markers: MarkerEntry[];
  selectedRestaurantId: string | null;
}) {
  if (markers.length === 0) {
    return;
  }

  const selectedEntry = markers.find(({ restaurant }) => restaurant.id === selectedRestaurantId) ?? markers[0] ?? null;
  if (!selectedEntry) {
    return;
  }

  markers.forEach(({ marker, restaurant }) => {
    marker.setZIndex?.(restaurant.id === selectedEntry.restaurant.id ? 3 : 1);
  });

  infoWindow.setContent(buildInfoWindowContent(selectedEntry.restaurant));
  infoWindow.open(map, selectedEntry.marker);
}

function loadKakaoMapsSdk() {
  const kakao = window.kakao;
  if (kakao?.maps) {
    return Promise.resolve(kakao);
  }

  if (!kakaoSdkPromise) {
    const loadPromise = new Promise<KakaoNamespace>((resolve, reject) => {
      const kakaoJsKey = window.__OMO_APP_CONFIG__?.kakaoJsKey ?? '';
      if (!kakaoJsKey) {
        reject(new Error('Kakao JS key is missing from runtime config')); 
        return;
      }

      const existing = document.querySelector<HTMLScriptElement>('script[data-kakao-maps-sdk="true"]');
      if (existing) {
        existing.addEventListener(
          'load',
          () => {
            const loadedKakao = window.kakao;
            if (!loadedKakao?.maps) {
              existing.remove();
              reject(new Error('Kakao Maps SDK loaded without kakao.maps'));
              return;
            }

            loadedKakao.maps.load(() => resolve(loadedKakao));
          },
          { once: true }
        );
        existing.addEventListener(
          'error',
          () => {
            existing.remove();
            void createKakaoSdkLoadError('Kakao Maps SDK failed to load').then(reject);
          },
          { once: true }
        );
        return;
      }

      const script = document.createElement('script');
      script.dataset.kakaoMapsSdk = 'true';
      script.async = true;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoJsKey}&autoload=false`;
      script.onload = () => {
        const loadedKakao = window.kakao;
        if (!loadedKakao?.maps) {
          script.remove();
          reject(new Error('Kakao Maps SDK loaded without kakao.maps'));
          return;
        }

        loadedKakao.maps.load(() => resolve(loadedKakao));
      };
      script.onerror = () => {
        script.remove();
        void createKakaoSdkLoadError('Kakao Maps SDK failed to load').then(reject);
      };
      document.head.append(script);
    });

    kakaoSdkPromise = loadPromise.catch((error) => {
      kakaoSdkPromise = null;
      throw error;
    });
  }

  return kakaoSdkPromise;
}

export function KakaoMapPanel({
  view,
  selectedRestaurant,
  onSelectRestaurant
}: {
  view: NeighborhoodView;
  selectedRestaurant: Restaurant | null;
  onSelectRestaurant: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<KakaoMapInstance | null>(null);
  const infoWindowRef = useRef<KakaoInfoWindow | null>(null);
  const markersRef = useRef<MarkerEntry[]>([]);
  const tokenRef = useRef(0);
  const [status, setStatus] = useState<string>(
    view.source === 'kakao' ? 'Kakao place 데이터를 불러오는 중입니다...' : '카카오맵을 불러오는 중입니다...'
  );
  const badgeLabel = useMemo(() => {
    return view.source === 'kakao' ? view.summary?.searchQuery ?? '' : view.summary?.bestEvidenceName ?? '';
  }, [view]);

  useEffect(() => {
    let cancelled = false;
    const renderToken = ++tokenRef.current;
    const node = containerRef.current;

    if (!node) {
      return () => {
        cancelled = true;
      };
    }

    node.innerHTML = '';
    setStatus(view.source === 'kakao' ? 'Kakao place 데이터를 불러오는 중입니다...' : '카카오맵을 불러오는 중입니다...');

    void (async () => {
      try {
        const kakao = await loadKakaoMapsSdk();
        if (cancelled || renderToken !== tokenRef.current || !node.isConnected) {
          return;
        }

        const center = getNeighborhoodCenter(view);
        const map = new kakao.maps.Map(node, {
          center: new kakao.maps.LatLng(center.lat, center.lng),
          level: center.level,
          draggable: true,
          scrollwheel: true
        });

        map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT_BOTTOM);

        const bounds = new kakao.maps.LatLngBounds();
        const infoWindow = new kakao.maps.InfoWindow({ zIndex: 10 });
        const markers = view.ranked.map((restaurant) => {
          const position = getRestaurantLatLng(restaurant, kakao, view);
          const marker = new kakao.maps.Marker({
            map,
            position,
            title: restaurant.name,
            zIndex: restaurant.id === selectedRestaurant?.id ? 3 : 1,
            image: createMarkerImage(kakao, restaurant)
          });

          kakao.maps.event.addListener(marker, 'click', () => {
            onSelectRestaurant(restaurant.id);
          });

          bounds.extend(position);
          return { restaurant, marker, position };
        });

        mapInstanceRef.current = map;
        infoWindowRef.current = infoWindow;
        markersRef.current = markers;

        if (markers.length > 1) {
          map.setBounds(bounds);
        } else if (markers.length === 1) {
          map.setCenter(markers[0].position);
        }

        syncSelectedMarkerState({
          map,
          infoWindow,
          markers,
          selectedRestaurantId: selectedRestaurant?.id ?? null
        });

        setStatus(`카카오맵 연동 완료 · ${view.ranked.length}개 마커`);
      } catch (error) {
        if (cancelled || renderToken !== tokenRef.current || !node.isConnected) {
          return;
        }

        setStatus(error instanceof Error ? error.message : '카카오맵을 불러오지 못했습니다.');
      }
    })();

    return () => {
      cancelled = true;
      mapInstanceRef.current = null;
      infoWindowRef.current = null;
      markersRef.current = [];
    };
  }, [onSelectRestaurant, view]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const infoWindow = infoWindowRef.current;
    const markers = markersRef.current;

    if (!map || !infoWindow || markers.length === 0) {
      return;
    }

    syncSelectedMarkerState({
      map,
      infoWindow,
      markers,
      selectedRestaurantId: selectedRestaurant?.id ?? null
    });
  }, [selectedRestaurant?.id, view]);

  return (
    <Card className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-soft" data-testid="kakao-map-panel">
      <CardHeader className="space-y-3 border-b border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Map view</p>
            <CardTitle className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">지도 탐색</CardTitle>
            <CardDescription className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              카카오맵 위에서 마커를 누르거나 추천 카드를 선택하면 같은 후보가 강조됩니다.
            </CardDescription>
          </div>
          <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
            {view.ranked.length.toLocaleString('ko-KR')} markers
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-0">
        <div className="relative flex min-h-[420px] flex-1 overflow-hidden bg-slate-950 sm:min-h-[460px] lg:min-h-[520px]">
          <div ref={containerRef} className="min-h-[420px] w-full flex-1 bg-slate-900/90 sm:min-h-[460px] lg:min-h-[520px]" aria-label="카카오 지도" />
          <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full bg-white/95 px-3 py-1 text-slate-700 shadow-sm">
              Kakao Map
            </Badge>
            <Badge variant="outline" className="rounded-full border-slate-200 bg-white/90 px-3 py-1 text-slate-700 shadow-sm">
              {badgeLabel || '지도 기준'}
            </Badge>
            {Array.from(new Set(view.ranked.map((restaurant) => getRestaurantSource(restaurant)))).map((source) => (
              <Badge key={source} variant="outline" className="rounded-full border-slate-200 bg-white/90 px-3 py-1 text-slate-700 shadow-sm">
                <span className="mr-1.5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MARKER_COLORS[source] }} />
                {getMarkerSourceLabel(source)}
              </Badge>
            ))}
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-4 rounded-[1.35rem] border border-white/70 bg-white/95 px-4 py-3 text-sm text-slate-700 shadow-[0_22px_50px_-30px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="min-w-0">
              <span className={cn('font-medium', status.includes('완료') ? 'text-emerald-600' : 'text-slate-700')} data-map-status>
                {status}
              </span>
              <p className="mt-1 truncate text-xs text-slate-500">주소: {getRestaurantAddress(selectedRestaurant)}</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              {selectedRestaurant ? `선택: ${selectedRestaurant.name}` : '선택 없음'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
