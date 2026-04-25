'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createApiClient } from '@/api';
import { NeighborhoodExplorerShell } from '@/components/neighborhood-explorer-shell';
import { Card, CardContent } from '@/components/ui/card';
import { resolveSelectedRestaurant } from '@/lib/explorer-state';
import type { CandidateReport, Neighborhood, NeighborhoodView } from '@/lib/types';

const api = createApiClient();

export function NeighborhoodExplorer() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [activeNeighborhoodId, setActiveNeighborhoodId] = useState<string | null>(null);
  const [view, setView] = useState<NeighborhoodView | null>(null);
  const [report, setReport] = useState<CandidateReport | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const selectedRestaurantIdRef = useRef<string | null>(null);

  const selectedRestaurant = useMemo(() => {
    if (!view) {
      return null;
    }

    return resolveSelectedRestaurant(view, [selectedRestaurantId]);
  }, [selectedRestaurantId, view]);

  useEffect(() => {
    selectedRestaurantIdRef.current = selectedRestaurantId;
  }, [selectedRestaurantId]);

  const loadNeighborhood = useCallback(
    async (neighborhoodId: string, keepSelection = false) => {
      const requestId = ++requestIdRef.current;
      setActiveNeighborhoodId(neighborhoodId);
      setError(null);
      setIsLoading(true);

      if (!keepSelection) {
        setSelectedRestaurantId(null);
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

  if (!view && isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-2xl border-border/70 bg-card/90 shadow-soft">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">로컬 API에서 시드 데이터를 불러오는 중입니다...</CardContent>
        </Card>
      </main>
    );
  }

  if (!view) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-2xl border-rose-500/20 bg-card/90 shadow-soft">
          <CardContent className="p-8 text-center text-sm text-rose-200">{error ?? '표시할 데이터가 없습니다.'}</CardContent>
        </Card>
      </main>
    );
  }

  return (
    <NeighborhoodExplorerShell
      neighborhoods={neighborhoods}
      activeNeighborhood={activeNeighborhood}
      activeNeighborhoodId={activeNeighborhoodId}
      view={view}
      report={report}
      selectedRestaurant={selectedRestaurant}
      selectedRestaurantId={selectedRestaurantId}
      onSelectNeighborhood={(id) => loadNeighborhood(id, false)}
      onSelectRestaurant={handleSelectRestaurant}
    />
  );
}
