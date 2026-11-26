import { describe, expect, it } from "vitest";
import { budgetStatus, fixedPlannedCents, proratedAllowance } from "./budget";
import { percentChange } from "./insights";
import { spendingPace } from "./pace";
import { daysInMonth, isLeapYear, weekRange } from "./period";
import { allocationFits, expenseStatus, suggestLinks } from "./reconcile";
import { spendingCents, totalsFor } from "./spending";
import { SpendingTransaction } from "./spending";

const expense = (partial: Partial<SpendingTransaction>): SpendingTransaction => ({
  id: partial.id ?? "t1",
  date: partial.date ?? "2026-03-10",
  amountCents: partial.amountCents ?? -1000,
  kind: partial.kind ?? "expense",
  categoryId: partial.categoryId ?? "groceries",
  merchant: partial.merchant ?? "LIDL",
  currency: partial.currency ?? "EUR",
});

describe("periods and money", () => {
  it("starts weeks on Monday and spans months", () => {
    expect(weekRange("2026-03-01", 1)).toEqual({ start: "2026-02-23", end: "2026-03-01" });
  });

  it("handles leap years", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
  });

  it("prorates a monthly budget across a week", () => {
    const result = proratedAllowance(
      [{ month: "2026-03-01", amountCents: 3100, active: true, forecast: "variable" }],
      { start: "2026-03-01", end: "2026-03-07" }
    );
    expect(result.prorated).toBe(true);
    expect(result.cents).toBe(700);
  });

  it("counts fixed expense projections in the period and skips variable ones", () => {
    const result = fixedPlannedCents(
      [
        { categoryId: "rent", amountCents: 80000, type: "fixed_recurring", active: true, day: 5, onceMonth: null },
        { categoryId: "food", amountCents: 20000, type: "variable", active: true, day: 1, onceMonth: null },
        { categoryId: "rent", amountCents: 1500, type: "fixed_once", active: true, day: 12, onceMonth: "2026-04-01" },
      ],
      { start: "2026-03-01", end: "2026-03-31" }
    );
    expect(result.cents).toBe(80000);
    expect(result.byCategory.get("rent")).toBe(80000);
    expect(result.byCategory.has("food")).toBe(false);
  });

  it("keeps refunds and transfers out of net spending", () => {
    const totals = totalsFor([
      expense({ amountCents: -2000 }),
      expense({ id: "r", amountCents: 500 }),
      expense({ id: "v", kind: "transfer", amountCents: -9000 }),
      expense({ id: "i", kind: "income", amountCents: 3000 }),
    ], "EUR");
    expect(spendingCents(expense({ amountCents: 500 }))).toBe(-500);
    expect(totals.netSpend).toBe(1500);
    expect(totals.income).toBe(3000);
    expect(totals.cashFlow).toBe(1500);
  });
});

describe("budget pace", () => {
  it("projects variable spending and stays quiet on the first day without transactions", () => {
    const pace = spendingPace({
      budgetCents: 3100,
      spentCents: 0,
      daysInPeriod: 31,
      elapsedDays: 0,
      forecast: "variable",
      coverageDate: null,
      periodEnd: "2026-03-31",
    });
    expect(pace.projectedCents).toBeNull();
    expect(pace.expectedCents).toBe(0);
  });

  it("projects an overshoot and limits coverage to the latest transaction", () => {
    const pace = spendingPace({
      budgetCents: 3000,
      spentCents: 2000,
      daysInPeriod: 30,
      elapsedDays: 10,
      forecast: "variable",
      coverageDate: "2026-03-10",
      periodEnd: "2026-03-31",
    });
    expect(pace.projectedCents).toBe(6000);
    expect(pace.overshootCents).toBe(3000);
    expect(pace.coverageLimited).toBe(true);
    expect(budgetStatus(2000, 3000, 10 / 30)).toBe("at_risk");
  });

  it("does not forecast a fixed budget", () => {
    const pace = spendingPace({
      budgetCents: 3000,
      spentCents: 3000,
      daysInPeriod: 30,
      elapsedDays: 30,
      forecast: "fixed",
      coverageDate: "2026-03-30",
      periodEnd: "2026-03-31",
    });
    expect(pace.estimate).toBe(false);
    expect(budgetStatus(3001, 3000, 1)).toBe("over");
    expect(budgetStatus(100, 0, 1)).toBe("over");
    expect(percentChange(100, 0)).toBeNull();
  });
});

describe("reconciliation", () => {
  const rent = {
    id: "rent",
    type: "fixed_recurring" as const,
    amountCents: 80000,
    categoryId: "housing",
    day: 5,
    active: true,
    matchMode: "merchant" as const,
    matchPattern: "LOYER",
    amountToleranceCents: 100,
    dateToleranceDays: 3,
    currency: "EUR",
    onceMonth: null,
  };

  it("confirms one unambiguous payment and leaves two candidates as suggestions", () => {
    const one = suggestLinks([rent], [
      expense({ id: "a", date: "2026-03-05", amountCents: -80000, merchant: "LOYER MARS", categoryId: "housing" }),
    ], "2026-03-01", new Set());
    expect(one).toEqual([
      { expenseId: "rent", transactionId: "a", allocatedCents: 80000, status: "confirmed" },
    ]);

    const two = suggestLinks([rent], [
      expense({ id: "a", date: "2026-03-05", amountCents: -80000, merchant: "LOYER", categoryId: "housing" }),
      expense({ id: "b", date: "2026-03-06", amountCents: -80000, merchant: "LOYER", categoryId: "housing" }),
    ], "2026-03-01", new Set());
    expect(two.every((link) => link.status === "suggested")).toBe(true);
  });

  it("supports a partial payment and refuses an allocation above the transaction", () => {
    const partial = suggestLinks([rent], [
      expense({ id: "p", date: "2026-03-05", amountCents: -40000, merchant: "LOYER", categoryId: "housing" }),
    ], "2026-03-01", new Set());
    expect(partial[0].status).toBe("suggested");
    expect(partial[0].allocatedCents).toBe(40000);
    expect(allocationFits(-40000, 30000, 20000)).toBe(false);
    expect(expenseStatus({
      type: "fixed_recurring",
      plannedCents: 80000,
      actualCents: 40000,
      expectedDate: "2026-03-05",
      today: "2026-03-20",
      matched: true,
    })).toBe("partially_paid");
  });

  it("keeps a confirmed match from being suggested again", () => {
    const again = suggestLinks([rent], [
      expense({ id: "a", date: "2026-03-05", amountCents: -80000, merchant: "LOYER", categoryId: "housing" }),
    ], "2026-03-01", new Set(["a"]));
    expect(again).toHaveLength(0);
  });
});
