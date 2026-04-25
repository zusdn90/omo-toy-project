import type { Neighborhood, NeighborhoodSnapshot } from '@/lib/types';

type NeighborhoodListResponse = {
  neighborhoods?: Neighborhood[];
};

function buildUrl(path: string, baseUrl = ''): string {
  return `${baseUrl}${path}`;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`.trim());
  }

  return (await response.json()) as T;
}

export interface ApiClient {
  fetchNeighborhoods(): Promise<Neighborhood[]>;
  fetchNeighborhoodSnapshot(neighborhoodId: string): Promise<NeighborhoodSnapshot>;
}

export function createApiClient(baseUrl = ''): ApiClient {
  return {
    async fetchNeighborhoods() {
      const payload = await readJson<NeighborhoodListResponse>(await fetch(buildUrl('/api/neighborhoods', baseUrl)));
      return payload.neighborhoods ?? [];
    },

    async fetchNeighborhoodSnapshot(neighborhoodId: string) {
      const safeNeighborhoodId = encodeURIComponent(neighborhoodId);
      return readJson<NeighborhoodSnapshot>(await fetch(buildUrl(`/api/neighborhoods/${safeNeighborhoodId}/snapshot`, baseUrl)));
    }
  };
}
