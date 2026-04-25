'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistance } from '@/lib/format';
import type { KakaoInfoWindow, KakaoLatLng, KakaoMapInstance, KakaoMarker, KakaoNamespace } from '@/lib/kakao-types';
import type { NeighborhoodView, Restaurant } from '@/lib/types';
import { cn } from '@/lib/utils';

const RESTAURANT_LAT_SPAN = 0.00036;
const RESTAURANT_LNG_SPAN = 0.00044;

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
  return `
    <div style="padding:12px 14px;min-width:180px;font-family:Arial,sans-serif;">
      <strong style="display:block;font-size:14px;margin-bottom:4px;">${escapeHtml(restaurant.name)}</strong>
      <div style="font-size:12px;line-height:1.4;opacity:0.9;">${escapeHtml(restaurant.category ?? '-')} · ${escapeHtml(restaurant.roadAddressName || restaurant.addressName || restaurant.note || '-')}</div>
      <div style="margin-top:6px;font-size:12px;font-weight:700;color:#2563eb;">점수 ${escapeHtml(restaurant.score ?? '-')}</div>
    </div>
  `;
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
            reject(new Error('Kakao Maps SDK failed to load'));
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
        reject(new Error('Kakao Maps SDK failed to load'));
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
            zIndex: restaurant.id === selectedRestaurant?.id ? 3 : 1
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
    <Card className="overflow-hidden border-border/70 bg-card/90 shadow-soft" data-testid="kakao-map-panel">
      <CardHeader className="space-y-2 border-b border-border/60 bg-card/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/90">Map view</p>
            <CardTitle className="mt-2 text-2xl">지도 + 랭킹</CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground">
              카카오맵 위에서 마커를 누르거나 리스트를 클릭하면 같은 후보가 강조됩니다.
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-cyan-400/30 bg-cyan-400/10 text-cyan-100">
            {view.source === 'kakao' ? 'kakao local' : 'seeded fallback'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-0">
        <div className="relative overflow-hidden rounded-b-3xl">
          <div ref={containerRef} className="h-[420px] w-full bg-slate-900/90" aria-label="카카오 지도" />
          <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-slate-950/85 text-slate-100">
              Kakao Map
            </Badge>
            <Badge variant="outline" className="border-white/10 bg-black/30 text-white">
              {badgeLabel || '지도 기준'}
            </Badge>
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 backdrop-blur">
            <span className={cn('font-medium', status.includes('완료') ? 'text-emerald-300' : 'text-slate-200')} data-map-status>
              {status}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {selectedRestaurant ? `선택: ${selectedRestaurant.name}` : '선택 없음'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
