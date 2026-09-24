import { findDateMatch, type LocalDate } from "./dates";
import type { Rule, RuleInput } from "./rules";
import { makeRule } from "./rules";

/** One parsed line of a bulk paste: either a usable row or a flagged one. */
export interface BulkRow {
  raw: string;
  name: string;
  amount: number;
  /** Set only when the line carries an explicit sign; otherwise the batch default wins. */
  kind?: "income" | "expense";
  /** Set only when the line carries its own date; otherwise the batch date wins. */
  date?: LocalDate;
  error?: string;
}

// Money anywhere in the line: 84.32, $84.32, 1,129.99
const AMOUNT_RE = /\$?\d[\d,]*(?:\.\d{1,2})?/g;

function toNumber(match: string): number {
  return Number(match.replace(/[$,\s]/g, ""));
}

export function parseBulkLine(raw: string, fallbackYear = new Date().getFullYear()): BulkRow {
  const original = raw.trim();

  // Pull a date out first: its digits would otherwise compete with the amount.
  // Remove exactly the text that parsed as a date, never a lookalike elsewhere
  // on the line — "Uber 22.41 Sep 21, 2026" must lose the date, not "Uber 22".
  const found = findDateMatch(original, fallbackYear);
  const date = found?.date;
  const line = found
    ? (original.slice(0, original.indexOf(found.match)) +
       " " +
       original.slice(original.indexOf(found.match) + found.match.length)).replace(/\s+/g, " ").trim()
    : original;

  const matches = line.match(AMOUNT_RE);
  if (!matches) return { raw, name: line, amount: 0, date, error: "No amount found" };

  // Prefer the last token with cents. A store number can trail the name
  // ("RAISING CANES 0103 -13.09") or lead it, and taking the plain last number
  // silently turned that line into $103.
  const withCents = matches.filter((m) => m.includes("."));
  const pool = withCents.length ? withCents : matches;
  const match = pool[pool.length - 1];
  const amount = toNumber(match);
  const at = line.lastIndexOf(match);

  // A scanned statement line carries its sign, which is how a deposit mixed into
  // a batch of withdrawals keeps its direction.
  const before = line.slice(0, at).trimEnd();
  const kind = /[-−–]$/.test(before) ? "expense" as const
    : before.endsWith("+") ? "income" as const
    : undefined;

  const name = line
    .slice(0, at)
    .concat(line.slice(at + match.length))
    .replace(/\s+/g, " ")
    .replace(/^[-+–—:,.\s]+|[-+–—:,.\s]+$/g, "");

  if (!(amount > 0)) return { raw, name, amount, kind, date, error: "Amount must be greater than 0" };
  return { raw, name: name || "Withdrawal", amount, kind, date };
}

/** Blank lines are skipped; every other line comes back, flagged if unusable. */
export function parseBulkLines(text: string, fallbackYear?: number): BulkRow[] {
  return text
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => parseBulkLine(l, fallbackYear));
}

export function bulkTotal(rows: BulkRow[]): number {
  return rows.reduce((sum, r) => (r.error ? sum : sum + r.amount), 0);
}

/** Signed rows net out; unsigned ones follow the batch default. */
export function bulkNet(rows: BulkRow[], defaultKind: "income" | "expense"): number {
  return rows.reduce((sum, r) => {
    if (r.error) return sum;
    return sum + ((r.kind ?? defaultKind) === "income" ? r.amount : -r.amount);
  }, 0);
}

export function rowsToRules(
  rows: BulkRow[],
  defaultKind: "income" | "expense",
  defaultDate: LocalDate,
): Rule[] {
  return rows
    .filter((r) => !r.error)
    .map((r) => {
      const input: RuleInput = {
        name: r.name,
        amount: r.amount,
        kind: r.kind ?? defaultKind,
        startDate: r.date ?? defaultDate,
        repeat: "none",
      };
      return makeRule(input);
    });
}
