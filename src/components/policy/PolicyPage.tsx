import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from "lucide-react";
import { Accent, Wordmark } from "@/components/canoe/brand";
import { PencilBackdrop } from "@/components/canoe/PencilBackdrop";
import { RecommendationLabel } from "@/components/canoe/RecommendationLabel";
import { LocksScene } from "./LocksScene";
import { getPolicyApi, type Draft, type PolicyDoc, type PolicyVersion, type Preview, type PublishResult, type Rule, type Cond } from "@/lib/policy/api";
import { demoDraft, DEMO_TITLE, toDraft, withLimit } from "@/lib/policy/mock";
import { defaultCond, describeDiff, OP_WORDS, opsFor, quoteLimitOf, SELECT_OPTIONS, valueText } from "@/lib/policy/text";
import { cn } from "@/lib/utils";

const key = (d: Draft) => JSON.stringify(d);
const two = (n: number) => String(n).padStart(2, "0");
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const nextV = (v: string) => `v${Number(v.slice(1)) + 1}`;
const REC_FROM_KEY = (s: string) => s.split(" -> ") as [string, string];

function useAuthor(): [string, (s: string) => void] {
  const [name, setName] = useState("Jury");
  useEffect(() => { try { const s = localStorage.getItem("canoe.reviewer"); if (s) setName(s); } catch { /* storage off */ } }, []);
  return [name, (s) => { setName(s); try { localStorage.setItem("canoe.reviewer", s); } catch { /* storage off */ } }];
}

function Step({ n, title, children, aside }: { n: number; title: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="border-t border-stone/25 pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="flex items-baseline gap-4"><span className="font-mono text-sm text-stone">{two(n)}</span><span className="font-display text-3xl">{title}</span></h2>
        {aside}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function PolicyPage() {
  const api = getPolicyApi();
  const [doc, setDoc] = useState<PolicyDoc | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewKey, setPreviewKey] = useState("");
  const [simErr, setSimErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [runId, setRunId] = useState(0);
  const [skip, setSkip] = useState(0);
  const [ghosts, setGhosts] = useState(true);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [damPending, setDamPending] = useState(false);
  const [viewing, setViewing] = useState<PolicyVersion | null>(null);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [glide, setGlide] = useState(0);
  const damTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = () => api.getPolicy().then((d) => { setDoc(d); setLoadErr(null); return d; }).catch((e) => { setLoadErr(e.message); return null; });
  useEffect(() => { load().then((d) => { if (d) setDraft(toDraft(d.versions.find((v) => v.version === d.latest)!)); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const liveV = doc?.versions.find((v) => v.version === doc.latest);
  const live = useMemo(() => (liveV ? toDraft(liveV) : null), [liveV]);
  if (loadErr) return <Shell><p className="mt-10 text-stone">{loadErr} <button className="underline" onClick={load}>Retry</button></p></Shell>;
  if (!doc || !draft || !live || !liveV) return <Shell><p className="mt-10 font-mono text-xs text-stone">Loading policy…</p></Shell>;

  const draftV = nextV(doc.latest);
  const drafting = key(draft) !== key(live) || draft.title !== live.title;
  const fresh = !!preview && previewKey === key(draft);
  const stale = !!preview && !fresh && !damPending;

  const runPreview = async (d: Draft, newRun: boolean) => {
    setBusy(true); setSimErr(null);
    try {
      const p = await api.preview(d);
      setPreview(p); setPreviewKey(key(d)); setResult(null);
      if (newRun) { setRunId((r) => r + 1); setHighlight(null); }
    } catch (e) { setSimErr((e as Error).message); }
    finally { setBusy(false); setDamPending(false); }
  };
  const onLimit = (v: number) => {
    const d = withLimit(draft, v); setDraft(d);
    if (!preview) return;
    if (api.mode === "mock") { runPreview(d, false); return; }
    setDamPending(true); clearTimeout(damTimer.current);
    damTimer.current = setTimeout(() => runPreview(d, false), 300);
  };
  const escalations = preview ? Object.entries(preview.moves).filter(([k]) => k.endsWith("-> human_review")).reduce((s, [, n]) => s + n, 0) : 0;

  return (
    <Shell>
      <div className="mt-8">
        <p className="eyebrow">Policy</p>
        <h1 className="mt-2 font-display text-5xl leading-[1.05] md:text-6xl">Rules <Accent>change</Accent>. Decisions hold.</h1>
        <div className="mt-5 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em]">
          {doc.versions.map((v) => {
            const isLive = v.version === doc.latest;
            return (
              <button key={v.version} onClick={() => setViewing(isLive || viewing?.version === v.version ? null : v)}
                className={cn("rounded-full border px-3 py-1", isLive ? "border-ink text-ink" : "border-stone/40 text-stone hover:text-ink", viewing?.version === v.version && "border-cedar text-cedar")}>
                {v.version} · {isLive ? "live" : "earlier"} · by {v.meta.published_by}
              </button>
            );
          })}
          {drafting && <span className="rounded-full border border-dashed border-cedar px-3 py-1 text-cedar">{draftV} · draft</span>}
        </div>
        {viewing && <ReadOnly v={viewing} fields={doc.fields} onClose={() => setViewing(null)} />}
      </div>

      <div className="mt-12 space-y-14">
        <Step n={1} title="Change">
          <RuleEditor draft={draft} live={live} fields={doc.fields} setDraft={setDraft} version={draftV} liveVersion={doc.latest} />
        </Step>

        <Step n={2} title="Simulate" aside={api.mode === "mock" && <span className="font-mono text-[11px] text-stone">demo data · 26 cases</span>}>
          <div className="card-calm overflow-hidden p-3 md:p-5">
            <LocksScene draft={draft} live={live} preview={preview} stale={stale} runId={runId} skipToken={skip} glide={glide}
              showGhosts={ghosts} highlight={highlight} liveLimit={quoteLimitOf(live.rules)} escalations={escalations} onLimit={onLimit} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button className="btn-cedar px-5 py-2 text-sm" disabled={busy} onClick={() => runPreview(draft, true)}>{stale ? "Simulate again" : "Simulate"}</button>
            <button className="btn-quiet px-4 py-2 text-sm" disabled={!fresh} onClick={() => setRunId((r) => r + 1)}>Replay</button>
            <button className="btn-quiet px-4 py-2 text-sm" disabled={!preview} onClick={() => setSkip((s) => s + 1)}>Skip animation</button>
            <label className="ml-1 flex items-center gap-2 text-sm text-stone"><input type="checkbox" checked={ghosts} onChange={(e) => setGhosts(e.target.checked)} className="accent-[var(--cedar)]" /> Show v1 routes</label>
            <span className="text-xs text-stone">Click the quote gate to open the dam.</span>
          </div>
          {simErr && <p className="mt-3 text-sm text-cedar">{simErr}</p>}
        </Step>

        <Step n={3} title="Check">
          {preview ? <Dashboard p={preview} stale={stale} highlight={highlight} setHighlight={setHighlight} /> : <p className="text-stone">Change a rule, then simulate.</p>}
        </Step>

        <Step n={4} title="Release">
          <Release draft={draft} version={draftV} fresh={fresh} drafting={drafting} preview={preview} result={result}
            onPublish={async (b) => {
              const r = await api.publish({ draft, ...b });
              setGlide((g) => g + 1);
              const d = await load();
              setResult(r);
              if (d) { const nd = toDraft(d.versions.find((v) => v.version === d.latest)!); setDraft(nd); setPreviewKey(key(nd)); }
              return r;
            }} />
        </Step>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pb-32">
      <div style={{ opacity: 0.3 }}><PencilBackdrop /></div>
      <header className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 pt-5 md:px-8">
        <div className="flex items-center gap-4">
          <Wordmark />
          <nav className="hidden gap-4 font-mono text-[11px] uppercase tracking-[0.14em] text-stone sm:flex">
            <Link to="/review" className="hover:text-ink">Review</Link>
            <Link to="/policy" className="text-ink">Policy</Link>
            <Link to="/cases" className="hover:text-ink">Cases</Link>
            <Link to="/rows" className="hover:text-ink">Rows</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-5 md:px-8">{children}</main>
    </div>
  );
}

function ruleSentence(r: Rule, fields: Record<string, string>) {
  return `If ${r.when.map((c) => `${fields[c.field] ?? c.field} ${OP_WORDS[c.op]}${c.value != null ? ` ${valueText(c)}` : ""}`).join(" and ")}`;
}
function ReadOnly({ v, fields, onClose }: { v: PolicyVersion; fields: Record<string, string>; onClose: () => void }) {
  return (
    <div className="card-calm mt-4 p-5">
      <div className="flex items-baseline justify-between"><p className="eyebrow">{v.version} · read-only · {v.meta.note}</p><button className="text-xs text-stone hover:text-ink" onClick={onClose}>Close</button></div>
      <ol className="mt-3 space-y-1.5 text-sm">
        {v.rules.map((r, i) => <li key={r.id} className="flex gap-3"><span className="font-mono text-xs text-stone">{two(i + 1)}</span>{ruleSentence(r, fields)} → <RecommendationLabel recommendation={r.outcome} /></li>)}
        <li className="flex gap-3"><span className="font-mono text-xs text-stone">··</span>Otherwise → <RecommendationLabel recommendation="routine_processing" /></li>
      </ol>
    </div>
  );
}

/* ---------------- 01 CHANGE ---------------- */
function RuleEditor({ draft, live, fields, setDraft, version, liveVersion }: { draft: Draft; live: Draft; fields: Record<string, string>; setDraft: (d: Draft) => void; version: string; liveVersion: string }) {
  const [json, setJson] = useState<string | null>(null);
  const [jsonErr, setJsonErr] = useState<string | null>(null);
  const drag = useRef<number | null>(null);
  const liveById = new Map(live.rules.map((r) => [r.id, r]));
  const removed = live.rules.filter((r) => !draft.rules.some((d) => d.id === r.id));
  const set = (rules: Rule[]) => setDraft({ ...draft, rules });
  const upd = (i: number, r: Rule) => set(draft.rules.map((x, j) => (j === i ? r : x)));
  const move = (i: number, j: number) => { if (j < 0 || j >= draft.rules.length) return; const rs = [...draft.rules]; const [x] = rs.splice(i, 1); if (x) rs.splice(j, 0, x); set(rs); };
  const addRule = () => { let n = 1; while (draft.rules.some((r) => r.id === `R1.custom_${n}`)) n++; set([...draft.rules, { id: `R1.custom_${n}`, outcome: "human_review", reason: "", when: [defaultCond("injury_reported")] }]); };

  return (
    <div>
      <p className="font-display text-xl text-ink">{describeDiff(live, draft, version, fields)}</p>
      {draft.title === DEMO_TITLE && <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-cedar">Demo change (replace with the official v2)</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-quiet px-4 py-1.5 text-sm" onClick={() => setDraft(demoDraft())}>Load demo change</button>
        <button className="btn-quiet px-4 py-1.5 text-sm" onClick={() => setDraft(JSON.parse(JSON.stringify(live)))}>Reset to {liveVersion}</button>
        <button className="btn-quiet px-4 py-1.5 text-sm" onClick={() => { setJson(json == null ? JSON.stringify(draft, null, 2) : null); setJsonErr(null); }}>{json == null ? "Edit as JSON" : "Close JSON"}</button>
      </div>
      {json != null && (
        <div className="mt-3">
          <textarea value={json} onChange={(e) => setJson(e.target.value)} className="field-input h-72 w-full p-3 font-mono text-xs" spellCheck={false} aria-label="Draft as JSON" />
          <div className="mt-2 flex items-center gap-3">
            <button className="btn-cedar px-4 py-1.5 text-sm" onClick={() => {
              try { const d = JSON.parse(json) as Draft; if (!Array.isArray(d.rules) || !d.default) throw new Error(); setDraft({ title: d.title ?? draft.title, rules: d.rules, default: d.default }); setJsonErr(null); setJson(null); }
              catch { setJsonErr("That isn't a valid draft. It needs title, rules and default."); }
            }}>Apply JSON</button>
            {jsonErr && <span className="text-sm text-cedar">{jsonErr}</span>}
          </div>
        </div>
      )}

      <ol className="mt-6 divide-y divide-stone/20 border-y border-stone/20">
        {draft.rules.map((r, i) => {
          const old = liveById.get(r.id);
          return (
            <li key={r.id} draggable onDragStart={() => { drag.current = i; }} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag.current != null) move(drag.current, i); drag.current = null; }}
              className="group flex flex-wrap items-start gap-x-3 gap-y-2 py-3">
              <span className="cursor-grab pt-1.5 text-stone" aria-hidden><GripVertical className="size-4" /></span>
              <span className="w-6 pt-1.5 font-mono text-xs text-stone">{two(i + 1)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[15px]">
                  <span>If</span>
                  {r.when.map((c, ci) => <CondEditor key={ci} c={c} old={old?.when[ci]} fields={fields} onChange={(nc) => upd(i, { ...r, when: r.when.map((x, k) => (k === ci ? nc : x)) })} />)}
                  <span>→</span>
                  <div className="inline-flex overflow-hidden rounded-full border border-stone/35">
                    {(["human_review", "request_information"] as const).map((o) => (
                      <button key={o} onClick={() => upd(i, { ...r, outcome: o })} aria-pressed={r.outcome === o}
                        className={cn("px-2.5 py-1", r.outcome === o ? "bg-mist" : "opacity-50 hover:opacity-100")}><RecommendationLabel recommendation={o} /></button>
                    ))}
                  </div>
                  {old && old.outcome !== r.outcome && <span className="font-mono text-[11px] text-stone line-through">{old.outcome === "human_review" ? "REVIEW" : "INFO NEEDED"}</span>}
                  {!old && <span className="font-mono text-[11px] text-cedar underline">new</span>}
                  {r.outcome === "request_information" && (
                    <label className="flex items-center gap-1.5 text-xs text-stone"><input type="checkbox" checked={!!r.blank_counts_as_match} onChange={(e) => upd(i, { ...r, blank_counts_as_match: e.target.checked })} className="accent-[var(--cedar)]" />A blank counts as missing</label>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-[11px] text-stone">{r.id}</span>
                  <input value={r.reason} onChange={(e) => upd(i, { ...r, reason: e.target.value })} placeholder="Reason, in one short sentence" className="min-w-0 flex-1 border-b border-transparent bg-transparent text-xs text-stone focus:border-cedar focus:outline-none" aria-label={`Reason for ${r.id}`} />
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100">
                <button className="rounded p-1 hover:bg-mist" aria-label="Move up" onClick={() => move(i, i - 1)}><ArrowUp className="size-3.5" /></button>
                <button className="rounded p-1 hover:bg-mist" aria-label="Move down" onClick={() => move(i, i + 1)}><ArrowDown className="size-3.5" /></button>
                <button className="rounded p-1 hover:bg-mist" aria-label={`Delete ${r.id}`} onClick={() => set(draft.rules.filter((_, j) => j !== i))}><Trash2 className="size-3.5" /></button>
              </div>
            </li>
          );
        })}
        {removed.map((r) => (
          <li key={`rm-${r.id}`} className="flex items-center gap-3 py-3 text-stone">
            <span className="w-4" /><span className="w-6 font-mono text-xs">—</span>
            <span className="flex-1 line-through">{ruleSentence(r, fields)} → {r.outcome === "human_review" ? "REVIEW" : "INFO NEEDED"}</span>
            <span className="font-mono text-[11px]">removed</span>
            <button className="text-xs underline hover:text-ink" onClick={() => { const idx = live.rules.findIndex((x) => x.id === r.id); const rs = [...draft.rules]; rs.splice(Math.min(idx, rs.length), 0, r); set(rs); }}>Undo</button>
          </li>
        ))}
        <li className="flex items-center gap-3 py-3">
          <span className="w-4" /><span className="w-6 font-mono text-xs text-stone">··</span>
          <span>Otherwise →</span><RecommendationLabel recommendation="routine_processing" />
        </li>
      </ol>
      <button className="btn-quiet mt-3 px-4 py-1.5 text-sm" onClick={addRule}>Add a rule</button>
    </div>
  );
}

function CondEditor({ c, old, fields, onChange }: { c: Cond; old?: Cond | undefined; fields: Record<string, string>; onChange: (c: Cond) => void }) {
  const ops = opsFor(c.field);
  const valChanged = old && old.field === c.field && JSON.stringify(old.value) !== JSON.stringify(c.value) && old.value != null;
  const sel = "field-input px-2 py-1 text-sm";
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <select value={c.field} onChange={(e) => onChange(defaultCond(e.target.value))} className={sel} aria-label="Field">
        {Object.entries(fields).map(([f, l]) => <option key={f} value={f}>{l}</option>)}
      </select>
      <select value={c.op} onChange={(e) => { const op = e.target.value as Cond["op"]; const multi = op === "in" || op === "not_in";
        const v = SELECT_OPTIONS[c.field] ? (multi ? (Array.isArray(c.value) ? c.value : [String(c.value ?? SELECT_OPTIONS[c.field]![0])]) : (Array.isArray(c.value) ? c.value[0] : c.value)) : c.value;
        onChange(v === undefined ? { field: c.field, op } : { ...c, op, value: v }); }} className={sel} aria-label="Operator">
        {ops.map((o) => <option key={o} value={o}>{OP_WORDS[o]}</option>)}
      </select>
      {valChanged && <span className="font-mono text-xs text-stone line-through">{valueText(old!)}</span>}
      {valChanged && <span className="text-stone">→</span>}
      {c.field === "quote_eur" && (
        <span className={cn("inline-flex items-center rounded-xl border pl-2", valChanged ? "border-cedar" : "border-stone/30")}>
          <span className="text-sm text-stone">€</span>
          <input type="number" value={Number(c.value ?? 0)} onChange={(e) => onChange({ ...c, value: Number(e.target.value) })} className="w-20 bg-transparent px-1 py-1 text-sm focus:outline-none" aria-label="Amount" />
        </span>
      )}
      {SELECT_OPTIONS[c.field] && (c.op === "in" || c.op === "not_in" ? (
        <span className="inline-flex gap-2">
          {SELECT_OPTIONS[c.field]!.map((o) => { const arr = Array.isArray(c.value) ? c.value : []; return (
            <label key={o} className="flex items-center gap-1 font-mono text-xs"><input type="checkbox" checked={arr.includes(o)} className="accent-[var(--cedar)]"
              onChange={(e) => onChange({ ...c, value: e.target.checked ? [...arr, o] : arr.filter((x) => x !== o) })} />{o}</label>); })}
        </span>
      ) : (
        <select value={String(c.value ?? "")} onChange={(e) => onChange({ ...c, value: e.target.value })} className={cn(sel, "font-mono text-xs", valChanged && "border-cedar")} aria-label="Value">
          {SELECT_OPTIONS[c.field]!.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ))}
    </span>
  );
}

/* ---------------- 03 CHECK ---------------- */
function Num({ label, value, className, children }: { label: string; value: ReactNode; className?: string; children?: ReactNode }) {
  return <div className="card-calm p-5"><p className="eyebrow">{label}</p><p className={cn("mt-2 font-display text-5xl leading-none", className)}>{value}</p>{children}</div>;
}
function Dashboard({ p, stale, highlight, setHighlight }: { p: Preview; stale: boolean; highlight: string | null; setHighlight: (s: string | null) => void }) {
  const open = p.rows.filter((r) => !r.retained);
  const changed = open.filter((r) => r.changed);
  const before = open.filter((r) => r.from === "routine_processing").length, after = open.filter((r) => r.to === "routine_processing").length;
  const toRoutine = Object.entries(p.moves).filter(([k]) => k.endsWith("-> routine_processing")).reduce((s, [, n]) => s + n, 0);
  const verdict = `${p.changed} open claim${p.changed === 1 ? "" : "s"} would change. ${p.closed_untouched} closed claim${p.closed_untouched === 1 ? "" : "s"} stay as decided. ${toRoutine ? `${toRoutine} would become routine that weren't.` : "Nothing becomes routine that wasn't."}`;
  const byRule: Record<string, number> = {};
  for (const r of changed) { const id = r.rule_to.replace(/^v\d+:/, ""); byRule[id] = (byRule[id] ?? 0) + 1; }
  const maxMove = Math.max(1, ...Object.values(p.moves));
  const vFrom = p.draft_quality.versions[p.from_version] ?? {}, vTo = p.draft_quality.versions[p.to_version] ?? {};
  const cc = p.draft_quality.changed_cases;
  return (
    <div className={cn("transition-opacity", stale && "opacity-40")}>
      <p className="font-display text-2xl">{verdict}</p>
      <div className="mt-6 grid grid-cols-12 gap-4">
        <div className="col-span-6 md:col-span-3"><Num label="Open claims re-run" value={p.open_claims} /></div>
        <div className="col-span-6 md:col-span-3"><Num label="Change" value={p.changed} className="text-cedar" /></div>
        <div className="col-span-6 md:col-span-3"><Num label="Unchanged" value={p.open_claims - p.changed} /></div>
        <div className="col-span-6 md:col-span-3"><Num label="Closed, protected" value={<span className="inline-flex items-baseline gap-2">{p.closed_untouched}<svg viewBox="0 0 24 24" className="size-7 text-stone" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden><circle cx="12" cy="5" r="2" /><path d="M12 7v14M7 11h10M4 15q2 6 8 6t8-6" /></svg></span>} /></div>

        <div className="col-span-12 md:col-span-4"><Num label="Straight-through share" value={<>{pct(before, open.length)} <span className="text-stone">→</span> {pct(after, open.length)}</>}>
          <p className="mt-2 text-sm text-stone">{after < before ? "Fewer claims pass without a person." : after > before ? "More claims pass without a person." : "The same share passes without a person."}</p></Num></div>

        <div className="card-calm col-span-12 p-5 md:col-span-4">
          <p className="eyebrow">Moves</p>
          <ul className="mt-3 space-y-2">
            {Object.entries(p.moves).map(([k, n]) => { const [a, b] = REC_FROM_KEY(k); const on = highlight === k; return (
              <li key={k}><button onClick={() => setHighlight(on ? null : k)} className={cn("w-full text-left", on && "text-cedar")} aria-pressed={on}>
                <span className="flex items-baseline justify-between"><span><RecommendationLabel recommendation={a} /> → <RecommendationLabel recommendation={b} /></span><span className="font-display text-xl">{n}</span></span>
                <span className="mt-1 block h-px bg-ink/60" style={{ width: `${(n / maxMove) * 100}%`, ...(on ? { background: "var(--cedar)" } : {}) }} />
              </button></li>); })}
            {!Object.keys(p.moves).length && <li className="text-sm text-stone">No moves.</li>}
          </ul>
          {!!Object.keys(p.moves).length && <p className="mt-3 text-xs text-stone">Click a move to find its canoes.</p>}
        </div>

        <div className="card-calm col-span-12 p-5 md:col-span-4">
          <p className="eyebrow">By rule</p>
          <ul className="mt-3 space-y-1.5 font-mono text-sm">{Object.entries(byRule).map(([id, n]) => <li key={id} className="flex justify-between"><span>{id}</span><span className="font-display text-xl">{n}</span></li>)}</ul>
          {!changed.length && <p className="text-sm text-stone">No rule changed a claim.</p>}
        </div>

        <div className="card-calm col-span-12 p-5 md:col-span-6">
          <p className="eyebrow">Quality on labelled cases</p>
          <table className="mt-3 w-full text-sm">
            <thead><tr className="text-left font-mono text-[11px] uppercase tracking-[0.08em] text-stone"><th className="pb-2 font-normal"></th><th className="pb-2 font-normal">{p.from_version}</th><th className="pb-2 font-normal">{p.to_version} draft</th></tr></thead>
            <tbody>
              {([["Correct", (v: typeof vFrom) => v.correct != null ? `${v.correct} / ${v.n}` : null, ""], ["Wrong routine", (v: typeof vFrom) => v.incorrect_routine, "text-cedar font-semibold"], ["Unnecessary escalations", (v: typeof vFrom) => v.unnecessary_human_review, ""]] as const).map(([l, g, cls]) => (
                <tr key={l} className="border-t border-stone/20"><td className={cn("py-2", cls)}>{l === "Wrong routine" ? <span className="recommendation-label">Wrong routine</span> : l}</td><td className={cn("py-2 font-display text-xl", cls)}>{g(vFrom) ?? "—"}</td><td className={cn("py-2 font-display text-xl", cls)}>{g(vTo) ?? "—"}</td></tr>
              ))}
            </tbody>
          </table>
          {vTo.note && <p className="mt-3 text-sm text-stone">No labels for {p.to_version} yet — import expected_{p.to_version} to measure it.</p>}
        </div>

        <div className="card-calm col-span-12 p-5 md:col-span-6">
          <p className="eyebrow">Changed labelled cases · {cc.count}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {cc.cases.map((c) => (
              <li key={c.case_id} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-stone/20 pt-2">
                <span className="font-mono">{c.case_id} <RecommendationLabel recommendation={c.from} /> → <RecommendationLabel recommendation={c.to} /></span>
                <span className="font-mono text-xs text-stone">before: {c.correct_before == null ? "unknown" : c.correct_before ? "correct" : "wrong"} · after: {c.correct_after == null ? "unknown" : c.correct_after ? "correct" : "wrong"}</span>
              </li>
            ))}
            {!cc.cases.length && <li className="text-stone">None.</li>}
          </ul>
        </div>

        <div className="card-calm col-span-12 p-5">
          <p className="eyebrow">Changed cases</p>
          <table className="mt-3 w-full text-sm">
            <thead><tr className="text-left font-mono text-[11px] uppercase tracking-[0.08em] text-stone"><th className="pb-2 font-normal">Case</th><th className="pb-2 font-normal">From → to</th><th className="pb-2 font-normal">Rule</th><th className="pb-2 font-normal">Summary</th><th /></tr></thead>
            <tbody>{changed.map((r) => (
              <tr key={r.case_id} className="border-t border-stone/20">
                <td className="py-2 font-mono">{r.case_id}</td>
                <td className="py-2"><RecommendationLabel recommendation={r.from} /> → <RecommendationLabel recommendation={r.to} /></td>
                <td className="py-2 font-mono text-xs">{r.rule_to}</td>
                <td className="py-2 text-stone">{r.summary}</td>
                <td className="py-2 text-right"><Link to="/review/$caseId" params={{ caseId: r.case_id }} className="text-cedar underline underline-offset-2">Open in review</Link></td>
              </tr>))}
              {!changed.length && <tr><td colSpan={5} className="py-2 text-stone">No open claim changes.</td></tr>}
            </tbody>
          </table>
          {p.warnings.map((w, i) => <p key={i} className="mt-3 text-sm text-stone">Note: {w}</p>)}
        </div>
      </div>
    </div>
  );
}

/* ---------------- 04 RELEASE ---------------- */
function Release({ draft, version, fresh, drafting, preview, result, onPublish }: {
  draft: Draft; version: string; fresh: boolean; drafting: boolean; preview: Preview | null; result: PublishResult | null;
  onPublish: (b: { published_by: string; approved_by: string; note: string }) => Promise<PublishResult>;
}) {
  const [author, setAuthor] = useAuthor();
  const [approver, setApprover] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const same = !!approver.trim() && approver.trim().toLowerCase() === author.trim().toLowerCase();
  const approved = fresh && !!approver.trim() && !same && !!note.trim();
  const stepIdx = result ? 3 : approved ? 2 : fresh && drafting ? 1 : 0;
  const steps = ["Draft", "Previewed", "Approved", "Live"];
  const canPublish = fresh && drafting && !!author.trim() && !!approver.trim() && !same && !!note.trim() && !busy;
  void draft;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <ol className="flex flex-wrap items-baseline gap-3 font-mono text-[12px] uppercase tracking-[0.08em]">
          {steps.map((s, i) => <li key={s} className="flex items-baseline gap-3"><span className={i === stepIdx ? "text-ink" : i < stepIdx ? "text-stone" : "text-stone/50"}>{i === stepIdx ? <Accent>{s}</Accent> : s}</span>{i < 3 && <span className="text-stone/50">→</span>}</li>)}
        </ol>
      </div>
      {result ? (
        <div className="card-calm col-span-12 p-6 md:col-span-8">
          <p className="eyebrow">Released</p>
          <p className="mt-2 font-display text-3xl leading-[1.1]">{result.version} is <Accent>live</Accent> · {result.change_timing.duration_minutes} min from first preview to live · {result.change_timing.open_claims_rechecked} open claims sent to review</p>
          <p className="mt-2 text-sm text-stone">Large insurers report weeks to months for this.{result.note ? ` (${result.note})` : ""}</p>
          <Link to="/review" className="mt-4 inline-block text-cedar underline underline-offset-2">See them in Review</Link>
        </div>
      ) : (
        <form className="col-span-12 grid gap-4 md:col-span-8" onSubmit={async (e) => {
          e.preventDefault(); if (!canPublish) return; setBusy(true); setErr(null);
          try { await onPublish({ published_by: author.trim(), approved_by: approver.trim(), note: note.trim() }); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
        }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="eyebrow">Author</span><input value={author} onChange={(e) => setAuthor(e.target.value)} className="field-input mt-1 w-full px-3 py-2" /></label>
            <label className="block"><span className="eyebrow">Approver</span><input value={approver} onChange={(e) => setApprover(e.target.value)} className="field-input mt-1 w-full px-3 py-2" placeholder="Someone else" />
              {same && <span className="mt-1 block text-sm text-cedar">The approver must be someone other than the author.</span>}</label>
          </div>
          <label className="block"><span className="eyebrow">What changed and why</span><textarea value={note} onChange={(e) => setNote(e.target.value)} className="field-input mt-1 h-24 w-full px-3 py-2" /></label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-cedar px-6 py-2.5" disabled={!canPublish}>{busy ? "Publishing…" : `Publish ${version}`}</button>
            {!drafting ? <span className="text-sm text-stone">Change a rule first.</span> : !preview ? <span className="text-sm text-stone">Simulate first.</span> : !fresh ? <span className="text-sm text-stone">You changed the draft. Simulate again.</span> : null}
          </div>
          {err && <p className="text-sm text-cedar">{err}</p>}
        </form>
      )}
    </div>
  );
}


