import { describe, expect, it } from "vitest";
import { categorizeTransaction } from "./categorize";
import { DEFAULT_KEYWORDS } from "./defaultKeywords";

const lidl = DEFAULT_KEYWORDS.find((keyword) => keyword.pattern === "LIDL")!;

describe("categorizeTransaction", () => {
  it("leaves a known shop uncategorized until a keyword exists", () => {
    const result = categorizeTransaction("LIDL CITY", -1500);
    expect(result.categoryName).toBeNull();
    expect(result.kind).toBe("expense");
    expect(result.needsReview).toBe(true);
  });

  it("uses a keyword for Lidl", () => {
    const result = categorizeTransaction("LIDL CITY", -1500, [{
      pattern: lidl.pattern,
      categoryName: lidl.categoryName,
      amountCents: null,
      kind: null,
      needsReview: false,
      priority: 40,
    }]);
    expect(result.categoryName).toBe("Groceries");
  });

  it("uses the merchant keyword instead of the card number", () => {
    const result = categorizeTransaction("CARTE X8230 LECLERC", -1000, [
      { pattern: "X8230", categoryName: "Restaurants", amountCents: null, kind: null, needsReview: false, priority: 100 },
      { pattern: "LECLERC", categoryName: "Groceries", amountCents: null, kind: null, needsReview: false, priority: 100 },
    ]);
    expect(result.categoryName).toBe("Groceries");
    expect(categorizeTransaction("CARTE X8230 PHARMACIE", -1000, [
      { pattern: "X8230", categoryName: "Restaurants", amountCents: null, kind: null, needsReview: false, priority: 100 },
    ]).categoryName).toBeNull();
  });

  it("does not let a short keyword match inside another word", () => {
    const result = categorizeTransaction("PRELEVEMENT EUROPEEN", -1000, [
      { pattern: "EUROPE", categoryName: "Restaurants", amountCents: null, kind: null, needsReview: false, priority: 100 },
    ]);
    expect(result.categoryName).toBeNull();
  });

  it("prefers the keyword that names an amount, then the longer keyword", () => {
    const stationRules = [
      { pattern: "Q8", categoryName: "Fuel", amountCents: null, kind: null, needsReview: false, priority: 40 },
      { pattern: "Q8", categoryName: "Tobacco", amountCents: -1130, kind: null, needsReview: false, priority: 40 },
      { pattern: "INTERSTATION", categoryName: "Tobacco", amountCents: null, kind: null, needsReview: false, priority: 110 },
      { pattern: "INTERSTATION MOUSCRON", categoryName: "Fuel", amountCents: null, kind: null, needsReview: false, priority: 110 },
    ];
    expect(categorizeTransaction("Q8 MOUSCRON", -1130, stationRules).categoryName).toBe("Tobacco");
    expect(categorizeTransaction("Q8 MOUSCRON", -4000, stationRules).categoryName).toBe("Fuel");
    expect(categorizeTransaction("CARTE X8230 INTERSTATION", -1130, stationRules).categoryName).toBe("Tobacco");
    expect(categorizeTransaction("CARTE X8230 INTERSTATION MOUSCRON 22,29 EUR", -2229, stationRules).categoryName).toBe("Fuel");
  });

  it("lets a personal keyword beat a default amount rule", () => {
    const result = categorizeTransaction("Q8 MOUSCRON", -1130, [
      { pattern: "Q8", categoryName: "Tobacco", amountCents: -1130, kind: null, needsReview: false, priority: 40 },
      { pattern: "Q8", categoryName: "Fuel", amountCents: null, kind: null, needsReview: false, priority: 110 },
    ]);
    expect(result.categoryName).toBe("Fuel");
  });

  it("classifies bank fees only when a keyword matches", () => {
    expect(categorizeTransaction("COTISATION JAZZ", -500, []).categoryName).toBeNull();
    const result = categorizeTransaction("COTIS MODULE S OPT CONV", -500, [
      { pattern: "COTIS MODULE", categoryName: "Bank fees", amountCents: null, kind: null, needsReview: false, priority: 110 },
    ]);
    expect(result.categoryName).toBe("Bank fees");
  });

  it("reads a keyword from the bank subcategory as well as the label", () => {
    const result = categorizeTransaction("PRELEVEMENT EUROPEEN DE ZEPHIR", -30700, [
      { pattern: "ASSURANCES AUTO", categoryName: "Car insurance", amountCents: null, kind: null, needsReview: false, priority: 40 },
    ], "Auto Assurances auto");
    expect(result.categoryName).toBe("Car insurance");
    expect(result.normalizedMerchant).not.toContain("ASSURANCES");
  });

  it("uses the kind stored on a keyword", () => {
    const salary = categorizeTransaction("VIREMENT KINGFISHER PAIE", 250000, [
      { pattern: "VIREMENT", categoryName: "Transfers", amountCents: null, kind: "transfer", needsReview: true, priority: 40 },
      { pattern: "KINGFISHER", categoryName: "Salary", amountCents: null, kind: "income", needsReview: false, priority: 40 },
    ]);
    expect(salary.kind).toBe("income");
    expect(salary.categoryName).toBe("Salary");

    const transfer = categorizeTransaction("VIREMENT VERS COMPTE EPARGNE", -20000, [
      { pattern: "VIREMENT", categoryName: "Transfers", amountCents: null, kind: "transfer", needsReview: true, priority: 40 },
    ]);
    expect(transfer.kind).toBe("transfer");
    expect(transfer.categoryName).toBe("Transfers");
  });

  it("treats a positive amount as income when no keyword matches", () => {
    const result = categorizeTransaction("REMBOURSEMENT AMI", 2500);
    expect(result.kind).toBe("income");
    expect(result.categoryName).toBeNull();
    expect(result.needsReview).toBe(true);
  });
});
