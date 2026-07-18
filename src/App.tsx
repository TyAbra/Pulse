import { useEffect, useMemo, useState } from "react";
import { TopBar, type ZoomLevel } from "./components/TopBar";
import { Fab } from "./components/Fab";
import { Canvas } from "./components/Canvas";
import { Wave } from "./components/Wave";
import { Fish } from "./components/Fish";
import { MonthTiles } from "./components/MonthTiles";
import { MonthView } from "./components/MonthView";
import { RuleSheet } from "./components/RuleSheet";
import { useStore } from "./store/useStore";
import { project, type CashEvent } from "./lib/engine";
import type { Rule } from "./lib/rules";
import { addMonths, daysInMonth, monthKey, todayLocal } from "./lib/dates";

export default function App() {
  const { rules, settings, corrupt } = useStore();
  const [zoom, setZoom] = useState<ZoomLevel>("quarter");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);

  const today = todayLocal();
  const [focusMonth, setFocusMonth] = useState<string>(monthKey(today));

  // Track viewport so the SVG wave re-renders on resize / device rotation.
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const horizonMonths = zoom === "quarter" ? 3 : 12;
  // In month view, project from the focused month's start to its end; the engine
  // still walks the running balance forward from asOfDate, so the wave stays honest
  // even when the focused month is far in the future.
  const from = zoom === "month" ? `${focusMonth}-01` : today;
  const to = zoom === "month"
    ? `${focusMonth}-${String(daysInMonth(focusMonth)).padStart(2, "0")}`
    : addMonths(today, horizonMonths);
  const projection = useMemo(() => project(rules, settings, from, to), [rules, settings, from, to]);

  // Always project through the current calendar month so the header can show
  // "now" vs "month end" regardless of which zoom the canvas is on.
  const monthEndDate = `${monthKey(today)}-${String(daysInMonth(monthKey(today))).padStart(2, "0")}`;
  const monthEndProjection = useMemo(
    () => project(rules, settings, today, monthEndDate),
    [rules, settings, today, monthEndDate],
  );

  const nowBalance = settings.startingBalance;
  const monthEndBalance = monthEndProjection.dailyBalance.at(-1)?.balance ?? nowBalance;
  const endBalance = projection.dailyBalance.at(-1)?.balance ?? nowBalance;
  const delta = endBalance - nowBalance;

  const openAdd = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (e: CashEvent) => {
    setEditing(rules.find(r => r.id === e.ruleId) ?? null);
    setSheetOpen(true);
  };

  return (
    <div className="h-full w-full overflow-hidden">
      <div className="aurora" />
      {corrupt && (
        <div className="relative z-20 m-4 rounded-xl border border-[var(--red)] bg-[#2a1220] p-3 text-sm">
          Saved data couldn't be read. Starting fresh — you can restore from a JSON export in settings.
        </div>
      )}
      <TopBar
        now={nowBalance}
        monthEnd={monthEndBalance}
        zoom={zoom} onZoom={setZoom}
      />
      <Canvas zoom={zoom} onZoom={setZoom}>
        <Wave data={projection.dailyBalance} width={size.w} height={size.h - 120} />
        <Fish data={projection.dailyBalance} width={size.w} height={size.h - 120} delta={delta} balance={endBalance} />
        {zoom === "month"
          ? <MonthView month={focusMonth} events={projection.events} onEdit={openEdit}
              onNav={(dir) => setFocusMonth(monthKey(addMonths(`${focusMonth}-01`, dir)))} />
          : <MonthTiles summaries={projection.monthSummaries} dailyBalance={projection.dailyBalance}
              onPick={(month) => { setFocusMonth(month); setZoom("month"); }} />}
      </Canvas>
      <Fab onClick={openAdd} />
      {sheetOpen && <RuleSheet editing={editing} onClose={() => setSheetOpen(false)} />}
    </div>
  );
}
