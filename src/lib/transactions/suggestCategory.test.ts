import { describe, expect, it } from "vitest";
import { acceptedSuggestions, displayMerchant, hasRestaurantSignal, inferCategory, isIncomeCategory, merchantKeyword } from "./suggestCategory";

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

describe("merchantKeyword", () => {
  it("keeps the brand so later transactions of the same merchant match", () => {
    expect(merchantKeyword("TEXACO RELAIS MOUSCRON")).toBe("TEXACO");
    expect(merchantKeyword("CB AU BUREAU LILLE")).toBe("AU BUREAU");
    expect(merchantKeyword("CARTE X8230 12/09 LECLERC 785")).toBe("LECLERC");
    expect(merchantKeyword("CARTE X8230 RETRAIT DAB")).toBe("");
    expect(merchantKeyword("FRAIS HORS ZONE EURO")).toBe("");
    expect(merchantKeyword("SUMUP COMITE SCOLAIRE")).toBe("COMITE");
  });
});

describe("isIncomeCategory", () => {
  it("recognizes salary and leaves expense categories alone", () => {
    expect(isIncomeCategory("Salary")).toBe(true);
    expect(isIncomeCategory("Salaire")).toBe(true);
    expect(isIncomeCategory("Groceries")).toBe(false);
  });
});

describe("displayMerchant", () => {
  it("drops the card number and the operation date", () => {
    expect(displayMerchant("CARTE X8230 24/11 CCN LILLE 11,30 EUR BELGIQUE 230632901839986IOPD")).toBe("Ccn Lille");
    expect(displayMerchant("CARTE X8230 12/09 LECLERC 785")).toBe("Leclerc");
    expect(displayMerchant("LIDL CITY")).toBe("Lidl City");
  });

  it("shows the creditor of a European direct debit", () => {
    expect(displayMerchant("PRELEVEMENT EUROPEEN 123 DE PAYPAL EUROPE S.A.R.L. ET CIE S.C.A. ID FR00ZZZ123 MOTIF ABONNEMENT")).toBe("Paypal");
    expect(displayMerchant("PRELEVEMENT EUROPEEN 1 DE ORANGE SA ID FR18ZZZ002305 MOTIF VOTRE ABONNEMENT MOBILE")).toBe("Orange");
    expect(displayMerchant("PRELEVEMENT EUROPEEN 1 DE PRET SOGEFINANC EXPRESSO FRANFINANC E ID FR08ZZZ100358")).toBe("Franfinance Expresso");
    expect(displayMerchant("PRELEVEMENT EUROPEEN 1 DE COFIDIS COF ID FR28ZZZ151408 MOTIF ECHEANCE")).toBe("Cofidis");
    expect(displayMerchant("PRLV EUROPEEN ACC 1 DE SOGECAP ID FR04ZZZ110906 MOTIF 1")).toBe("Sogecap");
  });
});

describe("hasRestaurantSignal", () => {
  it("recognizes a food place and ignores a fee or a shop", () => {
    expect(hasRestaurantSignal("BELLA PIZZA")).toBe(true);
    expect(hasRestaurantSignal("AU BUREAU LILLE")).toBe(true);
    expect(hasRestaurantSignal("PRELEVEMENT EUROPEEN")).toBe(false);
    expect(hasRestaurantSignal("SELF WASH")).toBe(false);
    expect(hasRestaurantSignal("HOTEL IBIS")).toBe(false);
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
