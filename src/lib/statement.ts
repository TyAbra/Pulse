import { findDate, type LocalDate } from "./dates";
/**
 * Turns raw OCR output from a bank statement screenshot into clean
 * "Name -12.34" lines for the bulk box.
 *
 * Measured against real Tesseract output at 3x upscale: every digit and decimal
 * came back correct, but "$" is regularly misread as "5" ("-$40.51" -> "-540.51").
 * The bank always renders a "$", so when no currency symbol is recognised a
 * leading "5" IS that symbol and is dropped. This only ever runs on OCR text —
 * hand-typed lines never go through it, where "Costco 55.00" must stay $55.00.
 */

// sign, optional currency ("$", or "5"/"S" misread, or "5$"), then digits with cents.
const MONEY = /([-+−–])?\s*(5\$|\$|S|5)?\s*(\d[\d,]*\.\d{2})/;

// Rows the statement repeats that carry no transaction: account lines, bare dates.
const NOISE = [
  /^(checking|savings|account|pending|posted)\b/i,
  /^[•·*\-\s]*\d{4}\s*$/,
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s*\d{4}\s*$/i,
];

// Clock/chevron icons OCR as a stray glyph at the start of a row, and a pasted list
// can lead with a bullet. A "*" is only stripped when a space follows it, so the one
// inside "UBER *EATS" or "CTLP*NEW MARK VENDING" survives.
const LEADING_ICON = /^(?:[®©@€&%©®●○•(]+\s*|\*\s+)/;

export interface StatementEntry {
  name: string;
  amount: number;
  kind: "income" | "expense";
  /** The row's own date, when the statement prints one next to it. */
  date?: LocalDate;
}

function cleanName(raw: string): string {
  return raw
    .replace(LEADING_ICON, "")
    .replace(/\s+/g, " ")
    .replace(/^[-–—:,.\s]+|[-–—:,.\s]+$/g, "");
}

export function parseStatementText(raw: string, fallbackYear = new Date().getFullYear()): StatementEntry[] {
  const entries: StatementEntry[] = [];
  let pendingName = "";

  for (const rawLine of raw.split("\n")) {
    const line = rawLine.replace(LEADING_ICON, "").trim();
    if (!line) continue;
    if (NOISE.some((re) => re.test(line))) {
      // The account row carries the transaction's date ("Checking - 6628
      // September 23, 2026"), so it belongs to the entry just above it. A year
      // OCR mangled into "20246" fails validation and leaves the date unset,
      // which falls back to the batch date instead of inventing one.
      const dated = findDate(line, fallbackYear);
      const last = entries[entries.length - 1];
      if (dated && last && !last.date) last.date = dated;
      continue;
    }

    const m = line.match(MONEY);
    if (!m) {
      // A name on its own line: the amount is usually on the next one.
      const name = cleanName(line);
      if (name) pendingName = name;
      continue;
    }

    const [, sign, , digits] = m;
    const amount = Number(digits.replace(/,/g, ""));
    if (!(amount > 0)) continue;

    // Everything before the amount is the merchant; anything after it (running
    // balance, chevron noise) is dropped.
    const head = cleanName(line.slice(0, m.index ?? 0));
    const name = head || pendingName || "Withdrawal";
    if (head) pendingName = "";

    const own = findDate(line, fallbackYear) ?? undefined;
    entries.push({ name, amount, kind: sign === "+" ? "income" : "expense", date: own });
  }

  return entries;
}

/** The text the bulk box is filled with after a scan — editable before saving. */
export function statementToLines(raw: string): string {
  // Name first, amount last — the same shape someone types by hand, and it keeps
  // a trailing store number in the name from being mistaken for the amount.
  return parseStatementText(raw)
    .map((e) => {
      const head = `${e.name} ${e.kind === "income" ? "+" : "-"}${e.amount.toFixed(2)}`;
      return e.date ? `${head} ${e.date}` : head;
    })
    .join("\n");
}
