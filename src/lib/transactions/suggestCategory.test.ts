import { describe, expect, it } from "vitest";
import { acceptedSuggestions, inferCategory } from "./suggestCategory";

describe("inferCategory", () => {
  it("maps a known merchant onto the matching category name", () => {
    expect(inferCategory("AUCHAN CITY LILLE", ["Groceries", "Fuel"])).toEqual({
      categoryName: "Groceries",
      keyword: "AUCHAN",
    });
    expect(inferCategory("CARTE AUCHAN", ["Alimentation", "Transport"])?.categoryName).toBe("Alimentation");
    expect(inferCategory("CB AU BUREAU LILLE", ["Restaurants", "Groceries"])).toEqual({
      categoryName: "Restaurants",
      keyword: "AU BUREAU",
    });
  });

  it("stays quiet when no category corresponds and picks one when several match", () => {
    expect(inferCategory("AUCHAN CITY", ["Maison", "Transport"])).toBeNull();
    expect(inferCategory("LIDL", ["Groceries", "Courses"])?.categoryName).toBe("Groceries");
  });
});

describe("acceptedSuggestions", () => {
  it("keeps a model suggestion only when the category and keyword are valid", () => {
    const result = acceptedSuggestions(
      { items: [
        { index: 0, category: "Shopping", keyword: "LIBRAIRIE" },
        { index: 0, category: "Unknown", keyword: "LIBRAIRIE" },
        { merchant: "OTHER", category: "Shopping", keyword: "AMAZON" },
      ] },
      ["LIBRAIRIE DU CENTRE 75011"],
      ["Shopping"]
    );
    expect(result).toEqual([
      { merchant: "LIBRAIRIE DU CENTRE 75011", categoryName: "Shopping", keyword: "LIBRAIRIE" },
    ]);
  });
});
