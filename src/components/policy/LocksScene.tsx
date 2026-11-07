import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import waterUrl from "@/assets/graphite-water.jpg";
import { RecommendationLabel } from "@/components/canoe/RecommendationLabel";
import { PADDLE } from "@/components/canoe/motion";
import { euro, gateLabel, quoteLimitOf } from "@/lib/policy/text";
import type { Draft, Preview, PreviewRow, Rec } from "@/lib/policy/types";

const W = 1200, H = 400, RT = 112, RB = 172, X0 = 140, X1 = 1050;
type Pt = [number, number];
type BasinKey = "review" | "info" | "open";
const BASINS: Record<BasinKey, { x0: number; x1: number; y0: number; cols: number; dx: number; dy: number; sx: number; sy: number }> = {
  review: { x0: 250, x1: 610, y0: 300, cols: 10, dx: 34, dy: 15, sx: 272, sy: 318 },
  info: { x0: 720, x1: 980, y0: 300, cols: 7, dx: 34, dy: 15, sx: 742, sy: 318 },
  open: { x0: 1062, x1: 1192, y0: 110, cols: 3, dx: 38, dy: 15, sx: 1084, sy: 122 },
};
const slotPt = (b: BasinKey, k: number): Pt => { const s = BASINS[b]; return [s.sx + (k % s.cols) * s.dx, s.sy + Math.floor(k / s.cols) * s.dy]; };

/* ---------- geometry ---------- */
interface Path { pts: Pt[]; cum: number[]; len: number; turn: number }
function mk(pts: Pt[], turnIdx: number): Path {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1]!, b = pts[i]!; cum.push(cum[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  return { pts, cum, len: cum[cum.length - 1]! || 1, turn: cum[turnIdx] ?? 0 };
}
function quad(a: Pt, c: Pt, b: Pt, n = 14): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); }
  return out;
}
function at(p: Path, f: number) {
  const d = f * p.len; let i = 1;
  while (i < p.pts.length - 1 && p.cum[i]! < d) i++;
  const a = p.pts[i - 1]!, b = p.pts[i] ?? a, c0 = p.cum[i - 1]!, seg = (p.cum[i]! - c0) || 1, k = Math.min(1, Math.max(0, (d - c0) / seg));
  return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, a: Math.atan2(b[1] - a[1], b[0] - a[0]), i };
}
const toD = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = (t: number, a: number, b: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x: number) => { let lo = 0, hi = 1; for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (cx(m, x1, x2) < x) lo = m; else hi = m; } return cx((lo + hi) / 2, y1, y2); };
}
const ease = bezier(...(PADDLE as unknown as [number, number, number, number]));
function rng(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function strokes(seed: number, x0: number, x1: number, y0: number, y1: number, n: number) {
  const r = rng(seed); const out: { d: string; o: number; w: number }[] = [];
  for (let i = 0; i < n; i++) {
    const y = y0 + r() * (y1 - y0), a = x0 + r() * (x1 - x0) * 0.8, len = 30 + r() * 140, b = Math.min(x1, a + len), amp = 1 + r() * 2.5;
    out.push({ d: `M${a.toFixed(1)} ${y.toFixed(1)} Q${((a + b) / 2).toFixed(1)} ${(y - amp).toFixed(1)} ${b.toFixed(1)} ${(y + r() * 1.5).toFixed(1)}`, o: 0.12 + r() * 0.3, w: 0.5 + r() * 0.8 });
  }
  return out;
}

/* ---------- routing ---------- */
interface Dest { basin: BasinKey; gate: number | null }
function destOf(rule: string, to: Rec, draft: Draft): Dest {
  const id = rule.replace(/^v\d+:/, "");
  const gi = draft.rules.findIndex((r) => r.id === id);
  if (to === "routine_processing") return { basin: "open", gate: null };
  const basin: BasinKey = to === "human_review" ? "review" : "info";
  if (gi >= 0) return { basin, gate: gi };
  const fb = draft.rules.findIndex((r) => r.outcome === to);
  return { basin, gate: fb >= 0 ? fb : 0 };
}
const sameDest = (a: Dest, b: Dest) => a.basin === b.basin && a.gate === b.gate;
function route(start: Pt[], lane: number, dest: Dest, slot: Pt, gx: (i: number) => number): Path {
  const pts = [...start];
  if (dest.gate != null && dest.basin !== "open") {
    const x = gx(dest.gate); pts.push([x, lane]); const turn = pts.length - 1;
    const b = BASINS[dest.basin]; const nx = Math.min(b.x1 - 20, Math.max(b.x0 + 20, x));
    pts.push(...quad([x, lane], [x + 14, RB + 50], [nx, b.y0], 18), ...quad([nx, b.y0], [nx, slot[1]], slot, 8));
    return mk(pts, turn);
  }
  pts.push([X1, lane]); const turn = pts.length - 1;
  pts.push(...quad([X1, lane], [slot[0] - 20, lane], slot, 10));
  return mk(pts, turn);
}
const harbourPt = (i: number): Pt => [32 + (i % 4) * 26, 118 + Math.floor(i / 4) * 10.5];
const laneOf = (i: number) => 142 + ((i % 5) - 2) * 9;
const startPts = (i: number): Pt[] => { const h = harbourPt(i), l = laneOf(i); return [h, ...quad(h, [h[0] + 40, l], [X0, l], 10)]; };

interface Canoe { id: string; idx: number; row: PreviewRow; path: Path; ghost: Path; start: number; dur: number; dest: Dest; slot: number }

export interface LocksSceneProps {
  draft: Draft; live: Draft; preview: Preview | null; stale: boolean; runId: number; skipToken: number; glide: number;
  showGhosts: boolean; highlight: string | null; liveLimit: number | null; escalations: number; onLimit: (v: number) => void;
}

export function LocksScene(p: LocksSceneProps) {
  const reduce = !!useReducedMotion();
  const navigate = useNavigate();
  const rules = p.draft.rules;
  const gx = (i: number) => (rules.length <= 1 ? 600 : 210 + (i * 780) / (rules.length - 1));
  const canoes = useRef(new Map<string, Canoe>());
  const slots = useRef<Record<BasinKey, (string | null)[]>>({ review: [], info: [], open: [] });
  const lastRun = useRef(0);
  const [, setTick] = useState(0);
  const raf = useRef(0);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const [dam, setDam] = useState(false);
  const liveIds = useMemo(() => new Set(p.live.rules.map((r) => r.id)), [p.live]);
  const waterStrokes = useMemo(() => strokes(7, X0 - 30, X1 + 60, RT + 3, RB - 3, 90), []);
  const bankStrokes = useMemo(() => [...strokes(11, 0, W, RT - 4, RT + 2, 30), ...strokes(13, 0, W, RB - 2, RB + 4, 30)], []);

  const alloc = (b: BasinKey, id: string) => { const s = slots.current[b]; let k = s.indexOf(null); if (k < 0) k = s.length; s[k] = id; return k; };
  const free = (b: BasinKey, k: number) => { slots.current[b][k] = null; };

  const kick = () => {
    cancelAnimationFrame(raf.current);
    const loop = () => {
      setTick((t) => t + 1);
      const end = Math.max(0, ...[...canoes.current.values()].map((c) => c.start + c.dur)) + 1000;
      if (performance.now() < end) raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // Build or reroute canoes when a run starts or the preview changes.
  useEffect(() => {
    if (!p.preview || p.runId === 0) return;
    const now = performance.now();
    const open = p.preview.rows.filter((r) => !r.retained);
    if (p.runId !== lastRun.current) {
      lastRun.current = p.runId;
      canoes.current.clear(); slots.current = { review: [], info: [], open: [] };
      open.forEach((row, i) => {
        const dest = destOf(row.rule_to, row.to, p.draft); const slot = alloc(dest.basin, row.case_id);
        const gd = destOf(row.rule_from, row.from, p.draft);
        canoes.current.set(row.case_id, {
          id: row.case_id, idx: i, row, dest, slot,
          path: route(startPts(i), laneOf(i), dest, slotPt(dest.basin, slot), gx),
          ghost: route(startPts(i), laneOf(i), gd, slotPt(gd.basin, 0), gx),
          start: reduce ? -1e9 : now + 650 + i * 40, dur: 2600,
        });
      });
    } else {
      open.forEach((row, i) => {
        const c = canoes.current.get(row.case_id); const dest = destOf(row.rule_to, row.to, p.draft);
        if (!c) return;
        c.row = row;
        if (sameDest(c.dest, dest)) return;
        const from = slotPt(c.dest.basin, c.slot); const backX = c.dest.gate != null && c.dest.basin !== "open" ? gx(c.dest.gate) : X1;
        free(c.dest.basin, c.slot); const slot = alloc(dest.basin, row.case_id); const l = laneOf(i);
        c.path = route([from, ...quad(from, [from[0], l + 20], [backX, l], 10)], l, dest, slotPt(dest.basin, slot), gx);
        c.dest = dest; c.slot = slot; c.start = reduce ? -1e9 : now; c.dur = 1500;
      });
    }
    kick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.preview, p.runId]);

  useEffect(() => { if (p.skipToken) { canoes.current.forEach((c) => { c.start = -1e9; }); kick(); } }, [p.skipToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const now = performance.now();
  const list = [...canoes.current.values()];
  const docked: Record<BasinKey, number> = { review: 0, info: 0, open: 0 };
  const closed = p.preview?.rows.filter((r) => r.retained) ?? [];
  const limit = quoteLimitOf(rules);
  const qi = rules.findIndex((r) => r.id === "R1.quote_over_limit");

  return (
    <div className="relative">
      <div className={p.stale ? "opacity-40 grayscale transition-opacity duration-300" : "transition-opacity duration-300"}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full select-none" role="img" aria-label="Simulation: claims sail through the rule gates">
          <defs>
            <clipPath id="river"><path d={`M${X0 - 40} ${RT} L${X1 + 10} ${RT} Q${X1 + 60} ${RT - 20} ${W} ${RT - 20} L${W} 240 Q${X1 + 60} 230 ${X1 + 10} ${RB} L${X0 - 40} ${RB} Z`} /></clipPath>
          </defs>
          {/* harbour + river + open water */}
          <g clipPath="url(#river)"><image href={waterUrl} x={0} y={60} width={W} height={220} preserveAspectRatio="xMidYMid slice" opacity={0.35} style={{ mixBlendMode: "multiply" }} /></g>
          <g className="text-stone" stroke="currentColor" fill="none" strokeLinecap="round">
            {bankStrokes.map((s, i) => <path key={i} d={s.d} strokeOpacity={s.o + 0.15} strokeWidth={s.w} />)}
            {waterStrokes.map((s, i) => <path key={`w${i}`} d={s.d} strokeOpacity={s.o * 0.8} strokeWidth={s.w} />)}
            <path d={`M10 98 Q70 92 130 100 L134 186 Q70 192 12 186 Z`} strokeOpacity={0.5} strokeDasharray="2 3" />
            <path d={`M10 296 Q80 288 160 298 L162 386 Q80 392 12 384 Z`} strokeOpacity={0.45} strokeDasharray="2 3" />
            {(["review", "info"] as const).map((b) => { const s = BASINS[b]; return <path key={b} d={`M${s.x0} ${s.y0} Q${(s.x0 + s.x1) / 2} ${s.y0 - 8} ${s.x1} ${s.y0} Q${s.x1 + 10} 350 ${s.x1 - 10} 385 Q${(s.x0 + s.x1) / 2} 394 ${s.x0 + 10} 385 Q${s.x0 - 10} 350 ${s.x0} ${s.y0} Z`} strokeOpacity={0.55} />; })}
            {rules.map((r, i) => { const b = BASINS[r.outcome === "human_review" ? "review" : "info"]; const x = gx(i); const nx = Math.min(b.x1 - 20, Math.max(b.x0 + 20, x));
              return <g key={`ch${r.id}`} strokeOpacity={0.35}><path d={`M${x - 5} ${RB} Q${x + 9} ${RB + 50} ${nx - 6} ${b.y0}`} /><path d={`M${x + 5} ${RB} Q${x + 19} ${RB + 50} ${nx + 6} ${b.y0}`} /></g>; })}
          </g>
          <g className="font-mono" fill="currentColor">
            <text x={14} y={90} className="text-stone" fontSize={9} letterSpacing="0.12em">NEW CLAIMS</text>
            <text x={1066} y={96} className="text-stone" fontSize={9} letterSpacing="0.12em">OPEN WATER</text>
            <text x={18} y={290} className="text-stone" fontSize={9} letterSpacing="0.12em">HARBOUR · CLOSED</text>
          </g>

          {/* gates */}
          {rules.map((r, i) => {
            const x = gx(i), isNew = !liveIds.has(r.id), info = r.outcome === "request_information";
            const liveRule = p.live.rules.find((l) => l.id === r.id);
            const oldQ = liveRule?.when[0]?.value, newQ = r.when[0]?.value;
            const plaque = r.id === "R1.quote_over_limit" && typeof oldQ === "number" && typeof newQ === "number" && oldQ !== newQ ? `${euro(oldQ)} → ${euro(newQ)}` : null;
            const ly = i % 2 ? 58 : 82;
            return (
              <motion.g key={`${p.runId}-${r.id}`} initial={isNew && !reduce && p.runId ? { y: -90, opacity: 0 } : false} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: PADDLE }}
                className={info ? "text-ochre" : "text-ink"} onClick={r.id === "R1.quote_over_limit" ? () => setDam((d) => !d) : undefined}
                style={{ cursor: r.id === "R1.quote_over_limit" ? "pointer" : undefined }}>
                <line x1={x} x2={x} y1={ly + 6} y2={RT - 6} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="1 2" />
                <line x1={x - 3} x2={x - 3} y1={RT - 8} y2={RB + 6} stroke="currentColor" strokeWidth={1.6} />
                <line x1={x + 3} x2={x + 3} y1={RT - 8} y2={RB + 6} stroke="currentColor" strokeWidth={1.6} />
                {[0, 1, 2, 3, 4].map((k) => <line key={k} x1={x - 3} x2={x + 3} y1={RT + 4 + k * 12} y2={RT + 10 + k * 12} stroke="currentColor" strokeWidth={0.7} strokeOpacity={0.6} />)}
                <text x={x} y={ly - 10} textAnchor="middle" fontSize={10} fill="currentColor" className="font-mono" letterSpacing="0.04em">{gateLabel(r, {})}</text>
                <text x={x} y={ly} textAnchor="middle" fontSize={7.5} className="fill-stone font-mono">{r.id}</text>
                {isNew && <g className="text-cedar"><text x={x} y={ly - 22} textAnchor="middle" fontSize={8.5} fill="currentColor" className="font-mono" textDecoration="underline">new</text></g>}
                {plaque && <g><rect x={x - 46} y={RB + 10} width={92} height={14} rx={2} className="fill-paper stroke-cedar" strokeWidth={0.8} /><text x={x} y={RB + 20} textAnchor="middle" fontSize={8.5} className="fill-cedar font-mono">{plaque}</text></g>}
                {r.id === "R1.quote_over_limit" && <rect x={x - 40} y={ly - 20} width={80} height={RB - ly + 26} fill="transparent" role="button" aria-label="Open the dam" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setDam((d) => !d); }} />}
              </motion.g>
            );
          })}

          {/* ghosts + trails */}
          {list.map((c) => {
            if (!c.row.changed) return null;
            const raw = Math.min(1, Math.max(0, (now - c.start) / c.dur)); const f = ease(raw); const pos = at(c.path, f);
            const dim = p.highlight && `${c.row.from} -> ${c.row.to}` !== p.highlight;
            return (
              <g key={`t${c.id}`} opacity={dim ? 0.15 : 1}>
                {p.showGhosts && <path d={toD(c.ghost.pts)} fill="none" className="stroke-stone" strokeOpacity={0.75} strokeDasharray="3 4" strokeWidth={1} />}
                {raw > 0 && <path d={toD(([...c.path.pts.slice(0, pos.i), [pos.x, pos.y]] as Pt[]).filter((q) => q[1] < 298))} fill="none" className="stroke-cedar" strokeWidth={1.3} strokeOpacity={0.85} />}
              </g>
            );
          })}

          {/* canoes */}
          <motion.g animate={{ x: p.glide ? 10 : 0 }} transition={{ duration: 1.2, ease: PADDLE }}>
            {list.map((c) => {
              const raw = Math.min(1, Math.max(0, (now - c.start) / c.dur)); const f = ease(raw); const pos = at(c.path, f);
              if (raw >= 1) docked[c.dest.basin]++;
              const tf = c.path.turn / c.path.len, wake = f > tf && f < tf + 0.12 ? (f - tf) / 0.12 : null;
              const dockAge = raw >= 1 ? now - (c.start + c.dur) : -1;
              const ang = raw >= 1 || raw === 0 ? 0 : Math.max(-0.7, Math.min(0.7, pos.a)) * (180 / Math.PI);
              const dim = p.highlight && !(c.row.changed && `${c.row.from} -> ${c.row.to}` === p.highlight);
              return (
                <g key={c.id} opacity={dim ? 0.2 : 1}>
                  {wake != null && <path d={`M${pos.x - 10} ${pos.y + 4} q5 ${3 + wake * 4} 10 0 M${pos.x - 2} ${pos.y + 6} q6 ${2 + wake * 5} 12 0`} fill="none" className="stroke-stone" strokeOpacity={0.6 * (1 - wake)} strokeWidth={0.8} />}
                  {c.row.changed && dockAge >= 0 && dockAge < 900 && <circle cx={pos.x} cy={pos.y} r={4 + (dockAge / 900) * 16} fill="none" className="stroke-cedar" strokeOpacity={1 - dockAge / 900} />}
                  <g transform={`translate(${pos.x} ${pos.y}) rotate(${ang})`} style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHover({ id: c.id, x: pos.x, y: pos.y })} onMouseLeave={() => setHover(null)}
                    onClick={() => navigate({ to: "/review/$caseId", params: { caseId: c.id } })}>
                    <rect x={-15} y={-7} width={30} height={14} fill="transparent" />
                    <path d="M-13 -1 Q0 7 13 -1 Q0 2.2 -13 -1 Z" className={c.row.changed ? "fill-paper stroke-cedar" : "fill-paper stroke-ink"} strokeWidth={c.row.changed ? 1.4 : 1} strokeLinejoin="round" />
                    <path d="M-9 0.6 Q0 4 9 0.6" fill="none" className="stroke-stone" strokeWidth={0.5} />
                  </g>
                </g>
              );
            })}
          </motion.g>

          {/* closed, moored */}
          {closed.map((r, i) => { const x = 36 + i * 50, y = 340; return (
            <g key={r.case_id} transform={`translate(${x} ${y})`} style={{ cursor: "pointer" }} onMouseEnter={() => setHover({ id: r.case_id, x, y })} onMouseLeave={() => setHover(null)}
              onClick={() => navigate({ to: "/review/$caseId", params: { caseId: r.case_id } })}>
              <path d="M-13 -1 Q0 7 13 -1 Q0 2.2 -13 -1 Z" className="fill-paper stroke-stone" strokeWidth={1} />
              <path d="M16 -6 L16 8 M12 -3 L20 -3 M11 5 Q16 11 21 5" fill="none" className="stroke-stone" strokeWidth={0.9} strokeLinecap="round" />
            </g>); })}
          <text x={18} y={374} fontSize={9} className="fill-stone">Closed decisions stay as they are.</text>

          {/* counters */}
          <g className="font-mono" fontSize={10} letterSpacing="0.08em">
            <text x={BASINS.review.x0 + 10} y={296} className="fill-ink">REVIEW <tspan className="font-display" fontSize={16}>{docked.review}</tspan></text>
            <text x={BASINS.info.x0 + 10} y={296} className="fill-ochre">INFO NEEDED <tspan className="font-display" fontSize={16}>{docked.info}</tspan></text>
            <text x={1066} y={232} className="fill-reed">ROUTINE <tspan className="font-display" fontSize={16}>{docked.open}</tspan></text>
          </g>
        </svg>
        {!p.preview && <p className="pointer-events-none absolute inset-x-0 top-[62%] text-center font-display text-xl text-stone">Change a rule, then simulate.</p>}
      </div>
      {p.stale && <p className="absolute inset-x-0 top-[62%] text-center font-display text-xl text-ink">You changed the draft. Simulate again.</p>}

      {hover && (() => {
        const row = p.preview?.rows.find((r) => r.case_id === hover.id); if (!row) return null;
        return (
          <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border bg-paper px-2.5 py-1.5 font-mono text-[11px] shadow-sm" style={{ left: `${(hover.x / W) * 100}%`, top: `${((hover.y - 10) / H) * 100}%` }}>
            <span className="text-ink">{row.case_id}</span> · <RecommendationLabel recommendation={row.from} /> → <RecommendationLabel recommendation={row.to} closed={row.retained} /> · <span className="text-stone">{row.rule_to}</span>
          </div>
        );
      })()}

      {dam && qi >= 0 && limit != null && (
        <div className="absolute z-20 w-72 -translate-x-1/2 rounded-xl border bg-paper p-4 shadow-md" style={{ left: `${Math.min(80, Math.max(20, (gx(qi) / W) * 100))}%`, top: "50%" }}>
          <div className="flex items-baseline justify-between"><p className="eyebrow">The dam</p><button className="text-xs text-stone hover:text-ink" onClick={() => setDam(false)}>Close</button></div>
          <p className="mt-1 font-display text-2xl">Quote &gt; {euro(limit)}</p>
          {p.liveLimit != null && p.liveLimit !== limit && <p className="font-mono text-[11px] text-stone">live: {euro(p.liveLimit)}</p>}
          <input type="range" min={800} max={2000} step={100} value={limit} onChange={(e) => p.onLimit(Number(e.target.value))} className="mt-3 w-full accent-[var(--cedar)]" aria-label="Quote limit" />
          <div className="flex justify-between font-mono text-[10px] text-stone"><span>€800</span><span>€2,000</span></div>
          <p className="mt-3 font-mono text-[11px] text-ink">Escalations: {p.escalations} · Review time ≈ {p.escalations} × 9 min = {p.escalations * 9} min</p>
          <p className="mt-1 text-xs text-stone">This edits the draft only.</p>
        </div>
      )}
    </div>
  );
}
