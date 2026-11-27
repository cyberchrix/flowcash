import { DEFAULT_KEYWORDS } from "./defaultKeywords";
import { normalizeMerchant } from "./normalize";

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

function containsTerm(text: string, term: string) {
  const needle = normalizeMerchant(term);
  if (!needle) return false;
  if (needle.includes(" ")) return text.includes(needle);
  return ` ${text} `.includes(` ${needle} `);
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
  return normalized === "SALARY" || normalized === "SALAIRE" || normalized === "INCOME" || normalized === "REVENU" || normalized === "REVENUS" || normalized === "REVENUS DU TRAVAIL";
}

export function isPaymentToken(word: string): boolean {
  const token = normalizeMerchant(word);
  if (!token) return false;
  if (/^[A-Z]\d{3,}$/.test(token)) return true;
  const digits = token.replace(/\D/g, "").length;
  return digits >= 4 && digits / token.length >= 0.5;
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

function emittedTransfer(words: string[]): string | null {
  const start = words.findIndex(
    (word, index) => word === "VIR" && words[index + 1] === "INSTANTANE" && words[index + 2] === "EMIS"
  );
  if (start < 0) return null;
  const after = words.slice(start + 3);
  const pour = after.indexOf("POUR");
  const source = pour >= 0 ? after.slice(pour + 1) : after;
  const stop = source.findIndex(
    (word) => word === "REF" || word === "MOTIF" || word === "ID" || /^\d+$/.test(word) || isPaymentToken(word)
  );
  const name = (stop < 0 ? source : source.slice(0, stop)).filter(
    (word) => word !== "LOGITEL" && word !== "WERO" && word !== "POUR"
  );
  return name.length > 0 ? `Vir. émis ${titleCase(name.join(" "))}` : "Vir. émis";
}

export function displayMerchant(label: string): string {
  const words = normalizeMerchant(label).split(" ").filter(Boolean);
  const creditor = sepaCreditor(words);
  if (creditor) return titleCase(creditor);
  const emitted = emittedTransfer(words);
  if (emitted) return emitted;
  const kept = words.filter((word) => !DISPLAY_NOISE.has(word) && !isPaymentToken(word) && !/^\d+$/.test(word));
  if (kept.length === 0) return "Card payment";
  return titleCase(kept.join(" "));
}

export function merchantKeyword(label: string): string {
  const normalized = labelForModel(label);
  const brands = DEFAULT_KEYWORDS
    .map((keyword) => normalizeMerchant(keyword.pattern))
    .filter((term) => term && containsTerm(normalized, term))
    .sort((left, right) => right.length - left.length);
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
