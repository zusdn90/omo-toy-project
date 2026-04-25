'use client';

import { KakaoMapPanel } from '@/components/kakao-map-panel';
import { ExplorerFooter, SelectedRestaurantPanel, ReportPanel } from '@/components/explorer-detail';
import { ActiveNeighborhoodPanel, ExplorerHero } from '@/components/explorer-intro';
import { ExplorerMetricsGrid, NeighborhoodSwitcher, RankedRestaurantsPanel, TopFivePanel } from '@/components/explorer-overview';
import type { CandidateReport, Neighborhood, NeighborhoodView, Restaurant } from '@/lib/types';

export type NeighborhoodExplorerShellProps = {
  neighborhoods: Neighborhood[];
  activeNeighborhood: Neighborhood | null;
  activeNeighborhoodId: string | null;
  view: NeighborhoodView;
  report: CandidateReport | null;
  selectedRestaurant: Restaurant | null;
  selectedRestaurantId: string | null;
  onSelectNeighborhood: (id: string) => void | Promise<void>;
  onSelectRestaurant: (id: string) => void;
};

export function NeighborhoodExplorerShell({
  neighborhoods,
  activeNeighborhood,
  activeNeighborhoodId,
  view,
  report,
  selectedRestaurant,
  selectedRestaurantId,
  onSelectNeighborhood,
  onSelectRestaurant
}: NeighborhoodExplorerShellProps) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <ExplorerHero />
        <ActiveNeighborhoodPanel activeNeighborhood={activeNeighborhood} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <div className="space-y-6">
          <NeighborhoodSwitcher
            neighborhoods={neighborhoods}
            activeNeighborhoodId={activeNeighborhoodId}
            onSelectNeighborhood={onSelectNeighborhood}
          />

          <ExplorerMetricsGrid view={view} report={report} />

          <KakaoMapPanel view={view} selectedRestaurant={selectedRestaurant} onSelectRestaurant={onSelectRestaurant} />

          <TopFivePanel restaurants={view.top5} selectedRestaurantId={selectedRestaurantId} onSelectRestaurant={onSelectRestaurant} />

          <RankedRestaurantsPanel restaurants={view.ranked} selectedRestaurantId={selectedRestaurantId} onSelectRestaurant={onSelectRestaurant} />
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <SelectedRestaurantPanel selectedRestaurant={selectedRestaurant} />
          <ReportPanel report={report} />
        </aside>
      </section>

      <ExplorerFooter />
    </main>
  );
}
