import { useEffect, useId, useRef, useState } from "react";
import { Icon, type IconNode } from "lucide-react";
import "./TodaySlide.css";

const statements = [
  "2–3 minutes per simple claim, 8–10 per escalation.",
  "0% of claims pass without a person.",
  "A rule change takes weeks to months to reach production.",
];

// Lucide Hand geometry split at the palm, four fingers and thumb for pencil ordering.
const pencilStrokes = [
  "M22 14a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34",
  "M6 14V6a2 2 0 0 1 4 0v4.5",
  "M10 6V4a2 2 0 0 1 4 0v6",
  "M14 6a2 2 0 0 1 4 0v5",
  "M18 8a2 2 0 1 1 4 0v6",
  "M6.01 19.66l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",
];
const pencilNodes: IconNode = pencilStrokes.map((d, i) => ["path", { d, key: `stroke-${i}`, pathLength: "1", vectorEffect: "non-scaling-stroke", className: `today-pencil-stroke today-pencil-stroke-${i}` }]);

function PencilHand({ filterId }: { filterId: string }) {
  return <Icon iconNode={pencilNodes} size={64} strokeWidth={0.75} fill="none" className="today-pencil" filter={`url(#${filterId})`}>
    <defs><filter id={filterId} x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="1" seed="7" result="pencil-noise" /><feDisplacementMap in="SourceGraphic" in2="pencil-noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" /></filter></defs>
    <g className="today-pencil-copy" transform="translate(0.225 0.225) rotate(0.8 12 12)">{pencilStrokes.map((d, i) => <path key={d} d={d} pathLength={1} vectorEffect="non-scaling-stroke" className={`today-pencil-stroke today-pencil-stroke-${i}`} />)}</g>
  </Icon>;
}

export function TodaySlide() {
  const section = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [headlineActive, setHeadlineActive] = useState(false);
  const pencilFilterId = `today-pencil-${useId().replace(/:/g, "")}`;
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
            Every claim is handled <span className="today-hand-phrase">by hand<span className="today-hand-period">.<span aria-hidden="true" className="today-hand"><PencilHand filterId={pencilFilterId} /></span></span><svg aria-hidden="true" className="today-hand-underline" viewBox="0 0 200 10" preserveAspectRatio="none" fill="none"><path pathLength="1" d="M2 6 Q18 2 34 6 T66 6 T98 6 T130 6 T162 6 T198 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${pencilFilterId})`} /></svg></span>
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