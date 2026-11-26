import { describe, expect, it } from "vitest";
import { markDuplicates } from "./duplicates";
import { RawBankRow } from "./types";

function row(amountCents: number, fullLabel = "LIDL CITY"): RawBankRow {
  return {
    transactionDate: "2026-03-15",
    bookingDate: "2026-03-16",
    accountNumber: "BE00",
    accountLabel: "Compte",
    operationLabel: "CARTE",
    fullLabel,
    bankCategory: "Courses",
    bankSubcategory: "Supermarche",
    amountCents,
    currency: "EUR",
    pointed: true,
  };
}

describe("markDuplicates", () => {
  it("keeps two identical legitimate rows in one file", () => {
    const marked = markDuplicates([row(-1250), row(-1250)], new Map());
    expect(marked.map((item) => item.duplicate)).toEqual([false, false]);
    expect(marked.map((item) => item.occurrence)).toEqual([1, 2]);
    expect(marked[0].fingerprint).toBe(marked[1].fingerprint);
  });

  it("marks a re-import as duplicate and keeps one extra identical purchase", () => {
    const first = markDuplicates([row(-1250), row(-1250)], new Map());
    const existing = new Map<string, number>([[first[0].fingerprint, 2]]);
    const second = markDuplicates([row(-1250), row(-1250), row(-1250)], existing);

    expect(second.map((item) => item.duplicate)).toEqual([true, true, false]);
    expect(second[2].occurrence).toBe(3);
  });

  it("does not treat a different amount as a duplicate", () => {
    const first = markDuplicates([row(-1250)], new Map());
    const existing = new Map<string, number>([[first[0].fingerprint, 1]]);
    const second = markDuplicates([row(-1300)], existing);
    expect(second[0].duplicate).toBe(false);
  });
});
