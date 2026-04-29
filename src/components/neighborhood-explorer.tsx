'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createApiClient } from '@/api';
import { NeighborhoodExplorerShell } from '@/components/neighborhood-explorer-shell';
import { Card, CardContent } from '@/components/ui/card';
import { filterNeighborhoodViewByRestaurantName, resolveSelectedRestaurant } from '@/lib/explorer-state';
import {
  addRestaurantReview,
  getBrowserRestaurantReviewStorage,
  getRestaurantReviews,
  loadStoredRestaurantReviews,
  persistStoredRestaurantReviews
} from '@/lib/restaurant-reviews';
import type { CandidateReport, Neighborhood, NeighborhoodView, RestaurantReview, RestaurantReviewDraft } from '@/lib/types';

const api = createApiClient();

export function NeighborhoodExplorer() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [activeNeighborhoodId, setActiveNeighborhoodId] = useState<string | null>(null);
  const [view, setView] = useState<NeighborhoodView | null>(null);
  const [report, setReport] = useState<CandidateReport | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurantReviews, setRestaurantReviews] = useState<RestaurantReview[]>(() => {
    return loadStoredRestaurantReviews(getBrowserRestaurantReviewStorage());
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const selectedRestaurantIdRef = useRef<string | null>(null);

  const filteredView = useMemo(() => {
    if (!view) {
      return null;
    }

    return filterNeighborhoodViewByRestaurantName(view, searchQuery);
  }, [searchQuery, view]);

  const selectedRestaurant = useMemo(() => {
    if (!filteredView) {
      return null;
    }

    return resolveSelectedRestaurant(filteredView, [selectedRestaurantId]);
  }, [filteredView, selectedRestaurantId]);

  const displayedSelectedRestaurantId = selectedRestaurant?.id ?? null;

  const selectedRestaurantReviews = useMemo(() => {
    if (!displayedSelectedRestaurantId) {
      return [];
    }

    return getRestaurantReviews(restaurantReviews, displayedSelectedRestaurantId);
  }, [displayedSelectedRestaurantId, restaurantReviews]);

  const handleSearchQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  useEffect(() => {
    selectedRestaurantIdRef.current = selectedRestaurantId;
  }, [selectedRestaurantId]);

  useEffect(() => {
    persistStoredRestaurantReviews(getBrowserRestaurantReviewStorage(), restaurantReviews);
  }, [restaurantReviews]);

  const loadNeighborhood = useCallback(
    async (neighborhoodId: string, keepSelection = false) => {
      const requestId = ++requestIdRef.current;
      setActiveNeighborhoodId(neighborhoodId);
      setError(null);
      setIsLoading(true);

      if (!keepSelection) {
        setSelectedRestaurantId(null);
        setSearchQuery('');
      }

      try {
        const { view: nextView, report: nextReport } = await api.fetchNeighborhoodSnapshot(neighborhoodId);
        if (requestId !== requestIdRef.current) {
          return;
        }

        setView(nextView);
        setReport(nextReport);

        const nextSelected = resolveSelectedRestaurant(nextView, keepSelection ? [selectedRestaurantIdRef.current] : []);
        setSelectedRestaurantId(nextSelected?.id ?? null);
        setIsLoading(false);
      } catch (loadError) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : '선택한 동네 데이터를 불러오지 못했습니다.');
        setView(null);
        setReport(null);
        setIsLoading(false);
      }
    },
    []
  );

  const handleSelectRestaurant = useCallback((id: string) => {
    setSelectedRestaurantId(id);
  }, []);

  const handleSubmitRestaurantReview = useCallback((draft: RestaurantReviewDraft) => {
    const result = addRestaurantReview(restaurantReviews, draft);
    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }

    setRestaurantReviews(result.reviews);
    return { ok: true as const };
  }, [restaurantReviews]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const nextNeighborhoods = await api.fetchNeighborhoods();
        if (cancelled) {
          return;
        }

        setNeighborhoods(nextNeighborhoods);
        const firstId = nextNeighborhoods[0]?.id ?? null;
        if (!firstId) {
          setIsLoading(false);
          return;
        }

        await loadNeighborhood(firstId, false);
      } catch (bootstrapError) {
        if (cancelled) {
          return;
        }

        setError(bootstrapError instanceof Error ? bootstrapError.message : '로컬 API를 불러오지 못했습니다.');
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadNeighborhood]);

  const activeNeighborhood = neighborhoods.find((item) => item.id === activeNeighborhoodId) ?? view?.neighborhood ?? null;

  if (!filteredView && isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-2xl border-slate-200 bg-white shadow-soft">
          <CardContent className="p-8 text-center text-sm text-slate-600">로컬 API에서 시드 데이터를 불러오는 중입니다...</CardContent>
        </Card>
      </main>
    );
  }

  if (!filteredView) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-2xl border-rose-200 bg-white shadow-soft">
          <CardContent className="p-8 text-center text-sm text-rose-700">{error ?? '표시할 데이터가 없습니다.'}</CardContent>
        </Card>
      </main>
    );
  }

  return (
    <NeighborhoodExplorerShell
      neighborhoods={neighborhoods}
      activeNeighborhood={activeNeighborhood}
      activeNeighborhoodId={activeNeighborhoodId}
      view={filteredView}
      report={report}
      selectedRestaurant={selectedRestaurant}
      selectedRestaurantId={displayedSelectedRestaurantId}
      searchQuery={searchQuery}
      onSearchQueryChange={handleSearchQueryChange}
      onSelectNeighborhood={(id) => loadNeighborhood(id, false)}
      onSelectRestaurant={handleSelectRestaurant}
      selectedRestaurantReviews={selectedRestaurantReviews}
      onSubmitRestaurantReview={handleSubmitRestaurantReview}
    />
  );
}
