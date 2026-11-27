import { normalizeMerchant } from "./normalize";

type Concept = {
  terms: string[];
  aliases: string[];
};

const CONCEPTS: Concept[] = [
  {
    terms: ["KINGFISHER"],
    aliases: ["SALARY", "SALAIRE"],
  },
  {
    terms: ["AUCHAN", "CARREFOUR", "LECLERC", "LIDL", "ALDI", "INTERMARCHE", "COLRUYT", "MONOPRIX", "FRANPRIX", "PICARD", "BIOCOOP", "CORA", "CASINO", "SUPER U"],
    aliases: ["GROCERIES", "GROCERY", "COURSES", "ALIMENTATION", "SUPERMARCHE", "SUPERMARKET"],
  },
  {
    terms: ["MCDONALD", "MCDONALDS", "BURGER KING", "QUICK", "KFC", "SUBWAY", "PIZZA", "RESTAURANT", "BRASSERIE", "UBER EATS", "DELIVEROO", "JUST EAT", "SUSHI", "KEBAB", "AU BUREAU", "OTACOS", "FRITERIE", "NEWREST", "EXKI", "STARBUCKS", "FLUNCH", "PITAYA", "PANOS", "DOMINOS"],
    aliases: ["RESTAURANTS", "RESTAURANT", "RESTAURATION"],
  },
  {
    terms: ["TOTAL", "SHELL", "Q8", "ESSO", "TEXACO", "CARBURANT", "ESSENCE", "DIESEL"],
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

const GENERIC_WORDS = new Set([
  "CARBURANT", "ESSENCE", "DIESEL", "GASOIL", "GAZOLE", "STATION", "ACCESS",
  "FACTURE", "PRELEVEMENT", "PRLV", "VIREMENT", "PAIEMENT", "ACHAT", "CARTE",
  "RETRAIT", "RETRAI", "CHEQUE", "FRAIS", "HORS", "ZONE", "EURO", "EUROPE",
  "EUROPEEN", "INSTANT", "INSTANTANE", "RECU", "COTIS", "COTISATION", "VIR",
  "SUMUP", "PAYPAL", "STRIPE", "ZETTLE", "MOUSCRON", "MOUSCON", "LUINGNE",
  "BELGIQUE", "FRANCE", "COMMERCE", "ELECTRONIQUE",
]);

export function isIncomeCategory(name: string) {
  const normalized = normalizeMerchant(name);
  return normalized === "SALARY" || normalized === "SALAIRE" || normalized === "INCOME" || normalized === "REVENU" || normalized === "REVENUS";
}

export function isRestaurantCategory(name: string) {
  const normalized = normalizeMerchant(name);
  return normalized === "RESTAURANT" || normalized === "RESTAURANTS" || normalized === "RESTAURATION";
}

export function hasRestaurantSignal(label: string) {
  const normalized = normalizeMerchant(label);
  const concept = CONCEPTS.find((item) => item.aliases.includes("RESTAURANTS"));
  return concept?.terms.some((term) => containsTerm(normalized, term)) ?? false;
}

export function isPaymentToken(word: string): boolean {
  const token = normalizeMerchant(word);
  if (!token) return false;
  if (/^[A-Z]\d{3,}$/.test(token)) return true;
  const digits = token.replace(/\D/g, "").length;
  return digits >= 4 && digits / token.length >= 0.5;
}

export function knownTermExpectation(
  term: string,
  categoryNames: string[]
): { known: boolean; categoryName: string | null } {
  const normalized = normalizeMerchant(term);
  const concept = CONCEPTS.find((item) =>
    item.terms.some((candidate) => {
      const needle = normalizeMerchant(candidate);
      return needle === normalized || (needle.includes(" ") && normalized.includes(needle));
    })
  );
  if (!concept) return { known: false, categoryName: null };
  return { known: true, categoryName: pickCategory(concept.aliases, categoryNames) };
}

function keywordWord(word: string): boolean {
  return word.length >= 4 && !GENERIC_WORDS.has(word) && !isPaymentToken(word) && !/^\d+$/.test(word);
}

const DISPLAY_NOISE = new Set(["CARTE", "CB", "PAIEMENT", "ACHAT", "EUR", "EURO", "BELGIQUE", "FRANCE"]);
const LEGAL_WORDS = new Set(["SA", "SAS", "SARL", "SCA", "SCS", "EURL", "CIE", "ET", "EUROPE"]);

function titleCase(value: string) {
  return value.toLowerCase().replace(/(^|\s)\p{L}/gu, (letter) => letter.toUpperCase());
}

function sepaCreditor(words: string[]): string | null {
  if (words[0] !== "PRELEVEMENT" && words[0] !== "PRLV") return null;
  if (!words.includes("EUROPEEN")) return null;
  const start = words.indexOf("DE");
  if (start < 0) return null;
  const end = words.findIndex((word, index) => index > start && (word === "ID" || word === "MOTIF"));
  const slice = words.slice(start + 1, end < 0 ? words.length : end);
  const creditor: string[] = [];
  for (let index = 0; index < slice.length; index += 1) {
    const word = slice[index];
    if (word.length > 1) {
      if (!LEGAL_WORDS.has(word)) creditor.push(word);
      continue;
    }
    const run = slice.slice(index).findIndex((part) => part.length > 1);
    const singles = run < 0 ? slice.length - index : run;
    if (singles >= 2) {
      index += singles - 1;
      continue;
    }
    if (creditor.length > 0 && creditor[creditor.length - 1].length >= 6) {
      creditor[creditor.length - 1] += word;
    }
  }
  while (creditor.length > 1 && creditor[creditor.length - 2].startsWith(creditor[creditor.length - 1])) creditor.pop();
  const lender = creditor.find((word) => word.startsWith("FRANFINANC"));
  if (lender) {
    const product = creditor.find((word) => word === "EXPRESSO" || word === "ALTERNA");
    return ["FRANFINANCE", ...(product ? [product] : [])].join(" ");
  }
  return creditor.length > 0 ? creditor.join(" ") : null;
}

export function displayMerchant(label: string): string {
  const words = normalizeMerchant(label).split(" ").filter(Boolean);
  const creditor = sepaCreditor(words);
  if (creditor) return titleCase(creditor);
  const kept = words.filter((word) => !DISPLAY_NOISE.has(word) && !isPaymentToken(word) && !/^\d+$/.test(word));
  if (kept.length === 0) return "Card payment";
  return titleCase(kept.join(" "));
}

export function merchantKeyword(label: string): string {
  const normalized = labelForModel(label);
  const brands = CONCEPTS.flatMap((concept) => concept.terms)
    .map((term) => normalizeMerchant(term))
    .filter((term) => term && containsTerm(normalized, term))
    .sort((a, b) => b.length - a.length);
  if (brands[0]) return brands[0];
  return normalized.split(" ").find(keywordWord) ?? "";
}

export function labelForModel(merchant: string) {
  return normalizeMerchant(merchant).replace(/\b\d{4,}\b/g, " ").replace(/\s+/g, " ").trim();
}

function keywordFromLabel(label: string, preferred?: string) {
  const normalized = labelForModel(label);
  const choice = preferred ? normalizeMerchant(preferred) : "";
  if (choice.length >= 3 && !isPaymentToken(choice) && normalized.includes(choice)) return choice;
  return normalized.split(" ").filter(keywordWord).sort((a, b) => b.length - a.length)[0] ?? "";
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
