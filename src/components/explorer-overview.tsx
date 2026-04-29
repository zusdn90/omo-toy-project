'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { buildExplorerMetrics, getPlaceBadge, getPlaceLocationLabel, getPlaceSubtitle } from '@/lib/explorer-display';
import type { CandidateReport, Neighborhood, NeighborhoodView, Restaurant } from '@/lib/types';
import { cn } from '@/lib/utils';
import { MetricCard } from './explorer-ui';

type NeighborhoodSwitcherProps = {
  neighborhoods: Neighborhood[];
  activeNeighborhoodId: string | null;
  onSelectNeighborhood: (id: string) => void | Promise<void>;
};

type RestaurantCollectionProps = {
  restaurants: Restaurant[];
  selectedRestaurantId: string | null;
  onSelectRestaurant: (id: string) => void;
};

const SOURCE_TREATMENT = {
  seeded: {
    label: 'Curated',
    dot: 'bg-slate-950',
    chip: 'border-slate-200 bg-slate-50 text-slate-700'
  },
  kakao: {
    label: 'Kakao',
    dot: 'bg-sky-600',
    chip: 'border-sky-200 bg-sky-50 text-sky-700'
  },
  visitkorea: {
    label: 'VisitKorea',
    dot: 'bg-emerald-600',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-700'
  },
  naver: {
    label: 'Naver 저장',
    dot: 'bg-rose-600',
    chip: 'border-rose-200 bg-rose-50 text-rose-700'
  }
} as const;

function getSourceTreatment(restaurant: Restaurant) {
  return SOURCE_TREATMENT[restaurant.source ?? 'seeded'];
}

export function NeighborhoodSwitcher({ neighborhoods, activeNeighborhoodId, onSelectNeighborhood }: NeighborhoodSwitcherProps) {
  return (
    <Card className="border-slate-200 bg-white shadow-soft">
      <CardHeader className="space-y-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">Neighborhood switcher</p>
            <CardTitle className="mt-2 text-2xl font-semibold text-slate-900">동네 선택</CardTitle>
            <CardDescription className="mt-1 text-sm text-slate-600">동네를 고르면 지도와 추천 후보가 함께 갱신됩니다.</CardDescription>
          </div>
          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
            v1 · 로컬 전용
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {neighborhoods.map((neighborhood) => {
            const active = neighborhood.id === activeNeighborhoodId;
            return (
              <Button
                key={neighborhood.id}
                data-testid={`neighborhood-switch-${neighborhood.id}`}
                variant={active ? 'default' : 'outline'}
                className={
                  active
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }
                onClick={() => void onSelectNeighborhood(neighborhood.id)}
              >
                <span>{neighborhood.name}</span>
                <span className="text-xs opacity-70">{active ? '현재 탐색 중' : '전환'}</span>
              </Button>
            );
          })}
        </div>
      </CardHeader>
    </Card>
  );
}

export function ExplorerMetricsGrid({ view, report }: { view: NeighborhoodView; report: CandidateReport | null }) {
  const metrics = buildExplorerMetrics(view, report);

  return (
    <Card className="border-slate-200 bg-white shadow-soft">
      <CardContent className="p-6 sm:p-8">
        <div className="grid gap-3 sm:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} label={metric.label} value={metric.value} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TopFivePanel({ restaurants, selectedRestaurantId, onSelectRestaurant }: RestaurantCollectionProps) {
  return (
    <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-soft">
      <CardHeader className="space-y-2 border-b border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Shortlist</p>
            <CardTitle className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">자동 추천 Top 5</CardTitle>
          </div>
          <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
            지도와 동기화
          </Badge>
        </div>
        <CardDescription className="max-w-2xl text-sm leading-6 text-slate-600">
          출처와 위치 맥락만 남겨 빠르게 훑고, 누르면 지도와 상세 기록이 같은 후보로 맞춰집니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 lg:p-8">
        <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {restaurants.length === 0 ? (
            <div className="w-full rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">이 동네에는 아직 추천 후보가 없습니다.</div>
          ) : (
            restaurants.map((restaurant, index) => {
              const selected = restaurant.id === selectedRestaurantId;
              const treatment = getSourceTreatment(restaurant);

              return (
                <button
                  key={restaurant.id}
                  type="button"
                  data-testid={`top-five-${restaurant.id}`}
                  onClick={() => onSelectRestaurant(restaurant.id)}
                  className={cn(
                    'group min-w-[270px] flex-[0_0_270px] rounded-[1.75rem] border p-4 text-left transition duration-200 sm:min-w-[310px] sm:flex-[0_0_310px] xl:min-w-[340px] xl:flex-[0_0_340px]',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100',
                    selected
                      ? 'border-sky-300 bg-sky-50 shadow-[0_22px_44px_-30px_rgba(2,132,199,0.65)]'
                      : 'border-slate-200 bg-white shadow-[0_18px_35px_-28px_rgba(15,23,42,0.2)] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_50px_-34px_rgba(15,23,42,0.28)]'
                  )}
                  aria-pressed={selected}
                >
                  <div className="flex h-full min-h-[188px] flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <Badge variant="outline" className={cn('rounded-full px-3 py-1', treatment.chip)}>
                        <span className={cn('mr-1.5 h-2 w-2 rounded-full', treatment.dot)} />
                        {treatment.label}
                      </Badge>
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-xl font-semibold tracking-[-0.02em] text-slate-950">{restaurant.name}</h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{getPlaceSubtitle(restaurant)}</p>
                    </div>

                    <div className="mt-auto space-y-2">
                      <Badge variant="secondary" className="max-w-full rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                        <span className="truncate">{restaurant.category ?? '맛집 후보'}</span>
                      </Badge>
                      <p className="truncate text-sm text-slate-500">{getPlaceLocationLabel(restaurant)}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function RankedRestaurantsPanel({ restaurants, selectedRestaurantId, onSelectRestaurant }: RestaurantCollectionProps) {
  return (
    <Card className="border-slate-200 bg-white shadow-soft">
      <CardHeader className="space-y-2 border-b border-slate-200 p-6 sm:p-8">
        <CardTitle className="text-2xl font-semibold text-slate-900">전체 후보 랭킹</CardTitle>
        <CardDescription className="text-sm text-slate-600">점수 순서와 증거 신호를 한눈에 비교할 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-6 sm:p-8">
        {restaurants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">이 동네에는 데이터가 없습니다.</div>
        ) : (
          restaurants.map((restaurant, index) => (
            <button
              key={restaurant.id}
              type="button"
              data-testid={`ranking-${restaurant.id}`}
              onClick={() => onSelectRestaurant(restaurant.id)}
              className={[
                'w-full rounded-2xl border p-4 text-left transition shadow-sm',
                restaurant.id === selectedRestaurantId
                  ? 'border-sky-300 bg-sky-50'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{index + 1}위</p>
                  <div className="mt-1 text-lg font-semibold text-slate-900">{restaurant.name}</div>
                </div>
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                  {getPlaceBadge(restaurant)}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-slate-600">{getPlaceSubtitle(restaurant)}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <Badge variant="muted" className="bg-slate-100 text-slate-600">
                  {restaurant.placeUrl ? 'Kakao place' : 'Seeded data'}
                </Badge>
                <Badge variant="muted" className="bg-slate-100 text-slate-600">
                  {getPlaceLocationLabel(restaurant)}
                </Badge>
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
