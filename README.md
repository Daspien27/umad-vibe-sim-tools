# UMAD · Reaction Trainers

Completely local, static browser trainers for FFXIV ultimate **UMAD** mechanics — no
build, no dependencies, no network. Each tool is a self-contained HTML page; just open it
in any browser. The tools cross-link through an in-page nav.

**[▶ Play it](https://daspien27.github.io/umad-vibe-sim-tools/)**

## P1 Arrows (`index.html`)

The Phase 1 **Arrows** mechanic: you're dealt one player's two arrows and timed on how fast
you click your two perimeter spots, in the correct drop order.

16 puddles, 8 players (2 arrows each). Each puddle carries a timer — one **7s**, one
**10s** — and the 7s puddle resolves first, so it must be dropped first.

- **Matching** players get two identical arrows; order doesn't matter.
- **Mixed** players get a clockwise corner pair (e.g. `↑→`); the **7s** arrow's cell must
  be dropped first.

Two strats, as in-page tabs:

- **Merry-Go-Round** — everyone forms one big clockwise ring on a 5×5 perimeter.
- **Filipino** — four 2×2 boxes, one per quadrant; each holds one matching and one mixed
  player.

Click your two cells in order (first click shows a "1" badge; click it again to deselect).
Green = correct with reaction time; red explains why and highlights the solution.

## P3 Limit Cut (`limitcut.html`)

A solo reaction trainer for the Phase 3 **Limit Cut** dodge. Each round shows Kefka's first
dash (origin + spin) and your Limit Cut number (1–8, drawn as the in-game "counting egg"
pip cluster — blue odd, red even); you click your dodge spot as fast as you can. After you
answer, every spot reveals its number so you can check the whole line.

Resolving it, in three reads:

1. **Rel N** is where Kefka's first dash *ends* — the waymark opposite where it started.
2. You count **opposite** his spin (Kefka CCW → you go CW).
3. From Rel N, step your number of inter-inter-cardinal spots.

Helpers: **Lock Dash as Relative N / S** reorients the whole arena so the dash origin faces
the top/bottom; **Hide waymarks** for a harder drill; **Cheat sheet** restates the rule with
a worked example.

Resolution logic lives in `limitcut-engine.js` (pure, DOM-free); run its tests with
`node --test`.

## Controls

Across both tools: **Try again** — or `R`, or `Space` / `Enter` after you've answered —
deals the next round. **About** lists the hotkeys, the source link, and credits.

## Project layout · adding a tool

Each mechanic is a flat, self-contained page at the repo root (stable URLs, no build):

- `index.html` — the front door / **P1 Arrows** tool (stays at `/`).
- `<mech>.html` — one page per mechanic (e.g. `limitcut.html`).
- `<mech>-engine.js` / `<mech>-engine.test.js` — optional pure, DOM-free logic + `node --test`.

To add a new tool:

1. Create `<mech>.html` (copy an existing page's shell for the shared dark theme). Put any
   non-trivial resolution logic in a pure `<mech>-engine.js` with tests.
2. Add a link to the `.toolnav` block **on every page** (the snippet is marked with a
   comment); mark the current page's link `class="active"`.

Keeping pages flat means every existing URL (`/`, `/limitcut.html`, …) stays valid.

## Credits

Created by **Daspien**, with the assistance of Claude.

## License

MIT
