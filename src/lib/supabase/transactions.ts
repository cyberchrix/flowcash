import { supabase, ensureSupabaseConfigured } from "../supabase";
import { Database } from "@/types/database";
import { createCategory, getCategories } from "./categories";
import { normalizeMerchant } from "@/lib/transactions/normalize";
import { TransactionKind } from "@/lib/transactions/types";

type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];

export type TransactionListItem = Database["public"]["Tables"]["transactions"]["Row"] & {
  categories: { name: string; color: string } | null;
};

const CATEGORY_COLORS: Record<string, string> = {
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
    .select("pattern, amount_cents, kind, needs_review, priority, categories(name)")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Error fetching categorization rules: ${error.message}`);
  }

  return (data ?? []).map((rule) => {
    const category = rule.categories as { name: string } | { name: string }[] | null;
    const categoryName = Array.isArray(category) ? category[0]?.name : category?.name;
    return {
      pattern: rule.pattern as string,
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
  const { data, error } = await supabase
    .from("transactions")
    .select("fingerprint")
    .eq("user_id", userId)
    .in("fingerprint", unique);

  if (error) {
    throw new Error(`Error checking duplicates: ${error.message}`);
  }

  for (const row of data ?? []) {
    const key = row.fingerprint as string;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export async function saveBankImport(
  userId: string,
  filename: string,
  rows: SavedTransactionInput[]
) {
  ensureSupabaseConfigured();
  const imported = rows.filter((row) => !row.duplicate);
  const duplicateCount = rows.length - imported.length;
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

    const { error } = await supabase.from("transactions").insert(payload);
    if (error) {
      throw new Error(`Error saving transactions: ${error.message}`);
    }
  }

  const corrections = imported.filter(
    (row) =>
      row.categoryName &&
      row.categoryName !== row.suggestedCategoryName &&
      row.normalizedMerchant.length >= 3
  );
  for (const row of corrections) {
    const categoryId = categoryIdFor(row.categoryName);
    if (!categoryId) continue;
    const { error } = await supabase.from("categorization_rules").upsert(
      {
        user_id: userId,
        pattern: row.normalizedMerchant,
        category_id: categoryId,
        kind: row.kind,
        needs_review: false,
        priority: 100,
      },
      { onConflict: "user_id,pattern" }
    );
    if (error) {
      throw new Error(`Error saving categorization rule: ${error.message}`);
    }
  }

  return {
    importedCount: imported.length,
    duplicateCount,
  };
}

export async function getTransactions(
  userId: string,
  filters: { month?: string; categoryId?: string; start?: string; end?: string }
) {
  ensureSupabaseConfigured();
  let query = supabase
    .from("transactions")
    .select("*, categories(name, color)")
    .eq("user_id", userId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

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

  return (data ?? []) as TransactionListItem[];
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
      priority: 100,
    },
    { onConflict: "user_id,pattern" }
  );
  if (error) throw new Error(`Error saving keyword: ${error.message}`);
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
}
