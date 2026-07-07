import { useMemo } from "react";
import { scaleLinear, scalePoint } from "d3-scale";
import { area, line, curveMonotoneX } from "d3-shape";
import type { DayBalance } from "../lib/engine";

export function Wave({ data, width, height }: { data: DayBalance[]; width: number; height: number }) {
  const paths = useMemo(() => {
    if (data.length < 2) return null;
    const x = scalePoint<string>().domain(data.map(d => d.date)).range([0, width]);
    const vals = data.map(d => d.balance);
    const y = scaleLinear().domain([Math.min(0, ...vals), Math.max(1, ...vals)]).range([height * 0.9, height * 0.15]);
    const l = line<DayBalance>().x(d => x(d.date)!).y(d => y(d.balance)).curve(curveMonotoneX);
    const a = area<DayBalance>().x(d => x(d.date)!).y0(height).y1(d => y(d.balance)).curve(curveMonotoneX);
    return { line: l(data)!, area: a(data)! };
  }, [data, width, height]);

  if (!paths) return null;
  return (
    <svg width={width} height={height} className="absolute inset-x-0 bottom-0 pointer-events-none" aria-hidden>
      <defs>
        <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--green)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--green)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={paths.area} fill="url(#waveFill)" />
      <path d={paths.line} fill="none" stroke="var(--green)" strokeWidth="2"
        style={{ filter: "drop-shadow(0 0 8px #34f5a0aa)" }} />
    </svg>
  );
}
