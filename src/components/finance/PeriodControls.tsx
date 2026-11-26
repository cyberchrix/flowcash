"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { PeriodUnit } from "@/lib/finance/period";

const UNITS: PeriodUnit[] = ["day", "week", "month", "year"];

export function formatCents(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function PeriodControls({
  label,
  unit,
  onUnit,
  onPrevious,
  onNext,
}: {
  label: string;
  unit: PeriodUnit;
  onUnit: (unit: PeriodUnit) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onPrevious} aria-label="Previous period" className="rounded-full p-2 text-gray-700 dark:text-gray-200">
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
        <button type="button" onClick={onNext} aria-label="Next period" className="rounded-full p-2 text-gray-700 dark:text-gray-200">
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-4 rounded-full bg-gray-100 p-1 text-xs dark:bg-white/5">
        {UNITS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onUnit(item)}
            className={`rounded-full py-1.5 capitalize ${
              unit === item ? "bg-flow-primary font-semibold text-white" : "text-gray-600 dark:text-gray-300"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProgressBar({ value, color }: { value: number; color: string }) {
  const width = Math.max(0, Math.min(value, 100));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#41414A]/20">
      <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
    </div>
  );
}
