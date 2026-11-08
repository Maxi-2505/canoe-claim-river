import { useEffect, useId, useRef } from "react";
import { CanoeMark } from "./brand";
import "./ScrollWaves.css";

const waves = [{ x: 37, amplitude: 16, wavelength: 310 }, { x: 60, amplitude: 10, wavelength: 370 }, { x: 82, amplitude: 6, wavelength: 265 }];

/** Decorative scroll position only, independent of claim and policy state. */
export function ScrollWaves() {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<SVGSVGElement>(null);
  const logo = useRef<HTMLDivElement>(null);
  const exclusions = useRef<SVGPathElement>(null);
  const filterId = `scroll-pencil-${useId().replace(/:/g, "")}`;
  const maskId = `${filterId}-clearance`;
  useEffect(() => {
    const element = root.current;
    const svg = track.current;
    const mark = logo.current;
    if (!element || !svg || !mark) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const paths = Array.from(svg.querySelectorAll<SVGPathElement>(".scroll-wave-path"));
    let height = innerHeight, target = 0, current = 0, frame = 0, last = 0, time = 0;
    let free = false, measureNeeded = true;
    let toolBounds: DOMRect[] = [];
    const measure = () => {
      height = innerHeight;
      svg.setAttribute("viewBox", `0 0 120 ${height}`);
      const total = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - height;
      target = total > 0 ? Math.max(0, Math.min(1, scrollY / total)) : 0;
      const left = innerWidth - 136;
      free = innerWidth >= 1100;
      toolBounds = [];
      // Existing content containers define the safe gutter. Full-bleed decorative
      // sections/backgrounds are excluded; controls and visible media are not.
      const containers = document.querySelectorAll<HTMLElement>('[class*="max-w-"], main, button, a, input, textarea, [role="dialog"], img, svg[role="img"]');
      for (const node of containers) {
        if (element.contains(node)) continue;
        const rect = node.getBoundingClientRect();
        if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= height) continue;
        if (node.closest('.canoe-chat-launcher')) { toolBounds.push(rect); continue; }
        const isContainer = node.className && typeof node.className === 'string' && node.className.includes('max-w-');
        if ((isContainer && rect.width > innerWidth - 160) || (rect.right > left - 12 && rect.left < innerWidth - 16)) { free = false; break; }
      }
      exclusions.current?.setAttribute('d', toolBounds.map(rect => `M${rect.left - left - 12},${rect.top - 12}h${rect.width + 24}v${rect.height + 24}h-${rect.width + 24}Z`).join(' '));
      element.dataset['visible'] = String(free);
      measureNeeded = false;
    };
    const sample = (index: number, y: number, phase: number, boatY: number) => {
      const wave = waves[index];
      if (!wave) return 60;
      const local = Math.exp(-Math.pow((y - boatY) / 120, 2));
      const bend = index === 1 ? 0 : (index === 0 ? -5 : 5) * local;
      return wave.x + Math.sin(y * Math.PI * 2 / wave.wavelength + phase + index * 0.8) * wave.amplitude + bend;
    };
    const render = (now: number) => {
      frame = 0;
      if (document.hidden) { last = 0; return; }
      if (measureNeeded) measure();
      if (!free) { last = 0; return; }
      if (last) time += Math.min(now - last, 50);
      last = now;
      const reduced = motion.matches;
      current = reduced ? target : current + (target - current) * 0.12;
      const phase = reduced ? 0 : time / 25000 * Math.PI * 2;
      const y = height * 0.1 + current * height * 0.8;
      const x = sample(1, y, phase, y);
      mark.style.opacity = toolBounds.some(rect => y + 24 > rect.top - 12 && y - 24 < rect.bottom + 12 && innerWidth - 136 + x + 24 > rect.left - 12) ? '0' : '1';
      const tangent = Math.atan((sample(1, y + 1, phase, y) - sample(1, y - 1, phase, y)) / 2) * 180 / Math.PI;
      const angle = reduced ? 0 : Math.max(-12, Math.min(12, -tangent)) + Math.sin(time / 3000 * Math.PI * 2) * 1.5;
      mark.style.transform = `translate3d(${x - 20}px, ${y - 20}px, 0) rotate(${angle}deg)`;
      paths.forEach((path, index) => {
        const waveIndex = index % 3;
        const points: string[] = [];
        for (let py = -20; py <= height + 20; py += 8) points.push(`${points.length ? 'L' : 'M'}${sample(waveIndex, py, phase, y).toFixed(2)},${py}`);
        path.setAttribute('d', points.join(' '));
      });
      if (!reduced) frame = requestAnimationFrame(render);
    };
    const request = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(render); };
    const update = () => { measureNeeded = true; request(); };
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; last = 0; } else update(); };
    const resize = new ResizeObserver(update);
    resize.observe(document.body);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    motion.addEventListener('change', update);
    update();
    return () => {
      cancelAnimationFrame(frame); resize.disconnect();
      window.removeEventListener('scroll', update); window.removeEventListener('resize', update);
      document.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', update);
    };
  }, [maskId]);
  return <div ref={root} className="scroll-waves" aria-hidden="true">
    <svg ref={track} className="scroll-waves-track" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
      <defs><filter id={filterId} x="-30%" y="-5%" width="160%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="1" seed="4" result="noise" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" /></filter><mask id={maskId} maskUnits="userSpaceOnUse"><rect width="120" height="10000" fill="white" /><path ref={exclusions} fill="black" /></mask></defs>
      <g mask={`url(#${maskId})`}><g filter={`url(#${filterId})`} opacity="0.65">{waves.map((_, i) => <path key={i} className="scroll-wave-path" />)}<g className="scroll-waves-copy" transform="translate(0.6 0.6)">{waves.map((_, i) => <path key={i} className="scroll-wave-path" />)}</g></g></g>
    </svg>
    <div ref={logo} className="scroll-waves-logo"><CanoeMark size={40} /></div>
  </div>;
}