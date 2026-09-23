import type { LocalDate } from "./dates";
import type { Rule, RuleInput } from "./rules";
import { makeRule } from "./rules";

/** One parsed line of a bulk paste: either a usable row or a flagged one. */
export interface BulkRow {
  raw: string;
  name: string;
  amount: number;
  error?: string;
}

// Money anywhere in the line: 84.32, $84.32, 1,129.99
const AMOUNT_RE = /\$?\d[\d,]*(?:\.\d{1,2})?/g;

function toNumber(match: string): number {
  return Number(match.replace(/[$,\s]/g, ""));
}

export function parseBulkLine(raw: string): BulkRow {
  const line = raw.trim();
  const matches = line.match(AMOUNT_RE);
  if (!matches) return { raw, name: line, amount: 0, error: "No amount found" };

  // Take the last number: names far more often lead ("Costco 84.32") than trail.
  const match = matches[matches.length - 1];
  const amount = toNumber(match);
  const name = line
    .slice(0, line.lastIndexOf(match))
    .concat(line.slice(line.lastIndexOf(match) + match.length))
    .replace(/\s+/g, " ")
    .replace(/^[-–—:,.\s]+|[-–—:,.\s]+$/g, "");

  if (!(amount > 0)) return { raw, name, amount, error: "Amount must be greater than 0" };
  return { raw, name: name || "Withdrawal", amount };
}

/** Blank lines are skipped; every other line comes back, flagged if unusable. */
export function parseBulkLines(text: string): BulkRow[] {
  return text
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map(parseBulkLine);
}

export function bulkTotal(rows: BulkRow[]): number {
  return rows.reduce((sum, r) => (r.error ? sum : sum + r.amount), 0);
}

export function rowsToRules(
  rows: BulkRow[],
  kind: "income" | "expense",
  date: LocalDate,
): Rule[] {
  return rows
    .filter((r) => !r.error)
    .map((r) => {
      const input: RuleInput = {
        name: r.name,
        amount: r.amount,
        kind,
        startDate: date,
        repeat: "none",
      };
      return makeRule(input);
    });
}
