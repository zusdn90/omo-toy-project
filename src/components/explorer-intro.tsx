'use client';

import { MapPin, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Neighborhood } from '@/lib/types';

export function ExplorerHero() {
  return (
    <Card className="overflow-hidden border-border/70 bg-card/90 shadow-soft">
      <CardHeader className="space-y-3 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/15">
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            개인용 블로그 후보 발굴 도구
          </Badge>
          <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-100">
            Next.js + React + TypeScript
          </Badge>
        </div>
        <CardTitle className="text-3xl sm:text-4xl">동네 가성비 맛집 지도</CardTitle>
        <CardDescription className="max-w-3xl text-base leading-7 text-slate-300">
          동네를 바꾸면 지도와 랭킹이 동시에 갱신되고, Kakao 장소 결과와 로컬 후보를 한 화면에서 함께 확인할 수 있습니다.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export function ActiveNeighborhoodPanel({ activeNeighborhood }: { activeNeighborhood: Neighborhood | null }) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-soft">
      <CardHeader className="space-y-3 p-6 sm:p-8">
        <CardTitle className="text-xl">현재 탐색 동네</CardTitle>
        <CardDescription className="text-sm text-slate-300">{activeNeighborhood?.vibe ?? '선택한 동네 정보가 없습니다.'}</CardDescription>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-cyan-200">
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-semibold">{activeNeighborhood?.name ?? '동네 없음'}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">Evidence first · 장소 정보와 위치 맥락을 먼저 확인한 뒤 후보를 빠르게 좁힙니다.</p>
        </div>
      </CardHeader>
    </Card>
  );
}
