import { useEffect, useRef } from "react";
import waterUrl from "@/assets/graphite-water.jpg";
import canoeUrl from "@/assets/graphite-canoe.png";

// Decorative motion controls; no form or claim state belongs here.
const WAVE_HEIGHT = 9;
const WAVE_SPEED = 1;
const CANOE_SWAY_DEGREES = 5;
const INTRO_DURATION = 7500;
let visitStarted: number | undefined;
type Stroke = { points: number[]; shade: number };
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => 1 - Math.pow(1 - clamp(n), 3);

function pencilStrokes(image: HTMLImageElement, boat: boolean): Stroke[] {
  const buffer = document.createElement("canvas");
  buffer.width = boat ? 800 : 1000;
  buffer.height = Math.round(buffer.width * image.height / image.width);
  const ctx = buffer.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(image, 0, 0, buffer.width, buffer.height);
  const pixels = ctx.getImageData(0, 0, buffer.width, buffer.height).data;
  const strokes: Stroke[] = [];
  for (let y = 2; y < buffer.height - 2; y += boat ? 3 : 5) {
    let points: number[] = [];
    const finish = () => {
      if (points.length >= 6) strokes.push({ points, shade: boat ? 0.7 : 0.35 + y / buffer.height * 0.4 });
      points = [];
    };
    for (let x = 2; x < buffer.width - 2; x += 2) {
      const at = (y * buffer.width + x) * 4;
      const above = at - buffer.width * 4;
      const tone = pixels[at] ?? 255;
      const edge = Math.abs(tone - (pixels[above] ?? 255)) > (boat ? 15 : 12);
      if ((pixels[at + 3] ?? 0) > 200 && (edge || (boat && tone < 65))) {
        points.push(x / buffer.width, y / buffer.height);
      } else finish();
      if (points.length > 60) finish();
    }
    finish();
  }
  return strokes;
}

function sketch(ctx: CanvasRenderingContext2D, strokes: Stroke[], progress: number, x: number, y: number, w: number, h: number, ink: string) {
  const count = Math.ceil(strokes.length * clamp(progress));
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.65;
  for (let i = 0; i < count; i++) {
    const s = strokes[i];
    if (!s) continue;
    ctx.globalAlpha = s.shade;
    ctx.beginPath();
    const partial = i === count - 1 ? clamp(strokes.length * progress - i) : 1;
    const end = Math.max(2, Math.floor(s.points.length * partial / 2) * 2);
    for (let j = 0; j < end; j += 2) {
      const px = x + (s.points[j] ?? 0) * w;
      const py = y + (s.points[j + 1] ?? 0) * h + Math.sin(j * 2.7 + i) * 0.18;
      if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function PencilWaterBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const water = new Image();
    const boat = new Image();
    let frame = 0, disposed = false, width = 0, height = 0;
    let ink = "", paper = "";
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width; height = bounds.height;
      const ratio = Math.min(devicePixelRatio, 1.5);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const tokens = getComputedStyle(document.documentElement);
      ink = tokens.getPropertyValue("--ink").trim();
      paper = tokens.getPropertyValue("--paper").trim();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const load = (image: HTMLImageElement, url: string) => new Promise<void>((resolve, reject) => {
      image.onload = () => resolve(); image.onerror = reject; image.src = url;
    });
    Promise.all([load(water, waterUrl), load(boat, canoeUrl)]).then(() => {
      if (disposed) return;
      resize();
      const waterLines = pencilStrokes(water, false);
      const boatLines = pencilStrokes(boat, true);
      visitStarted ??= performance.now();
      const render = (now: number) => {
        if (disposed) return;
        const elapsed = now - (visitStarted ?? now);
        const intro = media.matches ? 1 : clamp(elapsed / INTRO_DURATION);
        const seconds = media.matches ? 0 : Math.max(0, elapsed - INTRO_DURATION) / 1000;
        const time = seconds * WAVE_SPEED;
        ctx.clearRect(0, 0, width, height);
        const bw = Math.min(560, width * (width < 700 ? 0.76 : 0.52));
        const bh = bw * boat.height / boat.width;
        const bx = width - bw - width * (width < 700 ? 0.06 : 0.08);
        const by = height * 0.48 - bh * 0.45;
        const waveProgress = clamp((intro - 0.35) / 0.5);
        const shading = ease((intro - 0.55) / 0.35);
        const bob = Math.sin(time * 2 * Math.PI / 5.3) * WAVE_HEIGHT * 0.65 + Math.sin(time * 2 * Math.PI / 7.1 + 0.7) * 2;
        const angle = (Math.sin(time * 2 * Math.PI / 5.3) * 0.75 + Math.sin(time * 2 * Math.PI / 6.7 + 1) * 0.25) * CANOE_SWAY_DEGREES * Math.PI / 180;
        // Different wave bands advance and rise at different phases and scales.
        ctx.globalAlpha = shading * 0.88;
        for (let band = 0; band < 3; band++) {
          const y = band * height / 3;
          const dy = Math.sin(time * (0.9 + band * 0.37) + band) * WAVE_HEIGHT * (0.25 + band * 0.3);
          const dx = Math.sin(time * (0.35 + band * 0.2) + band) * (12 + band * 12);
          ctx.save(); ctx.beginPath(); ctx.rect(0, y, width, height / 3 + 1); ctx.clip();
          ctx.drawImage(water, dx - 70, dy - 18, width + 140, height + 36); ctx.restore();
        }
        ctx.globalAlpha = 1;
        // Construction lines appear first, before the detailed pencil marks.
        if (intro < 0.4) {
          ctx.strokeStyle = ink;
          ctx.globalAlpha = 0.2 * (1 - ease((intro - 0.2) / 0.2));
          ctx.lineWidth = 0.6;
          for (let row = 0; row < 8; row++) {
            ctx.beginPath();
            for (let x = 0; x < width * clamp(intro / 0.1); x += 8) {
              const y = height * (0.18 + row * 0.1) + Math.sin(x / (32 + row * 4) + row) * (2 + row);
              if (!x) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        if (intro < 0.95) sketch(ctx, waterLines, waveProgress, -20, 0, width + 40, height, ink);
        // Reflection is split into drifting strips, not a rigid mirrored copy.
        const waterline = by + bh * 0.86 + bob;
        const reflection = ease((intro - 0.87) / 0.13);
        ctx.save(); ctx.translate(bx + bw / 2, waterline); ctx.rotate(-angle * 0.5);
        ctx.globalAlpha = reflection * 0.23;
        for (let strip = 0; strip < 16; strip++) {
          const sy = boat.height * (1 - (strip + 1) / 16);
          const ripple = Math.sin(time * 1.7 + strip * 1.3) * (3 + strip * 0.6);
          ctx.drawImage(boat, 0, sy, boat.width, boat.height / 16, -bw / 2 + ripple, strip * bh * 0.032, bw, bh * 0.033);
        }
        ctx.restore();
        ctx.save(); ctx.translate(bx + bw / 2, by + bh * 0.86 + bob); ctx.rotate(angle); ctx.scale(1, 1 + Math.sin(time * 1.1) * 0.016);
        // The keyed image retains opaque paper inside the hull.
        const boatShade = ease((intro - 0.27) / 0.3);
        ctx.globalAlpha = boatShade;
        ctx.drawImage(boat, -bw / 2, -bh * 0.86, bw, bh);
        ctx.globalAlpha = 1;
        if (intro < 0.58) sketch(ctx, boatLines, clamp((intro - 0.08) / 0.35), -bw / 2, -bh * 0.86, bw, bh, ink);
        // Draw the contact shadow along this canoe's asymmetrical lower hull.
        ctx.globalAlpha = reflection * 0.8;
        ctx.strokeStyle = ink; ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-bw * 0.37, -bh * 0.29);
        ctx.bezierCurveTo(-bw * 0.18, -bh * 0.12, bw * 0.18, bh * 0.08, bw * 0.39, bh * 0.08);
        ctx.quadraticCurveTo(bw * 0.45, bh * 0.03, bw * 0.455, -bh * 0.03);
        ctx.stroke();
        ctx.strokeStyle = paper; ctx.lineWidth = 1.3;
        ctx.globalAlpha = reflection * 0.65;
        ctx.beginPath();
        for (let x = -bw * 0.3; x < bw * 0.44; x += 3) {
          const u = (x + bw * 0.3) / (bw * 0.74);
          const y = -bh * 0.18 + bh * 0.29 * Math.sin(u * Math.PI / 2) + Math.sin(x * 0.1 + time * 2) * 1.5;
          if (x === -bw * 0.3) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
        // Contact strokes and highlights overlap the lower hull at the waterline.
        ctx.globalAlpha = reflection;
        for (let ring = 0; ring < 7; ring++) {
          const spread = ring * 5 + Math.sin(time * 1.5 + ring) * 3;
          ctx.strokeStyle = ring % 2 ? paper : ink;
          ctx.lineWidth = ring % 2 ? 1.6 : 0.6;
          ctx.globalAlpha = reflection * (0.45 - ring * 0.045);
          ctx.beginPath();
          ctx.ellipse(bx + bw * 0.56, waterline + ring * 3, bw * 0.42 + spread, 5 + ring * 2, angle * 0.2, 0.08, Math.PI - 0.1);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        canvas.dataset['phase'] = intro < 1 ? "sketching" : "waves";
        if (!media.matches) frame = requestAnimationFrame(render);
      };
      frame = requestAnimationFrame(render);
      const changed = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(render); };
      media.addEventListener("change", changed);
      cleanupMotion = () => media.removeEventListener("change", changed);
    }).catch(() => { /* Decorative imagery never blocks the page. */ });
    let cleanupMotion = () => {};
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); cleanupMotion(); };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="pencil-scene" />;
}