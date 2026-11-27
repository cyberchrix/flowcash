import { normalizeMerchant } from "./normalize";
import { isPaymentToken } from "./suggestCategory";
import {
  Categorization,
  TransactionKind,
  UserCategorizationRule,
} from "./types";

const GROCERIES = ["LIDL", "ALDI", "LECLERC", "INTERMARCHE", "COLRUYT", "AUCHAN", "CARREFOUR"];
const RESTAURANTS = [
  "MCDONALD",
  "MCDONALDS",
  "BURGER KING",
  "QUICK",
  "KFC",
  "SUBWAY",
  "PIZZA",
  "PIZZA HUT",
  "DOMINO",
  "DOMINOS",
  "RESTAURANT",
  "BRASSERIE",
  "MC DONALD",
  "OTACOS",
  "FRITERIE",
  "NEWREST",
  "EXKI",
  "STARBUCKS",
  "KEBAB",
  "SUSHI",
];
const FUEL_STATIONS = ["TOTAL", "SHELL", "Q8", "ESSO", "LUKOIL", "TEXACO", "AVIA", "GULF", "BP"];
const SALARY_PAYERS = ["KINGFISHER"];
const FUEL_WORDS = [
  "CARBURANT",
  "ESSENCE",
  "DIESEL",
  "GASOIL",
  "GAZOLE",
  "FUEL",
  "SANS PLOMB",
  "SP95",
  "SP98",
];

function containsTerm(text: string, term: string): boolean {
  return ` ${text} `.includes(` ${term} `);
}

function matchesAny(text: string, terms: string[]): boolean {
  return terms.some((term) =>
    term.includes(" ") ? text.includes(term) : containsTerm(text, term)
  );
}

function kindFromAmount(amountCents: number): TransactionKind {
  return amountCents > 0 ? "income" : "expense";
}

export function matchingUserRule(
  normalizedMerchant: string,
  amountCents: number,
  rules: UserCategorizationRule[]
): UserCategorizationRule | null {
  return [...rules]
    .sort((a, b) => b.priority - a.priority || normalizeMerchant(b.pattern).length - normalizeMerchant(a.pattern).length)
    .find((rule) => {
      const pattern = normalizeMerchant(rule.pattern);
      if (!pattern || isPaymentToken(pattern) || !containsTerm(normalizedMerchant, pattern)) return false;
      if (rule.amountCents != null && rule.amountCents !== amountCents) return false;
      return true;
    }) ?? null;
}

export function categorizeTransaction(
  label: string,
  amountCents: number,
  rules: UserCategorizationRule[] = []
): Categorization {
  const normalizedMerchant = normalizeMerchant(label);
  const userRule = matchingUserRule(normalizedMerchant, amountCents, rules);

  if (userRule) {
    return {
      normalizedMerchant,
      kind: userRule.kind ?? kindFromAmount(amountCents),
      categoryName: userRule.categoryName,
      needsReview: userRule.needsReview,
    };
  }

  if (amountCents > 0 && matchesAny(normalizedMerchant, SALARY_PAYERS)) {
    return {
      normalizedMerchant,
      kind: "income",
      categoryName: "Salary",
      needsReview: false,
    };
  }

  if (
    containsTerm(normalizedMerchant, "VIREMENT") ||
    containsTerm(normalizedMerchant, "VIR")
  ) {
    return {
      normalizedMerchant,
      kind: "transfer",
      categoryName: "Transfers",
      needsReview: true,
    };
  }

  if (normalizedMerchant.includes("NAVI MOUSCRON")) {
    return {
      normalizedMerchant,
      kind: kindFromAmount(amountCents),
      categoryName: "Convenience Store",
      needsReview: true,
    };
  }

  const families: string[] = [];
  if (matchesAny(normalizedMerchant, GROCERIES)) families.push("Groceries");
  if (matchesAny(normalizedMerchant, RESTAURANTS)) families.push("Restaurants");
  const isFuelStation = matchesAny(normalizedMerchant, FUEL_STATIONS);
  if (isFuelStation) families.push("Fuel");

  if (families.length > 1) {
    return {
      normalizedMerchant,
      kind: kindFromAmount(amountCents),
      categoryName: null,
      needsReview: true,
    };
  }

  if (isFuelStation) {
    if (Math.abs(amountCents) === 1130) {
      return {
        normalizedMerchant,
        kind: kindFromAmount(amountCents),
        categoryName: "Tobacco",
        needsReview: false,
      };
    }
    if (matchesAny(normalizedMerchant, FUEL_WORDS)) {
      return {
        normalizedMerchant,
        kind: kindFromAmount(amountCents),
        categoryName: "Fuel",
        needsReview: false,
      };
    }
    return {
      normalizedMerchant,
      kind: kindFromAmount(amountCents),
      categoryName: null,
      needsReview: true,
    };
  }

  if (families.length === 1) {
    return {
      normalizedMerchant,
      kind: kindFromAmount(amountCents),
      categoryName: families[0],
      needsReview: false,
    };
  }

  return {
    normalizedMerchant,
    kind: kindFromAmount(amountCents),
    categoryName: null,
    needsReview: true,
  };
}
