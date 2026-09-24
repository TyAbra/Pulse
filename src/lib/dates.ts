export type LocalDate = string; // "YYYY-MM-DD", floating local time

export function toUTCDate(d: LocalDate): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

export function fromUTCDate(d: Date): LocalDate {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d: LocalDate, n: number): LocalDate {
  const dt = toUTCDate(d);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromUTCDate(dt);
}

export function addMonths(d: LocalDate, n: number): LocalDate {
  const [y, m, day] = d.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return fromUTCDate(target);
}

export function compare(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function monthKey(d: LocalDate): string {
  return d.slice(0, 7); // "YYYY-MM"
}

export function daysInMonth(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function todayLocal(): LocalDate {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function ymd(y: number, m: number, d: number): LocalDate | null {
  // A garbled OCR year ("20246") lands outside this range and is rejected, which
  // sends the row back to the batch date rather than inventing a wrong one.
  if (y < 2000 || y > 2099 || m < 1 || m > 12 || d < 1) return null;
  if (d > daysInMonth(`${y}-${String(m).padStart(2, "0")}`)) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Accepts 2026-09-22, 9/22, 9/22/26, 9/22/2026, "Sep 22" and "September 22, 2026". */
export function parseLooseDate(raw: string, fallbackYear: number): LocalDate | null {
  const s = raw.trim();
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return ymd(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/))) {
    const y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : fallbackYear;
    return ymd(y, +m[1], +m[2]);
  }
  if ((m = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:,?\s*(\d{4}))?$/))) {
    const idx = MONTH_NAMES.indexOf(m[1].slice(0, 3).toLowerCase());
    return idx < 0 ? null : ymd(m[3] ? +m[3] : fallbackYear, idx + 1, +m[2]);
  }
  return null;
}

/** A date found inside a longer line, with the exact text it matched. */
export interface FoundDate { date: LocalDate; match: string; }

// Ordered most specific first. Each is tried at every position, because an early
// false positive ("Uber 22" looks like "Sep 22") must not stop the search.
const DATE_PATTERNS = [
  /\d{4}-\d{1,2}-\d{1,2}(?!\d)/g,
  /[A-Za-z]{3,9}\.?\s+\d{1,2},?\s*\d{4}(?!\d)/g,
  /(?<!\d)\d{1,2}\/\d{1,2}\/\d{2,4}(?!\d)/g,
  /(?<!\d)\d{1,2}\/\d{1,2}(?!\d|\/)/g,
  /[A-Za-z]{3,9}\.?\s+\d{1,2}(?!\d)/g,
];

/** Pulls the first real date out of a line, e.g. "Checking - 6628 September 23, 2026". */
export function findDateMatch(line: string, fallbackYear: number): FoundDate | null {
  for (const re of DATE_PATTERNS) {
    for (const m of line.matchAll(re)) {
      const date = parseLooseDate(m[0], fallbackYear);
      if (date) return { date, match: m[0] };
    }
  }
  return null;
}

export function findDate(line: string, fallbackYear: number): LocalDate | null {
  return findDateMatch(line, fallbackYear)?.date ?? null;
}
