# UMAD · P1 Arrows — Reaction Trainer

A completely local, static browser trainer for the FFXIV ultimate **UMAD** Phase 1
**Arrows** mechanic. Deals you one player's two arrows and times how fast you can click
your two perimeter spots — in the correct drop order.

**[▶ Play it](https://daspien27.github.io/umad-vibe-sim-tools/)** *(live once GitHub Pages is enabled — see Settings → Pages)*

## The mechanic

16 puddles, 8 players (2 arrows each). Each puddle carries a timer — one **7s**, one
**10s** — and the 7s puddle resolves first, so it must be dropped first.

- **Matching** players get two identical arrows; order doesn't matter.
- **Mixed** players get a clockwise corner pair (e.g. `↑→`); the **7s** arrow's cell
  must be dropped first.

## Strats (tabs)

- **Merry-Go-Round** — everyone forms one big clockwise ring on a 5×5 perimeter.
- **Filipino** — four 2×2 boxes, one per quadrant; each box holds one matching and one
  mixed player.

## Run it

It's a single self-contained file — just open `index.html` in any browser. No build,
no dependencies, no network.

## How a round works

1. You're dealt a hand: two arrow tiles with **7s** / **10s** badges and a Matching/Mixed
   tag.
2. Click your two cells in sequence (first click shows a "1" badge; click it again to
   deselect; the second distinct click submits).
3. Green = correct (with reaction time); red tells you why and highlights the correct
   cells. **Try again** (or Space/Enter) deals the next hand. **Cheat sheet** toggles the
   current strat's mapping.

## P3 Limit Cut trainer

`limitcut.html` — a solo reaction trainer for the Phase 3 **Limit Cut** dodge. Each round
shows Kefka's first dash (origin + rotation) and your Limit Cut number (1–8); you click
your dodge spot as fast as possible. The rule, in three steps: **Rel N** is the waymark
*opposite* the dash origin, you count *opposite* Kefka's spin (Kefka CCW → you count CW),
and you step your number of inter-inter-cardinal spots from Rel N. A **Show Rel N** toggle
scaffolds the anchor + count direction; **Cheat sheet** restates the rule.

Resolution logic lives in `limitcut-engine.js` (pure, DOM-free); run its tests with
`node --test`.

## Project layout · adding a tool

Each mechanic is a flat, self-contained page at the repo root (stable URLs, no build):

- `index.html` — the front door / **P1 Arrows** tool (stays at `/`).
- `<mech>.html` — one page per mechanic (e.g. `limitcut.html`).
- `<mech>-engine.js` / `<mech>-engine.test.js` — optional pure, DOM-free logic + `node --test`.

To add a new tiny tool:

1. Create `<mech>.html` (copy an existing page's shell for the shared dark theme).
   Put any non-trivial resolution logic in a pure `<mech>-engine.js` with tests.
2. Add a link to the `.toolnav` block **on every page** (the snippet is marked with a
   comment); mark the current page's link `class="active"`.

Keeping pages flat means every existing URL (`/`, `/limitcut.html`, …) stays valid.

## License

MIT
