import { useEffect, useRef } from "react";
import waterUrl from "@/assets/graphite-water.jpg";
import canoeUrl from "@/assets/graphite-canoe.png";
import {
  SESSION_KEY, canoeSpot, clamp, easeOut, easeOutBack, entryDuration, foldStagger, frontFrom,
  layerCount, layerTop, panels, rockAngle, waveAmplitude, wavePath,
} from "./papercut";

const layers = Array.from({ length: layerCount }, (_, i) => i);
const SNIPPETS = 5;

function Layer({ i, setRef }: { i: number; setRef: (el: HTMLDivElement | null) => void }) {
  const depth = i / (layerCount - 1);
  return (
    <div ref={setRef} className="papercut-layer" style={{ top: `${layerTop(i) * 100}%`, zIndex: i < frontFrom ? i : 20 + i }}>
      <svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern id={`pc-water-${i}`} patternUnits="userSpaceOnUse" width="1100" height="560" x={-i * 13} y={-i * 9}>
            <image href={waterUrl} width="1100" height="560" preserveAspectRatio="xMidYMid slice" />
          </pattern>
        </defs>
        <path d={wavePath(i)} fill="var(--paper)" />
        <path d={wavePath(i)} fill={`url(#pc-water-${i})`} opacity={0.15 + depth * 0.5} style={{ filter: `contrast(${0.8 + depth * 0.6})` }} />
        <path d={wavePath(i)} fill="none" stroke="var(--mist)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

export function PapercutSea() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const canoeRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const foldRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const glossRefs = useRef<(HTMLDivElement | null)[]>([]);
  const snipRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try { seen = sessionStorage.getItem(SESSION_KEY) === "1"; sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
    const animateEntry = !reduce && !seen;
    const align = new URLSearchParams(location.search).has("align");
    const start = performance.now();
    const snips = Array.from({ length: SNIPPETS }, () => ({ born: -1e9, vx: 0, vy: 0 }));
    let lastPitch = 0, frame = 0;

    const render = (now: number) => {
      const t = animateEntry ? now - start : entryDuration + 1;
      const s = reduce ? 0 : now / 1000;
      const w = scene.clientWidth, h = scene.clientHeight;

      layers.forEach((i) => {
        const el = layerRefs.current[i];
        if (!el) return;
        const depth = i / (layerCount - 1);
        const amp = waveAmplitude * (0.25 + depth * 0.75);
        const p1 = 4 + (i * 0.83) % 5, p2 = 6 + (i * 1.37) % 3;
        const dy = Math.sin((s * 2 * Math.PI) / p1 + i) * amp + Math.sin((s * 2 * Math.PI) / p2 + i * 2.1) * amp * 0.4;
        const dx = Math.sin((s * 2 * Math.PI) / p2 + i) * amp * 1.6;
        const land = easeOutBack((t - i * 90) / 600);
        const rise = (1 - land) * h * 0.8;
        el.style.transform = `translate3d(${dx}px, ${dy + rise}px, 0)`;
        el.style.opacity = String(clamp((t - i * 90) / 200));
      });

      // Canoe rides the layer just behind the front layers.
      const base = canoeSpot(now);
      const spot = w < 700 ? { ...base, x: Math.min(base.x, 0.62) } : base;
      const cw = Math.min(560, w * (w < 700 ? 0.58 : 0.44)) * spot.scale;
      const ch = cw * 0.4;
      const ls = (s * 2 * Math.PI) / 5.3;
      const pitch = Math.sin(ls) * 0.75 + Math.sin((s * 2 * Math.PI) / 6.7 + 1) * 0.25;
      const settle = animateEntry ? clamp((t - 2800) / 800) : 1;
      const sink = (1 - easeOut(settle)) * -10 + Math.sin(settle * Math.PI * 3) * (1 - settle) * 6;
      const bob = Math.sin(ls - 0.4) * waveAmplitude * 0.75 * settle;
      const angle = pitch * rockAngle * settle;
      const drop = animateEntry ? (1 - easeOut((t - 900) / 500)) : 0;
      const sway = Math.sin(t / 120) * 18 * drop;
      if (canoeRef.current) {
        canoeRef.current.style.width = `${cw}px`;
        canoeRef.current.style.height = `${ch}px`;
        canoeRef.current.style.left = `${spot.x * w - cw / 2}px`;
        canoeRef.current.style.top = `${spot.y * h - ch * 0.78}px`;
        canoeRef.current.style.transform = `translate3d(${sway}px, ${bob + sink - drop * h * 0.5}px, 0) rotate(${angle + sway * 0.2}deg)`;
        canoeRef.current.style.opacity = String(animateEntry ? clamp((t - 900) / 150) : 1);
      }

      const folding = animateEntry && t < 2800;
      if (imgRef.current) imgRef.current.style.opacity = folding ? "0" : "1";
      if (foldRef.current) foldRef.current.style.display = folding || align ? "block" : "none";
      panels.forEach((p, k) => {
        const el = panelRefs.current[k];
        if (!el) return;
        const f = align ? 1 : easeOutBack((t - 1400 - p.order * foldStagger) / 600);
        const rot = p.from * (1 - f);
        el.style.transform = `rotate${p.axis}(${rot}deg)`;
        el.style.opacity = align ? "0.5" : "1";
        const g = glossRefs.current[k];
        if (g) {
          const sweep = clamp((t - 1700 - p.order * foldStagger) / 200);
          g.style.transform = `translateX(${-100 + sweep * 200}%)`;
          g.style.opacity = sweep > 0 && sweep < 1 ? "1" : "0";
        }
      });

      // Paper snippets pop at the bow (left) when it dips.
      if (!reduce && settle > 0.4 && lastPitch > -0.6 && pitch <= -0.6) {
        snips.forEach((sn, k) => { sn.born = now + k * 40; sn.vx = -20 - Math.random() * 30; sn.vy = 40 + Math.random() * 30; });
      }
      lastPitch = pitch;
      snips.forEach((sn, k) => {
        const el = snipRefs.current[k];
        if (!el) return;
        const age = (now - sn.born) / 1000;
        if (age < 0 || age > 0.9) { el.style.opacity = "0"; return; }
        const x = spot.x * w - cw * 0.42 + sn.vx * age;
        const y = spot.y * h + bob - sn.vy * age + 160 * age * age;
        el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${age * 400 + k * 60}deg)`;
        el.style.opacity = String(1 - age / 0.9);
      });

      if (!reduce) frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div ref={sceneRef} className="papercut-sea" aria-hidden="true">
      {layers.map((i) => <Layer key={i} i={i} setRef={(el) => { layerRefs.current[i] = el; }} />)}
      <div ref={canoeRef} className="papercut-canoe" style={{ zIndex: frontFrom + 1 }}>
        <img ref={imgRef} src={canoeUrl} alt="" draggable={false} />
        <div ref={foldRef} className="papercut-fold">
          {panels.map((p, k) => (
            <div key={p.id} ref={(el) => { panelRefs.current[k] = el; }} className="papercut-panel" style={{ transformOrigin: p.origin }}>
              <img src={canoeUrl} alt="" draggable={false} className="papercut-face" style={{ clipPath: p.clip }} />
              <div className="papercut-back" style={{ clipPath: p.clip, transform: `rotate${p.axis}(180deg)` }} />
              <div className="papercut-gloss-wrap" style={{ clipPath: p.clip }}>
                <div ref={(el) => { glossRefs.current[k] = el; }} className="papercut-gloss" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {Array.from({ length: SNIPPETS }, (_, k) => (
        <span key={k} ref={(el) => { snipRefs.current[k] = el; }} className="papercut-snip" style={{ zIndex: frontFrom }} />
      ))}
      <div className="papercut-grain" />
    </div>
  );
}
