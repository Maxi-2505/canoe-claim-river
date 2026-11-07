import { useEffect, useRef } from "react";
import seaAsset from "@/assets/pencil-sea-texture.jpg.asset.json";
const waterUrl = seaAsset.url;
import canoeUrl from "@/assets/graphite-canoe.png";
import {
  SESSION_KEY, canoeSpot, clamp, easeOut, easeOutBack, entryDuration, frontFrom,
  layerCount, layerTop, rockAngle, waveAmplitude, wavePath,
} from "./papercut";

const layers = Array.from({ length: layerCount }, (_, i) => i);
const SNIPPETS = 9;

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
        <path d={wavePath(i)} fill={`url(#pc-water-${i})`} opacity={0.45 + depth * 0.5} style={{ filter: `contrast(${0.8 + depth * 0.6})` }} />
      </svg>
    </div>
  );
}

export function PapercutSea() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const canoeRef = useRef<HTMLDivElement>(null);
  const snipRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try { seen = sessionStorage.getItem(SESSION_KEY) === "1"; sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
    const animateEntry = !reduce && !seen;
    const start = performance.now();
    const snips = Array.from({ length: SNIPPETS }, () => ({ born: -1e9, vx: 0, vy: 0 }));
    let lastPitch = 0, frame = 0, sprayed = !animateEntry;

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
        const k = clamp((t - 800) / 1400);
        const heave = i >= layerCount - 3 && k > 0 && k < 1 ? -Math.sin(k * Math.PI) * (6 + (i - layerCount + 3) * 4) : 0;
        el.style.transform = `translate3d(${dx}px, ${dy + rise + heave}px, 0)`;
        el.style.opacity = String(clamp((t - i * 90) / 200));
      });

      // Canoe rides the layer just behind the front layers.
      const base = canoeSpot(now);
      const spot = w < 700 ? { ...base, x: Math.min(base.x, 0.62) } : base;
      const cw = Math.min(560, w * (w < 700 ? 0.58 : 0.44)) * spot.scale;
      const ch = cw * 0.4;
      const ls = (s * 2 * Math.PI) / 5.3;
      const pitch = Math.sin(ls) * 0.75 + Math.sin((s * 2 * Math.PI) / 6.7 + 1) * 0.25;
      // Rise: hidden behind the front layers, bow down, then level; spring settle after.
      const k = animateEntry ? easeOut((t - 800) / 1400) : 1;
      const u = animateEntry ? clamp((t - 2200) / 800) : 1;
      const spring = u > 0 && u < 1 ? -7 * Math.exp(-4 * u) * Math.cos(u * Math.PI * 5) * (1 - u) : 0;
      const settle = u;
      const riseY = (1 - k) * ch * 1.15 + (u === 0 && animateEntry ? 0 : spring);
      const tilt = (1 - k) * -8;
      const roll = (1 - k) * 0.12;
      const bob = Math.sin(ls - 0.4) * waveAmplitude * 0.75 * settle;
      const angle = pitch * rockAngle * settle + tilt;
      if (canoeRef.current) {
        canoeRef.current.style.width = `${cw}px`;
        canoeRef.current.style.height = `${ch}px`;
        canoeRef.current.style.left = `${spot.x * w - cw / 2}px`;
        canoeRef.current.style.top = `${spot.y * h - ch * 0.78}px`;
        canoeRef.current.style.transform = `translate3d(0, ${bob + riseY}px, 0) rotate(${angle}deg) scaleY(${1 - roll})`;
      }
      if (!sprayed && t > 1300) {
        sprayed = true;
        snips.forEach((sn, n) => { sn.born = now + n * 70; sn.vx = -30 + Math.random() * cw * 0.5; sn.vy = 60 + Math.random() * 50; });
      }

      // Paper snippets pop at the bow (left) when it dips.
      if (!reduce && settle > 0.99 && lastPitch > -0.6 && pitch <= -0.6) {
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
        <img src={canoeUrl} alt="" draggable={false} />
      </div>
      {Array.from({ length: SNIPPETS }, (_, k) => (
        <span key={k} ref={(el) => { snipRefs.current[k] = el; }} className={k % 2 ? "papercut-snip papercut-drop" : "papercut-snip"} style={{ zIndex: frontFrom }} />
      ))}
      <div className="papercut-grain" />
    </div>
  );
}
