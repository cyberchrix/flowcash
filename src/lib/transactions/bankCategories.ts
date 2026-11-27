import { categoryDisplayName } from "./categoryNames";
import { normalizeMerchant } from "./normalize";
import { isIncomeCategory } from "./suggestCategory";

const PALETTE = ["#FF2D8A", "#8A2BFF", "#316CFF", "#10B981", "#F59E0B", "#FB923C", "#14B8A6", "#818CF8", "#F472B6", "#0EA5E9", "#64748B", "#94A3B8", "#A78BFA", "#34D399"];

const LEGACY = new Set([
  "SALARY", "GROCERIES", "RESTAURANTS", "FUEL", "TOBACCO", "CONVENIENCE STORE", "TRANSFERS",
  "CAR INSURANCE", "CASH WITHDRAWALS", "BANK FEES", "VETERINARY", "CHILD SUPPORT", "TRAVEL",
  "LEISURE", "GIFTS", "HOUSING", "CHILDREN", "SUBSCRIPTIONS", "TRANSPORT", "OTHER", "CREDIT",
  "HEALTH", "SHOPPING",
]);

export function bankColor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function usableBankCategory(name: string | null | undefined) {
  const trimmed = (name ?? "").trim().slice(0, 120);
  const normalized = normalizeMerchant(trimmed);
  if (!normalized || normalized === "NON CATEGORISEE" || normalized === "NON CATEGORISE") return null;
  return trimmed;
}

export function incomeCategoryIds(categories: { id: string; name: string; parentId: string | null }[]) {
  const parents = new Set(categories.filter((category) => !category.parentId && isIncomeCategory(category.name)).map((category) => category.id));
  return new Set(categories.filter((category) => parents.has(category.id) || (category.parentId != null && parents.has(category.parentId))).map((category) => category.id));
}

export function categoryRoot(categoryId: string | null, parentById: ReadonlyMap<string, string | null>) {
  if (!categoryId) return null;
  return parentById.get(categoryId) ?? categoryId;
}

export function bankParentIds(categories: { id: string; parentId: string | null }[], assignedIds: Iterable<string>) {
  const withChildren = new Set(categories.flatMap((category) => (category.parentId ? [category.parentId] : [])));
  const assigned = new Set(assignedIds);
  return new Set(categories.filter((category) => !category.parentId && (withChildren.has(category.id) || assigned.has(category.id))).map((category) => category.id));
}

export function expenseCategoryChoices<T extends { id: string; name: string; parentId: string | null; color: string }>(categories: T[]) {
  const parents = new Map(categories.filter((category) => !category.parentId).map((category) => [category.id, category]));
  const children = categories.filter((category) => category.parentId);
  const incomeParents = new Set([...parents.values()].filter((category) => isIncomeCategory(category.name)).map((category) => category.id));
  if (children.length === 0) {
    return categories
      .filter((category) => !category.parentId && !isIncomeCategory(category.name))
      .map((category) => ({ ...category, label: categoryDisplayName(category) }));
  }
  const choices = children
    .filter((category) => category.parentId && !incomeParents.has(category.parentId))
    .map((category) => ({
      ...category,
      label: `${categoryDisplayName(parents.get(category.parentId ?? "") ?? { name: "" })} · ${categoryDisplayName(category)}`,
    }));
  for (const parent of parents.values()) {
    if (incomeParents.has(parent.id) || children.some((category) => category.parentId === parent.id)) continue;
    if (LEGACY.has(normalizeMerchant(parent.name))) continue;
    choices.push({ ...parent, label: categoryDisplayName(parent) });
  }
  return choices.sort((left, right) => left.label.localeCompare(right.label, "fr"));
}
