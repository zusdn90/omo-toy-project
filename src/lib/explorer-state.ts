import type { NeighborhoodView } from './types';

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
