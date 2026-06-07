"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { getSnapshots } from "@/lib/supabase/snapshots";
import { getUserSettings } from "@/lib/supabase/settings";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";
import { Database } from "@/types/database";

// Force dynamic rendering
export const dynamic = "force-dynamic";

type Snapshot = Database["public"]["Tables"]["monthly_snapshots"]["Row"];

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [currency, setCurrency] = useState("EUR");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const [snaps, settings] = await Promise.all([
          getSnapshots(user.id),
          getUserSettings(user.id),
        ]);
        setSnapshots(snaps);
        if (settings?.currency) setCurrency(settings.currency);
        setError(null);
      } catch (err) {
        console.error("Error loading history:", err);
        setError("Error loading history");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatMonth = (month: string) => {
    const [year, m] = month.split("-").map(Number);
    return new Date(year, m - 1, 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 bg-flowBg">
        <div className="text-flowTextMuted">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const values = snapshots.map((s) => Number(s.available));
  const hasChart = snapshots.length >= 2;

  // Chart geometry (SVG units, stretched to container width)
  const W = 300;
  const H = 100;
  const P = 8;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const range = max - min || 1;
  const n = values.length;
  const xAt = (i: number) =>
    n <= 1 ? W / 2 : P + (i / (n - 1)) * (W - 2 * P);
  const yAt = (v: number) => H - P - ((v - min) / range) * (H - 2 * P);
  const linePath = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`)
    .join(" ");
  const areaPath = hasChart
    ? `${linePath} L ${xAt(n - 1)} ${H} L ${xAt(0)} ${H} Z`
    : "";

  const latest = snapshots[snapshots.length - 1];
  const previous = snapshots[snapshots.length - 2];
  const latestAvailable = latest ? Number(latest.available) : 0;
  const overallDelta = previous
    ? latestAvailable - Number(previous.available)
    : 0;

  return (
    <>
      <div
        id="page-top-anchor"
        className="absolute top-0 left-0 w-1 h-1 opacity-0 pointer-events-none"
        aria-hidden="true"
      />
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 bg-flowBg dark:bg-transparent">
        <Header />

        <main className="flex-1 space-y-6 pt-20 pb-28">
          {/* Header card with the latest available and its trend */}
          <div
            className="rounded-[28px] bg-white dark:bg-white/2 border border-gray-200 dark:border-transparent px-6 py-5"
            style={{ boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}
          >
            <h1 className="text-xs font-semibold text-gray-900 dark:text-white/50 uppercase mb-2">
              Available over time
            </h1>

            {snapshots.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                No history yet. Your available balance will be tracked month
                after month as you use the app.
              </p>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(latestAvailable)}
                  </span>
                  {previous && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                        overallDelta >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-500 dark:text-red-400"
                      }`}
                    >
                      {overallDelta >= 0 ? (
                        <ArrowUpIcon className="h-3 w-3" />
                      ) : (
                        <ArrowDownIcon className="h-3 w-3" />
                      )}
                      {formatCurrency(Math.abs(overallDelta))}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {latest ? formatMonth(latest.month) : ""}
                  {previous ? " vs previous month" : ""}
                </p>

                {hasChart && (
                  <div className="mt-4">
                    <svg
                      viewBox={`0 0 ${W} ${H}`}
                      preserveAspectRatio="none"
                      className="h-28 w-full"
                    >
                      <path d={areaPath} fill="var(--color-flow-primary)" opacity="0.12" />
                      <path
                        d={linePath}
                        fill="none"
                        stroke="var(--color-flow-primary)"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                    <div className="mt-1 flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
                      <span>{formatMonth(snapshots[0].month)}</span>
                      <span>{formatMonth(snapshots[snapshots.length - 1].month)}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Monthly list with deltas */}
          {snapshots.length > 0 && (
            <div
              className="rounded-[28px] bg-white dark:bg-white/2 border border-gray-200 dark:border-transparent px-6 py-5"
              style={{ boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}
            >
              <h2 className="text-xs font-semibold text-gray-900 dark:text-white/50 uppercase mb-4">
                Month by month
              </h2>
              <div className="space-y-3">
                {snapshots
                  .map((snap, i) => ({
                    snap,
                    delta:
                      i > 0
                        ? Number(snap.available) -
                          Number(snapshots[i - 1].available)
                        : null,
                  }))
                  .reverse()
                  .map(({ snap, delta }) => (
                    <div
                      key={snap.id}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {formatMonth(snap.month)}
                      </span>
                      <div className="flex items-center gap-3">
                        {delta !== null && delta !== 0 && (
                          <span
                            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                              delta > 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-500 dark:text-red-400"
                            }`}
                          >
                            {delta > 0 ? (
                              <ArrowUpIcon className="h-3 w-3" />
                            ) : (
                              <ArrowDownIcon className="h-3 w-3" />
                            )}
                            {formatCurrency(Math.abs(delta))}
                          </span>
                        )}
                        <span className="text-sm font-semibold text-flow-primary">
                          {formatCurrency(Number(snap.available))}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </>
  );
}
