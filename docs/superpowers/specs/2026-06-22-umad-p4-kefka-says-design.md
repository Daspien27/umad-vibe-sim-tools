# UMAD · P4 Kefka Says — Design

**Date:** 2026-06-22
**Status:** Approved design, ready for implementation plan
**Branch:** `feature/p4-kefka-says`

## Summary

A **macro-pad + chat-log utility** for the UMAD Phase 4 "Kefka Says" mechanic. Unlike
the other tools in this repo, this is **not a reaction sim** — there is no "correct
answer" and no resolution engine. It is a practice/communication aid that mimics the
FFXIV macro experience: assign call-out macros to a grid, click them to "fire" their
text into a simulated chat log (in the right channel colors), and clear the log between
pull attempts.

It ships as a flat, self-contained page (`kefkasays.html`) consistent with the existing
tools, plus a pure, tested `kefkasays-engine.js`.

## Goals

- A **5×5 macro pad** above a **chat log**, matching the general feel of the in-game
  reference (macro grid on top, party/echo text below).
- A **super-simplified FF macro system**: two colored chat channels — **Party** (`/p`)
  and **Echo** (`/e`) — plus neutral plain lines.
- **User-customizable macros** via an editor (paste-from-game-friendly raw textarea).
- **Per-channel color control** (one Party color, one Echo color).
- **Clear log** for subsequent attempts.
- **Import / Export** the full setup (macros + grid + colors) as a single shareable
  string.
- Ships with the **18 default macros** listed by the user.

## Non-Goals (this pass)

- Mechanics simulation / scoring / timing of the actual fight.
- Icons / `/micon` support (lines are dropped on import; iconography revisited later).
- The 4 FF hotbar pages — a **single** 5×5 grid only.
- Chat channels/commands beyond Party + Echo (e.g. `/say`, `/yell`, `/fc`).

## UI Layout (`kefkasays.html`)

Top-to-bottom, using the shared dark theme + `.toolnav` (a new **P4 Kefka Says** link
is added to the nav on every page; this page's link is `active`).

```
UMAD · P4 Kefka Says
[ P1 Arrows ] [ P3 Limit Cut ] [ P4 Kefka Says ] [ P5 Celestriad ]   ← toolnav

┌───────────────────────────────┐
│   MACRO PAD  (5×5 grid)        │  Each slot shows the macro NAME as a text label
│   [Real Inf][Fake Inf][ … ]    │  (iconography TBD later); full name on hover.
│   [ … empty slots … ]          │
└───────────────────────────────┘
[ Edit macros ] [ Clear log ] [ Import/Export ]   Party ■  Echo ■   ← controls

┌───────────────────────────────┐
│  CHAT LOG                      │  Clicking a slot appends that macro's lines, each
│  [16:08] Chariot - GET OUT!!   │  colored by channel, with a timestamp. Newest at
│  [16:08] Opposite (Real) …     │  bottom; scrolls.
└───────────────────────────────┘

▼ Macro palette (collapsible drawer)              ← drag any macro onto the grid
[Real Inferno][Fake Inferno][Real Typhoon] …
```

### Macro pad (grid)
- 25 slots. Each slot is either empty or holds a macro.
- A filled slot shows the macro **name** as a text label; the full name appears on
  **hover** (tooltip).
- **Click** a filled slot → fires the macro (appends its lines to the log).
- **Drag** palette → slot (assign), slot → slot (move/swap), slot → palette or
  right-click (clear the slot).

### Macro palette (drawer)
- A collapsible, scrollable strip listing **all** defined macros (18 defaults + any the
  user adds). This is the source for drag-to-assign.

### Chat log
- Append-only list; each fired line is one row: `[HH:MM] text`, colored by channel.
- **Party** and **Echo** lines use the current per-channel colors; **none** (plain)
  lines render in a neutral/muted color.
- Timestamps are **cosmetic, auto-incrementing fake `[HH:MM]`** values (not real
  wall-clock), to resemble the reference image.
- **Clear log** empties it.

### Color pickers
- Two `<input type="color">` controls: Party color, Echo color.
- Changing a color recolors **existing and future** lines of that channel live.

## Data Model

```js
// One macro
Macro = {
  id:    string,                       // stable unique id
  name:  string,                       // shown on slot + hover; e.g. "Real Inferno"
  lines: [ { channel, text } ]         // channel ∈ "party" | "echo" | "none"
}

// Whole persisted setup
Setup = {
  v:      1,
  macros: { [id]: Macro },             // the library (defaults + user edits)
  grid:   [ id | null x25 ],           // slot → macro id (or empty)
  colors: { party: "#rrggbb", echo: "#rrggbb" }
}
```

- **Persistence:** the whole `Setup` is saved to `localStorage` under `kefkasays.v1`
  on every change; loaded on startup; falls back to defaults if absent/corrupt.
- **Defaults:** the 18 macros below, a **default pad layout** (`DEFAULT_GRID`, baked into
  the engine from the maintainer's exported setup string), Party ≈ light cyan/white,
  Echo ≈ pink/magenta (per the reference image).

## Engine (`kefkasays-engine.js`) — pure, DOM-free, tested

Exports (CommonJS, like the other engines so `node --test` works):

- `DEFAULT_MACROS` — the 18 macros as structured `Macro` data.
- `DEFAULT_COLORS` — `{ party, echo }`.
- `parseMacro(text) -> { name?, lines }`
  - Splits raw macro text into lines. Per-line prefix mapping:
    - `/p ` (or `/party `) → `{ channel: "party", text }`
    - `/e ` (or `/echo `)  → `{ channel: "echo",  text }`
    - `/micon …`           → **dropped**
    - anything else (bare text) → `{ channel: "none", text }`
- `serializeMacro(macro) -> text`
  - Inverse of `parseMacro` for loading a macro into the editor textarea:
    `party→"/p …"`, `echo→"/e …"`, `none→ bare text`.
- `encodeSetup(setup) -> string` — `base64(JSON.stringify(setup))`, URL-safe, version
  tagged.
- `decodeSetup(str) -> setup` — inverse; throws on malformed/garbage input.

### Tests (`kefkasays-engine.test.js`, `node --test`)
- Each prefix maps to the right channel; `/micon` is dropped; bare line → `none`.
- `serializeMacro(parseMacro(text))` round-trips line content.
- `parseMacro(serializeMacro(macro))` preserves lines.
- `decodeSetup(encodeSetup(setup))` deep-equals `setup`.
- `decodeSetup("garbage")` throws (caught by the UI).

## Macro Editor (modal)

- A list of all macros (name + short preview) with **＋ New**, **Duplicate**,
  **Delete** per macro, and **Reset to defaults**.
- Selecting a macro opens an edit form:
  - **Name** text field.
  - A **raw textarea** containing the FF-style macro text (`/p …`, `/e …` lines), so a
    user can paste straight from their in-game macro. On **Save**, the textarea is run
    through `parseMacro` to produce the structured lines.
- **Reset to defaults** restores the shipped 18 macros + default colors (with a confirm).

## Import / Export (modal)

- **Export:** show `encodeSetup(currentSetup)` in a read-only textarea with a **Copy**
  button.
- **Import:** a textarea + **Load** button. On load: `decodeSetup` (try/catch) → validate
  shape → replace state, persist, re-render. On bad input, show a clear inline error and
  change nothing.

## Default Macros (the 18)

`/micon` lines are dropped on import. Channel shown per line.

| # | Name | Lines (channel · text) |
|---|------|------------------------|
| 1 | Real Inferno | party · `[1] Chariot - GET OUT!! (Inferno)` / party · `[1] AFTER: First Shriek + Levin Floor` |
| 2 | Fake Inferno | party · `[1] DONUT - STAY IN!! (Inferno)` / party · `[1] AFTER: First Shriek + Levin Floor` |
| 3 | Real Typhoon | party · `[2] DONUT - STAY IN!! (Typhoon)` / party · `[2] AFTER: Second Shriek - During Stock Floor` |
| 4 | Fake Typhoon | party · `[2] Chariot - GET OUT!! (Typhoon)` / party · `[2] AFTER: Second Shriek - During Stock Floor` |
| 5 | Yellow Dude | echo · `-` / echo · `Opposite (Real) // Same (Fake)` |
| 6 | Purple Dude | echo · `-` / echo · `Same (Real) // Opposite (Fake)` |
| 7 | Real Exdeath | echo · `-` / echo · `....V----- REAL (LOOK AWAY)` |
| 8 | Fake Exdeath | echo · `-` / echo · `....FAKE (LOOK AT) -------V` |
| 9 | Accel Bomb | echo · `\|\|\|\|-STILLNESS -\|\| - ~~MOTION~~~~` |
| 10 | I'm Shriek | echo · `SHRiEEEEEEEKKK!!!!` |
| 11 | Support Prpl <1min | echo · `[D] -> [A] ------------- [A] -> [A]` |
| 12 | Support Prpl >1min | echo · `[A] -> [D] ------------- [A] -> [A]` |
| 13 | Support Water <1min | echo · `[A] -> [A] ------------- [D] -> [A]` |
| 14 | Support Water >1min | echo · `[A] -> [A] ------------- [A] -> [D]` |
| 15 | DPS Prpl <1min | echo · `[B] -> [C] ------------- [C] -> [C]` |
| 16 | DPS Prpl >1min | echo · `[C] -> [B] ------------- [C] -> [C]` |
| 17 | DPS Water <1min | echo · `[C] -> [C] ------------- [B] -> [C]` |
| 18 | DPS Water >1min | echo · `[C] -> [C] ------------- [C] -> [B]` |

> Note: "I'm Shriek" is the macro **name** only (shown on the pad / on hover); it is not a
> chat line. The `none` channel still exists for any user-authored bare (no-command) line —
> in the editor textarea such a line appears as plain text with no `/p` or `/e` prefix.

## Resources (linked in About + README)

This tool pairs well with other UMAD P4 prep material — it's a comms/practice aid you can
run **alongside VOD review or a sim** while drilling call-outs. Surface these links in the
About panel and the README's P4 section:

- **Raidplan:** https://raidplan.io/plan/V-r1InYZW7VMRYAU
- **Aery's P4 Macros:** https://docs.google.com/spreadsheets/d/1Uo88anmlf2zectmvWMnm8j4ebMPOsFyQ-Lq33wFu7Y0/edit?usp=sharing
- **DMU Sim (Waju-Sims):** https://github.com/WCGH/Waju-Sims/releases

## Integration / Conventions

- Add `kefkasays.html` at the repo root; keep all pages flat (stable URLs).
- Add the **P4 Kefka Says** link to the `.toolnav` block on **every** page
  (`index.html`, `limitcut.html`, `celestriad.html`, `kefkasays.html`); mark the active
  one.
- Update `README.md` with a P4 Kefka Says section.
- `kefkasays-engine.js` mirrors the existing engines' CommonJS export style so
  `node --test` runs in the same way.

## Open Items Deferred

- **Iconography** for grid slots (currently text labels) — revisit after initial build.
- **Default grid layout:** ships with `DEFAULT_GRID` (baked into the engine from the
  maintainer's exported setup string); applied on first load and on "Reset to defaults".
