import { describe, expect, it } from "vitest";
import { categoryBankLabel, categoryDisplayName, categoryEnglishName } from "./categoryNames";

describe("category names", () => {
  it("shows the English name for a bank category", () => {
    expect(categoryEnglishName("Vie quotidienne")).toBe("Everyday life");
    expect(categoryDisplayName({ name: "Alimentation" })).toBe("Groceries");
    expect(categoryDisplayName({ name: "Hébergement (hôtels, camping…)" })).toBe("Lodging");
  });

  it("keeps an English category and a custom app name", () => {
    expect(categoryDisplayName({ name: "Groceries" })).toBe("Groceries");
    expect(categoryDisplayName({ name: "Alimentation", nameEn: "Food" })).toBe("Food");
  });

  it("keeps the French label for the bank match", () => {
    expect(categoryBankLabel({ name: "Carburant" })).toBe("Carburant");
    expect(categoryBankLabel({ name: "Fuel", nameFr: "Carburant" })).toBe("Carburant");
    expect(categoryBankLabel({ name: "Groceries" })).toBe("");
  });
});
