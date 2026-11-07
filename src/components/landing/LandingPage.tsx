import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PencilBackdrop } from "@/components/canoe/PencilBackdrop";
import { Accent, Wordmark } from "@/components/canoe/brand";

// Static landing mockup. No logic here; links only.
const navLink = "font-mono text-[11px] uppercase tracking-[0.14em] text-stone hover:text-ink";
const btnMain = "btn-cedar inline-flex items-center px-5 py-2.5 text-sm";
const btnGhost = "btn-quiet inline-flex items-center px-5 py-2.5 text-sm";

function Section({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`relative z-10 mx-auto max-w-[1120px] scroll-mt-20 px-5 py-20 md:px-8 md:py-28 ${className}`}>
      {children}
    </section>
  );
}

const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="font-display text-[32px] leading-[1.05] tracking-[-0.02em] md:text-[44px]">{children}</h2>
);

function MainButtons() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link to="/claim" className={btnMain}>Report a claim</Link>
      <Link to="/policy" className={btnGhost}>See a policy change</Link>
    </div>
  );
}

/** Simplified, static take on the /policy wiring scene. */
function WiringSketch() {
  const gates = [
    { x: 70, id: "R1.injury", label: "Injury" },
    { x: 190, id: "R1.quote", label: "Quote > €1,200", changed: true },
    { x: 310, id: "R1.ev_battery", label: "EV battery", fresh: true },
  ];
  const wires = [0, 1, 2, 3, 4, 5, 6];
  return (
    <svg viewBox="0 0 520 300" className="w-full" role="img" aria-label="Simplified diagram: open claims flow through rule gates to Routine, Review and Info needed. One claim is re-routed to Review.">
      <defs>
        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="var(--stone)" strokeOpacity="0.12" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="520" height="300" fill="url(#grid)" />
      {wires.map((w) => (
        <path key={w} d={`M10 ${80 + w * 2.5} H440`} stroke="var(--ink)" strokeOpacity="0.45" fill="none" />
      ))}
      <path d="M10 70 H246 Q260 70 260 84 V186 Q260 200 274 200 H440" stroke="var(--cedar)" strokeWidth="1.6" fill="none" />
      <path d="M10 70 H440" stroke="var(--cedar)" strokeOpacity="0.3" strokeDasharray="4 4" fill="none" />
      <path d="M110 92 V186 Q110 200 124 200 H440" stroke="var(--ink)" strokeOpacity="0.45" fill="none" />
      <path d="M50 94 V256 Q50 270 64 270 H440" stroke="var(--ink)" strokeOpacity="0.45" fill="none" />
      {gates.map((g) => (
        <g key={g.id} transform={`translate(${g.x} 52)`}>
          <rect width="100" height="52" rx="6" fill="var(--paper)" stroke={g.fresh ? "var(--cedar)" : "var(--ink)"} strokeDasharray={g.fresh ? "4 3" : undefined} />
          <text x="8" y="17" fontFamily="var(--font-mono)" fontSize="8.5" fill="var(--stone)">{g.id}</text>
          <text x="8" y="33" fontFamily="var(--font-sans)" fontSize="11" fill={g.changed ? "var(--cedar)" : "var(--ink)"}>{g.label}</text>
          {g.fresh && <text x="8" y="46" fontFamily="var(--font-mono)" fontSize="8" fill="var(--cedar)" textDecoration="underline">new</text>}
        </g>
      ))}
      {[
        { y: 86, label: "ROUTINE", n: "3", d: "−5" },
        { y: 204, label: "REVIEW", n: "17", d: "+6" },
        { y: 274, label: "INFO NEEDED", n: "4", d: "−1" },
      ].map((t) => (
        <g key={t.label} transform={`translate(448 ${t.y})`}>
          <text fontFamily="var(--font-mono)" fontSize="9" letterSpacing="1" fill="var(--stone)" y="-10">{t.label}</text>
          <text fontFamily="var(--font-display)" fontWeight="600" fontSize="22" fill="var(--ink)" y="12">{t.n}</text>
          <text fontFamily="var(--font-mono)" fontSize="10" fill="var(--cedar)" x="30" y="12">{t.d}</text>
        </g>
      ))}
    </svg>
  );
}

const team = [
  { name: "Mattis", line: "Business informatics, ex-GTM engineer", initials: "M" },
  { name: "Maximilian", line: "Ex-Plato sales", initials: "M" },
  { name: "Siddesh", line: "AI engineer", initials: "S" },
  { name: "Vineeth", line: "AI engineer", initials: "V" },
];

export function LandingPage() {
  return (
    <div className="relative isolate overflow-hidden">
      {/* 1. HERO */}
      <div className="relative min-h-screen pb-[34vh] md:pb-0">
        {/* TODO(hero-boat): hero boat animation — swap in the redrawn canoe asset and its entrance here. */}
        <PencilBackdrop contained />
        <nav className="relative z-10 mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-5 pt-6 md:px-8">
          <Wordmark />
          <div className="hidden items-center gap-6 md:flex">
            <a href="#how-it-works" className={navLink}>How it works</a>
            <a href="#policy-change" className={navLink}>Policy change</a>
            <a href="#team" className={navLink}>Team</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/review" className="btn-quiet hidden px-4 py-2 text-sm sm:inline-flex">Open workspace</Link>
            <Link to="/claim" className="btn-cedar inline-flex px-4 py-2 text-sm">Report a claim</Link>
          </div>
        </nav>
        <Section className="!pt-16 md:!pt-24">
          <p className="eyebrow mb-5">Canoe / claims triage</p>
          <h1 className="max-w-[760px] font-display text-[44px] leading-[1.05] tracking-[-0.02em] md:text-[68px]">
            Decisions that <Accent>hold</Accent> when the rules change.
          </h1>
          <p className="mt-6 max-w-[580px] text-[17px] leading-relaxed text-ink/80">
            Canoe reads a motor claim, applies your written policy and tells your team the next step — with the facts, the rule and the policy version behind every answer. When the policy changes, you see what moves before it goes live.
          </p>
          <div className="mt-8 space-y-4">
            <MainButtons />
            <Link to="/review" className="inline-block text-sm text-stone underline underline-offset-4 hover:text-ink">Open the reviewer workspace</Link>
          </div>
        </Section>
      </div>

      {/* 2. PROBLEM */}
      <Section>
        <p className="eyebrow mb-4">Today</p>
        <H2>Every claim is handled by hand.</H2>
        <ol className="mt-10 max-w-[760px] border-t border-border">
          {["2–3 minutes per simple claim, 8–10 per escalation.", "0% of claims pass without a person.", "A rule change takes weeks to months to reach production."].map((t, i) => (
            <li key={t} className="flex items-baseline gap-6 border-b border-border py-5">
              <span className="font-mono text-xs text-cedar">0{i + 1}</span>
              <span className="font-display text-xl md:text-2xl">{t}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 max-w-[620px] text-sm text-stone">Figures for a mid-sized European motor insurer, from our interview with the case team. Assumptions, not measurements.</p>
      </Section>

      {/* 3. HOW IT WORKS */}
      <Section id="how-it-works">
        <H2>Collect. <Accent>Decide</Accent>. Review.</H2>
        {/* TODO(flow-line): a single line travelling through the three steps. */}
        <div className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          <div aria-hidden="true" className="absolute left-0 right-0 top-[7px] hidden h-px bg-ink/30 md:block" />
          {[
            ["Collect", "The claim form only asks what the policy needs. “I’m not sure” stays blank — we never guess a fact."],
            ["Decide", "Written rules decide, in order. Every recommendation carries its rule and policy version. AI may help read documents; it never decides."],
            ["Review", "People handle the exceptions. Every correction is stored with the reviewer, the reason and the policy version."],
          ].map(([h, t]) => (
            <div key={h} className="relative">
              <span aria-hidden="true" className="relative block h-[15px] w-px bg-ink" />
              <p className="eyebrow mt-4 text-ink">{h}</p>
              <p className="mt-3 leading-relaxed text-ink/80">{t}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 4. CHANGE MOMENT */}
      <Section id="policy-change">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <p className="eyebrow mb-4">Policy v1 → v2</p>
            <H2>See what <Accent>moves</Accent> before it goes live.</H2>
            <p className="mt-6 leading-relaxed text-ink/80">Lower the review limit from €1,500 to €1,200 and send EV battery work to review. Canoe re-runs every open claim, shows exactly which ones change and leaves closed decisions as they were.</p>
            <p className="mt-5 font-mono text-xs uppercase tracking-[0.08em] text-stone">24 open claims re-run · 6 change · 2 closed, untouched</p>
            <Link to="/policy" className={`${btnMain} mt-8`}>Try it</Link>
          </div>
          <div className="card-calm p-4 md:p-6"><WiringSketch /></div>
        </div>
      </Section>

      {/* 5. FOR WHOM */}
      <Section>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["Reviewers", "Understand and decide in under a minute."],
            ["Policy owners", "Change rules safely, with an approver."],
            ["Operations", "See quality, workload and every decision’s history."],
          ].map(([h, t]) => (
            <div key={h} className="card-calm p-6">
              <h3 className="font-display text-2xl">{h}</h3>
              <p className="mt-3 text-ink/80">{t}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 6. PROOF */}
      <Section>
        <p className="eyebrow mb-8">Measured on the labelled cases</p>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {[["14/14", "correct under v1"], ["14/14", "correct under v2"], ["0", "wrong routine approvals"], ["6", "open claims flagged for recheck"]].map(([n, l]) => (
            <div key={l}>
              <p className="font-display text-5xl md:text-6xl">{n}</p>
              <p className="mt-2 text-sm text-stone">{l}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-stone">14 labelled cases are a starting point, not a risk rate.</p>
      </Section>

      {/* 7. BUSINESS VALUE — placeholders until the model is ready. */}
      <Section>
        <H2>What it is worth.</H2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {["Annual triage cost today vs. with Canoe", "Payback", "Cost of a policy change"].map((l) => (
            <div key={l} className="card-calm p-6">
              <p className="font-display text-5xl text-stone">—</p>
              <p className="mt-3 text-sm text-ink/80">{l}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm text-stone">Model in progress — assumptions are shown on the business page.</p>
      </Section>

      {/* 8. PRINCIPLES */}
      <Section>
        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {["Rules decide. AI only assists.", "Blank stays blank.", "Closed stays closed.", "Every decision carries its version."].map((t, i) => (
            <div key={t} className="flex items-baseline gap-5 border-t border-border pt-5">
              <span className="font-mono text-xs text-cedar">0{i + 1}</span>
              <p className="font-display text-2xl">{t}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 9. TEAM */}
      <Section id="team">
        <p className="eyebrow mb-4">About us</p>
        <H2>Four people, one <Accent>canoe</Accent>.</H2>
        <p className="mt-6 max-w-[620px] text-ink/80">Why Canoe: [two sentences from the team]</p>
        {/* TODO(portraits): replace the graphite circles with pencil-sketch portraits. */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((m, i) => (
            <div key={i} className="card-calm p-6">
              <div aria-hidden="true" className="flex h-20 w-20 items-center justify-center rounded-full border border-ink/40 bg-[radial-gradient(circle_at_35%_30%,var(--mist),color-mix(in_oklab,var(--stone)_35%,var(--paper)))] font-display text-xl text-ink/70">{m.initials}</div>
              <p className="mt-5 font-display text-xl">{m.name}</p>
              <p className="mt-2 text-sm text-ink/80">{m.line}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 10. CLOSING */}
      <div className="relative min-h-[620px]">
        <PencilBackdrop contained />
        <Section className="text-left">
          <p className="max-w-[760px] font-display text-[40px] leading-[1.05] tracking-[-0.02em] md:text-[60px]">Steady through changing <Accent>water</Accent>.</p>
          <div className="mt-8"><MainButtons /></div>
        </Section>
      </div>
      <footer className="relative z-10 border-t border-border bg-paper">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-5 py-10 md:flex-row md:items-start md:justify-between md:px-8">
          <div className="max-w-[560px] space-y-3">
            <Wordmark />
            <p className="text-sm text-stone">Built for the Taktile case at thinc! Munich 2026. Fictional insurer and claims data. Canoe never approves or pays a claim.</p>
          </div>
          <div className="flex gap-6">
            <Link to="/review" className={navLink}>Review</Link>
            <Link to="/policy" className={navLink}>Policy</Link>
            <Link to="/claim" className={navLink}>Report a claim</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
