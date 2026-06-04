# UMAD · P1 Arrows — Reaction Trainer

A completely local, static browser trainer for the FFXIV ultimate **UMAD** Phase 1
**Arrows** mechanic. Deals you one player's two arrows and times how fast you can click
your two perimeter spots — in the correct drop order.

**[▶ Play it](https://USERNAME.github.io/REPO/)** *(update this link after enabling GitHub Pages)*

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

## License

MIT
