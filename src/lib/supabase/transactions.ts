import { supabase, ensureSupabaseConfigured } from "../supabase";
import { Database } from "@/types/database";
import { createCategory, getCategories } from "./categories";
import { matchingUserRule } from "@/lib/transactions/categorize";
import { normalizeMerchant } from "@/lib/transactions/normalize";
import { invalidateBudgetCache } from "@/lib/finance/budgetCache";
import { invalidateCategoryModel } from "@/lib/transactions/categorizeWithModel";
import {
  hasRestaurantSignal,
  inferCategory,
  isPaymentToken,
  isRestaurantCategory,
  knownTermExpectation,
  merchantKeyword,
} from "@/lib/transactions/suggestCategory";
import { TransactionKind } from "@/lib/transactions/types";

type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];

export type TransactionListItem = Database["public"]["Tables"]["transactions"]["Row"] & {
  categories: { name: string; color: string } | null;
};

const CATEGORY_COLORS: Record<string, string> = {
  Salary: "#34D399",
  Groceries: "#10B981",
  Restaurants: "#F59E0B",
  Fuel: "#316CFF",
  Tobacco: "#A1A1A1",
  "Convenience Store": "#8A2BFF",
  Transfers: "#6366F1",
};

export type SavedTransactionInput = {
  transactionDate: string;
  bookingDate: string | null;
  accountNumber: string;
  accountLabel: string;
  operationLabel: string;
  fullLabel: string;
  bankCategory: string;
  bankSubcategory: string;
  amountCents: number;
  currency?: string;
  pointed: boolean;
  kind: TransactionKind;
  normalizedMerchant: string;
  categoryName: string | null;
  needsReview: boolean;
  fingerprint: string;
  occurrence: number;
  duplicate: boolean;
  suggestedCategoryName: string | null;
};

async function assertCategoryOwner(userId: string, categoryId: string | null) {
  if (!categoryId) return;
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from("categories")
    .select("id, user_id")
    .eq("id", categoryId)
    .single();

  if (error || !data || data.user_id !== userId) {
    throw new Error("This category does not belong to the current user.");
  }
}

export async function ensureCategoryIds(userId: string, names: string[]) {
  const existing = await getCategories(userId);
  const byName = new Map(existing.map((category) => [category.name.toLowerCase(), category]));

  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed || byName.has(trimmed.toLowerCase())) continue;
    const created = await createCategory({
      user_id: userId,
      name: trimmed,
      color: CATEGORY_COLORS[trimmed] ?? "#A1A1A1",
    });
    byName.set(created.name.toLowerCase(), created);
  }

  return byName;
}

export async function getCategorizationRules(userId: string) {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from("categorization_rules")
    .select("pattern, category_id, amount_cents, kind, needs_review, priority, categories(name)")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Error fetching categorization rules: ${error.message}`);
  }

  return (data ?? []).map((rule) => {
    const category = rule.categories as { name: string } | { name: string }[] | null;
    const categoryName = Array.isArray(category) ? category[0]?.name : category?.name;
    return {
      pattern: rule.pattern as string,
      categoryId: rule.category_id as string,
      categoryName: categoryName ?? "",
      amountCents: rule.amount_cents as number | null,
      kind: rule.kind as TransactionKind | null,
      needsReview: Boolean(rule.needs_review),
      priority: Number(rule.priority ?? 0),
    };
  }).filter((rule) => rule.categoryName);
}

export async function countFingerprints(userId: string, fingerprints: string[]) {
  const counts = new Map<string, number>();
  if (fingerprints.length === 0) return counts;

  ensureSupabaseConfigured();
  const unique = [...new Set(fingerprints)];
  for (let index = 0; index < unique.length; index += 80) {
    const batch = unique.slice(index, index + 80);
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("transactions")
        .select("fingerprint")
        .eq("user_id", userId)
        .in("fingerprint", batch)
        .range(from, from + 999);
      if (error) {
        throw new Error(`Error checking duplicates: ${error.message}`);
      }
      const page = data ?? [];
      for (const row of page) {
        const key = row.fingerprint as string;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      if (page.length < 1000) break;
    }
  }
  return counts;
}

function isDuplicateError(error: { code?: string; message?: string }) {
  return error.code === "23505" || /duplicate key/i.test(error.message ?? "");
}

async function insertTransactions(rows: TransactionInsert[]): Promise<number> {
  const { error } = await supabase.from("transactions").insert(rows);
  if (!error) return rows.length;
  if (!isDuplicateError(error)) {
    throw new Error(`Error saving transactions: ${error.message}`);
  }

  let saved = 0;
  for (const row of rows) {
    const { error: rowError } = await supabase.from("transactions").insert(row);
    if (!rowError) {
      saved += 1;
      continue;
    }
    if (!isDuplicateError(rowError)) {
      throw new Error(`Error saving transactions: ${rowError.message}`);
    }
  }
  return saved;
}

export async function saveBankImport(
  userId: string,
  filename: string,
  rows: SavedTransactionInput[]
) {
  ensureSupabaseConfigured();
  const imported = rows.filter((row) => !row.duplicate);
  let duplicateCount = rows.length - imported.length;
  let saved = imported.length;
  const names = [
    ...new Set(
      imported
        .map((row) => row.categoryName)
        .filter((name): name is string => Boolean(name))
    ),
  ];
  const categories = await ensureCategoryIds(userId, names);

  const categoryIdFor = (name: string | null) => {
    if (!name) return null;
    const match = categories.get(name.toLowerCase());
    if (!match?.id) {
      throw new Error(`Missing category: ${name}`);
    }
    return match.id;
  };

  for (const name of names) {
    const id = categoryIdFor(name);
    await assertCategoryOwner(userId, id);
  }

  const { data: bankImport, error: importError } = await supabase
    .from("bank_imports")
    .insert({
      user_id: userId,
      filename,
      row_count: rows.length,
      imported_count: imported.length,
      duplicate_count: duplicateCount,
    })
    .select()
    .single();

  if (importError || !bankImport) {
    throw new Error(`Error creating import: ${importError?.message ?? "unknown"}`);
  }

  if (imported.length > 0) {
    const payload: TransactionInsert[] = imported.map((row) => ({
      user_id: userId,
      import_id: bankImport.id,
      transaction_date: row.transactionDate,
      booking_date: row.bookingDate,
      account_number: row.accountNumber || null,
      account_label: row.accountLabel || null,
      operation_label: row.operationLabel || null,
      full_label: row.fullLabel,
      bank_category: row.bankCategory || null,
      bank_subcategory: row.bankSubcategory || null,
      amount_cents: row.amountCents,
      currency: row.currency || "EUR",
      pointed: row.pointed,
      kind: row.kind,
      normalized_merchant: row.normalizedMerchant,
      category_id: categoryIdFor(row.categoryName),
      needs_review: row.needsReview,
      fingerprint: row.fingerprint,
      occurrence: row.occurrence,
    }));

    saved = 0;
    for (let index = 0; index < payload.length; index += 80) {
      saved += await insertTransactions(payload.slice(index, index + 80));
    }
    duplicateCount += imported.length - saved;
    await supabase
      .from("bank_imports")
      .update({ imported_count: saved, duplicate_count: duplicateCount })
      .eq("id", bankImport.id);
  }

  const corrections = imported.filter(
    (row) =>
      row.categoryName &&
      row.categoryName !== row.suggestedCategoryName &&
      row.normalizedMerchant.length >= 3
  );
  for (const row of corrections) {
    const categoryId = categoryIdFor(row.categoryName);
    const pattern = merchantKeyword(row.fullLabel) || row.normalizedMerchant;
    if (!categoryId || pattern.length < 3) continue;
    const { error } = await supabase.from("categorization_rules").upsert(
      {
        user_id: userId,
        pattern,
        category_id: categoryId,
        kind: row.kind,
        needs_review: false,
        priority: 110,
      },
      { onConflict: "user_id,pattern" }
    );
    if (error) {
      throw new Error(`Error saving categorization rule: ${error.message}`);
    }
  }

  invalidateTransactionSync(userId);
  invalidateBudgetCache();
  return {
    importedCount: saved,
    duplicateCount,
  };
}

export async function applyKeywordRules(userId: string) {
  const rules = await getCategorizationRules(userId);
  if (rules.length === 0) return 0;

  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from("transactions")
    .select("id, normalized_merchant, amount_cents, category_id")
    .eq("user_id", userId);
  if (error) throw new Error(`Error reading transactions: ${error.message}`);

  const idsByCategory = new Map<string, { ids: string[]; needsReview: boolean }>();
  for (const row of data ?? []) {
    const rule = matchingUserRule(row.normalized_merchant, Number(row.amount_cents), rules);
    if (!rule?.categoryId || rule.categoryId === row.category_id) continue;
    if (row.category_id && rule.priority < 100) continue;
    const group = idsByCategory.get(rule.categoryId) ?? { ids: [] as string[], needsReview: rule.needsReview };
    group.ids.push(row.id);
    group.needsReview = group.needsReview || rule.needsReview;
    idsByCategory.set(rule.categoryId, group);
  }

  let updated = 0;
  for (const [categoryId, group] of idsByCategory) {
    const { error: updateError } = await supabase
      .from("transactions")
      .update({ category_id: categoryId, needs_review: group.needsReview })
      .eq("user_id", userId)
      .in("id", group.ids);
    if (updateError) throw new Error(`Error applying keywords: ${updateError.message}`);
    updated += group.ids.length;
  }
  return updated;
}

export async function applyKnownMerchants(userId: string) {
  const categories = await getCategories(userId);
  if (categories.length === 0) return 0;
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from("transactions")
    .select("id, normalized_merchant, full_label, category_id, needs_review")
    .eq("user_id", userId)
    .or("category_id.is.null,needs_review.eq.true");
  if (error) throw new Error(`Error reading transactions: ${error.message}`);

  const names = categories.map((category) => category.name);
  const categoryIdFor = new Map(categories.map((category) => [category.name.toLowerCase(), category.id]));
  const rules = await getCategorizationRules(userId);
  const idsByCategory = new Map<string, { categoryId: string; keyword: string; ids: string[] }>();
  for (const row of data ?? []) {
    const label = `${row.normalized_merchant} ${row.full_label ?? ""}`;
    const locked = matchingUserRule(label, 0, rules);
    if (locked && locked.priority >= 100) continue;
    const inferred = inferCategory(label, names);
    const categoryId = inferred ? categoryIdFor.get(inferred.categoryName.toLowerCase()) : undefined;
    if (!inferred || !categoryId || categoryId === row.category_id) continue;
    const group = idsByCategory.get(categoryId) ?? { categoryId, keyword: inferred.keyword, ids: [] as string[] };
    group.ids.push(row.id);
    idsByCategory.set(categoryId, group);
    const { error: ruleError } = await supabase.from("categorization_rules").insert({
      user_id: userId,
      pattern: inferred.keyword,
      category_id: categoryId,
      needs_review: false,
      priority: 40,
    });
    if (ruleError && ruleError.code !== "23505") throw new Error(`Error saving inferred keyword: ${ruleError.message}`);
  }

  let updated = 0;
  for (const group of idsByCategory.values()) {
    const { error: updateError } = await supabase
      .from("transactions")
      .update({ category_id: group.categoryId, needs_review: false })
      .eq("user_id", userId)
      .in("id", group.ids);
    if (updateError) throw new Error(`Error applying known merchants: ${updateError.message}`);
    updated += group.ids.length;
  }
  return updated;
}

export async function applySalaryIncome(userId: string) {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from("transactions")
    .select("id, normalized_merchant, full_label, amount_cents, kind")
    .eq("user_id", userId)
    .gt("amount_cents", 0);
  if (error) throw new Error(`Error reading income: ${error.message}`);
  const ids = (data ?? [])
    .filter((row) => `${row.normalized_merchant} ${row.full_label ?? ""}`.toUpperCase().includes("KINGFISHER"))
    .filter((row) => row.kind !== "income")
    .map((row) => row.id);
  if (ids.length === 0) return 0;
  const categories = await ensureCategoryIds(userId, ["Salary"]);
  const categoryId = categories.get("salary")?.id;
  const { error: updateError } = await supabase
    .from("transactions")
    .update({ kind: "income", category_id: categoryId, needs_review: false })
    .eq("user_id", userId)
    .in("id", ids);
  if (updateError) throw new Error(`Error marking salary: ${updateError.message}`);
  return ids.length;
}

export async function repairKeywordRules(userId: string) {
  ensureSupabaseConfigured();
  const [rules, categories] = await Promise.all([
    getCategorizationRules(userId),
    getCategories(userId),
  ]);
  const names = categories.map((category) => category.name);
  for (const rule of rules) {
    if (isPaymentToken(rule.pattern)) {
      const { error } = await supabase.from("categorization_rules").delete().eq("user_id", userId).eq("pattern", rule.pattern);
      if (error) throw new Error(`Error removing keyword: ${error.message}`);
      continue;
    }
    if (rule.priority >= 110) continue;
    const expectation = knownTermExpectation(rule.pattern, names);
    if (expectation.known && !expectation.categoryName) {
      const { error } = await supabase.from("categorization_rules").delete().eq("user_id", userId).eq("pattern", rule.pattern);
      if (error) throw new Error(`Error removing keyword: ${error.message}`);
      continue;
    }
    if (expectation.categoryName && expectation.categoryName !== rule.categoryName) {
      const categoryId = categories.find((category) => category.name === expectation.categoryName)?.id;
      if (!categoryId) continue;
      const { error } = await supabase
        .from("categorization_rules")
        .update({ category_id: categoryId, needs_review: false })
        .eq("user_id", userId)
        .eq("pattern", rule.pattern);
      if (error) throw new Error(`Error correcting keyword: ${error.message}`);
      continue;
    }
    if (isRestaurantCategory(rule.categoryName) && rule.priority < 110 && !hasRestaurantSignal(rule.pattern)) {
      const { error } = await supabase.from("categorization_rules").delete().eq("user_id", userId).eq("pattern", rule.pattern);
      if (error) throw new Error(`Error removing keyword: ${error.message}`);
    }
  }
}

async function releaseFalseRestaurants(userId: string) {
  const categories = await getCategories(userId);
  const restaurant = categories.find((category) => isRestaurantCategory(category.name));
  if (!restaurant) return 0;
  const names = categories.map((category) => category.name);
  const categoryIdFor = new Map(categories.map((category) => [category.name.toLowerCase(), category.id]));
  const rules = await getCategorizationRules(userId);
  const { data, error } = await supabase
    .from("transactions")
    .select("id, normalized_merchant, full_label, amount_cents")
    .eq("user_id", userId)
    .eq("category_id", restaurant.id);
  if (error) throw new Error(`Error reading restaurants: ${error.message}`);

  const clearIds: string[] = [];
  const moveIds = new Map<string, string[]>();
  for (const row of data ?? []) {
    const label = `${row.normalized_merchant ?? ""} ${row.full_label ?? ""}`;
    if (hasRestaurantSignal(label)) continue;
    const rule = matchingUserRule(normalizeMerchant(label), Number(row.amount_cents), rules);
    if (rule?.categoryId === restaurant.id) continue;
    const inferred = inferCategory(label, names);
    const nextId = (inferred ? categoryIdFor.get(inferred.categoryName.toLowerCase()) : undefined) ?? rule?.categoryId;
    if (nextId && nextId !== restaurant.id) {
      const ids = moveIds.get(nextId) ?? [];
      ids.push(row.id);
      moveIds.set(nextId, ids);
    } else {
      clearIds.push(row.id);
    }
  }

  let updated = 0;
  for (let index = 0; index < clearIds.length; index += 80) {
    const ids = clearIds.slice(index, index + 80);
    const { error: clearError } = await supabase
      .from("transactions")
      .update({ category_id: null, needs_review: true })
      .eq("user_id", userId)
      .in("id", ids);
    if (clearError) throw new Error(`Error clearing category: ${clearError.message}`);
    updated += ids.length;
  }
  for (const [categoryId, ids] of moveIds) {
    for (let index = 0; index < ids.length; index += 80) {
      const batch = ids.slice(index, index + 80);
      const { error: moveError } = await supabase
        .from("transactions")
        .update({ category_id: categoryId, needs_review: false })
        .eq("user_id", userId)
        .in("id", batch);
      if (moveError) throw new Error(`Error moving category: ${moveError.message}`);
      updated += batch.length;
    }
  }
  return updated;
}

const SYNC_TTL_MS = 10 * 60 * 1000;
const transactionSync = new Map<string, { at: number; pending?: Promise<number> }>();

export function invalidateTransactionSync(userId?: string) {
  if (userId) transactionSync.delete(userId);
  else transactionSync.clear();
  invalidateCategoryModel();
}

export async function ensureTransactionSync(userId: string): Promise<number> {
  const current = transactionSync.get(userId);
  if (current?.pending) return current.pending;
  if (current && Date.now() - current.at < SYNC_TTL_MS) return 0;
  const pending = (async () => {
    await applySalaryIncome(userId);
    await repairKeywordRules(userId);
    const released = await releaseFalseRestaurants(userId);
    const keywords = await applyKeywordRules(userId);
    const known = await applyKnownMerchants(userId);
    return released + keywords + known;
  })();
  transactionSync.set(userId, { at: current?.at ?? 0, pending });
  try {
    return await pending;
  } finally {
    const latest = transactionSync.get(userId);
    if (latest?.pending === pending) transactionSync.set(userId, { at: Date.now() });
  }
}

export async function getTransactions(
  userId: string,
  filters: { month?: string; categoryId?: string; start?: string; end?: string }
) {
  ensureSupabaseConfigured();
  const pageSize = 1000;
  const rows: TransactionListItem[] = [];

  for (let from = 0; ; from += pageSize) {
    let query = supabase
      .from("transactions")
      .select("*, categories(name, color)")
      .eq("user_id", userId)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (filters.start) query = query.gte("transaction_date", filters.start);
    if (filters.end) query = query.lte("transaction_date", filters.end);

    if (filters.month && !filters.start) {
      const [year, month] = filters.month.split("-").map(Number);
      const start = `${filters.month}-01`;
      const endMonth = month === 12 ? 1 : month + 1;
      const endYear = month === 12 ? year + 1 : year;
      const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
      query = query.gte("transaction_date", start).lt("transaction_date", end);
    }

    if (filters.categoryId) {
      query = query.eq("category_id", filters.categoryId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Error fetching transactions: ${error.message}`);
    }
    const page = (data ?? []) as TransactionListItem[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

export async function updateTransactionCategory(
  userId: string,
  transactionId: string,
  categoryId: string | null
) {
  await assertCategoryOwner(userId, categoryId);
  ensureSupabaseConfigured();
  const { error } = await supabase
    .from("transactions")
    .update({ category_id: categoryId, needs_review: false })
    .eq("id", transactionId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Error updating transaction: ${error.message}`);
  }
  invalidateBudgetCache();

  if (!categoryId) return null;
  const { data } = await supabase
    .from("transactions")
    .select("full_label, normalized_merchant")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .single();
  const pattern = merchantKeyword(`${data?.normalized_merchant ?? ""} ${data?.full_label ?? ""}`);
  if (pattern.length < 3) return null;
  const { error: ruleError } = await supabase.from("categorization_rules").upsert(
    {
      user_id: userId,
      pattern,
      category_id: categoryId,
      needs_review: false,
      priority: 110,
    },
    { onConflict: "user_id,pattern" }
  );
  if (ruleError) throw new Error(`Error saving categorization rule: ${ruleError.message}`);
  await applyKeywordRules(userId);
  transactionSync.set(userId, { at: Date.now() });
  return pattern;
}

export async function saveKeywordRule(userId: string, keyword: string, categoryName: string) {
  const pattern = normalizeMerchant(keyword);
  if (pattern.length < 3) {
    throw new Error("Use a keyword of at least 3 letters.");
  }
  const categories = await ensureCategoryIds(userId, [categoryName]);
  const category = categories.get(categoryName.trim().toLowerCase());
  if (!category) throw new Error("Could not save this category.");

  ensureSupabaseConfigured();
  const { error } = await supabase.from("categorization_rules").upsert(
    {
      user_id: userId,
      pattern,
      category_id: category.id,
      needs_review: false,
      priority: 110,
    },
    { onConflict: "user_id,pattern" }
  );
  if (error) throw new Error(`Error saving keyword: ${error.message}`);
  await applyKeywordRules(userId);
  transactionSync.set(userId, { at: Date.now() });
  return pattern;
}

export async function deleteKeywordRule(userId: string, pattern: string) {
  ensureSupabaseConfigured();
  const { error } = await supabase
    .from("categorization_rules")
    .delete()
    .eq("user_id", userId)
    .eq("pattern", pattern);
  if (error) throw new Error(`Error deleting keyword: ${error.message}`);
  invalidateTransactionSync(userId);
}
