# UMAD P3 Limit Cut — Solo Reaction Trainer

**Date:** 2026-06-08
**Status:** Approved (sections 1–3); rendering/flow/testing pending user review

## Purpose
A completely local, static browser page to drill the FFXIV ultimate "UMAD" Phase 3
**Limit Cut** dodge. Solo reaction trainer: each round you are shown Kefka's first dash
(origin + rotation) and your Limit Cut number (1–8), and you must click your correct
dodge spot as fast as possible. It is the third tool in the suite, after P1 Arrows
(`index.html`) and P2 Forsaken (`forsaken.html`, on a separate unmerged branch).

## Mechanic
Kefka dashes across the circular arena in a sequence, crossing each waymark to its
diametric opposite, stepping around the ring: `A→C, 1→3, D→B, 4→2, …`. The *order* of
those origins around the circle reveals his **rotation** (the example sequence steps
45° CCW each dash, so Kefka is rotating CCW).

Limit Cut resolution:
- **Rel N** (relative north, the counting anchor) = the waymark **diametrically opposite
  the first dash's origin**. First dash from A → Rel N = C.
- Players line up on the 8 dodge spots in **numerical order 1→8**, starting from Rel N,
  going in the **opposite** direction to Kefka's rotation (Kefka CCW → players count CW).
- Your **Limit Cut number** (the head-marker pip, 1–8) is your position in that line.

So the whole mechanic reduces to two inversions — "opposite origin, opposite spin" —
plus your number.

## Geometry (engine source of truth)
Angles in degrees, **0° = North (up), increasing clockwise** (E=90, S=180, W=270).

**Waymarks (8 reference points), 45° apart:**

| Mark | A | 2 | B | 3 | C | 4 | D | 1 |
|---|---|---|---|---|---|---|---|---|
| Angle | 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315 |
| Compass | N | NE | E | SE | S | SW | W | NW |

(CCW order of dash origins: A→1→D→4→C→3→B→2, each −45°.)

**Dodge spots (8), the inter-inter-cardinals:** `22.5 + k·45` for k=0..7 →
`22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5`. Each sits halfway between two
adjacent waymarks. `spotIndex` k = `(angle − 22.5) / 45`.

## The resolver (pure)
```
resolve({ originAngle, rotation, number }) → { angle, spotIndex }
  R        = (originAngle + 180) mod 360         // Rel N = opposite the dash origin
  countSgn = rotation === 'CCW' ? +1 : -1        // count OPPOSITE Kefka's spin; CW = +angle
  angle    = (R + countSgn·(45·number − 22.5)) mod 360
  spotIndex = (angle − 22.5) / 45  (mod 8)
```
Worked checks (must be encoded as tests):
- `A→C, CCW, #1`  → R=180, +(45·1−22.5)=22.5 → **202.5°** (between S and SW) ✓
- `D→B, CW, #2`   → R=90,  −(45·2−22.5)=−67.5 → **22.5°** (between N and NE) ✓

`rotation` is **Kefka's** spin (`'CW' | 'CCW'`). `originAngle` is one of the 8 waymark
angles. `number` ∈ 1..8.

### Scenario generator
```
deal() → { origin: {mark, angle}, rotation, number }
```
- `origin`: uniformly random among **all 8 waymarks**.
- `rotation`: uniformly random `'CW' | 'CCW'`.
- `number`: uniformly random 1..8.

### Engine module shape
Pure, DOM-free, no dependencies. Dual export so the same file serves the browser and
Node tests:
```js
const LimitCut = { WAYMARKS, DODGE_SPOTS, resolve, deal, relNorth, angleToXY };
if (typeof module !== 'undefined' && module.exports) module.exports = LimitCut;
if (typeof window !== 'undefined') window.LimitCut = LimitCut;
```
`relNorth(originAngle)` and `angleToXY(angle, radius)` are pure helpers (the latter used
by the renderer to place markers; kept in the engine so it's unit-testable).

## Rendering (DOM/SVG layer in limitcut.html)
A single inline **SVG** arena (cleaner than CSS grid for angle-placed elements and the
rotation arc), centered viewBox, dark radial-gradient fill matching the suite palette
(`--bg/--panel/--edge/--cyan/--pink/--gold/--green/--red`).

Layers, outer → inner radius:
1. **Arena disc** — circle with the tower-style ring border used elsewhere.
2. **Waymarks (8)** — FFXIV-style colored markers just inside the rim, placed via
   `angleToXY`. Cardinals as filled circles, intercardinals as squares, with their
   letters/numbers: `A=red, B=gold, C=cyan, D=violet`, `1–4` in the same family. Purely
   decorative reference; not clickable.
3. **First-dash glyph** — at the dash origin: a faint straight dash line crossing to the
   opposite side **plus** a short **curved arrow hugging the rim**, arrowhead pointing in
   Kefka's rotation direction (CW or CCW). This is the player's primary read.
4. **Dodge spots (8)** — clickable circular buttons at the inter-inter-cardinals, in the
   muted palette; hover/focus highlight. These are the answer targets.
5. **Your pip** — the Limit Cut number (1–8) shown prominently above the arena (head-marker
   style badge) as your assignment.

### Round flow
1. `deal()` a scenario; `resolve()` the correct spot; render dash glyph + pip; start
   `performance.now()` timer.
2. Player clicks a dodge spot → lock, stop timer.
3. **Correct** → green spot highlight + reaction time (e.g. "Correct! 1.23s").
   **Wrong** → red on the pick, green on the correct spot, and a one-line reason
   ("Rel N is C; CCW spin → count CW; #1 is the next spot CW of Rel N").
4. `Next` button (and Space/Enter when locked) deals the next round.

### Controls & hints (parity with existing tools)
- **Next** — new round.
- **Show Rel N** (ghost toggle, off by default) — overlays a "Rel N" label on the anchor
  waymark/spot and an arrow for the count direction, so learners can scaffold then turn it
  off. Mirrors the "Hide arrows" learning aid in `index.html`.
- **Cheat sheet** (ghost toggle) — a legend panel restating the rule ("opposite origin,
  opposite spin, count your number") and the waymark map, with a source link.
- Reaction time shown per round (no persistent scoring in v1 — matches `index.html`).

## Testing (`limitcut-engine.test.js`, `node --test`)
- **Canonical examples** — the two worked checks above resolve to 202.5° and 22.5°.
- **Bijection property** — for every (origin, rotation), `resolve` over numbers 1..8
  yields all 8 distinct dodge spots exactly once (the line fills the ring).
- **Rel N** — `relNorth` is always exactly opposite the origin; a cardinal origin yields a
  cardinal Rel N, intercardinal yields intercardinal.
- **Wrap correctness** — `#8` lands on the spot immediately *before* Rel N in the count
  direction (i.e. 337.5° offset from Rel N).
- **Spin inversion** — same (origin, number) under CW vs CCW are mirror images across Rel N.
- **`deal()` validity** — origin ∈ the 8 waymarks, rotation ∈ {CW,CCW}, number ∈ 1..8.
- **`angleToXY`** — N maps to straight up (0, −r), E to (+r, 0), within float tolerance.

## File changes
- **Add** `limitcut.html`, `limitcut-engine.js`, `limitcut-engine.test.js`.
- **Edit** `index.html` — add a `P3 Limit Cut trainer →` nav link (only a live link; no
  link to the unmerged `forsaken.html` from this branch).
- **Edit** `README.md` — short "P3 Limit Cut trainer" section.

## Out of scope (YAGNI for v1)
- Multi-dash animation / inferring rotation from a played-out sequence (one static dash
  glyph encodes origin + rotation).
- Director/scenario-pinning panel, persistent scoring/streaks, multiplayer, sound.
