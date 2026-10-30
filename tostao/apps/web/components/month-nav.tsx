"use client";
import { monthLabel, shiftMonth } from "@/lib/format";

export default function MonthNav({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const btn = "rounded-md border border-ink/20 bg-white px-3 py-1.5 focus-visible:ring-2 focus-visible:ring-moss";
  return (
    <div className="flex items-center gap-2">
      <button className={btn} aria-label="Mês anterior" onClick={() => onChange(shiftMonth(month, -1))}>‹</button>
      <span className="min-w-36 text-center font-medium capitalize">{monthLabel(month)}</span>
      <button className={btn} aria-label="Próximo mês" onClick={() => onChange(shiftMonth(month, 1))}>›</button>
    </div>
  );
}
