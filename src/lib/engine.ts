import { RRule } from "rrule";
import { addDays, compare, fromUTCDate, monthKey, toUTCDate, type LocalDate } from "./dates";
import type { Rule } from "./rules";

export interface Settings { startingBalance: number; asOfDate: LocalDate; }
export interface CashEvent { date: LocalDate; ruleId: string; name: string; amount: number; kind: "income" | "expense"; emoji?: string; }
export interface DayBalance { date: LocalDate; balance: number; }
export interface MonthSummary { month: string; in: number; out: number; net: number; }

const MAX_DAYS = 365 * 5;

function expandRule(rule: Rule, from: LocalDate, to: LocalDate): LocalDate[] {
  const lo = compare(rule.startDate, from) > 0 ? rule.startDate : from;
  const hi = rule.endDate && compare(rule.endDate, to) < 0 ? rule.endDate : to;
  if (compare(lo, hi) > 0) return [];
  if (!rule.recurrence) {
    return compare(rule.startDate, lo) >= 0 && compare(rule.startDate, hi) <= 0 ? [rule.startDate] : [];
  }
  // Floating-time convention: dtstart at UTC midnight, read back with getUTC* only.
  const rr = RRule.fromString(`DTSTART:${rule.startDate.replace(/-/g, "")}T000000Z\nRRULE:${rule.recurrence}`);
  return rr.between(toUTCDate(lo), toUTCDate(hi), true).map(fromUTCDate);
}

export function project(rules: Rule[], settings: Settings, from: LocalDate, to: LocalDate) {
  // Clamp range to a sane maximum.
  let end = to;
  if (compare(addDays(from, MAX_DAYS), to) < 0) end = addDays(from, MAX_DAYS);

  // Walk balances from whichever comes first: the as-of anchor or the view start.
  const walkStart = compare(settings.asOfDate, from) < 0 ? settings.asOfDate : from;

  // Expand every rule once across the full walk range.
  const allEvents: CashEvent[] = [];
  for (const rule of rules) {
    for (const date of expandRule(rule, walkStart, end)) {
      allEvents.push({ date, ruleId: rule.id, name: rule.name, amount: rule.amount, kind: rule.kind, emoji: rule.emoji });
    }
  }

  const byDate = new Map<LocalDate, number>();
  for (const e of allEvents) {
    byDate.set(e.date, (byDate.get(e.date) ?? 0) + (e.kind === "income" ? e.amount : -e.amount));
  }

  // Running balance: startingBalance is the balance ON asOfDate (before that day's later events are irrelevant);
  // events strictly after asOfDate move the balance.
  const dailyBalance: DayBalance[] = [];
  let bal = settings.startingBalance;
  for (let d = walkStart; compare(d, end) <= 0; d = addDays(d, 1)) {
    if (compare(d, settings.asOfDate) > 0) bal += byDate.get(d) ?? 0;
    if (compare(d, from) >= 0) dailyBalance.push({ date: d, balance: bal });
  }

  // Events returned are limited to the requested [from, end] window.
  const events = allEvents
    .filter((e) => compare(e.date, from) >= 0 && compare(e.date, end) <= 0)
    .sort((a, b) => compare(a.date, b.date) || a.name.localeCompare(b.name));

  const monthMap = new Map<string, MonthSummary>();
  for (const e of events) {
    const key = monthKey(e.date);
    const m = monthMap.get(key) ?? { month: key, in: 0, out: 0, net: 0 };
    if (e.kind === "income") m.in += e.amount; else m.out += e.amount;
    m.net = m.in - m.out;
    monthMap.set(key, m);
  }
  const monthSummaries = [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month));

  return { events, dailyBalance, monthSummaries };
}
