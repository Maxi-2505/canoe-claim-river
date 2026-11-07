# Papercut sea — new canoe background on the intake

Replace the pencil lake with one new decorative scene, `<PapercutSea />`. Page content, layout, fonts and paper colour stay as they are. Same graphite water and canoe drawings.

## What you will see
- No more stray lines: the keel stroke, ripple arcs, streaks and reflection strips are gone.
- Water built from 6–7 cut-paper layers with wavy hand-cut tops, lighter/flatter at the back, darker/taller at the front, thin paper rim, soft shadow, faint paper grain. Each layer bobs on its own.
- The canoe sits between the layers: front 1–2 layers cover the lower hull. It rocks ±4° at the waterline, with tiny paper snippets at the bow when it dips.
- Entrance (~3.6s, once per browser session): layers slide up back to front, a paper sheet drops onto the water, folds into the canoe in 5 panels, then swaps to the real image and settles. Reduced motion shows the resting scene only. Never blocks clicks.

## Files
- New: `src/components/canoe/PapercutSea.tsx` (scene, layers, fold, snippets), `src/components/canoe/papercut.ts` (tunable constants, `positions[]`, wave path generator, panel polygons, `sailTo`).
- Change: `PencilBackdrop.tsx` renders `<PapercutSea />` (keeps the intake-only placement); `src/styles.css` swaps `.pencil-scene` rules for papercut ones.
- Delete: `PencilWaterBackground.tsx`, plus unused `pencil-canoe.png`, `pencil-water.jpg`, `graphite-canoe-source.png` if nothing imports them.
- Update the AGENTS.md backdrop rule and the pencil-scene memory note.

## How the canoe splits into 5 panels
Five copies of `graphite-canoe.png`, stacked identically, each with a `clip-path: polygon(...)` in percent of the image box. Polygons share edges exactly so at rotation 0 they reassemble the image pixel-for-pixel:

```text
 +------+-----------------+------+
 |      |   left hull     |      |   top half (far gunwale)
 | bow  +--- interior ----+ stern|   middle band (thwarts)
 |      |   right hull    |      |   bottom half (near hull)
 +------+-----------------+------+
   ~0-22%      22-78%       78-100%
```
- Hinges (transform-origin): hull halves fold on the edge they share with the interior band (rotateX), bow/stern on their edge with the middle (rotateY), interior settles with a small lift.
- Each panel is a preserve-3d card: front = clipped canoe, back = paper with grain, both backface-hidden; highlight sweep and crease line are overlays that fade out.
- Exact split lines will be tuned to the drawing once rendered; a dev-only `?align` flag overlays panels at 50% over the image to check alignment.

## Technical details
- Motion via one requestAnimationFrame loop writing transforms/opacity only; entrance timeline is time-based, flagged in sessionStorage.
- Layer clipPaths are SVG paths generated once (seeded jitter), water texture as offset background per layer.
- `sailTo({x,y,scale}, ms)` tweens the canoe group's base position; `positions[0]` is the current resting spot, ready for later form steps.
- Constants at top: layerCount, waveAmplitude, rockAngle, entryDuration, foldStagger.
- Verify with Playwright at desktop and the 631px mobile width: entrance frames, resting scene, reduced motion, no runtime errors.
