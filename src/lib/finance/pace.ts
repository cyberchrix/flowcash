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
  const linearCents = elapsedDays === 0 ? null : Math.round((input.spentCents / elapsedDays) * input.daysInPeriod);
  const coverageLimited = linearCents != null
    && input.budgetCents != null
    && linearCents > input.budgetCents
    && input.coverageDate != null
    && input.coverageDate < input.periodEnd;
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
  // The identified budget is already expected to be spent, even before any
  // transaction arrives. A faster pace can only raise that projection.
  const projectedCents = Math.max(linearCents ?? 0, input.budgetCents, input.spentCents);
  const remainingBudget = input.budgetCents - input.spentCents;
  const remainingPerDayCents = remainingDays === 0 ? remainingBudget : Math.round(remainingBudget / remainingDays);
  return {
    ...base,
    estimate: true,
    expectedCents,
    projectedCents,
    remainingPerDayCents,
    overshootCents: Math.max(projectedCents - input.budgetCents, 0),
  };
}

/** Salary left after the identified budget that is not spent yet. */
export function projectedSalaryLeftCents(salaryLeftCents: number, budgetCents: number, spentCents: number) {
  if (budgetCents <= 0) return salaryLeftCents;
  return salaryLeftCents - Math.max(budgetCents - spentCents, 0);
}
