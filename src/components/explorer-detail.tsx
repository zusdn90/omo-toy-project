'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatDistance, safePlaceUrl } from '@/lib/format';
import type { CandidateReport, Restaurant, RestaurantReview, RestaurantReviewDraft, RestaurantReviewSubmitResult } from '@/lib/types';
import { InfoCard } from './explorer-ui';
import { getRestaurantReviewSummary } from '@/lib/restaurant-reviews';

function getSourceLabel(restaurant: Restaurant) {
  if (restaurant.source === 'kakao') {
    return 'Kakao place';
  }

  if (restaurant.source === 'visitkorea') {
    return '맛집차트';
  }

  if (restaurant.source === 'naver') {
    return 'Naver saved';
  }

  return '추천 후보';
}

function getScoreLabel(restaurant: Restaurant) {
  if (restaurant.source === 'naver') {
    return '저장목록 점수';
  }

  return restaurant.source === 'kakao' ? '점수' : '가성비 점수';
}

function getRestaurantInfoCards(restaurant: Restaurant) {
  const infoCards = [
    { label: '카테고리', value: restaurant.category ?? '-' },
    { label: '거리', value: formatDistance(restaurant.distanceMeters) },
    { label: '전화', value: restaurant.phone ?? '-' }
  ];

  if (restaurant.source === 'visitkorea') {
    return infoCards;
  }

  return [
    { label: getScoreLabel(restaurant), value: String(restaurant.score ?? '-') },
    ...infoCards
  ];
}

function getUniqueAddressRows(restaurant: Restaurant) {
  const rows = [
    { label: '도로명 주소', value: restaurant.roadAddressName },
    { label: '지번 주소', value: restaurant.addressName }
  ];
  const seen = new Set<string>();

  return rows.filter(({ value }) => {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  }) as Array<{ label: string; value: string }>;
}

function getCleanReasons(restaurant: Restaurant) {
  const addressValues = new Set(
    [restaurant.roadAddressName, restaurant.addressName].filter((value): value is string => Boolean(value?.trim()))
  );
  const note = restaurant.note?.trim();
  const seen = new Set<string>();

  return (restaurant.reasons ?? []).filter((reason) => {
    const normalized = reason.trim();
    if (!normalized || normalized === note || normalized.startsWith('주소:')) {
      return false;
    }

    for (const address of addressValues) {
      if (normalized.includes(address)) {
        return false;
      }
    }

    if (seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function getExternalLinkLabel(restaurant: Restaurant) {
  if (restaurant.source === 'visitkorea') {
    return '대한민국 구석구석 상세 페이지 열기';
  }

  if (restaurant.source === 'naver') {
    return '네이버 지도 장소 상세 페이지 열기';
  }

  return '카카오 장소 상세 페이지 열기';
}

type SubmitRestaurantReview = (draft: RestaurantReviewDraft) => RestaurantReviewSubmitResult;

function formatReviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function RestaurantReviewSection({
  selectedRestaurant,
  reviews,
  onSubmitReview
}: {
  selectedRestaurant: Restaurant;
  reviews: RestaurantReview[];
  onSubmitReview?: SubmitRestaurantReview;
}) {
  const [reviewerName, setReviewerName] = useState('');
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const summary = getRestaurantReviewSummary(reviews, selectedRestaurant.id);

  useEffect(() => {
    setFeedback(null);
    setContent('');
  }, [selectedRestaurant.id]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onSubmitReview?.({
      restaurantId: selectedRestaurant.id,
      reviewerName,
      rating,
      content
    }) ?? { ok: false, error: '리뷰 저장 기능을 사용할 수 없습니다.' };

    if (!result.ok) {
      setFeedback(result.error);
      return;
    }

    setFeedback('리뷰를 저장했습니다.');
    setContent('');
  }

  return (
    <section className="space-y-4" aria-labelledby="restaurant-review-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h4 id="restaurant-review-heading" className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">방문 리뷰</h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">이 맛집에 대한 내 경험을 브라우저에 저장하고 다시 확인합니다.</p>
        </div>
        <Badge variant="outline" className="w-fit rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
          Local notes
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard label="리뷰 평균" value={summary.averageRating === '-' ? '-' : `${summary.averageRating}/5`} />
        <InfoCard label="남겨진 리뷰" value={`${summary.count}개`} />
      </div>

      <form className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>작성자</span>
            <input
              type="text"
              value={reviewerName}
              maxLength={32}
              placeholder="예: 오모"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              onChange={(event) => setReviewerName(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>별점</span>
            <select
              value={rating}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              onChange={(event) => setRating(Number(event.target.value))}
            >
              {[5, 4, 3, 2, 1].map((score) => (
                <option key={score} value={score}>{score}점</option>
              ))}
            </select>
          </label>
        </div>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>리뷰 내용</span>
          <textarea
            value={content}
            maxLength={500}
            rows={4}
            placeholder="맛, 가격, 대기, 다시 방문 의사를 남겨보세요."
            className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            onChange={(event) => setContent(event.target.value)}
          />
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {feedback ? <p className="text-sm text-slate-600" role="status">{feedback}</p> : <span />}
          <Button type="submit" className="rounded-full bg-slate-900 text-white hover:bg-slate-800">리뷰 남기기</Button>
        </div>
      </form>

      {reviews.length > 0 ? (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <strong className="font-semibold text-slate-900">{review.reviewerName}</strong>
                <span className="text-xs font-semibold text-amber-600" aria-label={`별점 ${review.rating}점`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
              </div>
              <p className="mt-2 leading-6 text-slate-700">{review.content}</p>
              <time className="mt-2 block text-xs text-slate-500" dateTime={review.createdAt}>{formatReviewDate(review.createdAt)}</time>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-600">아직 남겨진 방문 리뷰가 없습니다. 이 맛집을 다녀온 뒤 첫 기록을 남겨보세요.</div>
      )}
    </section>
  );
}

export function SelectedRestaurantPanel({
  selectedRestaurant,
  reviews = [],
  onSubmitReview
}: {
  selectedRestaurant: Restaurant | null;
  reviews?: RestaurantReview[];
  onSubmitReview?: SubmitRestaurantReview;
}) {
  const addressRows = selectedRestaurant ? getUniqueAddressRows(selectedRestaurant) : [];
  const cleanReasons = selectedRestaurant ? getCleanReasons(selectedRestaurant) : [];
  const safeUrl = safePlaceUrl(selectedRestaurant?.placeUrl);

  return (
    <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-soft" data-testid="selected-restaurant-panel">
      <CardHeader className="space-y-2 border-b border-slate-200 bg-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Place detail</p>
        <CardTitle className="text-2xl font-semibold tracking-[-0.02em] text-slate-950">{selectedRestaurant ? `${selectedRestaurant.name} 상세정보` : '맛집 상세정보'}</CardTitle>
        <CardDescription className="max-w-2xl text-sm leading-6 text-slate-600">지도에서 선택한 맛집의 주소, 추천 이유, 외부 장소 링크, 방문 리뷰를 바로 확인합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6 sm:p-8">
        {selectedRestaurant ? (
          <>
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
              <Badge className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">
                {getSourceLabel(selectedRestaurant)}
              </Badge>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-slate-950">{selectedRestaurant.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{selectedRestaurant.category ?? '맛집 후보'}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {getRestaurantInfoCards(selectedRestaurant).map(({ label, value }) => (
                <InfoCard key={label} label={label} value={value} />
              ))}
            </div>

            <Separator className="bg-slate-200" />

            {addressRows.length > 0 || safeUrl !== '#' ? (
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">주소</h4>
                {addressRows.length > 0 ? (
                  <dl className="mt-3 space-y-3 text-sm text-slate-600">
                    {addressRows.map(({ label, value }) => (
                      <div key={`${label}-${value}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</dt>
                        <dd className="mt-1 text-base font-medium leading-6 text-slate-900">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {safeUrl !== '#' ? (
                  <div className="mt-4">
                    <Button asChild variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                      <a href={safeUrl} target="_blank" rel="noreferrer">
                        {getExternalLinkLabel(selectedRestaurant)}
                      </a>
                    </Button>
                  </div>
                ) : null}
              </section>
            ) : null}

            {cleanReasons.length > 0 ? (
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">추천 이유</h4>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                  {cleanReasons.map((reason) => (
                    <li key={reason} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      {reason}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <Separator className="bg-slate-200" />
            <RestaurantReviewSection selectedRestaurant={selectedRestaurant} reviews={reviews} onSubmitReview={onSubmitReview} />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">선택된 후보가 없습니다.</div>
        )}
      </CardContent>
    </Card>
  );
}

export function ReportPanel({ report }: { report: CandidateReport | null }) {
  return (
    <Card className="border-slate-200 bg-white shadow-soft" data-testid="report-panel">
      <CardHeader className="space-y-2 border-b border-slate-200 p-6 sm:p-8">
        <CardTitle className="text-2xl font-semibold text-slate-900">후보 탐색 리포트</CardTitle>
        <CardDescription className="text-sm text-slate-600">Kakao place와 seeded fallback 각각의 탐색 결과를 읽을 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-6 sm:p-8">
        {report ? (
          report.source === 'kakao' ? (
            <>
              <p className="text-sm leading-6 text-slate-600">{report.narrative}</p>
              {report.fallbackReason ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {report.fallbackReason}
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCard label="후보 수" value={String(report.summary.candidateCount)} />
                <InfoCard label="쇼트리스트" value={String(report.summary.shortlistCount)} />
                <InfoCard label="평균 거리" value={formatDistance(report.summary.averageDistance)} />
                <InfoCard label="가장 가까운 후보" value={formatDistance(report.summary.nearestDistance)} />
              </div>
              <Separator className="bg-slate-200" />
              <div className="space-y-2 text-sm text-slate-600">
                <p>검색어: {report.instrumentation.query}</p>
                <p>반경: {formatDistance(report.instrumentation.radiusMeters)}</p>
                <p>정렬: {report.instrumentation.sort}</p>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm leading-6 text-slate-600">{report.narrative}</p>
              {report.fallbackReason ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {report.fallbackReason}
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCard label="쇼트리스트 압축" value={`${String(report.summary.shortlistCount)}/${String(report.summary.candidateCount)}`} />
                <InfoCard label="만원 이하 후보" value={`${String(report.summary.affordableCount)}곳`} />
                <InfoCard label="근거량 강한 후보" value={`${String(report.summary.evidenceStrongCount)}곳`} />
                <InfoCard label="긍정 반응 강한 후보" value={`${String(report.summary.highConfidenceCount)}곳`} />
              </div>
              <Separator className="bg-slate-200" />
              <div className="space-y-2 text-sm text-slate-600">
                <p>맛 {Math.round((report.instrumentation.weights.taste ?? 0) * 100)}%</p>
                <p>가성비 {Math.round((report.instrumentation.weights.affordability ?? 0) * 100)}%</p>
                <p>근거량 {Math.round((report.instrumentation.weights.evidence ?? 0) * 100)}%</p>
                <p>긍정 반응 {Math.round((report.instrumentation.weights.sentiment ?? 0) * 100)}%</p>
              </div>
            </>
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">탐색 리포트를 생성하지 못했습니다.</div>
        )}
      </CardContent>
    </Card>
  );
}

export function ExplorerFooter() {
  return null;
}
