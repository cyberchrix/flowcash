export type PeriodUnit = "day" | "week" | "month" | "year";

export type DateRange = { start: string; end: string };

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatISODate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isLeapYear(year: number): boolean {
  return daysInMonth(year, 2) === 29;
}

export function inclusiveDays(start: string, end: string): number {
  const ms = parseISODate(end).getTime() - parseISODate(start).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function monthRange(year: number, month: number): DateRange {
  return {
    start: monthKey(year, month),
    end: formatISODate(new Date(Date.UTC(year, month - 1, daysInMonth(year, month)))),
  };
}

export function shiftDate(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return formatISODate(date);
}

export function weekRange(anchor: string, weekStartsOn = 1): DateRange {
  const date = parseISODate(anchor);
  const day = date.getUTCDay();
  const offset = (day - weekStartsOn + 7) % 7;
  const start = shiftDate(anchor, -offset);
  return { start, end: shiftDate(start, 6) };
}

export function yearRange(year: number): DateRange {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function rangeFor(unit: PeriodUnit, anchor: string, weekStartsOn = 1): DateRange {
  const date = parseISODate(anchor);
  if (unit === "day") return { start: anchor, end: anchor };
  if (unit === "week") return weekRange(anchor, weekStartsOn);
  if (unit === "year") return yearRange(date.getUTCFullYear());
  return monthRange(date.getUTCFullYear(), date.getUTCMonth() + 1);
}

export function shiftAnchor(unit: PeriodUnit, anchor: string, delta: number, weekStartsOn = 1): string {
  const date = parseISODate(anchor);
  if (unit === "day") return shiftDate(anchor, delta);
  if (unit === "week") return shiftDate(anchor, delta * 7);
  if (unit === "year") return formatISODate(new Date(Date.UTC(date.getUTCFullYear() + delta, date.getUTCMonth(), 1)));
  return formatISODate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1)));
}

export function overlaps(a: DateRange, b: DateRange): DateRange | null {
  const start = a.start > b.start ? a.start : b.start;
  const end = a.end < b.end ? a.end : b.end;
  if (start > end) return null;
  return { start, end };
}

export function monthsTouched(range: DateRange): string[] {
  const keys: string[] = [];
  let cursor = parseISODate(range.start);
  const end = parseISODate(range.end);
  cursor.setUTCDate(1);
  while (cursor <= end) {
    keys.push(formatISODate(cursor));
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  return keys;
}

export function formatPeriodLabel(unit: PeriodUnit, anchor: string, weekStartsOn = 1): string {
  const range = rangeFor(unit, anchor, weekStartsOn);
  const start = parseISODate(range.start);
  const month = start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  if (unit === "month") return month;
  if (unit === "year") return String(start.getUTCFullYear());
  if (unit === "day") {
    return start.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  }
  const end = parseISODate(range.end);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const startLabel = start.toLocaleDateString("en-US", { day: "numeric", month: sameMonth ? undefined : "short", timeZone: "UTC" });
  const endLabel = end.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return `${startLabel} – ${endLabel}`;
}
