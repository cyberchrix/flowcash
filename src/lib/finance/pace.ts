export type PaceInput = {
  budgetCents: number | null;
  spentCents: number;
  daysInPeriod: number;
  elapsedDays: number;
  forecast: "variable" | "fixed";
  coverageDate: string | null;
  periodEnd: string;
};

export type PaceResult = {
  estimate: boolean;
  coverageLimited: boolean;
  coverageDate: string | null;
  expectedCents: number | null;
  projectedCents: number | null;
  remainingPerDayCents: number | null;
  overshootCents: number;
  elapsedDays: number;
  remainingDays: number;
};

export function spendingPace(input: PaceInput): PaceResult {
  const elapsedDays = Math.min(Math.max(input.elapsedDays, 0), input.daysInPeriod);
  const remainingDays = Math.max(input.daysInPeriod - elapsedDays, 0);
  const coverageLimited = input.coverageDate != null && input.coverageDate < input.periodEnd;
  const base = {
    coverageLimited,
    coverageDate: input.coverageDate,
    elapsedDays,
    remainingDays,
    overshootCents: 0,
  };

  if (input.forecast === "fixed" || input.budgetCents == null || input.daysInPeriod === 0) {
    return {
      ...base,
      estimate: false,
      expectedCents: null,
      projectedCents: null,
      remainingPerDayCents: null,
    };
  }

  const expectedCents = Math.round((input.budgetCents * elapsedDays) / input.daysInPeriod);
  const projectedCents = elapsedDays === 0 ? null : Math.round((input.spentCents / elapsedDays) * input.daysInPeriod);
  const remainingBudget = input.budgetCents - input.spentCents;
  const remainingPerDayCents = remainingDays === 0 ? remainingBudget : Math.round(remainingBudget / remainingDays);
  return {
    ...base,
    estimate: true,
    expectedCents,
    projectedCents,
    remainingPerDayCents,
    overshootCents: projectedCents == null ? 0 : Math.max(projectedCents - input.budgetCents, 0),
  };
}
