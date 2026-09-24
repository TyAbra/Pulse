import { useCallback, useMemo, useState } from "react";
import { TopBar, type ZoomLevel } from "./components/TopBar";
import { Fab } from "./components/Fab";
import { Canvas } from "./components/Canvas";
import { Wave } from "./components/Wave";
import { Fish } from "./components/Fish";
import { MonthTiles } from "./components/MonthTiles";
import { MonthView } from "./components/MonthView";
import { RuleSheet } from "./components/RuleSheet";
import { Toast } from "./components/Toast";
import { useStore } from "./store/useStore";
import { project, type CashEvent } from "./lib/engine";
import type { Rule } from "./lib/rules";
import { addMonths, daysInMonth, monthKey, todayLocal } from "./lib/dates";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

export default function App() {
  const { rules, settings, corrupt, undoLastBatch, clearLastBatch } = useStore();
  const [notice, setNotice] = useState("");
  const [undoable, setUndoable] = useState(0);
  const [zoom, setZoom] = useState<ZoomLevel>("quarter");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);

  const today = todayLocal();
  const [focusMonth, setFocusMonth] = useState<string>(monthKey(today));

  // The canvas reports its own box, so the wave matches whatever space is left
  // after the header — which changes height between phone and desktop layouts.
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight - 160 });
  const onCanvasSize = useCallback((w: number, h: number) => {
    setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
  }, []);

  const horizonMonths = zoom === "quarter" ? 3 : 12;
  // In month view, project from the focused month's start to its end; the engine
  // still walks the running balance forward from asOfDate, so the wave stays honest
  // even when the focused month is far in the future.
  const from = zoom === "month" ? `${focusMonth}-01` : today;
  // Snap the horizon to a month boundary: a window ending mid-month would render a
  // half-month tile whose "left over" silently omits the rest of that month.
  const lastMonth = zoom === "month"
    ? focusMonth
    : monthKey(addMonths(today, horizonMonths - 1));
  const to = `${lastMonth}-${String(daysInMonth(lastMonth)).padStart(2, "0")}`;
  const projection = useMemo(() => project(rules, settings, from, to), [rules, settings, from, to]);

  // "Now" is the start-of-day anchor plus anything already logged for today (or since
  // the anchor), so a charge added the day it hits shows up immediately.
  const todayProjection = useMemo(() => project(rules, settings, today, today), [rules, settings, today]);
  const nowBalance = todayProjection.dailyBalance.at(-1)?.balance ?? settings.startingBalance;
  const todayNet = todayProjection.events.reduce(
    (sum, e) => sum + (e.kind === "income" ? e.amount : -e.amount), 0);

  const endBalance = projection.dailyBalance.at(-1)?.balance ?? nowBalance;
  const delta = endBalance - nowBalance;

  // The header's second figure names the period actually on screen. It used to
  // always say "month end" for the current calendar month, which contradicted
  // the body of the screen whenever you were looking at any other month.
  const endLabel = (() => {
    const year = Number(lastMonth.slice(0, 4));
    const name = MONTH_NAMES[Number(lastMonth.slice(5)) - 1];
    const suffix = year === Number(today.slice(0, 4)) ? "" : ` ${year}`;
    return zoom === "month" ? `End of ${name}${suffix}` : `Through ${name}${suffix}`;
  })();

  const openAdd = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (e: CashEvent) => {
    setEditing(rules.find(r => r.id === e.ruleId) ?? null);
    setSheetOpen(true);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="aurora" />
      {corrupt && (
        <div className="relative z-20 m-4 rounded-xl border border-[var(--red)] bg-[#2a1220] p-3 text-sm">
          Saved data couldn't be read. Starting fresh — you can restore from a JSON export in settings.
        </div>
      )}
      <TopBar
        now={nowBalance}
        endValue={endBalance}
        endLabel={endLabel}
        todayNet={todayNet}
        zoom={zoom} onZoom={setZoom}
        onNotice={setNotice}
      />
      <Canvas zoom={zoom} onZoom={setZoom} onSize={onCanvasSize}>
        <Wave data={projection.dailyBalance} width={size.w} height={size.h} />
        <Fish data={projection.dailyBalance} width={size.w} height={size.h} delta={delta} balance={endBalance} />
        {zoom === "month"
          ? <MonthView month={focusMonth} events={projection.events}
              startBalance={projection.dailyBalance[0]?.balance ?? nowBalance}
              endBalance={endBalance}
              onEdit={openEdit}
              onNav={(dir) => setFocusMonth(monthKey(addMonths(`${focusMonth}-01`, dir)))} />
          : <MonthTiles summaries={projection.monthSummaries} dailyBalance={projection.dailyBalance}
              onPick={(month) => { setFocusMonth(month); setZoom("month"); }} />}
      </Canvas>
      <Fab onClick={openAdd} />
      {sheetOpen && (
        <RuleSheet
          editing={editing}
          now={nowBalance}
          onClose={() => setSheetOpen(false)}
          onAdded={(n, noun) => { setUndoable(n); setNotice(`Added ${n} ${noun}.`); }}
        />
      )}
      <Toast
        message={notice}
        actionLabel={undoable ? "Undo" : undefined}
        onAction={() => {
          const removed = undoLastBatch();
          setUndoable(0);
          setNotice(removed ? `Removed ${removed} ${removed === 1 ? "entry" : "entries"}.` : "");
        }}
        onDismiss={() => { setNotice(""); setUndoable(0); clearLastBatch(); }}
      />
    </div>
  );
}
