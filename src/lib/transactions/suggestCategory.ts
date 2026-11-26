import { normalizeMerchant } from "./normalize";

type Concept = {
  terms: string[];
  aliases: string[];
};

const CONCEPTS: Concept[] = [
  {
    terms: ["AUCHAN", "CARREFOUR", "LECLERC", "LIDL", "ALDI", "INTERMARCHE", "COLRUYT", "MONOPRIX", "FRANPRIX", "PICARD", "BIOCOOP", "CORA", "CASINO", "SUPER U"],
    aliases: ["GROCERIES", "GROCERY", "COURSES", "ALIMENTATION", "SUPERMARCHE", "SUPERMARKET"],
  },
  {
    terms: ["MCDONALD", "BURGER KING", "QUICK", "KFC", "SUBWAY", "PIZZA", "RESTAURANT", "BRASSERIE", "UBER EATS", "DELIVEROO", "JUST EAT", "SUSHI", "KEBAB", "AU BUREAU"],
    aliases: ["RESTAURANTS", "RESTAURANT", "RESTAURATION"],
  },
  {
    terms: ["TOTAL", "SHELL", "Q8", "ESSO", "CARBURANT", "ESSENCE", "DIESEL"],
    aliases: ["FUEL", "CARBURANT", "ESSENCE"],
  },
  {
    terms: ["SNCF", "RATP", "NAVIGO", "UBER", "BOLT", "TAXI", "PARKING", "AUTOROUTE"],
    aliases: ["TRANSPORT", "TRANSPORTS", "MOBILITY"],
  },
  {
    terms: ["LOYER", "EDF", "ENGIE", "VEOLIA", "ELECTRICITE"],
    aliases: ["HOUSING", "LOGEMENT", "MAISON", "HOME"],
  },
  {
    terms: ["NETFLIX", "SPOTIFY", "DISNEY", "CANAL PLUS", "ORANGE", "SFR", "BOUYGUES", "YOUTUBE"],
    aliases: ["SUBSCRIPTIONS", "SUBSCRIPTION", "ABONNEMENTS", "ABONNEMENT"],
  },
  {
    terms: ["PHARMACIE", "DOCTOLIB", "MEDECIN", "HOPITAL"],
    aliases: ["HEALTH", "SANTE", "SANTE"],
  },
  {
    terms: ["AMAZON", "DECATHLON", "FNAC", "DARTY", "IKEA", "ZARA"],
    aliases: ["SHOPPING", "ACHATS", "MAGASINS"],
  },
  {
    terms: ["VIREMENT", "VIR"],
    aliases: ["TRANSFERS", "TRANSFER", "VIREMENTS", "VIREMENT"],
  },
];

function resolveCategory(raw: string, categoryNames: string[]): string | null {
  const needle = normalizeMerchant(raw);
  if (!needle) return null;
  const exact = categoryNames.filter((name) => normalizeMerchant(name) === needle);
  if (exact.length === 1) return exact[0];
  if (needle.length < 4) return null;
  const partial = categoryNames.filter((name) => {
    const normalized = normalizeMerchant(name);
    return normalized.includes(needle) || needle.includes(normalized);
  });
  return partial.length === 1 ? partial[0] : null;
}

function same(left: string, right: string) {
  return normalizeMerchant(left) === normalizeMerchant(right);
}

function pickCategory(aliases: string[], categoryNames: string[]): string | null {
  const exact = categoryNames.filter((name) => aliases.some((alias) => same(name, alias)));
  if (exact.length >= 1) {
    return [...exact].sort((a, b) => normalizeMerchant(b).length - normalizeMerchant(a).length)[0];
  }
  const partial = categoryNames.filter((name) =>
    aliases.some((alias) => {
      const normalized = normalizeMerchant(name);
      const needle = normalizeMerchant(alias);
      return needle.length >= 4 && normalized.includes(needle);
    })
  );
  return partial.length === 1 ? partial[0] : null;
}

function containsTerm(text: string, term: string) {
  const needle = normalizeMerchant(term);
  if (!needle) return false;
  if (needle.includes(" ")) return text.includes(needle);
  return ` ${text} `.includes(` ${needle} `);
}

export function inferCategory(
  merchant: string,
  categoryNames: string[]
): { categoryName: string; keyword: string } | null {
  const normalized = normalizeMerchant(merchant);
  if (!normalized) return null;
  const hits = CONCEPTS.flatMap((concept) => {
    const keyword = concept.terms
      .filter((term) => containsTerm(normalized, term))
      .sort((a, b) => normalizeMerchant(b).length - normalizeMerchant(a).length)[0];
    if (!keyword) return [];
    const categoryName = pickCategory(concept.aliases, categoryNames);
    return categoryName ? [{ categoryName, keyword: normalizeMerchant(keyword) }] : [];
  }).sort((a, b) => b.keyword.length - a.keyword.length);
  if (hits.length === 0) return null;
  const best = hits[0];
  if (hits.some((hit) => hit.keyword.length === best.keyword.length && hit.categoryName !== best.categoryName)) return null;
  return best;
}

export function labelForModel(merchant: string) {
  return normalizeMerchant(merchant).replace(/\b\d{4,}\b/g, " ").replace(/\s+/g, " ").trim();
}

function keywordFromLabel(label: string, preferred?: string) {
  const normalized = labelForModel(label);
  const choice = preferred ? normalizeMerchant(preferred) : "";
  if (choice.length >= 3 && normalized.includes(choice)) return choice;
  return normalized
    .split(" ")
    .filter((word) => word.length >= 4 && !/^\d+$/.test(word))
    .sort((a, b) => b.length - a.length)[0] ?? "";
}

export function acceptedSuggestions(
  payload: unknown,
  merchants: string[],
  categoryNames: string[]
): { merchant: string; categoryName: string; keyword: string }[] {
  const record = payload && typeof payload === "object" ? payload as { items?: unknown } : null;
  const items = Array.isArray(payload) ? payload : record?.items;
  if (!Array.isArray(items)) return [];
  const suggestions = [];
  const used = new Set<string>();
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as { index?: unknown; merchant?: unknown; category?: unknown; keyword?: unknown };
    if (typeof row.category !== "string") continue;
    const categoryName = resolveCategory(row.category, categoryNames);
    if (!categoryName) continue;
    const indexed = typeof row.index === "number" ? merchants[row.index] : undefined;
    const echoed = typeof row.merchant === "string" ? labelForModel(row.merchant) : "";
    const matches = indexed
      ? [indexed]
      : merchants.filter((merchant) => {
          const label = labelForModel(merchant);
          return echoed && (label === echoed || label.includes(echoed) || echoed.includes(label));
        });
    for (const merchant of matches) {
      if (used.has(merchant)) continue;
      const keyword = keywordFromLabel(merchant, typeof row.keyword === "string" ? row.keyword : undefined);
      if (!keyword) continue;
      used.add(merchant);
      suggestions.push({ merchant, categoryName, keyword });
    }
  }
  return suggestions;
}
