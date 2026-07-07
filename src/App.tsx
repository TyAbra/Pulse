import { useMemo, useState } from "react";
import { TopBar, type ZoomLevel } from "./components/TopBar";
import { Fab } from "./components/Fab";
import { Canvas } from "./components/Canvas";
import { Wave } from "./components/Wave";
import { MonthTiles } from "./components/MonthTiles";
import { MonthView } from "./components/MonthView";
import { RuleSheet } from "./components/RuleSheet";
import { useStore } from "./store/useStore";
import { project, type CashEvent } from "./lib/engine";
import type { Rule } from "./lib/rules";
import { addMonths, monthKey, todayLocal } from "./lib/dates";

export default function App() {
  const { rules, settings, corrupt } = useStore();
  const [zoom, setZoom] = useState<ZoomLevel>("quarter");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);

  const today = todayLocal();
  const horizonMonths = zoom === "month" ? 1 : zoom === "quarter" ? 3 : 12;
  const to = addMonths(today, horizonMonths);
  const projection = useMemo(() => project(rules, settings, today, to), [rules, settings, today, to]);

  const endBalance = projection.dailyBalance.at(-1)?.balance ?? settings.startingBalance;
  const delta = endBalance - settings.startingBalance;

  const openAdd = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (e: CashEvent) => {
    setEditing(rules.find(r => r.id === e.ruleId) ?? null);
    setSheetOpen(true);
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      <div className="aurora" />
      {corrupt && (
        <div className="relative z-20 m-4 rounded-xl border border-[var(--red)] bg-[#2a1220] p-3 text-sm">
          Saved data couldn't be read. Starting fresh — you can restore from a JSON export in settings.
        </div>
      )}
      <TopBar
        balance={endBalance}
        label={`Projected · ${to}`}
        delta={`${delta >= 0 ? "▲ +" : "▼ -"}$${Math.abs(delta).toLocaleString()} next ${horizonMonths} mo`}
        zoom={zoom} onZoom={setZoom}
      />
      <Canvas zoom={zoom} onZoom={setZoom}>
        <Wave data={projection.dailyBalance} width={window.innerWidth} height={window.innerHeight - 120} />
        {zoom === "month"
          ? <MonthView month={monthKey(today)} events={projection.events} onEdit={openEdit} />
          : <MonthTiles summaries={projection.monthSummaries} dailyBalance={projection.dailyBalance}
              onPick={() => setZoom("month")} />}
      </Canvas>
      <Fab onClick={openAdd} />
      {sheetOpen && <RuleSheet editing={editing} onClose={() => setSheetOpen(false)} />}
    </div>
  );
}
