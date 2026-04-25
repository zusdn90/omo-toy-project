'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatDistance, safePlaceUrl } from '@/lib/format';
import type { CandidateReport, Restaurant } from '@/lib/types';
import { InfoCard } from './explorer-ui';

export function SelectedRestaurantPanel({ selectedRestaurant }: { selectedRestaurant: Restaurant | null }) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-soft" data-testid="selected-restaurant-panel">
      <CardHeader className="space-y-2 border-b border-border/60 p-6 sm:p-8">
        <CardTitle className="text-2xl">상세 정보</CardTitle>
        <CardDescription className="text-sm text-slate-300">선택된 후보의 이유와 주소를 바로 확인합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6 sm:p-8">
        {selectedRestaurant ? (
          <>
            <div>
              <Badge className="bg-cyan-500/15 text-cyan-100">{selectedRestaurant.source === 'kakao' ? 'Kakao place' : '현재 추천 후보'}</Badge>
              <h3 className="mt-3 text-2xl font-semibold text-slate-50">{selectedRestaurant.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{selectedRestaurant.note ?? selectedRestaurant.roadAddressName ?? selectedRestaurant.addressName ?? '-'}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard label={selectedRestaurant.source === 'kakao' ? '점수' : '가성비 점수'} value={String(selectedRestaurant.score ?? '-')} />
              <InfoCard label="카테고리" value={selectedRestaurant.category ?? '-'} />
              <InfoCard label="거리" value={formatDistance(selectedRestaurant.distanceMeters)} />
              <InfoCard label="전화" value={selectedRestaurant.phone ?? '-'} />
            </div>

            <Separator className="bg-white/10" />

            {selectedRestaurant.source === 'kakao' ? (
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">주소</h4>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  <li>{selectedRestaurant.roadAddressName || '도로명 주소 정보 없음'}</li>
                  <li>{selectedRestaurant.addressName || '지번 주소 정보 없음'}</li>
                </ul>
                <div className="mt-4">
                  <Button asChild variant="outline" className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">
                    <a href={safePlaceUrl(selectedRestaurant.placeUrl)} target="_blank" rel="noreferrer">
                      카카오 장소 상세 페이지 열기
                    </a>
                  </Button>
                </div>
              </section>
            ) : (
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">추천 이유</h4>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
                  {(selectedRestaurant.reasons ?? []).map((reason) => (
                    <li key={reason} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      {reason}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">선택된 후보가 없습니다.</div>
        )}
      </CardContent>
    </Card>
  );
}

export function ReportPanel({ report }: { report: CandidateReport | null }) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-soft" data-testid="report-panel">
      <CardHeader className="space-y-2 border-b border-border/60 p-6 sm:p-8">
        <CardTitle className="text-2xl">후보 탐색 리포트</CardTitle>
        <CardDescription className="text-sm text-slate-300">Kakao place와 seeded fallback 각각의 탐색 결과를 읽을 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-6 sm:p-8">
        {report ? (
          report.source === 'kakao' ? (
            <>
              <p className="text-sm leading-6 text-slate-300">{report.narrative}</p>
              {report.fallbackReason ? (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                  {report.fallbackReason}
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCard label="후보 수" value={String(report.summary.candidateCount)} />
                <InfoCard label="쇼트리스트" value={String(report.summary.shortlistCount)} />
                <InfoCard label="평균 거리" value={formatDistance(report.summary.averageDistance)} />
                <InfoCard label="가장 가까운 후보" value={formatDistance(report.summary.nearestDistance)} />
              </div>
              <Separator className="bg-white/10" />
              <div className="space-y-2 text-sm text-slate-300">
                <p>검색어: {report.instrumentation.query}</p>
                <p>반경: {formatDistance(report.instrumentation.radiusMeters)}</p>
                <p>정렬: {report.instrumentation.sort}</p>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm leading-6 text-slate-300">{report.narrative}</p>
              {report.fallbackReason ? (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                  {report.fallbackReason}
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCard label="쇼트리스트 압축" value={`${String(report.summary.shortlistCount)}/${String(report.summary.candidateCount)}`} />
                <InfoCard label="만원 이하 후보" value={`${String(report.summary.affordableCount)}곳`} />
                <InfoCard label="근거량 강한 후보" value={`${String(report.summary.evidenceStrongCount)}곳`} />
                <InfoCard label="긍정 반응 강한 후보" value={`${String(report.summary.highConfidenceCount)}곳`} />
              </div>
              <Separator className="bg-white/10" />
              <div className="space-y-2 text-sm text-slate-300">
                <p>맛 {Math.round((report.instrumentation.weights.taste ?? 0) * 100)}%</p>
                <p>가성비 {Math.round((report.instrumentation.weights.affordability ?? 0) * 100)}%</p>
                <p>근거량 {Math.round((report.instrumentation.weights.evidence ?? 0) * 100)}%</p>
                <p>긍정 반응 {Math.round((report.instrumentation.weights.sentiment ?? 0) * 100)}%</p>
              </div>
            </>
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">탐색 리포트를 생성하지 못했습니다.</div>
        )}
      </CardContent>
    </Card>
  );
}

export function ExplorerFooter() {
  return <footer className="mt-8 pb-4 text-center text-sm text-slate-400">블로그 후보 탐색 시간을 줄이기 위한 개인용 MVP · Kakao Map powered</footer>;
}
