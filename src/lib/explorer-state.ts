import type { NeighborhoodView } from './types';

function formatAverageScore(items: NeighborhoodView['ranked']) {
  if (items.length === 0) {
    return '0.0';
  }

  const total = items.reduce((sum, item) => sum + (item.score ?? 0), 0);
  return (total / items.length).toFixed(1);
}

function formatLowestPriceLabel(items: NeighborhoodView['ranked']) {
  const prices = items.map((item) => item.avgMealPrice).filter((price): price is number => Number.isFinite(price));
  if (prices.length === 0) {
    return '-';
  }

  return `${Math.min(...prices).toLocaleString('ko-KR')}원`;
}

export function resolveSelectedRestaurant(view: NeighborhoodView, preferredRestaurantIds: Array<string | null | undefined> = []) {
  for (const preferredRestaurantId of preferredRestaurantIds) {
    if (!preferredRestaurantId) {
      continue;
    }

    const preferredRestaurant = view.ranked.find((restaurant) => restaurant.id === preferredRestaurantId);
    if (preferredRestaurant) {
      return preferredRestaurant;
    }
  }

  return view.selected ?? null;
}

export function filterNeighborhoodViewByRestaurantName(view: NeighborhoodView, query: string): NeighborhoodView {
  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
  if (!normalizedQuery) {
    return view;
  }

  const ranked = view.ranked.filter((restaurant) => restaurant.name.toLocaleLowerCase('ko-KR').includes(normalizedQuery));
  const top5 = ranked.slice(0, 5);
  const selected = ranked[0] ?? null;

  return {
    ...view,
    ranked,
    top5,
    selected,
    summary: {
      ...view.summary,
      totalRestaurants: ranked.length,
      totalPlaces: ranked.length,
      averageScore: formatAverageScore(ranked),
      bestEvidenceName: ranked[0]?.name ?? '-',
      lowestPriceLabel: formatLowestPriceLabel(ranked)
    }
  };
}
