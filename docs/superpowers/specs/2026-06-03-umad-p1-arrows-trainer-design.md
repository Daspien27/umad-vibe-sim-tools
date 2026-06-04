# UMAD P1 Arrows — Solo Reaction Trainer

**Date:** 2026-06-03
**Status:** Approved

## Purpose
A completely local, static browser page to drill the FFXIV ultimate "UMAD" Phase 1
Arrows mechanic. Solo reaction trainer: you are dealt one player's two arrows and must
click your two perimeter spots, in the correct sequence, as fast as possible.

## Mechanic
- A 5×5 arena; the 16 perimeter cells are puddle spots forming a **clockwise arrow ring**:
  top edge →, right edge ↓, bottom edge ←, left edge ↑.
- 8 players, 2 puddles each (16 total). Each puddle has a timer: one **7s**, one **10s**.
  The 7s puddle resolves first, so it must be dropped first.
- **Matching (cardinal) players** — both arrows identical, two cells on one edge:
  - `↑↑` → left edge, `→→` → top, `↓↓` → right, `←←` → bottom.
  - Order does **not** matter (both puddles identical).
- **Mixed (intercardinal) players** — two different arrows forming a CW corner turn,
  two cells straddling a corner (one per adjacent edge):
  - `↑→` → top-left, `→↓` → top-right, `↓←` → bottom-right, `←↑` → bottom-left.
  - Order **matters**: the 7s arrow's cell must be dropped first.

## Geometry (rendering model)
A symmetric 16-cell ring rendered on a 6×6 CSS grid, **4 cells per side**, the four exact
corners left empty. CW cell ids: `T1..T4` (top, →), `R1..R4` (right, ↓), `B1..B4`
(bottom, ←), `L1..L4` (left, ↑).

Ownership:
| Player | Cells | Arrows |
|---|---|---|
| Match top | T2, T3 | →, → |
| Match right | R2, R3 | ↓, ↓ |
| Match bottom | B2, B3 | ←, ← |
| Match left | L2, L3 | ↑, ↑ |
| Mixed TL | L4 (↑), T1 (→) | up, right |
| Mixed TR | T4 (→), R1 (↓) | right, down |
| Mixed BR | R4 (↓), B1 (←) | down, left |
| Mixed BL | B4 (←), L1 (↑) | left, up |

## Round flow
1. Pick a random player (1 of 8). Randomly tag its two arrows **7s** and **10s**;
   randomize their left/right display order so position never leaks the order.
2. Show the assignment (two arrow tiles, each with a timer badge).
3. Player clicks two distinct perimeter cells in sequence (first click shows a "1" badge;
   clicking the selected cell again deselects it; second distinct click auto-submits).
   Inner/empty cells are inert.
4. Validate:
   - Clicked cell set must equal the player's two cells.
   - Matching → any order accepted.
   - Mixed → first clicked cell must be the **7s** arrow's cell.
5. Flash green (correct) / red (wrong). On wrong, highlight the correct cells (with order
   badges 1=7s, 2=10s for mixed). Show reaction time. **"Try again"** (button, click, or
   Space/Enter) loads the next round.

## Out of scope (explicitly cut)
Auto-advance, stats/streaks, persistence, sound, full 8-player board, multi-cell-per-puddle
faithfulness beyond the two-click model.

## Touches
- Reaction time shown per attempt (start → second click).
- Toggleable cheat-sheet legend with the mapping table.

## Delivery
A single self-contained `index.html` — inline CSS + JS, zero dependencies, no build,
no network. Opens offline in any browser.
