import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { acceptedSuggestions, inferCategory, labelForModel } from "@/lib/transactions/suggestCategory";

async function askModel(merchants: string[], categoryNames: string[]) {
  const key = process.env.OPENAI_API_KEY;
  if (!key || merchants.length === 0) return [];
  const response = await fetch(process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "No keyword matched these bank labels. Choose a category that already exists in the list. Return JSON {\"items\":[{\"index\":0,\"category\":\"exact category name\",\"keyword\":\"distinctive word copied from the label\"}]}. Include every index. Never invent a category.",
        },
        {
          role: "user",
          content: JSON.stringify({
            categories: categoryNames,
            labels: merchants.map((label, index) => ({ index, label })),
          }),
        },
      ],
    }),
  });
  if (!response.ok) {
    console.error("Category model failed", response.status);
    return [];
  }
  const body = await response.json();
  try {
    return acceptedSuggestions(JSON.parse(body.choices?.[0]?.message?.content ?? "{}"), merchants, categoryNames);
  } catch {
    return [];
  }
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch {}
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: "", ...options });
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data: categories, error: categoryError } = await supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", user.id);
    if (categoryError) return NextResponse.json({ error: categoryError.message }, { status: 500 });

    const names = (categories ?? []).map((category) => category.name);
    const categoryIdFor = new Map((categories ?? []).map((category) => [category.name.toLowerCase(), category.id]));
    const { data: rows, error } = await supabase
      .from("transactions")
      .select("id, normalized_merchant, full_label")
      .eq("user_id", user.id)
      .is("category_id", null)
      .limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const unresolved = new Map<string, string[]>();
    let updated = 0;
    for (const row of rows ?? []) {
      const inferred = inferCategory(`${row.normalized_merchant} ${row.full_label}`, names);
      const categoryId = inferred ? categoryIdFor.get(inferred.categoryName.toLowerCase()) : undefined;
      if (inferred && categoryId) {
        await supabase.from("categorization_rules").insert({
          user_id: user.id,
          pattern: inferred.keyword,
          category_id: categoryId,
          needs_review: false,
          priority: 40,
        });
        const { error: updateError } = await supabase
          .from("transactions")
          .update({ category_id: categoryId, needs_review: false })
          .eq("id", row.id)
          .eq("user_id", user.id);
        if (!updateError) updated += 1;
        continue;
      }
      const label = labelForModel(`${row.normalized_merchant} ${row.full_label}`);
      const ids = unresolved.get(label) ?? [];
      ids.push(row.id);
      unresolved.set(label, ids);
    }

    const merchants = [...unresolved.keys()].slice(0, 40);
    const suggestions = await askModel(merchants, names);
    for (const suggestion of suggestions) {
      const categoryId = categoryIdFor.get(suggestion.categoryName.toLowerCase());
      const ids = unresolved.get(suggestion.merchant) ?? [];
      if (!categoryId || ids.length === 0) continue;
      await supabase.from("categorization_rules").insert({
        user_id: user.id,
        pattern: suggestion.keyword,
        category_id: categoryId,
        needs_review: true,
        priority: 40,
      });
      const { error: updateError } = await supabase
        .from("transactions")
        .update({ category_id: categoryId, needs_review: true })
        .eq("user_id", user.id)
        .in("id", ids);
      if (!updateError) updated += ids.length;
    }

    return NextResponse.json({ updated, model: Boolean(process.env.OPENAI_API_KEY) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
