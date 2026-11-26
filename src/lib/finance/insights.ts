import { BudgetStatus } from "./budget";
import { PaceResult } from "./pace";

export type Insight = { id: string; text: string };

export function buildInsights(input: {
  categoryName?: string;
  spentCents: number;
  previousSpentCents: number | null;
  budgetCents: number | null;
  status: BudgetStatus;
  pace: PaceResult;
  topMerchant?: string | null;
  comparisonLabel: string;
}): Insight[] {
  const insights: Insight[] = [];
  if (input.previousSpentCents != null && input.previousSpentCents > 0 && input.spentCents > 0) {
    const change = Math.round(((input.spentCents - input.previousSpentCents) / input.previousSpentCents) * 100);
    if (Math.abs(change) >= 10 && input.categoryName) {
      insights.push({
        id: "category-change",
        text: `${input.categoryName} spending is ${Math.abs(change)}% ${change > 0 ? "higher" : "lower"} than ${input.comparisonLabel}.`,
      });
    }
  }

  if (input.budgetCents && input.budgetCents > 0) {
    const used = Math.round((input.spentCents / input.budgetCents) * 100);
    if (used >= 80 && input.categoryName) {
      insights.push({
        id: "budget-used",
        text: `You have consumed ${used}% of your ${input.categoryName} budget.`,
      });
    }
  }

  if (input.pace.estimate && input.pace.overshootCents > 0) {
    insights.push({
      id: "pace",
      text: "At your current spending pace, you may exceed your monthly budget. This is an estimate.",
    });
  }

  if (input.pace.estimate && input.pace.remainingPerDayCents != null && input.pace.remainingDays > 0 && input.pace.remainingPerDayCents >= 0) {
    const amount = (input.pace.remainingPerDayCents / 100).toFixed(2);
    insights.push({
      id: "allowance",
      text: `About €${amount} per day remains for the next ${input.pace.remainingDays} day${input.pace.remainingDays === 1 ? "" : "s"}.`,
    });
  }

  if (input.topMerchant && input.spentCents > 0) {
    insights.push({
      id: "merchant",
      text: `Your largest merchant this period is ${input.topMerchant}.`,
    });
  }

  if (input.pace.coverageLimited && input.pace.coverageDate) {
    insights.push({
      id: "coverage",
      text: `Estimates use transactions through ${input.pace.coverageDate}, not through today.`,
    });
  }

  return insights.slice(0, 4);
}

export function percentChange(current: number, previous: number | null): number | null {
  if (previous == null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
