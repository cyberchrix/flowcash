import { RawBankRow } from "./types";

export type FingerprintInput = Pick<
  RawBankRow,
  "accountNumber" | "transactionDate" | "bookingDate" | "fullLabel" | "amountCents" | "pointed"
>;

export function fingerprint(row: FingerprintInput): string {
  const payload = [
    row.accountNumber.trim(),
    row.transactionDate,
    row.bookingDate ?? "",
    row.fullLabel.trim(),
    String(row.amountCents),
    row.pointed ? "1" : "0",
  ].join("|");

  const hash = (seed: number) => {
    let value = seed;
    for (let i = 0; i < payload.length; i++) {
      value ^= payload.charCodeAt(i);
      value = Math.imul(value, 0x01000193);
    }
    return (value >>> 0).toString(16).padStart(8, "0");
  };

  return hash(0x811c9dc5) + hash(0x811c9dc5 ^ 0x9e3779b9);
}

export type DuplicateMark<T> = T & {
  fingerprint: string;
  occurrence: number;
  duplicate: boolean;
};

// Existing rows occupy occurrences 1..M for a fingerprint.
// The first M rows of a new file are duplicates; further identical rows are kept.
export function markDuplicates<T extends FingerprintInput>(
  rows: T[],
  existingCounts: Map<string, number>
): DuplicateMark<T>[] {
  const seen = new Map<string, number>();

  return rows.map((row) => {
    const key = fingerprint(row);
    const index = seen.get(key) ?? 0;
    seen.set(key, index + 1);
    const existing = existingCounts.get(key) ?? 0;
    return {
      ...row,
      fingerprint: key,
      occurrence: index + 1,
      duplicate: index < existing,
    };
  });
}

export function markSameOperations<T extends { transactionDate: string; amountCents: number; duplicate: boolean }>(
  rows: T[],
  existingCounts: Map<string, number>
): T[] {
  const seen = new Map<string, number>();
  return rows.map((row) => {
    const key = `${row.transactionDate}|${row.amountCents}`;
    const index = seen.get(key) ?? 0;
    seen.set(key, index + 1);
    if (row.duplicate) return row;
    return { ...row, duplicate: index < (existingCounts.get(key) ?? 0) };
  });
}
