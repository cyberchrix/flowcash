import { RawBankRow } from "./types";

const COLUMN_ALIASES = {
  transactionDate: [
    "date de l operation",
    "date de operation",
    "date transaction",
    "date operation",
    "date d operation",
  ],
  bookingDate: ["date comptabilisation", "date de comptabilisation", "date valeur"],
  accountNumber: ["num compte", "numero de compte", "numero compte", "n compte"],
  accountLabel: ["libelle compte", "intitule du compte", "intitule compte"],
  operationLabel: ["libelle operation", "libelle simplifie", "libelle"],
  fullLabel: ["libelle complet", "detail de l ecriture", "communication", "description"],
  bankCategory: ["categorie"],
  bankSubcategory: ["sous categorie"],
  amount: ["montant de l operation", "montant eur", "montant euro", "montant"],
  currency: ["devise", "currency"],
  pointed: ["pointee", "pointe"],
} as const;

type ColumnKey = keyof typeof COLUMN_ALIASES;

export function decodeCsvBytes(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return stripBom(new TextDecoder("utf-16le").decode(bytes));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return stripBom(new TextDecoder("utf-16be").decode(bytes));
  }
  try {
    const utf8 = stripBom(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (utf8.includes("\u0000")) {
      return stripBom(new TextDecoder("utf-16le").decode(bytes));
    }
    return utf8;
  } catch {
    return stripBom(new TextDecoder("windows-1252").decode(bytes));
  }
}

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

export function parseAmountToCents(value: string): number {
  let raw = value.trim().replace(/\u00a0/g, "").replace(/\s/g, "").replace(/(?:eur|€)$/i, "");
  if (!raw) {
    throw new Error("Missing amount");
  }

  let negative = false;
  if (raw.startsWith("-")) {
    negative = true;
    raw = raw.slice(1);
  } else if (raw.startsWith("+")) {
    raw = raw.slice(1);
  }

  if (raw.includes(",")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    throw new Error(`Invalid amount: ${value}`);
  }

  const [whole, fraction = ""] = raw.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return negative ? -cents : cents;
}

export function parseFrenchDate(value: string): string {
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return validatedDate(Number(iso[1]), Number(iso[2]), Number(iso[3]), value);

  const local = trimmed.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{2}|\d{4})$/);
  if (!local) {
    throw new Error(`Invalid date: ${value}`);
  }
  const yearPart = local[3];
  const yearNumber = Number(yearPart);
  const year = yearPart.length === 2 ? (yearNumber >= 70 ? 1900 + yearNumber : 2000 + yearNumber) : yearNumber;
  return validatedDate(year, Number(local[2]), Number(local[1]), value);
}

function validatedDate(year: number, month: number, day: number, source: string): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!valid) {
    throw new Error(`Invalid date: ${source}`);
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parsePointed(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ["oui", "o", "yes", "y", "1", "true", "x"].includes(normalized);
}

export function detectDelimiter(text: string): ";" | "," | "\t" {
  const line =
    text
      .split(/\r?\n/)
      .map((value) => value.trim())
      .find((value) => value && !value.toLowerCase().startsWith("sep=")) ?? "";
  const counts = { ";": 0, ",": 0, "\t": 0 };
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && (char === ";" || char === "," || char === "\t")) {
      counts[char] += 1;
    }
  }
  if (counts[";"] > 0 && counts[";"] >= counts[","] && counts[";"] >= counts["\t"]) return ";";
  if (counts["\t"] > counts[","]) return "\t";
  return counts[","] > 0 ? "," : ";";
}

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findColumns(records: string[][]) {
  const aliases = (Object.entries(COLUMN_ALIASES) as [ColumnKey, readonly string[]][])
    .flatMap(([key, names]) => names.map((alias) => ({ key, alias })))
    .sort((a, b) => b.alias.length - a.alias.length);

  for (let index = 0; index < Math.min(records.length, 8); index++) {
    const cells = records[index].map((cell) => cell.trim());
    if (cells[0]?.toLowerCase().startsWith("sep=")) continue;
    const normalized = cells.map(normalizeHeader);
    const columns = {} as Partial<Record<ColumnKey, number>>;
    const used = new Set<number>();

    for (const { key, alias } of aliases) {
      if (columns[key] != null) continue;
      const found = normalized.findIndex(
        (cell, cellIndex) => !used.has(cellIndex) && cell === alias
      );
      if (found >= 0) {
        columns[key] = found;
        used.add(found);
      }
    }

    if (
      columns.transactionDate != null &&
      columns.amount != null &&
      (columns.fullLabel != null || columns.operationLabel != null)
    ) {
      return { headerIndex: index, columns };
    }
  }

  return null;
}

export function parseCsvRecords(text: string, delimiter = ";"): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) records.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== "")) records.push(row);
  }

  return records;
}

export type CsvParseResult = { rows: RawBankRow[]; skipped: string[] };

export function parseCsv(text: string): CsvParseResult {
  const records = parseCsvRecords(text.replace(/^\uFEFF/, ""), detectDelimiter(text));
  if (records.length === 0) {
    throw new Error("The CSV file is empty.");
  }

  const located = findColumns(records);
  if (!located) {
    const seen = records[0]
      .map((cell) => cell.trim())
      .filter(Boolean)
      .slice(0, 12)
      .join(" | ");
    throw new Error(
      `Unrecognized CSV header. Found: ${seen || "no header row"}. Expected a date column, a label and an amount.`
    );
  }

  const { headerIndex, columns } = located;
  const cell = (record: string[], key: ColumnKey) => {
    const position = columns[key];
    return position == null ? "" : (record[position] ?? "").trim();
  };

  const rows: RawBankRow[] = [];
  const skipped: string[] = [];
  records.slice(headerIndex + 1).forEach((record, index) => {
    if (record.every((value) => value.trim() === "")) return;
    const line = headerIndex + index + 2;
    try {
      const booking = cell(record, "bookingDate");
      const operationLabel = cell(record, "operationLabel");
      const fullLabel = cell(record, "fullLabel") || operationLabel;
      rows.push({
        transactionDate: parseFrenchDate(cell(record, "transactionDate")),
        bookingDate: booking ? parseFrenchDate(booking) : null,
        accountNumber: cell(record, "accountNumber"),
        accountLabel: cell(record, "accountLabel"),
        operationLabel,
        fullLabel,
        bankCategory: cell(record, "bankCategory"),
        bankSubcategory: cell(record, "bankSubcategory"),
        amountCents: parseAmountToCents(cell(record, "amount")),
        currency: (cell(record, "currency") || "EUR").toUpperCase(),
        pointed: parsePointed(cell(record, "pointed")),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid row";
      skipped.push(`Line ${line}: ${message}`);
    }
  });

  if (rows.length === 0) {
    throw new Error(skipped[0] ?? "The CSV file has no transactions.");
  }

  return { rows, skipped };
}
