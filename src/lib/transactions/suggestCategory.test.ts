import { describe, expect, it } from "vitest";
import { acceptedSuggestions, displayMerchant, isIncomeCategory, labelKeywords, merchantKeyword, sameDisplayedMerchantIds } from "./suggestCategory";

describe("merchantKeyword", () => {
  it("keeps the brand so later transactions of the same merchant match", () => {
    expect(merchantKeyword("TEXACO RELAIS MOUSCRON")).toBe("TEXACO");
    expect(merchantKeyword("CB AU BUREAU LILLE")).toBe("AU BUREAU");
    expect(merchantKeyword("CARTE X8230 12/09 LECLERC 785")).toBe("LECLERC");
    expect(merchantKeyword("CARTE X8230 RETRAIT DAB")).toBe("RETRAIT DAB");
    expect(merchantKeyword("FRAIS HORS ZONE EURO")).toBe("FRAIS HORS ZONE");
    expect(merchantKeyword("SUMUP COMITE SCOLAIRE")).toBe("COMITE");
  });
});

describe("labelKeywords", () => {
  it("keeps words from the transaction name", () => {
    expect(labelKeywords("CARTE X8230 02/08 Friterie Themis 74,90 EUR BELGIQUE")).toEqual(["FRITERIE", "THEMIS"]);
  });
});

describe("sameDisplayedMerchantIds", () => {
  it("includes every transaction with the same displayed name", () => {
    const rows = [
      { id: "a", fullLabel: "CARTE X8230 02/08 Friterie Themis 74,90 EUR BELGIQUE" },
      { id: "b", fullLabel: "CARTE X8230 22/11 Friterie Themis 9,50 EUR BELGIQUE" },
      { id: "c", fullLabel: "CARTE X8230 04/10 FRITERIE GRAND PLACE 22,90 EUR BELGIQUE" },
    ];
    expect(sameDisplayedMerchantIds(rows, "a")).toEqual(["a", "b"]);
  });
});

describe("isIncomeCategory", () => {
  it("recognizes salary and leaves expense categories alone", () => {
    expect(isIncomeCategory("Salary")).toBe(true);
    expect(isIncomeCategory("Salaire")).toBe(true);
    expect(isIncomeCategory("Revenus du travail")).toBe(true);
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
    expect(displayMerchant("000001 VIR INSTANTANE EMIS LOGITEL POUR JEAN DUPONT 12 11 REF 681679988904 MOTIF LOYER")).toBe("Vir. émis Jean Dupont");
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
