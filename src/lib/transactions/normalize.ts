export function normalizeMerchant(label: string): string {
  const withoutAccents = label.normalize("NFD").replace(/\p{M}/gu, "");
  return withoutAccents
    .toUpperCase()
    .replace(/\b(CARTE|CB|PAIEMENT|ACHAT)\b/g, " ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
