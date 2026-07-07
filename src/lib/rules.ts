import type { LocalDate } from "./dates";

export type Repeat = "none" | "weekly" | "biweekly" | "monthly";

export interface Rule {
  id: string;
  name: string;
  amount: number; // always positive
  kind: "income" | "expense";
  recurrence: string | null; // RRULE body, e.g. "FREQ=WEEKLY;INTERVAL=2"
  startDate: LocalDate;
  endDate?: LocalDate;
  emoji?: string;
}

export interface RuleInput {
  name: string;
  amount: number;
  kind: "income" | "expense";
  startDate: LocalDate;
  endDate?: LocalDate;
  repeat: Repeat;
  emoji?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function buildRecurrence(input: RuleInput): string | null {
  const day = Number(input.startDate.slice(8, 10));
  switch (input.repeat) {
    case "none": return null;
    case "weekly": return "FREQ=WEEKLY";
    case "biweekly": return "FREQ=WEEKLY;INTERVAL=2";
    case "monthly":
      return day >= 29
        ? "FREQ=MONTHLY;BYMONTHDAY=28,29,30,31;BYSETPOS=-1" // "31st or last day" — RFC-safe across short months
        : `FREQ=MONTHLY;BYMONTHDAY=${day}`;
  }
}

export function validateRule(input: RuleInput): string[] {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push("Name is required");
  if (!(input.amount > 0)) errors.push("Amount must be greater than 0");
  if (!DATE_RE.test(input.startDate)) errors.push("Start date is invalid");
  if (input.endDate !== undefined) {
    if (!DATE_RE.test(input.endDate)) errors.push("End date is invalid");
    else if (DATE_RE.test(input.startDate) && input.endDate <= input.startDate)
      errors.push("End date must be after start date");
  }
  return errors;
}

export function makeRule(input: RuleInput): Rule {
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    amount: input.amount,
    kind: input.kind,
    recurrence: buildRecurrence(input),
    startDate: input.startDate,
    endDate: input.endDate,
    emoji: input.emoji,
  };
}
