import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addRestaurantReview,
  getRestaurantReviewSummary,
  getRestaurantReviews,
  loadStoredRestaurantReviews,
  parseStoredRestaurantReviews,
  persistStoredRestaurantReviews,
  serializeRestaurantReviews
} from '../src/lib/restaurant-reviews';
import type { RestaurantReview } from '../src/lib/types';

const now = '2026-04-29T12:00:00.000Z';

test('addRestaurantReview validates and stores a sanitized review newest-first by restaurant', () => {
  const existing: RestaurantReview[] = [
    {
      id: 'old-review',
      restaurantId: 'first',
      reviewerName: '기존 작성자',
      rating: 4,
      content: '기존 리뷰',
      createdAt: '2026-04-28T12:00:00.000Z'
    }
  ];

  const result = addRestaurantReview(existing, {
    restaurantId: 'first',
    reviewerName: '  새 작성자  ',
    rating: 5,
    content: '  다시 방문하고 싶은 집이에요.  ',
    now: () => now,
    idFactory: () => 'new-review'
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.deepEqual(result.review, {
    id: 'new-review',
    restaurantId: 'first',
    reviewerName: '새 작성자',
    rating: 5,
    content: '다시 방문하고 싶은 집이에요.',
    createdAt: now
  });
  assert.deepEqual(getRestaurantReviews(result.reviews, 'first').map((review) => review.id), ['new-review', 'old-review']);
});

test('addRestaurantReview rejects invalid review input', () => {
  assert.equal(addRestaurantReview([], { restaurantId: '', reviewerName: '나', rating: 5, content: '좋아요' }).ok, false);
  assert.equal(addRestaurantReview([], { restaurantId: 'first', reviewerName: '', rating: 5, content: '좋아요' }).ok, false);
  assert.equal(addRestaurantReview([], { restaurantId: 'first', reviewerName: '나', rating: 0, content: '좋아요' }).ok, false);
  assert.equal(addRestaurantReview([], { restaurantId: 'first', reviewerName: '나', rating: 6, content: '좋아요' }).ok, false);
  assert.equal(addRestaurantReview([], { restaurantId: 'first', reviewerName: '나', rating: 5, content: '   ' }).ok, false);
});

test('getRestaurantReviewSummary computes count and average rating for one restaurant', () => {
  const reviews: RestaurantReview[] = [
    { id: 'a', restaurantId: 'first', reviewerName: 'A', rating: 5, content: 'A', createdAt: '2026-04-29T12:00:00.000Z' },
    { id: 'b', restaurantId: 'first', reviewerName: 'B', rating: 4, content: 'B', createdAt: '2026-04-29T11:00:00.000Z' },
    { id: 'c', restaurantId: 'second', reviewerName: 'C', rating: 1, content: 'C', createdAt: '2026-04-29T10:00:00.000Z' }
  ];

  assert.deepEqual(getRestaurantReviewSummary(reviews, 'first'), { count: 2, averageRating: '4.5' });
  assert.deepEqual(getRestaurantReviewSummary(reviews, 'missing'), { count: 0, averageRating: '-' });
});

test('storage serialization keeps only valid restaurant reviews and tolerates corrupt payloads', () => {
  const validReview: RestaurantReview = {
    id: 'a',
    restaurantId: 'first',
    reviewerName: 'A',
    rating: 5,
    content: '좋아요',
    createdAt: now
  };
  const payload = JSON.stringify([validReview, { id: 'bad', restaurantId: 'first', rating: 9 }]);

  assert.deepEqual(parseStoredRestaurantReviews(payload), [validReview]);
  assert.deepEqual(parseStoredRestaurantReviews('{bad json'), []);
  assert.equal(serializeRestaurantReviews([validReview]), JSON.stringify([validReview]));
});

test('storage helpers tolerate unavailable browser storage', () => {
  const throwingStorage = {
    getItem() {
      throw new Error('storage disabled');
    },
    setItem() {
      throw new Error('storage disabled');
    }
  };

  assert.deepEqual(loadStoredRestaurantReviews(null), []);
  assert.deepEqual(loadStoredRestaurantReviews(throwingStorage), []);
  assert.equal(persistStoredRestaurantReviews(null, []), false);
  assert.equal(persistStoredRestaurantReviews(throwingStorage, []), false);
});
