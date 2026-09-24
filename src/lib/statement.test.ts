import { describe, it, expect } from "vitest";
import { parseStatementText, statementToLines } from "./statement";
import { bulkNet, parseBulkLines } from "./bulk";

// Verbatim Tesseract output for a real SoFi screenshot at 3x upscale, including
// its actual mistakes: "$" read as "5", chevrons read as trailing glyphs, and
// "2026" read as "20246".
const OCR = `® AFFIRM.COM PAYMENTS -540.51 5
Checking « 6628 September 23, 2026

® Dave Inc -591.20 N
Checking - 6628 September 23, 2026

® Money App Cash Advance -$84.99 N
Checking - 6628 September 23, 20246

® CLEO Al -$5.99 5
Checking « 6628 September 23, 2026

® CLEO* ADVANCE+EXPRESS -594.98 3
Checking - 6628 September 23, 2026

® Grant Repayment -5157.50 5
Checking - 6628 September 23, 2026

® KLOVER APP CASH ADVANC -$83.47 5
Checking « 6628 September 23, 2026

® TILT ADVANCE -$79.00 5
Checking - 6628 September 23, 2026

® CTLP*NEW MARK VENDING -52.60 5
Checking - 6628 September 23, 2026

® GO PUFF*GOPUFF -$9.75 5
Checking - 6628 September 22, 2026

® RAISING CANES 0103 -$13.09 5
Checking - 6628 September 22, 2026

® CRUNCHYROLL.COM -59.99 N
Checking - 6628 September 22, 2026

® UBER "EATS -$3.70 5
Checking - 6628 September 22, 2026

® UBER "EATS -$3.76 N
Checking - 6628 September 22, 2026

® UBER "EATS -528.92 N
Checking - 6628 September 22, 2026

® Grant Subscription -$9.99 5
Checking - 6628 September 22, 2026

® UBER *GOPUFF -$18.62 N
Checking « 6628 September 21, 2026`;

const EXPECTED = [
  ["AFFIRM.COM PAYMENTS", 40.51], ["Dave Inc", 91.2], ["Money App Cash Advance", 84.99],
  ["CLEO Al", 5.99], ["CLEO* ADVANCE+EXPRESS", 94.98], ["Grant Repayment", 157.5],
  ["KLOVER APP CASH ADVANC", 83.47], ["TILT ADVANCE", 79], ["CTLP*NEW MARK VENDING", 2.6],
  ["GO PUFF*GOPUFF", 9.75], ["RAISING CANES 0103", 13.09], ["CRUNCHYROLL.COM", 9.99],
  ['UBER "EATS', 3.7], ['UBER "EATS', 3.76], ['UBER "EATS', 28.92],
  ["Grant Subscription", 9.99], ["UBER *GOPUFF", 18.62],
] as const;

describe("parseStatementText on real OCR output", () => {
  const entries = parseStatementText(OCR);

  it("finds every transaction and no phantom ones", () => {
    expect(entries).toHaveLength(EXPECTED.length);
  });

  it("recovers every amount despite the $-as-5 misreads", () => {
    expect(entries.map((e) => e.amount)).toEqual(EXPECTED.map(([, a]) => a));
  });

  it("keeps the merchant names", () => {
    expect(entries.map((e) => e.name)).toEqual(EXPECTED.map(([n]) => n));
  });

  it("totals what the statement totals", () => {
    const total = entries.reduce((s, e) => s + e.amount, 0);
    expect(total).toBeCloseTo(738.06, 2);
  });

  it("drops account lines and dates", () => {
    expect(entries.some((e) => /checking|september/i.test(e.name))).toBe(false);
  });

  it("marks them all as expenses", () => {
    expect(entries.every((e) => e.kind === "expense")).toBe(true);
  });
});

describe("parseStatementText on pasted web text", () => {
  // The sofi.com list runs the amount and running balance together.
  const PASTED = `Zelle® Payment to Toskany
Checking • 6628
-$65.00$2,024.20

* Corner Store
Checking • 6628
-$7.57$2,089.20

* FIDELITY 74468 P
Checking • 6628
+$2,057.14$2,110.22`;

  const entries = parseStatementText(PASTED);

  it("takes the transaction amount, not the running balance", () => {
    expect(entries.map((e) => e.amount)).toEqual([65, 7.57, 2057.14]);
  });

  it("pairs a name with the amount on the following line", () => {
    expect(entries.map((e) => e.name)).toEqual([
      "Zelle® Payment to Toskany", "Corner Store", "FIDELITY 74468 P",
    ]);
  });

  it("reads a leading + as income", () => {
    expect(entries.map((e) => e.kind)).toEqual(["expense", "expense", "income"]);
  });
});

describe("statementToLines", () => {
  it("emits signed, editable lines with the amount last", () => {
    expect(statementToLines("® Corner Store -57.57 5")).toBe("Corner Store -7.57");
  });

  it("round-trips through the bulk parser at the right total", () => {
    const rows = parseBulkLines(statementToLines(OCR));
    expect(rows.filter(r => r.error)).toHaveLength(0);
    expect(bulkNet(rows, "expense")).toBeCloseTo(-738.06, 2);
  });
});
