import { useState } from "react";
import { BalanceCounter } from "./BalanceCounter";
import { useStore } from "../store/useStore";
import { todayLocal } from "../lib/dates";

export type ZoomLevel = "month" | "quarter" | "year";
const LEVELS: ZoomLevel[] = ["month", "quarter", "year"];

function SettingsButton() {
  const [open, setOpen] = useState(false);
  const { settings, setSettings, exportJSON, importJSON } = useStore();
  const doExport = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pulse-backup-${todayLocal()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const doImport = (file: File) => {
    file.text().then(t => { if (!importJSON(t)) alert("That file isn't a valid Pulse backup."); });
  };
  return (
    <div className="relative ml-2">
      <button onClick={() => setOpen(o => !o)} aria-label="Settings"
        className="rounded-full border border-[#232c3f] bg-[#10141ecc] px-3 py-1.5 text-sm">⚙</button>
      {open && (
        <div className="absolute right-0 top-10 z-40 w-64 rounded-2xl border border-[#232c3f] bg-[var(--panel)] p-4 text-sm">
          <label className="text-xs text-[var(--dim)]">Balance today ($)
            <input type="number" className="num mt-1 w-full rounded-xl border border-[#232c3f] bg-[#0d1016] px-3 py-2"
              value={settings.startingBalance}
              onChange={(e) => setSettings({ startingBalance: Number(e.target.value), asOfDate: todayLocal() })} />
          </label>
          <div className="mt-3 flex gap-2">
            <button onClick={doExport} className="flex-1 rounded-xl border border-[#232c3f] py-2 text-xs">Export</button>
            <label className="flex-1 cursor-pointer rounded-xl border border-[#232c3f] py-2 text-center text-xs">
              Import<input type="file" accept=".json" className="hidden"
                onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
            </label>
          </div>
          <div className="mt-2 text-[10px] text-[var(--dim)]">Your data never leaves this device.</div>
        </div>
      )}
    </div>
  );
}

export function TopBar({ balance, label, delta, zoom, onZoom }: {
  balance: number; label: string; delta?: string; zoom: ZoomLevel; onZoom: (z: ZoomLevel) => void;
}) {
  return (
    <div className="safe-top flex items-start justify-between px-5 pb-5 z-10 relative">
      <BalanceCounter value={balance} label={label} delta={delta} />
      <div className="flex items-start">
        <div className="flex gap-1 rounded-full border border-[#232c3f] bg-[#10141ecc] p-1 backdrop-blur">
          {LEVELS.map((l) => (
            <button key={l} onClick={() => onZoom(l)}
              className={`rounded-full px-3.5 py-1 text-[11px] font-semibold capitalize transition
                ${zoom === l ? "bg-gradient-to-br from-[var(--green)] to-[var(--green2)] text-[#03140c] shadow-[0_0_18px_#34f5a055]" : "text-[var(--dim)]"}`}>
              {l}
            </button>
          ))}
        </div>
        <SettingsButton />
      </div>
    </div>
  );
}
