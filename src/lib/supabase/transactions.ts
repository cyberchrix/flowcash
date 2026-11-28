import { supabase, ensureSupabaseConfigured } from "../supabase";
import { Database } from "@/types/database";
import { createCategory, findCategoryByName, getCategories } from "./categories";
import { matchingUserRule } from "@/lib/transactions/categorize";
import { DEFAULT_KEYWORDS } from "@/lib/transactions/defaultKeywords";
import { normalizeMerchant } from "@/lib/transactions/normalize";
import { invalidateBudgetCache } from "@/lib/finance/budgetCache";
import { invalidateCategoryModel } from "@/lib/transactions/categorizeWithModel";
import { bankColor, usableBankCategory } from "@/lib/transactions/bankCategories";
import { categoryEnglishName } from "@/lib/transactions/categoryNames";
import { isPaymentToken, merchantKeyword, sameDisplayedMerchantIds } from "@/lib/transactions/suggestCategory";
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
  "Car insurance": "#0EA5E9",
  "Cash withdrawals": "#64748B",
  "Bank fees": "#94A3B8",
  Veterinary: "#14B8A6",
  "Child support": "#FB923C",
  Travel: "#38BDF8",
  Leisure: "#818CF8",
  Gifts: "#F9A8D4",
  "Convenience Store": "#8A2BFF",
  Transfers: "#6366F1",
  Health: "#F472B6",
  Shopping: "#A78BFA",
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
    const key = trimmed.toLowerCase();
    if (!trimmed) continue;
    const resolved = findCategoryByName(existing, trimmed);
    if (resolved) {
      byName.set(key, resolved);
      continue;
    }
    if (byName.has(key)) continue;
    const created = await createCategory({
      user_id: userId,
      name: trimmed,
      color: CATEGORY_COLORS[trimmed] ?? "#A1A1A1",
    });
    existing.push(created);
    byName.set(key, created);
    byName.set(created.name.toLowerCase(), created);
  }

  return byName;
}

async function rememberKeyword(
  userId: string,
  pattern: string,
  categoryId: string,
  kind: TransactionKind | null = null,
  amountCents: number | null = null
) {
  let lookup = supabase
    .from("categorization_rules")
    .select("id")
    .eq("user_id", userId)
    .eq("pattern", pattern);
  lookup = amountCents == null ? lookup.is("amount_cents", null) : lookup.eq("amount_cents", amountCents);
  const { data: found, error: findError } = await lookup.maybeSingle();
  if (findError) throw new Error(`Error saving keyword: ${findError.message}`);
  const payload = {
    category_id: categoryId,
    kind,
    needs_review: false,
    priority: 110,
  };
  const { error } = found
    ? await supabase.from("categorization_rules").update(payload).eq("id", found.id)
    : await supabase.from("categorization_rules").insert({
        user_id: userId,
        pattern,
        amount_cents: amountCents,
        ...payload,
      });
  if (error) throw new Error(`Error saving keyword: ${error.message}`);
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
      amountCents: rule.amount_cents == null ? null : Number(rule.amount_cents),
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
    await rememberKeyword(userId, pattern, categoryId, row.kind);
  }

  invalidateTransactionSync(userId);
  invalidateBudgetCache();
  return {
    importedCount: saved,
    duplicateCount,
  };
}

export async function clearAllTransactions(userId: string) {
  ensureSupabaseConfigured();
  let removed = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", userId)
      .limit(500);
    if (error) throw new Error(`Error clearing transactions: ${error.message}`);
    if (!data || data.length === 0) break;
    const { error: deleteError } = await supabase
      .from("transactions")
      .delete()
      .in("id", data.map((row) => row.id));
    if (deleteError) throw new Error(`Error clearing transactions: ${deleteError.message}`);
    removed += data.length;
  }

  for (;;) {
    const { data, error } = await supabase
      .from("bank_imports")
      .select("id")
      .eq("user_id", userId)
      .limit(500);
    if (error) throw new Error(`Error clearing imports: ${error.message}`);
    if (!data || data.length === 0) break;
    const { error: deleteError } = await supabase
      .from("bank_imports")
      .delete()
      .in("id", data.map((row) => row.id));
    if (deleteError) throw new Error(`Error clearing imports: ${deleteError.message}`);
  }

  invalidateTransactionSync(userId);
  invalidateBudgetCache();
  return removed;
}

export async function applyKeywordRules(userId: string) {
  const rules = await getCategorizationRules(userId);
  if (rules.length === 0) return 0;

  ensureSupabaseConfigured();
  const rows: {
    id: string;
    text: string;
    amount_cents: number;
    category_id: string | null;
    kind: string | null;
  }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, normalized_merchant, full_label, bank_category, bank_subcategory, amount_cents, category_id, kind")
      .eq("user_id", userId)
      .range(from, from + 999);
    if (error) throw new Error(`Error reading transactions: ${error.message}`);
    rows.push(...(data ?? []).map((row) => ({
      id: row.id,
      text: normalizeMerchant([row.normalized_merchant, row.full_label, row.bank_category, row.bank_subcategory].filter(Boolean).join(" ")),
      amount_cents: Number(row.amount_cents),
      category_id: row.category_id,
      kind: row.kind,
    })));
    if (!data || data.length < 1000) break;
  }

  const groups = new Map<string, { categoryId: string; needsReview: boolean; kind: TransactionKind | null; ids: string[] }>();
  for (const row of rows) {
    const rule = matchingUserRule(row.text, row.amount_cents, rules);
    if (!rule?.categoryId) continue;
    if (row.category_id && rule.priority < 100) continue;
    const kind = rule.kind ?? null;
    if (rule.categoryId === row.category_id && (kind == null || kind === row.kind)) continue;
    const key = `${rule.categoryId}|${kind ?? ""}|${rule.needsReview}`;
    const group = groups.get(key) ?? { categoryId: rule.categoryId, needsReview: rule.needsReview, kind, ids: [] as string[] };
    group.ids.push(row.id);
    groups.set(key, group);
  }

  let updated = 0;
  for (const group of groups.values()) {
    for (let index = 0; index < group.ids.length; index += 80) {
      const ids = group.ids.slice(index, index + 80);
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          category_id: group.categoryId,
          needs_review: group.needsReview,
          ...(group.kind ? { kind: group.kind } : {}),
        })
        .eq("user_id", userId)
        .in("id", ids);
      if (updateError) throw new Error(`Error applying keywords: ${updateError.message}`);
      updated += ids.length;
    }
  }
  return updated;
}

function keywordIdentity(pattern: string, amountCents: number | null | undefined) {
  return `${normalizeMerchant(pattern)}|${amountCents ?? ""}`;
}

export async function ensureDefaultKeywords(userId: string) {
  ensureSupabaseConfigured();
  const existing = await getCategorizationRules(userId);
  const present = new Set(existing.map((rule) => keywordIdentity(rule.pattern, rule.amountCents)));
  const missing = DEFAULT_KEYWORDS.filter((keyword) => !present.has(keywordIdentity(keyword.pattern, keyword.amountCents ?? null)));
  if (missing.length === 0) return 0;

  const categories = await ensureCategoryIds(userId, [...new Set(missing.map((keyword) => keyword.categoryName))]);
  let inserted = 0;
  for (const keyword of missing) {
    const category = categories.get(keyword.categoryName.toLowerCase());
    if (!category?.id) continue;
    const { error } = await supabase.from("categorization_rules").insert({
      user_id: userId,
      pattern: normalizeMerchant(keyword.pattern),
      category_id: category.id,
      amount_cents: keyword.amountCents ?? null,
      kind: keyword.kind ?? null,
      needs_review: keyword.needsReview ?? false,
      priority: keyword.priority ?? 40,
    });
    if (error && error.code !== "23505") throw new Error(`Error saving keyword: ${error.message}`);
    if (!error) inserted += 1;
  }
  return inserted;
}

export async function repairKeywordRules(userId: string) {
  ensureSupabaseConfigured();
  const rules = await getCategorizationRules(userId);
  for (const rule of rules) {
    if (!isPaymentToken(rule.pattern)) continue;
    const { error } = await supabase.from("categorization_rules").delete().eq("user_id", userId).eq("pattern", rule.pattern);
    if (error) throw new Error(`Error removing keyword: ${error.message}`);
  }
}

function bankMatchKey(category: { name: string; name_fr?: string | null }) {
  return (category.name_fr || category.name).toLowerCase();
}

async function createBankCategory(category: { user_id: string; name: string; color: string; parent_id?: string }) {
  const english = categoryEnglishName(category.name);
  try {
    return await createCategory({
      ...category,
      name_fr: category.name,
      ...(english ? { name_en: english } : {}),
    });
  } catch (error) {
    if (error instanceof Error && /name_en|name_fr|column|schema cache/i.test(error.message)) {
      return createCategory(category);
    }
    throw error;
  }
}

export async function applyBankCategories(userId: string) {
  ensureSupabaseConfigured();
  const rules = await getCategorizationRules(userId);
  const rows: {
    id: string;
    text: string;
    amount_cents: number;
    bank_category: string | null;
    bank_subcategory: string | null;
    category_id: string | null;
  }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, normalized_merchant, full_label, bank_category, bank_subcategory, amount_cents, category_id")
      .eq("user_id", userId)
      .range(from, from + 999);
    if (error) throw new Error(`Error reading transactions: ${error.message}`);
    rows.push(...(data ?? []).map((row) => ({
      id: row.id,
      text: normalizeMerchant([row.normalized_merchant, row.full_label, row.bank_category, row.bank_subcategory].filter(Boolean).join(" ")),
      amount_cents: Number(row.amount_cents),
      bank_category: row.bank_category,
      bank_subcategory: row.bank_subcategory,
      category_id: row.category_id,
    })));
    if (!data || data.length < 1000) break;
  }

  const wanted = new Map<string, { parent: string; child: string | null }>();
  for (const row of rows) {
    const parent = usableBankCategory(row.bank_category);
    if (!parent) continue;
    const child = usableBankCategory(row.bank_subcategory);
    wanted.set(`${parent}\n${child ?? ""}`, { parent, child });
  }

  const existing = await getCategories(userId);
  const parents = new Map(existing.filter((category) => !category.parent_id).map((category) => [bankMatchKey(category), category]));
  const children = new Map(
    existing.filter((category) => category.parent_id).map((category) => [`${category.parent_id}|${bankMatchKey(category)}`, category])
  );

  for (const item of wanted.values()) {
    let parent = parents.get(item.parent.toLowerCase());
    if (!parent) {
      try {
        parent = await createBankCategory({ user_id: userId, name: item.parent, color: bankColor(item.parent) });
      } catch (error) {
        if (error instanceof Error && /parent_id|column/i.test(error.message)) {
          throw new Error("Run supabase/migrations/bank_category_hierarchy.sql in the Supabase SQL editor, then reload.");
        }
        throw error;
      }
      parents.set(bankMatchKey(parent), parent);
    }
    if (!item.child || !parent?.id) continue;
    const key = `${parent.id}|${item.child.toLowerCase()}`;
    if (children.has(key)) continue;
    try {
      const created = await createBankCategory({
        user_id: userId,
        name: item.child,
        color: parent.color,
        parent_id: parent.id,
      });
      children.set(key, created);
    } catch (error) {
      if (error instanceof Error && /parent_id|column/i.test(error.message)) {
        throw new Error("Run supabase/migrations/bank_category_hierarchy.sql in the Supabase SQL editor, then reload.");
      }
      if (!(error instanceof Error) || !/duplicate|unique/i.test(error.message)) throw error;
    }
  }

  const groups = new Map<string, string[]>();
  for (const row of rows) {
    const keyword = matchingUserRule(row.text, row.amount_cents, rules);
    if (keyword && keyword.priority >= 100) continue;
    const parentName = usableBankCategory(row.bank_category);
    if (!parentName) continue;
    const parent = parents.get(parentName.toLowerCase());
    if (!parent?.id) continue;
    const childName = usableBankCategory(row.bank_subcategory);
    const child = childName ? children.get(`${parent.id}|${childName.toLowerCase()}`) : null;
    const target = child?.id ?? parent.id;
    if (target === row.category_id) continue;
    const ids = groups.get(target) ?? [];
    ids.push(row.id);
    groups.set(target, ids);
  }

  let updated = 0;
  for (const [categoryId, ids] of groups) {
    for (let index = 0; index < ids.length; index += 80) {
      const slice = ids.slice(index, index + 80);
      const { error } = await supabase
        .from("transactions")
        .update({ category_id: categoryId, needs_review: false })
        .eq("user_id", userId)
        .in("id", slice);
      if (error) throw new Error(`Error applying bank categories: ${error.message}`);
      updated += slice.length;
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
  if (current && Date.now() - current.at < SYNC_TTL_MS) {
    await ensureDefaultKeywords(userId);
    const keywords = await applyKeywordRules(userId);
    return keywords + await applyBankCategories(userId);
  }
  const pending = (async () => {
    await ensureDefaultKeywords(userId);
    await repairKeywordRules(userId);
    const keywords = await applyKeywordRules(userId);
    return keywords + await applyBankCategories(userId);
  })();
  transactionSync.set(userId, { at: current?.at ?? 0, pending });
  try {
    return await pending;
  } finally {
    const latest = transactionSync.get(userId);
    if (latest?.pending === pending) transactionSync.set(userId, { at: Date.now() });
  }
}

export async function countUncategorizedTransactions(userId: string) {
  ensureSupabaseConfigured();
  const { count, error } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("category_id", null);
  if (error) throw new Error(`Error counting uncategorized transactions: ${error.message}`);
  return count ?? 0;
}

export async function getTransactions(
  userId: string,
  filters: { month?: string; categoryId?: string; start?: string; end?: string; uncategorized?: boolean }
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

    if (filters.uncategorized) {
      query = query.is("category_id", null);
    } else if (filters.categoryId) {
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
  categoryId: string | null,
  keyword?: string | null,
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

  const sameIds = sameDisplayedMerchantIds(await transactionLabels(userId), transactionId);
  let updated = 1;
  const others = sameIds.filter((id) => id !== transactionId);
  for (let index = 0; index < others.length; index += 80) {
    const ids = others.slice(index, index + 80);
    const { error: sameError } = await supabase
      .from("transactions")
      .update({ category_id: categoryId, needs_review: false })
      .eq("user_id", userId)
      .in("id", ids);
    if (sameError) throw new Error(`Error updating transaction: ${sameError.message}`);
    updated += ids.length;
  }

  if (!categoryId || keyword === null) return { pattern: null, updated };
  const { data } = await supabase
    .from("transactions")
    .select("full_label, normalized_merchant")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .single();
  const label = `${data?.normalized_merchant ?? ""} ${data?.full_label ?? ""}`;
  const pattern = keyword ? normalizeMerchant(keyword) : merchantKeyword(label);
  if (pattern.length < 3 || (keyword && !normalizeMerchant(label).includes(pattern))) return { pattern: null, updated };
  await rememberKeyword(userId, pattern, categoryId);
  await applyKeywordRules(userId);
  transactionSync.set(userId, { at: Date.now() });
  return { pattern, updated };
}

async function transactionLabels(userId: string) {
  const rows: { id: string; fullLabel: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, full_label")
      .eq("user_id", userId)
      .range(from, from + 999);
    if (error) throw new Error(`Error reading transactions: ${error.message}`);
    rows.push(...(data ?? []).map((row) => ({ id: row.id, fullLabel: row.full_label ?? "" })));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export async function saveKeywordRule(
  userId: string,
  keyword: string,
  categoryName: string,
  amountCents: number | null = null
) {
  const pattern = normalizeMerchant(keyword);
  if (pattern.length < 3) {
    throw new Error("Use a keyword of at least 3 letters.");
  }
  const categories = await ensureCategoryIds(userId, [categoryName]);
  const category = categories.get(categoryName.trim().toLowerCase());
  if (!category) throw new Error("Could not save this category.");

  ensureSupabaseConfigured();
  await rememberKeyword(userId, pattern, category.id, null, amountCents);
  await applyKeywordRules(userId);
  transactionSync.set(userId, { at: Date.now() });
  return pattern;
}

export async function deleteKeywordRule(userId: string, pattern: string, amountCents: number | null = null) {
  ensureSupabaseConfigured();
  let query = supabase
    .from("categorization_rules")
    .delete()
    .eq("user_id", userId)
    .eq("pattern", pattern);
  query = amountCents == null ? query.is("amount_cents", null) : query.eq("amount_cents", amountCents);
  const { error } = await query;
  if (error) throw new Error(`Error deleting keyword: ${error.message}`);
  invalidateTransactionSync(userId);
}
