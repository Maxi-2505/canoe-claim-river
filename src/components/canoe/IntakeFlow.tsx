import canoeArt from "@/assets/canoe-engraving.jpg.asset.json";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Building2, Car, FileText, HeartPulse, Home, User } from "lucide-react";
import { toast } from "sonner";
import { motorConfig as config } from "@/lib/intake/config";
import {
  answer, applyDocument, emptyState, injuryReported, isSettled, isVisible, nextQuestion,
  orderedQuestions, progress, skippedCount, upcoming,
} from "@/lib/intake/logic";
import type { IntakeState, Mode } from "@/lib/intake/types";
import { submitClaim, updateClaim } from "@/lib/claims.functions";
import { HorizonLine, Wordmark } from "./brand";
import { RiverProgress } from "./RiverProgress";
import { ClaimFilePanel, ClaimFilePill } from "./ClaimFile";
import { QuestionCard } from "./QuestionCard";
import { DocumentPicker, type ConfirmedDoc } from "./DocumentStep";
import { displayValue } from "./display";
import { useCalmMotion } from "./motion";
import { DemoMenu, type Preset } from "./DemoMenu";

type Screen = "start" | "preview" | "docs" | "question" | "review" | "done";
interface Saved { screen: Screen; state: IntakeState; history: string[] }
const STORAGE = "canoe-intake-v1";

export function IntakeFlow({ mode = { kind: "intake" }, initialState, caseId, header, quoteTotal }: {
  mode?: Mode; initialState?: IntakeState; caseId?: string; header?: React.ReactNode; quoteTotal?: number | undefined;
}) {
  const missing = mode.kind === "missing";
  const [screen, setScreen] = useState<Screen>(missing ? "question" : "start");
  const [state, setState] = useState<IntakeState>(initialState ?? emptyState());
  const [history, setHistory] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ id: string; toReview: boolean } | null>(null);
  const [previewLine, setPreviewLine] = useState<"home" | "health" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);
  const loaded = useRef(false);
  const { advance } = useCalmMotion();

  // Autosave after every answer (intake mode only).
  useEffect(() => {
    if (missing) { loaded.current = true; return; }
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const s = JSON.parse(raw) as Saved;
        if (s.screen !== "done" && s.screen !== "preview") { setState(s.state); setHistory(s.history); setScreen(s.screen); }
      }
    } catch { /* ignore */ }
    loaded.current = true;
  }, [missing]);
  useEffect(() => {
    if (!loaded.current || missing) return;
    localStorage.setItem(STORAGE, JSON.stringify({ screen, state, history } satisfies Saved));
  }, [screen, state, history, missing]);

  const current = useMemo(() => {
    if (editing) return config.questions.find((q) => q.id === editing.id) ?? null;
    return nextQuestion(state, config, mode);
  }, [editing, state, mode]);

  useEffect(() => {
    if (screen === "question" && !current) setScreen("review");
  }, [screen, current]);

  const p = progress(state, config);
  const skipped = skippedCount(state, config);
  const injury = injuryReported(state);
  const comingUp = upcoming(state, config, mode).filter((q) => q.id !== current?.id).slice(0, 4);
  const confirmedDocIds = Object.values(state.uploads).map((u) => u?.sampleId).filter(Boolean) as string[];

  const onAnswer = (value: string | number | null) => {
    if (!current) return;
    setState((s) => answer(s, current.id, value));
    if (editing?.toReview) { setEditing(null); setScreen("review"); return; }
    setHistory((h) => [...h, current.id]);
    setEditing(null);
  };
  const onDocument = (c: ConfirmedDoc) => setState((s) => applyDocument(s, c.kind, c.extracted, c.edited));
  const back = () => {
    if (editing?.toReview) { setEditing(null); setScreen("review"); return; }
    const prev = history.at(-1);
    if (prev) { setHistory((h) => h.slice(0, -1)); setEditing({ id: prev, toReview: false }); }
    else if (!missing) setScreen("docs");
  };

  useEffect(() => {
    if (screen !== "question") return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "Backspace" && el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") { e.preventDefault(); back(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = caseId ? await updateClaim({ data: { caseId, state, ...(mode.kind === "missing" ? { missing: mode.missing } : {}) } }) : await submitClaim({ data: { state } });
      setDoneId(res.caseId);
      setScreen("done");
      if (!missing) localStorage.removeItem(STORAGE);
    } catch {
      toast("We couldn't send your claim just now. Please try again in a moment.");
    } finally { setSubmitting(false); }
  };

  const applyPreset = (preset: Preset | "reset") => {
    setEditing(null); setHistory([]);
    if (preset === "reset") { setState(emptyState()); setScreen("start"); localStorage.removeItem(STORAGE); return; }
    setState(preset.state); setScreen("review");
  };

  const total = screen === "done" ? 1 : p.total;
  const done = screen === "done" ? 1 : p.done;

  return (
    <div className="relative isolate min-h-screen">
      <div aria-hidden="true" className="canoe-backdrop" style={{ backgroundImage: `url(${canoeArt.url})` }} />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 pt-6 md:px-8">
        <Wordmark />
        {(screen === "question" || screen === "docs") && <ClaimFilePill state={state} config={config} />}
      </header>
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto mt-6 max-w-[560px] lg:mx-0">
          {screen !== "start" && screen !== "preview" && <RiverProgress done={done} total={total} label={screen === "done" ? "All details in" : undefined} />}
        </div>
      </div>

      <main className="mx-auto grid max-w-6xl gap-10 px-5 pb-24 pt-8 md:px-8 lg:grid-cols-[minmax(0,560px)_320px] lg:justify-between">
        <div className="min-w-0">
          {header}
          <AnimatePresence mode="wait">
            {screen === "start" && (
              <motion.section key="start" {...advance} className="space-y-6">
                <div>
                  <p className="eyebrow mb-4">Report a claim / about five minutes</p>
                  <h1 className="question-title">What <em className="text-cedar">happened?</em></h1>
                  <p className="mt-3 text-sm text-stone">Pick what your claim is about. We collect the facts. We never decide the claim.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <button onClick={() => setScreen("docs")} className="answer-btn flex flex-col items-start gap-6 p-5 text-left">
                    <Car className="size-6 text-cedar" /><span className="font-display text-lg">My car</span>
                  </button>
                  {([["home", Home, "My home"], ["health", HeartPulse, "My health"]] as const).map(([k, Icon, label]) => (
                    <button key={k} onClick={() => { setPreviewLine(k); setScreen("preview"); }} className="answer-btn flex flex-col items-start gap-6 p-5 text-left">
                      <span className="flex w-full items-start justify-between"><Icon className="size-6 text-stone" /><span className="rounded-full border border-stone/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-stone">Preview</span></span>
                      <span className="font-display text-lg">{label}</span>
                    </button>
                  ))}
                </div>
              </motion.section>
            )}

            {screen === "preview" && previewLine && (
              <motion.section key="preview" {...advance}><PreviewFlow line={previewLine} onExit={() => setScreen("start")} /></motion.section>
            )}

            {screen === "docs" && (
              <motion.section key="docs" {...advance} className="space-y-6">
                <div>
                  <h1 className="question-title">Have your repair quote or police report?</h1>
                  <p className="mt-3 text-sm text-stone">Add them and we'll fill in what we can — fewer questions for you.</p>
                </div>
                <DocumentPicker confirmedIds={confirmedDocIds} onConfirm={onDocument} />
                <div className="flex flex-wrap items-center gap-4">
                  <button onClick={() => setScreen("question")} className="btn-cedar px-6 py-2.5 text-sm">{confirmedDocIds.length ? "Continue" : "Skip — I'll answer the questions"}</button>
                  <button onClick={() => setScreen("start")} className="text-sm text-stone hover:text-ink">Back</button>
                </div>
              </motion.section>
            )}

            {screen === "question" && current && (
              <motion.section key={`q-${current.id}`} {...advance} className="space-y-8">
                {injury && current.id !== "injury" && (
                  <div className="card-calm px-4 py-3 text-sm">A claims specialist will contact you personally. Anything else you add below helps us prepare.</div>
                )}
                <button onClick={back} className="inline-flex items-center gap-1 text-sm text-stone hover:text-ink"><ArrowLeft className="size-3.5" /> Back</button>
                <QuestionCard
                  key={current.id}
                  quoteTotal={quoteTotal}
                  q={current}
                  fact={state.facts[current.id]}
                  optional={injury && current.id !== "injury"}
                  onAnswer={onAnswer}
                  onDocument={onDocument}
                  confirmedDocIds={confirmedDocIds}
                />
                <ComingUp items={comingUp.map((q) => ({ id: q.id, label: q.short ?? q.label }))} skipped={skipped} />
              </motion.section>
            )}

            {screen === "review" && (
              <motion.section key="review" {...advance} className="space-y-6">
                <div>
                  <h1 className="question-title">Check your claim</h1>
                  <p className="mt-3 text-sm text-stone">Tap any line to change it. Blank is fine — we'll ask later if we need it.</p>
                </div>
                <ReviewList state={state} onEdit={(id) => { setEditing({ id, toReview: true }); setScreen("question"); }} />
                <div className="flex items-center gap-4">
                  <button onClick={submit} disabled={submitting} className="btn-cedar px-6 py-2.5 text-sm">{submitting ? "Sending…" : missing ? "Send the update" : "Send my claim"}</button>
                </div>
              </motion.section>
            )}

            {screen === "done" && (
              <motion.section key="done" {...advance} className="space-y-5">
                <h1 className="question-title">{missing ? "Your claim is moving again." : "Thanks — your claim is in."}</h1>
                <p className="text-stone">{missing ? "We've added what you sent. No need to do anything else." : "We'll get back to you within 2 working days."}</p>
                <div className="card-calm inline-block px-5 py-3">
                  <span className="block text-xs text-stone">Your claim reference</span>
                  <span className="font-display text-2xl">{doneId}</span>
                </div>
                {!missing && <div><button onClick={() => applyPreset("reset")} className="text-sm text-stone underline underline-offset-4 hover:text-ink">Start another claim</button></div>}
              </motion.section>
            )}
          </AnimatePresence>
        </div>
        {(screen === "question" || screen === "docs" || screen === "review") && <ClaimFilePanel state={state} config={config} />}
      </main>
      {!missing && <DemoMenu onPick={applyPreset} />}
    </div>
  );
}

function ComingUp({ items, skipped }: { items: { id: string; label: string }[]; skipped: number }) {
  const { t } = useCalmMotion();
  if (!items.length && !skipped) return null;
  return (
    <div className="pt-2">
      <HorizonLine />
      <div className="mt-3 flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-wider text-stone">Coming up</p>
        <AnimatePresence mode="wait">
          {skipped > 0 && (
            <motion.p key={skipped} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={t(300)} className="text-xs text-stone">
              {skipped} question{skipped === 1 ? "" : "s"} skipped
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <ul className="mt-2">
        <AnimatePresence initial={false}>
          {items.map((i) => (
            <motion.li key={i.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={t(300)} className="overflow-hidden text-sm text-stone">
              <span className="block py-1">{i.label}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

function ReviewList({ state, onEdit }: { state: IntakeState; onEdit: (id: string) => void }) {
  const qs = orderedQuestions(config).filter((q) => q.source === "customer" && isVisible(q, state, config));
  return (
    <div className="card-calm divide-y divide-stone/15 px-5">
      {qs.map((q) => {
        const f = state.facts[q.id];
        const Icon = f?.source === "upload" ? FileText : User;
        return (
          <button key={q.id} onClick={() => onEdit(q.id)} className="flex w-full items-center gap-3 py-3 text-left">
            <Icon className="size-4 shrink-0 text-stone" aria-label={f?.source === "upload" ? "Read from your document" : "You told us"} />
            <span className="w-40 shrink-0 text-sm text-stone">{q.short ?? q.label}</span>
            <span className="min-w-0 flex-1 truncate text-sm">{isSettled(f) ? displayValue(q, f) : <span className="text-stone">—</span>}</span>
            <span className="text-xs text-stone">Edit</span>
          </button>
        );
      })}
      <div className="flex items-center gap-3 py-3">
        <Building2 className="size-4 shrink-0 text-stone" aria-label="From your insurer" />
        <span className="w-40 shrink-0 text-sm text-stone">Your cover</span>
        <span className="text-sm">We'll add this from your policy</span>
      </div>
    </div>
  );
}

const PREVIEW = {
  home: [
    { label: "What happened at home?", help: "We ask so the right person looks at your claim.", options: ["Water or leak", "Storm", "Break-in", "Something else"] },
    { label: "Is the home still safe to live in?", help: "If not, we'll make this a priority.", options: ["Yes", "No", "I'm not sure"] },
  ],
  health: [
    { label: "What is your request about?", help: "We ask so the right person looks at your request.", options: ["A treatment bill", "A planned treatment", "Something else"] },
    { label: "Has the treatment already happened?", help: "This helps us know which documents you'll need.", options: ["Yes", "No", "I'm not sure"] },
  ],
};

function PreviewFlow({ line, onExit }: { line: "home" | "health"; onExit: () => void }) {
  const [step, setStep] = useState(0);
  const { advance } = useCalmMotion();
  const steps = PREVIEW[line];
  const cur = steps[step];
  return (
    <AnimatePresence mode="wait">
      {cur ? (
        <motion.div key={step} {...advance} className="space-y-6">
          <div>
            <h1 className="question-title">{cur.label}</h1>
            <p className="mt-3 text-sm text-stone">{cur.help}</p>
          </div>
          <div className="grid gap-2">
            {cur.options.map((o) => (
              <button key={o} onClick={() => setStep(step + 1)} className="answer-btn px-4 py-4 text-left">{o}</button>
            ))}
          </div>
          <button onClick={onExit} className="text-sm text-stone hover:text-ink">Back</button>
        </motion.div>
      ) : (
        <motion.div key="end" {...advance} className="space-y-5">
          <h1 className="question-title">This line isn't open yet — a specialist will handle your request personally.</h1>
          <p className="text-stone">Thank you for your patience. Someone from our team will get in touch.</p>
          <button onClick={onExit} className="btn-quiet px-5 py-2 text-sm">Back to start</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
