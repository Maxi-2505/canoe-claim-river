// Tunable constants for the papercut sea. Decorative only — no claim state here.
export const layerCount = 7;
export const waveAmplitude = 7; // px, front layer bob
export const rockAngle = 4; // degrees
export const entryDuration = 3600; // ms
export const foldStagger = 150; // ms
export const SESSION_KEY = "canoe-papercut-entered";

export type Spot = { x: number; y: number; scale: number };
/** Resting spots as fractions of the scene: x = canoe centre, y = waterline. */
export const positions: Spot[] = [{ x: 0.7, y: 0.6, scale: 1 }];

/** Layer i (0 = back) — top edge as a fraction of scene height. */
export const layerTop = (i: number) => 0.3 + (i / (layerCount - 1)) * 0.45;
/** Index of the first layer drawn in front of the canoe. */
export const frontFrom = layerCount - 2;

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

/** Hand-cut wavy top edge in a 1000×300 box, filled down to the bottom. */
export function wavePath(i: number) {
  const rand = seeded(i * 97 + 13);
  const depth = i / (layerCount - 1);
  const amp = 4 + depth * 14;
  const wl = 150 - depth * 50;
  const pts: string[] = [];
  for (let x = -20; x <= 1020; x += 10) {
    const y = 30 + Math.sin(x / wl + i * 1.7) * amp + Math.sin(x / (wl * 0.37) + i) * amp * 0.3 + (rand() - 0.5) * 1.6;
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return `M-20,300 L${pts.join(" L")} L1020,300 Z`;
}

/** Five panels of the canoe image. Edges are shared so they rebuild the image exactly. */
export type Panel = { id: string; clip: string; origin: string; axis: "X" | "Y"; from: number; order: number };
const B = 18, S = 82, T = 28, M = 52;
export const panels: Panel[] = [
  { id: "near-hull", clip: `polygon(${B}% ${M}%, ${S}% ${M}%, ${S}% 100%, ${B}% 100%)`, origin: `50% ${M}%`, axis: "X", from: 180, order: 0 },
  { id: "far-hull", clip: `polygon(${B}% 0%, ${S}% 0%, ${S}% ${T}%, ${B}% ${T}%)`, origin: `50% ${T}%`, axis: "X", from: -180, order: 1 },
  { id: "bow", clip: `polygon(0% 0%, ${B}% 0%, ${B}% 100%, 0% 100%)`, origin: `${B}% 50%`, axis: "Y", from: -180, order: 2 },
  { id: "stern", clip: `polygon(${S}% 0%, 100% 0%, 100% 100%, ${S}% 100%)`, origin: `${S}% 50%`, axis: "Y", from: 180, order: 3 },
  { id: "interior", clip: `polygon(${B}% ${T}%, ${S}% ${T}%, ${S}% ${M}%, ${B}% ${M}%)`, origin: "50% 50%", axis: "X", from: 90, order: 4 },
];

export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const easeOut = (n: number) => 1 - Math.pow(1 - clamp(n), 3);
export const easeOutBack = (n: number) => {
  const c = 1.4, x = clamp(n) - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
};

/** Canoe movement controller; the scene registers its tween target here. */
let current: Spot = { ...positions[0]! };
let tween: { from: Spot; to: Spot; start: number; dur: number } | null = null;
export function sailTo(to: Spot, duration = 1800) {
  tween = { from: { ...current }, to, start: performance.now(), dur: Math.max(1, duration) };
}
export function canoeSpot(now: number): Spot {
  if (tween) {
    const k = easeOut((now - tween.start) / tween.dur);
    const { from, to } = tween;
    current = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, scale: from.scale + (to.scale - from.scale) * k };
    if (k >= 1) tween = null;
  }
  return current;
}
