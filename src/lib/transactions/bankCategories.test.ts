import { describe, expect, it } from "vitest";
import { bankParentIds, expenseCategoryChoices, incomeCategoryIds, usableBankCategory } from "./bankCategories";

describe("usableBankCategory", () => {
  it("keeps a bank category and skips the unlabeled bucket", () => {
    expect(usableBankCategory("Vie quotidienne")).toBe("Vie quotidienne");
    expect(usableBankCategory("Non catégorisée")).toBeNull();
    expect(usableBankCategory("  ")).toBeNull();
  });
});

describe("incomeCategoryIds", () => {
  it("includes the salary category and its subcategories", () => {
    const ids = incomeCategoryIds([
      { id: "work", name: "Revenus du travail", parentId: null },
      { id: "salary", name: "Salaire fixe", parentId: "work" },
      { id: "food", name: "Vie quotidienne", parentId: null },
    ]);
    expect(ids.has("work")).toBe(true);
    expect(ids.has("salary")).toBe(true);
    expect(ids.has("food")).toBe(false);
  });
});

describe("expenseCategoryChoices", () => {
  it("offers subcategories once the bank hierarchy exists", () => {
    const choices = expenseCategoryChoices([
      { id: "daily", name: "Vie quotidienne", parentId: null, color: "#111" },
      { id: "food", name: "Alimentation", parentId: "daily", color: "#111" },
      { id: "groceries", name: "Groceries", parentId: null, color: "#222" },
      { id: "transfers", name: "Virements reçus", parentId: null, color: "#333" },
    ]);
    expect(choices.map((choice) => choice.label)).toEqual(["Everyday life · Groceries", "Incoming transfers"]);
  });
});

describe("bankParentIds", () => {
  it("keeps parents that have a subcategory or a direct transaction", () => {
    const ids = bankParentIds(
      [
        { id: "daily", parentId: null },
        { id: "food", parentId: "daily" },
        { id: "transfers", parentId: null },
        { id: "groceries", parentId: null },
      ],
      ["transfers"]
    );
    expect([...ids].sort()).toEqual(["daily", "transfers"]);
  });
});
