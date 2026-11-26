import { describe, expect, it } from "vitest";
import { categorizeTransaction } from "./categorize";

describe("categorizeTransaction", () => {
  it("maps grocery merchants", () => {
    for (const label of ["LIDL CITY", "ALDI", "Intermarché", "Colruyt"]) {
      const result = categorizeTransaction(label, -1500);
      expect(result.categoryName).toBe("Groceries");
      expect(result.kind).toBe("expense");
      expect(result.needsReview).toBe(false);
    }
  });

  it("maps restaurants and fast food", () => {
    expect(categorizeTransaction("McDonald's Mouscron", -890).categoryName).toBe("Restaurants");
    expect(categorizeTransaction("Brasserie du Parc", -2400).categoryName).toBe("Restaurants");
  });

  it("maps a clear fuel purchase and a 11.30 station payment to tobacco", () => {
    const fuel = categorizeTransaction("TOTAL ACCESS CARBURANT", -6540);
    expect(fuel.categoryName).toBe("Fuel");
    expect(fuel.needsReview).toBe(false);

    const tobacco = categorizeTransaction("Q8 MOUSCRON", -1130);
    expect(tobacco.categoryName).toBe("Tobacco");
    expect(tobacco.kind).toBe("expense");
  });

  it("flags NAVI MOUSCRON and personal transfers for review", () => {
    const shop = categorizeTransaction("NAVI MOUSCRON", -430);
    expect(shop.categoryName).toBe("Convenience Store");
    expect(shop.needsReview).toBe(true);

    const transfer = categorizeTransaction("VIREMENT VERS COMPTE EPARGNE", -20000);
    expect(transfer.kind).toBe("transfer");
    expect(transfer.categoryName).toBe("Transfers");
    expect(transfer.needsReview).toBe(true);
  });

  it("does not force a category on an unknown or ambiguous merchant", () => {
    const unknown = categorizeTransaction("Librairie du Centre", -1890);
    expect(unknown.categoryName).toBeNull();
    expect(unknown.needsReview).toBe(true);

    const stationOnly = categorizeTransaction("SHELL STATION", -4200);
    expect(stationOnly.categoryName).toBeNull();
    expect(stationOnly.needsReview).toBe(true);
  });

  it("applies a short keyword to any label that contains it", () => {
    const result = categorizeTransaction("AUCHAN CITY LILLE", -4520, [
      {
        pattern: "Auchan",
        categoryName: "Groceries",
        needsReview: false,
        priority: 100,
      },
    ]);
    expect(result.categoryName).toBe("Groceries");
  });

  it("lets a user rule override a built-in match", () => {
    const result = categorizeTransaction("LIDL CITY", -1500, [
      {
        pattern: "LIDL",
        categoryName: "Other",
        needsReview: false,
        priority: 100,
      },
    ]);
    expect(result.categoryName).toBe("Other");
  });

  it("treats a positive amount as income", () => {
    const result = categorizeTransaction("REMBOURSEMENT AMI", 2500);
    expect(result.kind).toBe("income");
    expect(result.needsReview).toBe(true);
  });
});
