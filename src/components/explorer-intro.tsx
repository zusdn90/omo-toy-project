'use client';

import React from 'react';
import { MapPin } from 'lucide-react';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Neighborhood } from '@/lib/types';

export function ExplorerHero() {
  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-soft">
      <CardHeader className="space-y-4 p-6 sm:p-8">
        <CardTitle className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          동네별 맛집 탐색을 한 화면에서 정리하는 관리자형 대시보드
        </CardTitle>
        <CardDescription className="max-w-3xl text-base leading-7 text-slate-600">
          shadcnblocks 스타일처럼 밝고 정돈된 레이아웃으로 동네 전환, 랭킹, 지도, 리포트를 한 번에 읽도록 구성했습니다.
        </CardDescription>
        <div className="grid gap-3 pt-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">동네</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">빠른 전환</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">탐색</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">Top 5 · 전체 랭킹</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">연동</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">Kakao Map</p>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

export function ActiveNeighborhoodPanel({ activeNeighborhood }: { activeNeighborhood: Neighborhood | null }) {
  return (
    <Card className="border-slate-200 bg-white shadow-soft">
      <CardHeader className="space-y-4 p-6 sm:p-8">
        <CardTitle className="text-xl font-semibold text-slate-900">현재 탐색 동네</CardTitle>
        <CardDescription className="text-sm text-slate-600">{activeNeighborhood?.vibe ?? '선택한 동네 정보가 없습니다.'}</CardDescription>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sky-700">
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-semibold">{activeNeighborhood?.name ?? '동네 없음'}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">Evidence first · 장소 정보와 위치 맥락을 먼저 확인한 뒤 후보를 빠르게 좁힙니다.</p>
        </div>
      </CardHeader>
    </Card>
  );
}
