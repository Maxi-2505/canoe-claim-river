import { useEffect, useRef, useState } from "react";
import { Hand } from "lucide-react";
import "./TodaySlide.css";

const statements = [
  "2–3 minutes per simple claim, 8–10 per escalation.",
  "0% of claims pass without a person.",
  "A rule change takes weeks to months to reach production.",
];

export function TodaySlide() {
  const section = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [headlineActive, setHeadlineActive] = useState(false);
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    setReady(true);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.12 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={section} aria-labelledby="today-heading" data-ready={ready} data-visible={visible} className="today-slide relative z-10">
      <div className="mx-auto max-w-[1186px] px-5 py-20 md:px-8 md:py-28">
        <div className="today-intro">
          <p className="font-mono text-sm uppercase tracking-[0.14em] text-stone md:text-xl">TODAY</p>
          <h2 id="today-heading" data-active={headlineActive} onPointerEnter={(event) => { if (event.pointerType === "mouse") setHeadlineActive(true); }} onPointerLeave={(event) => { if (event.pointerType === "mouse") setHeadlineActive(false); }} onPointerUp={(event) => { if (event.pointerType !== "mouse") setHeadlineActive((active) => !active); }} className="today-headline mt-8 font-display text-[32px] font-bold leading-[1.12] tracking-normal md:text-[56px]">
            Every claim is handled <span className="today-hand-phrase">by hand<span className="today-hand-period">.<span aria-hidden="true" className="today-hand"><Hand size={56} strokeWidth={1.25} fill="none" /></span></span><svg aria-hidden="true" className="today-hand-underline" viewBox="0 0 200 10" preserveAspectRatio="none" fill="none"><path pathLength="1" d="M2 6 Q18 2 34 6 T66 6 T98 6 T130 6 T162 6 T198 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></span>
          </h2>
        </div>
        <ol className="mt-12 md:mt-20">
          {statements.map((text, i) => <li key={text} className={`today-row today-row-${i} relative`}>
            <div aria-hidden="true" className={`today-divider today-divider-${i} h-px w-full bg-border`} />
            <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-baseline gap-3 py-7 md:grid-cols-[3rem_minmax(0,1fr)] md:gap-6 md:py-10">
              <span className="today-index font-mono text-base text-cedar md:text-2xl">0{i + 1}</span>
              <div className="today-statement min-w-0 pr-2"><p className="today-text font-display text-xl font-bold leading-[1.3] tracking-normal md:text-[36px]">{text}</p></div>
            </div>
          </li>)}
        </ol>
        <div aria-hidden="true" className="today-divider today-divider-3 h-px w-full bg-border" />
        <p className="today-footnote mt-8 text-base leading-relaxed text-stone md:mt-10 md:text-2xl">Figures for a mid-sized European motor insurer, from our interview with the case team. Assumptions, not measurements.</p>
      </div>
    </section>
  );
}