import type { RestaurantReview, RestaurantReviewDraft } from './types';

type RestaurantReviewStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const RESTAURANT_REVIEWS_STORAGE_KEY = 'omo.restaurantReviews.v1';

export type ReviewDraftInput = RestaurantReviewDraft & {
  idFactory?: () => string;
  now?: () => string;
};

export type AddRestaurantReviewResult =
  | {
      ok: true;
      review: RestaurantReview;
      reviews: RestaurantReview[];
    }
  | {
      ok: false;
      error: string;
      reviews: RestaurantReview[];
    };

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function createReviewId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `review-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidIsoDate(value: string) {
  return !Number.isNaN(Date.parse(value));
}

function isRestaurantReview(value: unknown): value is RestaurantReview {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.restaurantId === 'string' &&
    value.restaurantId.trim().length > 0 &&
    typeof value.reviewerName === 'string' &&
    value.reviewerName.trim().length > 0 &&
    typeof value.content === 'string' &&
    value.content.trim().length > 0 &&
    typeof value.createdAt === 'string' &&
    isValidIsoDate(value.createdAt) &&
    typeof value.rating === 'number' &&
    Number.isInteger(value.rating) &&
    value.rating >= 1 &&
    value.rating <= 5
  );
}

function sortNewestFirst(reviews: RestaurantReview[]) {
  return [...reviews].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function getRestaurantReviews(reviews: RestaurantReview[], restaurantId: string) {
  return sortNewestFirst(reviews.filter((review) => review.restaurantId === restaurantId));
}

export function getRestaurantReviewSummary(reviews: RestaurantReview[], restaurantId: string) {
  const restaurantReviews = getRestaurantReviews(reviews, restaurantId);
  if (restaurantReviews.length === 0) {
    return { count: 0, averageRating: '-' };
  }

  const total = restaurantReviews.reduce((sum, review) => sum + review.rating, 0);
  return {
    count: restaurantReviews.length,
    averageRating: (total / restaurantReviews.length).toFixed(1)
  };
}

export function addRestaurantReview(existingReviews: RestaurantReview[], input: ReviewDraftInput): AddRestaurantReviewResult {
  const restaurantId = normalizeText(input.restaurantId);
  const reviewerName = normalizeText(input.reviewerName);
  const content = input.content.trim();
  const rating = Number(input.rating);

  if (!restaurantId) {
    return { ok: false, error: '리뷰를 남길 식당을 찾을 수 없습니다.', reviews: existingReviews };
  }

  if (!reviewerName) {
    return { ok: false, error: '작성자 이름을 입력해 주세요.', reviews: existingReviews };
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: '별점은 1점부터 5점까지 선택해 주세요.', reviews: existingReviews };
  }

  if (!content) {
    return { ok: false, error: '리뷰 내용을 입력해 주세요.', reviews: existingReviews };
  }

  const review: RestaurantReview = {
    id: input.idFactory?.() ?? createReviewId(),
    restaurantId,
    reviewerName,
    rating,
    content,
    createdAt: input.now?.() ?? new Date().toISOString()
  };

  return {
    ok: true,
    review,
    reviews: sortNewestFirst([review, ...existingReviews])
  };
}

export function parseStoredRestaurantReviews(rawValue: string | null | undefined): RestaurantReview[] {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortNewestFirst(parsed.filter(isRestaurantReview));
  } catch {
    return [];
  }
}

export function serializeRestaurantReviews(reviews: RestaurantReview[]) {
  return JSON.stringify(sortNewestFirst(reviews.filter(isRestaurantReview)));
}

export function getBrowserRestaurantReviewStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadStoredRestaurantReviews(storage: Pick<RestaurantReviewStorage, 'getItem'> | null | undefined) {
  if (!storage) {
    return [];
  }

  try {
    return parseStoredRestaurantReviews(storage.getItem(RESTAURANT_REVIEWS_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function persistStoredRestaurantReviews(
  storage: Pick<RestaurantReviewStorage, 'setItem'> | null | undefined,
  reviews: RestaurantReview[]
) {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(RESTAURANT_REVIEWS_STORAGE_KEY, serializeRestaurantReviews(reviews));
    return true;
  } catch {
    return false;
  }
}
