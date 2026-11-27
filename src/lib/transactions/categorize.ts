import { normalizeMerchant } from "./normalize";
import { isPaymentToken } from "./suggestCategory";
import {
  Categorization,
  TransactionKind,
  UserCategorizationRule,
} from "./types";

function containsTerm(text: string, term: string): boolean {
  return ` ${text} `.includes(` ${term} `);
}

export function kindFromAmount(amountCents: number): TransactionKind {
  return amountCents > 0 ? "income" : "expense";
}

export function matchingUserRule(
  normalizedMerchant: string,
  amountCents: number,
  rules: UserCategorizationRule[]
): UserCategorizationRule | null {
  const text = normalizeMerchant(normalizedMerchant);
  return [...rules]
    .sort((left, right) =>
      right.priority - left.priority
      || Number(right.amountCents != null) - Number(left.amountCents != null)
      || normalizeMerchant(right.pattern).length - normalizeMerchant(left.pattern).length
    )
    .find((rule) => {
      const pattern = normalizeMerchant(rule.pattern);
      if (!pattern || isPaymentToken(pattern) || !containsTerm(text, pattern)) return false;
      if (rule.amountCents != null && Number(rule.amountCents) !== amountCents) return false;
      return true;
    }) ?? null;
}

export function categorizeTransaction(
  label: string,
  amountCents: number,
  rules: UserCategorizationRule[] = [],
  extra = ""
): Categorization {
  const normalizedMerchant = normalizeMerchant(label);
  const matchText = extra ? normalizeMerchant(`${label} ${extra}`) : normalizedMerchant;
  const userRule = matchingUserRule(matchText, amountCents, rules);

  if (userRule) {
    return {
      normalizedMerchant,
      kind: userRule.kind ?? kindFromAmount(amountCents),
      categoryName: userRule.categoryName,
      needsReview: userRule.needsReview,
    };
  }

  return {
    normalizedMerchant,
    kind: kindFromAmount(amountCents),
    categoryName: null,
    needsReview: true,
  };
}
