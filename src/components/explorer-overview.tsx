'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { buildExplorerMetrics, getPlaceBadge, getPlaceLocationLabel, getPlaceSubtitle } from '@/lib/explorer-display';
import type { CandidateReport, Neighborhood, NeighborhoodView, Restaurant } from '@/lib/types';
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

export function NeighborhoodSwitcher({ neighborhoods, activeNeighborhoodId, onSelectNeighborhood }: NeighborhoodSwitcherProps) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-soft">
      <CardHeader className="space-y-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/90">Neighborhood switcher</p>
            <CardTitle className="mt-2 text-2xl">동네를 빠르게 전환</CardTitle>
            <CardDescription className="mt-1 text-sm text-slate-300">탭을 누르면 지도, 랭킹, 리포트가 한 번에 갱신됩니다.</CardDescription>
          </div>
          <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-100">
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
                className={active ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'}
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
    <Card className="border-border/70 bg-card/90 shadow-soft">
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
    <Card className="border-border/70 bg-card/90 shadow-soft">
      <CardHeader className="space-y-2 border-b border-border/60 p-6 sm:p-8">
        <CardTitle className="text-2xl">자동 추천 Top 5</CardTitle>
        <CardDescription className="text-sm text-slate-300">지도와 리스트를 한 번에 보면서 바로 검토할 수 있게 정리했어요.</CardDescription>
      </CardHeader>
      <CardContent className="p-6 sm:p-8">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {restaurants.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">이 동네에는 아직 추천 후보가 없습니다.</div>
          ) : (
            restaurants.map((restaurant, index) => (
              <button
                key={restaurant.id}
                type="button"
                data-testid={`top-five-${restaurant.id}`}
                onClick={() => onSelectRestaurant(restaurant.id)}
                className={[
                  'rounded-2xl border p-4 text-left transition',
                  restaurant.id === selectedRestaurantId
                    ? 'border-cyan-400/50 bg-cyan-400/10 shadow-soft'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">Top {index + 1}</p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-50">{restaurant.name}</h3>
                  </div>
                  <Badge variant="secondary" className="bg-white/10 text-slate-100">
                    {getPlaceBadge(restaurant)}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-300">{getPlaceSubtitle(restaurant)}</p>
                <p className="mt-4 text-sm text-slate-400">{getPlaceLocationLabel(restaurant)}</p>
              </button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function RankedRestaurantsPanel({ restaurants, selectedRestaurantId, onSelectRestaurant }: RestaurantCollectionProps) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-soft">
      <CardHeader className="space-y-2 border-b border-border/60 p-6 sm:p-8">
        <CardTitle className="text-2xl">전체 후보 랭킹</CardTitle>
        <CardDescription className="text-sm text-slate-300">점수 순서와 증거 신호를 한눈에 비교할 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-6 sm:p-8">
        {restaurants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">이 동네에는 데이터가 없습니다.</div>
        ) : (
          restaurants.map((restaurant, index) => (
            <button
              key={restaurant.id}
              type="button"
              data-testid={`ranking-${restaurant.id}`}
              onClick={() => onSelectRestaurant(restaurant.id)}
              className={[
                'w-full rounded-2xl border p-4 text-left transition',
                restaurant.id === selectedRestaurantId
                  ? 'border-cyan-400/50 bg-cyan-400/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">{index + 1}위</p>
                  <div className="mt-1 text-lg font-semibold text-slate-50">{restaurant.name}</div>
                </div>
                <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-100">
                  {getPlaceBadge(restaurant)}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-slate-300">{getPlaceSubtitle(restaurant)}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                <Badge variant="muted" className="bg-white/5 text-slate-300">
                  {restaurant.placeUrl ? 'Kakao place' : 'Seeded data'}
                </Badge>
                <Badge variant="muted" className="bg-white/5 text-slate-300">
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
