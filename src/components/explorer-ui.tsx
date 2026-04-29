import React, { type ReactNode } from 'react';

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function InfoCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.24)]">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
