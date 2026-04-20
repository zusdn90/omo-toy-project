function buildUrl(path, baseUrl = '') {
  return `${baseUrl}${path}`;
}

async function readJson(response) {
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`.trim());
  }

  return response.json();
}

export function createApiClient(baseUrl = '') {
  return {
    async fetchNeighborhoods() {
      const payload = await readJson(await fetch(buildUrl('/api/neighborhoods', baseUrl)));
      return payload.neighborhoods ?? [];
    },
    async fetchNeighborhoodSnapshot(neighborhoodId) {
      const safeNeighborhoodId = encodeURIComponent(neighborhoodId);
      const [viewPayload, reportPayload] = await Promise.all([
        readJson(await fetch(buildUrl(`/api/neighborhoods/${safeNeighborhoodId}/view`, baseUrl))),
        readJson(await fetch(buildUrl(`/api/neighborhoods/${safeNeighborhoodId}/report`, baseUrl)))
      ]);

      return {
        view: viewPayload,
        report: reportPayload
      };
    }
  };
}
