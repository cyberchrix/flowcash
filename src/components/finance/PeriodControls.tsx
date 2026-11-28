"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { PeriodUnit } from "@/lib/finance/period";

const UNITS: PeriodUnit[] = ["day", "week", "month", "year"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatCents(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function PeriodControls({
  label,
  unit,
  month,
  onMonth,
  onUnit,
  onPrevious,
  onNext,
  showUnits = true,
}: {
  label: string;
  unit: PeriodUnit;
  month?: string;
  onMonth?: (month: string) => void;
  onUnit: (unit: PeriodUnit) => void;
  onPrevious: () => void;
  onNext: () => void;
  showUnits?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedYear = Number(month?.slice(0, 4)) || new Date().getFullYear();
  const [pickerYear, setPickerYear] = useState(selectedYear);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onPrevious} aria-label="Previous period" className="rounded-full p-2 text-gray-700 dark:text-gray-200">
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        {unit === "month" && onMonth ? (
          <button
            type="button"
            onClick={() => {
              setPickerYear(selectedYear);
              setOpen((current) => !current);
            }}
            className="rounded-full px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white"
            aria-expanded={open}
            aria-label="Choose month"
          >
            {label}
          </button>
        ) : (
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
        )}
        <button type="button" onClick={onNext} aria-label="Next period" className="rounded-full p-2 text-gray-700 dark:text-gray-200">
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
      {open && unit === "month" && onMonth && (
        <div className="rounded-3xl border border-gray-200 bg-white p-3 dark:border-transparent dark:bg-[#262A35]">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => setPickerYear((year) => year - 1)} aria-label="Previous year" className="rounded-full p-2 text-gray-700 dark:text-gray-200">
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{pickerYear}</p>
            <button type="button" onClick={() => setPickerYear((year) => year + 1)} aria-label="Next year" className="rounded-full p-2 text-gray-700 dark:text-gray-200">
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((name, index) => {
              const value = `${pickerYear}-${String(index + 1).padStart(2, "0")}`;
              const selected = value === month;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    onMonth(value);
                    setOpen(false);
                  }}
                  className={`rounded-xl py-2 text-sm ${
                    selected
                      ? "bg-flow-primary font-semibold text-white"
                      : "bg-gray-100 text-gray-800 dark:bg-white/5 dark:text-gray-100"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {showUnits && (
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
      )}
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
