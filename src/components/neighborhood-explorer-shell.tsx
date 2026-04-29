'use client';

import React, { useState } from 'react';
import {
  Map as MapIcon,
  ListChecks,
  MapPinned,
  Search,
  Sparkles,
  Store,
  X
} from 'lucide-react';

import { KakaoMapPanel } from '@/components/kakao-map-panel';
import { ExplorerFooter, SelectedRestaurantPanel } from '@/components/explorer-detail';
import { TopFivePanel } from '@/components/explorer-overview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type {
  CandidateReport,
  Neighborhood,
  NeighborhoodView,
  Restaurant,
  RestaurantReview,
  RestaurantReviewDraft,
  RestaurantReviewSubmitResult
} from '@/lib/types';

export type NeighborhoodExplorerShellProps = {
  neighborhoods: Neighborhood[];
  activeNeighborhood: Neighborhood | null;
  activeNeighborhoodId: string | null;
  view: NeighborhoodView;
  report: CandidateReport | null;
  selectedRestaurant: Restaurant | null;
  selectedRestaurantId: string | null;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSelectNeighborhood: (id: string) => void | Promise<void>;
  onSelectRestaurant: (id: string) => void;
  selectedRestaurantReviews?: RestaurantReview[];
  onSubmitRestaurantReview?: (draft: RestaurantReviewDraft) => RestaurantReviewSubmitResult;
};

function RestaurantSearchBox({
  searchQuery,
  onSearchQueryChange,
  className
}: Pick<NeighborhoodExplorerShellProps, 'searchQuery' | 'onSearchQueryChange'> & { className?: string }) {
  return (
    <label className={['flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-500 shadow-sm transition focus-within:border-sky-300 focus-within:ring-4 focus-within:ring-sky-100', className ?? ''].join(' ')}>
      <Search className="h-4 w-4 shrink-0" />
      <span className="sr-only">식당 이름으로 검색</span>
      <input
        type="search"
        value={searchQuery}
        placeholder="식당 이름으로 검색"
        className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-500"
        onChange={(event) => onSearchQueryChange(event.target.value)}
      />
    </label>
  );
}

function DashboardHeader({
  activeNeighborhood,
  searchQuery,
  onSearchQueryChange,
  onOpenDetail,
  selectedRestaurant,
  view
}: {
  activeNeighborhood: Neighborhood | null;
  onOpenDetail: () => void;
  selectedRestaurant: Restaurant | null;
  view: NeighborhoodView;
} & Pick<NeighborhoodExplorerShellProps, 'searchQuery' | 'onSearchQueryChange'>) {
  return (
    <header className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-4 px-6 py-5 xl:px-7">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
            <MapPinned className="h-4 w-4" />
            Dining atlas
          </div>
          <div className="max-w-4xl">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950">맛집 탐색 노트</h1>
            <p className="mt-2 max-w-[72ch] text-sm leading-6 text-slate-600">
              {activeNeighborhood ? `${activeNeighborhood.name}: ${activeNeighborhood.vibe}` : '선택된 동네를 기준으로 탐색 정보를 확인합니다.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">후보 {view.ranked.length.toLocaleString('ko-KR')}곳</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">Top {view.top5.length}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">선택 {selectedRestaurant?.name ?? '대기 중'}</span>
          </div>
        </div>

        <div className="flex min-w-[360px] flex-col justify-between gap-4 border-t border-slate-200 bg-slate-50/80 px-6 py-5 xl:border-l xl:border-t-0">
          <RestaurantSearchBox searchQuery={searchQuery} onSearchQueryChange={onSearchQueryChange} className="w-full" />
          <Button variant="outline" className="h-11 rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-100" aria-label="상세 정보 열기" onClick={onOpenDetail}>
            <ListChecks className="h-4 w-4" />
            선택 맛집 기록 보기
          </Button>
        </div>
      </div>
    </header>
  );
}

function MobileAppHeader({
  activeNeighborhood,
  activeNeighborhoodId,
  neighborhoods,
  onSearchQueryChange,
  onSelectNeighborhood,
  searchQuery,
  selectedRestaurant
}: Pick<
  NeighborhoodExplorerShellProps,
  'activeNeighborhood' | 'activeNeighborhoodId' | 'neighborhoods' | 'onSearchQueryChange' | 'onSelectNeighborhood' | 'searchQuery' | 'selectedRestaurant'
>) {
  return (
    <header className="sticky top-0 z-30 space-y-3 border-b border-slate-200 bg-white/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] shadow-[0_14px_34px_-28px_rgba(15,23,42,0.45)] backdrop-blur lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
            <Store className="h-4 w-4" />
            Dining atlas
          </div>
          <h1 className="mt-1 truncate text-xl font-semibold tracking-[-0.02em] text-slate-950">맛집 탐색 노트</h1>
          <p className="mt-1 truncate text-sm text-slate-600">{activeNeighborhood?.name ?? '동네 선택'} · {selectedRestaurant?.name ?? '후보 탐색 중'}</p>
        </div>

        <Badge className="shrink-0 border border-sky-200 bg-sky-50 text-sky-700">
          <MapPinned className="mr-1 h-3.5 w-3.5" />
          Live
        </Badge>
      </div>
      <RestaurantSearchBox searchQuery={searchQuery} onSearchQueryChange={onSearchQueryChange} className="h-12 w-full bg-white" />
      <NeighborhoodRail
        neighborhoods={neighborhoods}
        activeNeighborhoodId={activeNeighborhoodId}
        onSelectNeighborhood={onSelectNeighborhood}
        className="-mx-4 px-4"
      />
    </header>
  );
}

function NeighborhoodRail({
  neighborhoods,
  activeNeighborhoodId,
  onSelectNeighborhood,
  className
}: Pick<NeighborhoodExplorerShellProps, 'neighborhoods' | 'activeNeighborhoodId' | 'onSelectNeighborhood'> & { className?: string }) {
  return (
    <section className={className} aria-label="동네 빠른 선택">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {neighborhoods.map((neighborhood) => {
          const active = neighborhood.id === activeNeighborhoodId;
          return (
            <Button
              key={neighborhood.id}
              type="button"
              variant={active ? 'default' : 'outline'}
              className={[
                'h-11 min-w-[96px] shrink-0 rounded-full px-4 text-sm font-semibold transition focus-visible:ring-4 focus-visible:ring-sky-100',
                active ? 'bg-slate-950 text-white shadow-[0_14px_28px_-22px_rgba(15,23,42,0.8)] hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              ].join(' ')}
              aria-pressed={active}
              onClick={() => void onSelectNeighborhood(neighborhood.id)}
            >
              {neighborhood.name}
            </Button>
          );
        })}
      </div>
    </section>
  );
}

function SearchResultNotice({
  searchQuery,
  resultCount,
  onSearchQueryChange
}: Pick<NeighborhoodExplorerShellProps, 'searchQuery' | 'onSearchQueryChange'> & { resultCount: number }) {
  const normalizedQuery = searchQuery.trim();
  if (!normalizedQuery) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 sm:flex-row sm:items-center sm:justify-between">
      <span>
        <strong>{normalizedQuery}</strong> 검색 결과 {resultCount}곳을 지도와 추천 목록에 표시 중입니다.
      </span>
      <Button type="button" variant="outline" size="sm" className="border-sky-200 bg-white text-sky-700 hover:bg-sky-50" onClick={() => onSearchQueryChange('')}>
        검색 초기화
      </Button>
    </div>
  );
}

function MobileBottomNavigation({ onOpenDetail }: { onOpenDetail: () => void }) {
  const items = [
    { href: '#map', label: '지도', icon: MapIcon },
    { href: '#recommendations', label: '추천', icon: Sparkles }
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[80] border-t border-slate-200 bg-white/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur lg:hidden" aria-label="모바일 앱 하단 내비게이션">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-1 rounded-3xl border border-slate-200 bg-slate-50 p-1">
        {items.map(({ href, label, icon: Icon }) => (
          <a key={href} href={href} className="flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs font-medium text-slate-600 transition hover:bg-white hover:text-slate-900">
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </a>
        ))}
        <button type="button" aria-label="상세 정보 열기" className="flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs font-medium text-slate-600 transition hover:bg-white hover:text-slate-900" onClick={onOpenDetail}>
          <Store className="h-4 w-4" />
          <span>상세</span>
        </button>
      </div>
    </nav>
  );
}

function DetailDialog({
  open,
  selectedRestaurant,
  onClose,
  reviews = [],
  onSubmitReview
}: {
  open: boolean;
  selectedRestaurant: Restaurant | null;
  onClose: () => void;
  reviews?: RestaurantReview[];
  onSubmitReview?: (draft: RestaurantReviewDraft) => RestaurantReviewSubmitResult;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" aria-label="상세 정보">
      <div className="max-h-[88vh] w-full overflow-auto rounded-t-[2rem] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[2rem]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Selected place</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">상세 정보</h2>
          </div>
          <Button type="button" variant="outline" size="icon" className="rounded-full border-slate-200 bg-white text-slate-600" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 sm:p-6">
          <SelectedRestaurantPanel selectedRestaurant={selectedRestaurant} reviews={reviews} onSubmitReview={onSubmitReview} />
        </div>
      </div>
    </div>
  );
}

export function NeighborhoodExplorerShell({
  neighborhoods,
  activeNeighborhood,
  activeNeighborhoodId,
  view,
  selectedRestaurant,
  selectedRestaurantId,
  searchQuery,
  onSearchQueryChange,
  onSelectNeighborhood,
  onSelectRestaurant,
  selectedRestaurantReviews = [],
  onSubmitRestaurantReview
}: NeighborhoodExplorerShellProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <main className="surface-grid min-h-screen">
      <MobileAppHeader
        activeNeighborhood={activeNeighborhood}
        activeNeighborhoodId={activeNeighborhoodId}
        neighborhoods={neighborhoods}
        onSearchQueryChange={onSearchQueryChange}
        onSelectNeighborhood={onSelectNeighborhood}
        searchQuery={searchQuery}
        selectedRestaurant={selectedRestaurant}
      />

      <div className="mx-auto w-full max-w-[1800px] px-4 py-4 pb-28 lg:px-6 lg:pb-6">
        <section className="space-y-6">
          <div className="hidden lg:block">
            <DashboardHeader
              activeNeighborhood={activeNeighborhood}
              searchQuery={searchQuery}
              onSearchQueryChange={onSearchQueryChange}
              onOpenDetail={() => setDetailOpen(true)}
              selectedRestaurant={selectedRestaurant}
              view={view}
            />
          </div>

          <div className="hidden lg:block">
            <NeighborhoodRail neighborhoods={neighborhoods} activeNeighborhoodId={activeNeighborhoodId} onSelectNeighborhood={onSelectNeighborhood} />
          </div>

          <SearchResultNotice searchQuery={searchQuery} resultCount={view.ranked.length} onSearchQueryChange={onSearchQueryChange} />

          <section id="map" className="scroll-mt-24 space-y-6">
            <KakaoMapPanel view={view} selectedRestaurant={selectedRestaurant} onSelectRestaurant={onSelectRestaurant} />

            <div id="recommendations" className="scroll-mt-24">
              <TopFivePanel restaurants={view.top5} selectedRestaurantId={selectedRestaurantId} onSelectRestaurant={onSelectRestaurant} />
            </div>
          </section>

          <ExplorerFooter />
        </section>
      </div>

      <MobileBottomNavigation onOpenDetail={() => setDetailOpen(true)} />
      <DetailDialog
        open={detailOpen}
        selectedRestaurant={selectedRestaurant}
        reviews={selectedRestaurantReviews}
        onSubmitReview={onSubmitRestaurantReview}
        onClose={() => setDetailOpen(false)}
      />
    </main>
  );
}
