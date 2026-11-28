import { describe, expect, it } from "vitest";
import { SpendingTransaction } from "./spending";
import {
  fundedMonthKey,
  monthFlowsFromTransactions,
  openingBalanceCents,
  openingHistoryStart,
  parseOpeningInput,
  salaryLeftCents,
} from "./openingBalance";

const flow = (incomeCents: number, netSpendCents: number) => ({ incomeCents, netSpendCents });

describe("opening balance", () => {
  it("carries a negative leftover into the next month", () => {
    const flows = new Map([
      ["2026-11", flow(0, 20000)],
      ["2026-12", flow(470000, 410000)],
    ]);
    const overrides = new Map<string, number>();

    expect(openingBalanceCents("2026-11", flows, overrides)).toBe(0);
    expect(salaryLeftCents("2026-11", flows, overrides)).toBe(-20000);
    expect(openingBalanceCents("2026-12", flows, overrides)).toBe(-20000);
    expect(salaryLeftCents("2026-12", flows, overrides)).toBe(40000);
  });

  it("uses a manual opening and carries that result forward", () => {
    const flows = new Map([
      ["2026-11", flow(0, 20000)],
      ["2026-12", flow(470000, 410000)],
    ]);
    const overrides = new Map([["2026-12", -35000]]);

    expect(openingBalanceCents("2026-12", flows, overrides)).toBe(-35000);
    expect(salaryLeftCents("2026-12", flows, overrides)).toBe(25000);
    expect(openingBalanceCents("2027-01", flows, overrides)).toBe(25000);
  });

  it("carries only the previous month, not the cumulative history", () => {
    const flows = new Map([
      ["2026-05", flow(0, 500000)],
      ["2026-10", flow(100000, 110000)],
      ["2026-11", flow(470000, 410000)],
    ]);
    const overrides = new Map<string, number>();

    expect(openingBalanceCents("2026-11", flows, overrides)).toBe(-10000);
    expect(salaryLeftCents("2026-11", flows, overrides)).toBe(50000);
    expect(openingBalanceCents("2026-12", flows, overrides)).toBe(50000);
    expect(openingBalanceCents("2027-02", flows, new Map([["2026-12", -35000]]))).toBe(0);
  });

  it("starts the next month from the previous salary left", () => {
    const flows = new Map([
      ["2026-09", flow(0, 177064)],
      ["2026-10", flow(0, 119429)],
      ["2026-11", flow(81954, 0)],
      ["2026-12", flow(275846, 0)],
    ]);
    const overrides = new Map<string, number>();

    expect(openingBalanceCents("2026-10", flows, overrides)).toBe(-177064);
    expect(openingBalanceCents("2026-11", flows, overrides)).toBe(-119429);
    expect(salaryLeftCents("2026-11", flows, overrides)).toBe(-37475);
    expect(openingBalanceCents("2026-12", flows, overrides)).toBe(-37475);
    expect(salaryLeftCents("2026-12", flows, overrides)).toBe(238371);
    expect(openingBalanceCents("2027-01", flows, overrides)).toBe(238371);
  });

  it("loads the months a salary-left carry needs", () => {
    expect(openingHistoryStart("2026-12")).toBe("2026-09-25");
    expect(openingHistoryStart("2026-11")).toBe("2026-09-25");
    expect(openingHistoryStart("2026-08")).toBe("2026-06-25");
  });

  it("assigns a late salary to the funded month", () => {
    const salaryIds = new Set(["salary"]);
    const pay = (date: string, kind: SpendingTransaction["kind"] = "income"): SpendingTransaction => ({
      id: date,
      date,
      amountCents: kind === "income" ? 100 : -100,
      kind,
      categoryId: kind === "income" ? "salary" : "food",
      merchant: "KINGFISHER",
      currency: "EUR",
    });
    expect(fundedMonthKey(pay("2026-10-28"), salaryIds)).toBe("2026-11");
    expect(fundedMonthKey(pay("2026-11-10", "expense"), salaryIds)).toBe("2026-11");
    expect(fundedMonthKey(pay("2026-11-26"), salaryIds)).toBe("2026-12");

    const flows = monthFlowsFromTransactions([
      pay("2026-10-28"),
      pay("2026-11-10", "expense"),
      pay("2026-11-26"),
    ], salaryIds, "EUR");
    expect(flows.get("2026-11")).toEqual({ incomeCents: 100, netSpendCents: 100 });
    expect(flows.get("2026-12")).toEqual({ incomeCents: 100, netSpendCents: 0 });

    const aroundPayday = monthFlowsFromTransactions([
      pay("2026-10-28"),
      pay("2026-11-25", "expense"),
      pay("2026-11-26", "expense"),
      pay("2026-11-26"),
    ], salaryIds, "EUR");
    expect(aroundPayday.get("2026-11")).toEqual({ incomeCents: 100, netSpendCents: 100 });
    expect(aroundPayday.get("2026-12")).toEqual({ incomeCents: 100, netSpendCents: 100 });
  });

  it("parses a corrected opening and treats a blank value as automatic", () => {
    expect(parseOpeningInput("-200,50")).toBe(-20050);
    expect(parseOpeningInput("")).toBeNull();
    expect(() => parseOpeningInput("abc")).toThrow();
  });
});
