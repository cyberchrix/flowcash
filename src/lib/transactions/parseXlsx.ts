import { strFromU8, unzipSync } from "fflate";
import { parseBankTable, type CsvParseResult } from "./parseCsv";

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

export function excelSerialToFrenchDate(serial: number): string {
  const date = new Date(EXCEL_EPOCH + Math.floor(serial) * 86_400_000);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

function sharedStrings(xml: string): string[] {
  const values: string[] = [];
  for (const item of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const texts = [...item[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1]));
    values.push(texts.join(""));
  }
  return values;
}

function columnIndex(ref: string): number {
  const letters = ref.replace(/[^A-Z]/gi, "").toUpperCase();
  let index = 0;
  for (const char of letters) index = index * 26 + char.charCodeAt(0) - 64;
  return index - 1;
}

function sheetGrid(xml: string, strings: string[]): string[][] {
  const rows = new Map<number, string[]>();
  for (const cell of xml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
    const ref = cell[1].match(/\br="([A-Z]+\d+)"/i)?.[1];
    if (!ref) continue;
    const type = cell[1].match(/\bt="([^"]+)"/)?.[1];
    const raw = cell[2].match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? "";
    const inline = [...cell[2].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1])).join("");
    const value = type === "s" ? strings[Number(raw)] ?? "" : type === "inlineStr" ? inline : decodeXml(raw);
    const rowNumber = Number(ref.replace(/\D/g, "")) - 1;
    const row = rows.get(rowNumber) ?? [];
    row[columnIndex(ref)] = value;
    rows.set(rowNumber, row);
  }
  const last = Math.max(-1, ...rows.keys());
  return Array.from({ length: last + 1 }, (_, index) => (rows.get(index) ?? []).map((cell) => cell ?? ""));
}

function withExcelDates(records: string[][]): string[][] {
  const header = records.findIndex((row) => row.some((cell) => /date/i.test(cell)));
  if (header < 0) return records;
  const dateColumns = records[header]
    .map((cell, index) => (/date/i.test(cell) ? index : -1))
    .filter((index) => index >= 0);
  const amountColumn = records[header].findIndex((cell) => /montant/i.test(cell));
  return records.map((row, rowIndex) => {
    if (rowIndex === header) return row;
    const next = [...row];
    for (const index of dateColumns) {
      const value = next[index]?.trim() ?? "";
      if (/^\d+(\.\d+)?$/.test(value) && Number(value) > 20000) next[index] = excelSerialToFrenchDate(Number(value));
    }
    if (amountColumn >= 0 && /^-?\d+(\.\d+)?$/.test(next[amountColumn]?.trim() ?? "")) {
      next[amountColumn] = (Math.round(Number(next[amountColumn]) * 100) / 100).toFixed(2);
    }
    return next;
  });
}

export function parseXlsx(bytes: Uint8Array): CsvParseResult {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error("This Excel file could not be read.");
  }
  const sheetName = Object.keys(files).find((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name));
  if (!sheetName) throw new Error("The Excel file has no worksheet.");
  const strings = files["xl/sharedStrings.xml"] ? sharedStrings(strFromU8(files["xl/sharedStrings.xml"])) : [];
  return parseBankTable(withExcelDates(sheetGrid(strFromU8(files[sheetName]), strings)));
}
