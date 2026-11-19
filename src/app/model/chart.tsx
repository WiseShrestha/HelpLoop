"use client";

import { useState } from "react";
import styles from "./model.module.css";

// Small line chart: x = starter grant (categorical steps), y = a share 0–100 %, one line per overdraft.
// Thin 2px lines, 8px markers with a surface ring, a distinct marker shape per series (secondary
// encoding), direct labels at line ends, a crosshair tooltip listing every series, recessive grid.

export type Series = { key: string; label: string; short: string; color: string; shape: "circle" | "square" | "triangle"; values: number[] };

const W = 320, H = 200, M = { top: 14, right: 34, bottom: 30, left: 36 };
const iw = W - M.left - M.right, ih = H - M.top - M.bottom;

function Marker({ shape, x, y, color }: { shape: Series["shape"]; x: number; y: number; color: string }) {
  const ring = { stroke: "var(--chart-surface)", strokeWidth: 2, fill: color };
  if (shape === "square") return <rect x={x - 4.5} y={y - 4.5} width={9} height={9} rx={1.5} {...ring} />;
  if (shape === "triangle") return <path d={`M${x} ${y - 5.5} L${x + 5.5} ${y + 4.5} L${x - 5.5} ${y + 4.5} Z`} {...ring} />;
  return <circle cx={x} cy={y} r={4.5} {...ring} />;
}

export function ShareChart({ title, xLabels, xTitle, series, highlight }: {
  title: string; xLabels: string[]; xTitle: string; series: Series[]; highlight?: { series: string; index: number };
}) {
  const [hover, setHover] = useState<number | null>(null);
  const x = (i: number) => M.left + (xLabels.length === 1 ? iw / 2 : (i * iw) / (xLabels.length - 1));
  const y = (v: number) => M.top + ih - (v / 100) * ih;
  const nearest = (clientX: number, rect: DOMRect) => {
    const px = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    xLabels.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
    return best;
  };
  // Spread end labels apart so they never collide.
  const ends = series.map((s) => ({ key: s.key, label: s.short, y: y(s.values.at(-1) ?? 0) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;

  return <figure className={styles.chart}>
    <figcaption>{title}</figcaption>
    <div className={styles.plot}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}
        onPointerMove={(e) => setHover(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))} onPointerLeave={() => setHover(null)}>
        {[0, 25, 50, 75, 100].map((t) => <g key={t}>
          <line x1={M.left} x2={M.left + iw} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={1} />
          <text x={M.left - 6} y={y(t) + 4} textAnchor="end" className={styles.tick}>{t}%</text>
        </g>)}
        {xLabels.map((l, i) => <text key={l} x={x(i)} y={H - 12} textAnchor="middle" className={styles.tick}>{l}</text>)}
        <text x={M.left + iw / 2} y={H - 1} textAnchor="middle" className={styles.tick}>{xTitle}</text>
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + ih} stroke="var(--chart-axis)" strokeWidth={1} />}
        {series.map((s) => <g key={s.key}>
          <polyline fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
            points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
          {s.values.map((v, i) => <Marker key={i} shape={s.shape} x={x(i)} y={y(v)} color={s.color} />)}
        </g>)}
        {highlight && (() => {
          const s = series.find((x) => x.key === highlight.series);
          return s ? <circle cx={x(highlight.index)} cy={y(s.values[highlight.index])} r={9} fill="none" stroke="var(--chart-ink)" strokeWidth={1.5} /> : null;
        })()}
        {ends.map((e) => <text key={e.key} x={M.left + iw + 8} y={e.y + 4} className={styles.endLabel}>{e.label}</text>)}
      </svg>
      {hover !== null && <div className={styles.tooltip} style={{ left: `${(x(hover) / W) * 100}%` }} role="status">
        <span className={styles.tipTitle}>{xTitle}: {xLabels[hover]}</span>
        {series.map((s) => <span key={s.key} className={styles.tipRow}>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><Marker shape={s.shape} x={6} y={6} color={s.color} /></svg>
          <strong>{Math.round(s.values[hover])}%</strong> {s.label}</span>)}
      </div>}
    </div>
    <ul className={styles.legend}>{series.map((s) => <li key={s.key}>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><Marker shape={s.shape} x={6} y={6} color={s.color} /></svg>{s.label}</li>)}</ul>
  </figure>;
}
