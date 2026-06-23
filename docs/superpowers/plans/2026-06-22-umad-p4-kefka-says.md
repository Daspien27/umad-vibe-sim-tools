# P4 Kefka Says Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a macro-pad + simulated chat-log utility (`kefkasays.html`) for the UMAD Phase 4 "Kefka Says" mechanic — assign call-out macros to a 5×5 grid, click to "fire" their text into a party/echo-colored chat log, customize macros, and import/export the whole setup as a shareable string.

**Architecture:** A flat, self-contained `kefkasays.html` holds all UI/DOM logic (vanilla JS in an IIFE, shared dark theme, localStorage persistence). All pure, DOM-free logic — the 18 default macros, macro text parse/serialize, and setup encode/decode — lives in `kefkasays-engine.js`, exported via both `module.exports` and `window.KefkaSays`, and covered by `node --test` in `kefkasays-engine.test.js`. This mirrors the existing `celestriad`/`limitcut` tools.

**Tech Stack:** Plain HTML/CSS/vanilla JS (no build, no deps). Node's built-in `node:test` for engine tests. HTML5 drag-and-drop. `localStorage` for persistence.

**Spec:** `docs/superpowers/specs/2026-06-22-umad-p4-kefka-says-design.md`

**Conventions to follow (from existing engines):**
- Engine is an IIFE; at the bottom: `if (typeof module !== "undefined" && module.exports) module.exports = KefkaSays;` and `if (typeof window !== "undefined") window.KefkaSays = KefkaSays;`
- Tests: `"use strict"; const test = require("node:test"); const assert = require("node:assert"); const KS = require("./kefkasays-engine.js");`
- Run all engine tests with: `node --test`
- Channels are the strings `"party"`, `"echo"`, `"none"`.

---

## Task 1: Engine — default colors + the 18 default macros

**Files:**
- Create: `kefkasays-engine.js`
- Test: `kefkasays-engine.test.js`

- [ ] **Step 1: Write the failing test**

Create `kefkasays-engine.test.js`:

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const KS = require("./kefkasays-engine.js");

test("DEFAULT_COLORS has party + echo hex strings", () => {
  assert.match(KS.DEFAULT_COLORS.party, /^#[0-9a-fA-F]{6}$/);
  assert.match(KS.DEFAULT_COLORS.echo, /^#[0-9a-fA-F]{6}$/);
});

test("DEFAULT_MACROS: 18 macros, unique ids, valid shape", () => {
  assert.strictEqual(KS.DEFAULT_MACROS.length, 18);
  const ids = KS.DEFAULT_MACROS.map(m => m.id);
  assert.strictEqual(new Set(ids).size, 18, "ids are unique");
  for (const m of KS.DEFAULT_MACROS) {
    assert.ok(typeof m.id === "string" && m.id.length > 0, "id is non-empty string");
    assert.ok(typeof m.name === "string" && m.name.length > 0, "name is non-empty string");
    assert.ok(Array.isArray(m.lines) && m.lines.length > 0, "lines is non-empty array");
    for (const ln of m.lines) {
      assert.ok(["party", "echo", "none"].includes(ln.channel), "channel is valid: " + ln.channel);
      assert.strictEqual(typeof ln.text, "string");
    }
  }
});

test("DEFAULT_MACROS: spot-check known macros", () => {
  const byName = Object.fromEntries(KS.DEFAULT_MACROS.map(m => [m.name, m]));

  assert.deepStrictEqual(byName["Real Inferno"].lines, [
    { channel: "party", text: "[1] Chariot - GET OUT!! (Inferno)" },
    { channel: "party", text: "[1] AFTER: First Shriek + Levin Floor" },
  ]);

  // Echo-channel macro
  assert.deepStrictEqual(byName["Yellow Dude"].lines, [
    { channel: "echo", text: "-" },
    { channel: "echo", text: "Opposite (Real) // Same (Fake)" },
  ]);

  // The bare-line macro: line 1 has no /p or /e -> "none"
  assert.deepStrictEqual(byName["I'm Shriek"].lines, [
    { channel: "none", text: "I'm Shriek" },
    { channel: "echo", text: "SHRiEEEEEEEKKK!!!!" },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test`
Expected: FAIL — `Cannot find module './kefkasays-engine.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `kefkasays-engine.js`:

```js
// =====================================================================
//  UMAD P4 Kefka Says — pure data + text engine (DOM-free, no deps).
//
//  This tool is a macro pad + simulated chat log (NOT a mechanics sim).
//  This module holds the 18 default call-out macros, the macro-text
//  parse/serialize functions (text <-> {name, lines:[{channel,text}]}),
//  and setup encode/decode for the shareable import/export string.
//
//  Channels: "party" (/p), "echo" (/e), "none" (bare text). /micon lines
//  are dropped on import.
// =====================================================================
(function () {
  "use strict";

  var DEFAULT_COLORS = { party: "#7ec8ff", echo: "#ff7ad9" };

  // Helper so the default list reads like the in-game macros.
  function P(text) { return { channel: "party", text: text }; }
  function E(text) { return { channel: "echo", text: text }; }
  function N(text) { return { channel: "none", text: text }; }

  var DEFAULT_MACROS = [
    { id: "real-inferno", name: "Real Inferno", lines: [
      P("[1] Chariot - GET OUT!! (Inferno)"),
      P("[1] AFTER: First Shriek + Levin Floor") ] },
    { id: "fake-inferno", name: "Fake Inferno", lines: [
      P("[1] DONUT - STAY IN!! (Inferno)"),
      P("[1] AFTER: First Shriek + Levin Floor") ] },
    { id: "real-typhoon", name: "Real Typhoon", lines: [
      P("[2] DONUT - STAY IN!! (Typhoon)"),
      P("[2] AFTER: Second Shriek - During Stock Floor") ] },
    { id: "fake-typhoon", name: "Fake Typhoon", lines: [
      P("[2] Chariot - GET OUT!! (Typhoon)"),
      P("[2] AFTER: Second Shriek - During Stock Floor") ] },
    { id: "yellow-dude", name: "Yellow Dude", lines: [
      E("-"),
      E("Opposite (Real) // Same (Fake)") ] },
    { id: "purple-dude", name: "Purple Dude", lines: [
      E("-"),
      E("Same (Real) // Opposite (Fake)") ] },
    { id: "real-exdeath", name: "Real Exdeath", lines: [
      E("-"),
      E("....V----- REAL (LOOK AWAY)") ] },
    { id: "fake-exdeath", name: "Fake Exdeath", lines: [
      E("-"),
      E("....FAKE (LOOK AT) -------V") ] },
    { id: "accel-bomb", name: "Accel Bomb", lines: [
      E("||||-STILLNESS -|| - ~~MOTION~~~~") ] },
    { id: "im-shriek", name: "I'm Shriek", lines: [
      N("I'm Shriek"),
      E("SHRiEEEEEEEKKK!!!!") ] },
    { id: "support-prpl-lt", name: "Support Prpl <1min", lines: [
      E("[D] -> [A] ------------- [A] -> [A]") ] },
    { id: "support-prpl-gt", name: "Support Prpl >1min", lines: [
      E("[A] -> [D] ------------- [A] -> [A]") ] },
    { id: "support-water-lt", name: "Support Water <1min", lines: [
      E("[A] -> [A] ------------- [D] -> [A]") ] },
    { id: "support-water-gt", name: "Support Water >1min", lines: [
      E("[A] -> [A] ------------- [A] -> [D]") ] },
    { id: "dps-prpl-lt", name: "DPS Prpl <1min", lines: [
      E("[B] -> [C] ------------- [C] -> [C]") ] },
    { id: "dps-prpl-gt", name: "DPS Prpl >1min", lines: [
      E("[C] -> [B] ------------- [C] -> [C]") ] },
    { id: "dps-water-lt", name: "DPS Water <1min", lines: [
      E("[C] -> [C] ------------- [B] -> [C]") ] },
    { id: "dps-water-gt", name: "DPS Water >1min", lines: [
      E("[C] -> [C] ------------- [C] -> [B]") ] }
  ];

  var KefkaSays = {
    DEFAULT_COLORS: DEFAULT_COLORS,
    DEFAULT_MACROS: DEFAULT_MACROS
  };

  if (typeof module !== "undefined" && module.exports) module.exports = KefkaSays;
  if (typeof window !== "undefined") window.KefkaSays = KefkaSays;
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add kefkasays-engine.js kefkasays-engine.test.js
git commit -m "Add Kefka Says engine: default colors + 18 default macros"
```

---

## Task 2: Engine — `parseMacro`

**Files:**
- Modify: `kefkasays-engine.js`
- Test: `kefkasays-engine.test.js`

- [ ] **Step 1: Write the failing test**

Append to `kefkasays-engine.test.js`:

```js
test("parseMacro: /p and /party -> party channel, prefix stripped", () => {
  assert.deepStrictEqual(KS.parseMacro("/p hello").lines, [{ channel: "party", text: "hello" }]);
  assert.deepStrictEqual(KS.parseMacro("/party hello").lines, [{ channel: "party", text: "hello" }]);
});

test("parseMacro: /e and /echo -> echo channel, prefix stripped", () => {
  assert.deepStrictEqual(KS.parseMacro("/e hi").lines, [{ channel: "echo", text: "hi" }]);
  assert.deepStrictEqual(KS.parseMacro("/echo hi").lines, [{ channel: "echo", text: "hi" }]);
});

test("parseMacro: /micon lines are dropped", () => {
  assert.deepStrictEqual(KS.parseMacro('/micon "summon ifrit"').lines, []);
  assert.deepStrictEqual(KS.parseMacro("/p keep\n/micon rekindle\n/e drop").lines, [
    { channel: "party", text: "keep" },
    { channel: "echo", text: "drop" },
  ]);
});

test("parseMacro: bare line -> none channel, text preserved verbatim", () => {
  assert.deepStrictEqual(KS.parseMacro("I'm Shriek").lines, [{ channel: "none", text: "I'm Shriek" }]);
});

test("parseMacro: blank lines are skipped", () => {
  assert.deepStrictEqual(KS.parseMacro("/p a\n\n/e b").lines, [
    { channel: "party", text: "a" },
    { channel: "echo", text: "b" },
  ]);
});

test("parseMacro: preserves echo text that contains special chars", () => {
  assert.deepStrictEqual(KS.parseMacro("/e ||||-STILLNESS -|| - ~~MOTION~~~~").lines,
    [{ channel: "echo", text: "||||-STILLNESS -|| - ~~MOTION~~~~" }]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test`
Expected: FAIL — `KS.parseMacro is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `kefkasays-engine.js`, add these functions before the `var KefkaSays = {` line:

```js
  // Parse raw FF-style macro text into structured lines.
  // /p|/party -> party, /e|/echo -> echo, /micon -> dropped, else -> none.
  // Blank lines are skipped.
  function parseMacro(text) {
    var lines = [];
    String(text == null ? "" : text).split(/\r?\n/).forEach(function (raw) {
      if (/^\s*$/.test(raw)) return;                 // skip blank
      if (/^\/micon\b/i.test(raw)) return;           // drop icon directive
      var mP = raw.match(/^\/(?:p|party)\s?(.*)$/i);
      if (mP) { lines.push({ channel: "party", text: mP[1] }); return; }
      var mE = raw.match(/^\/(?:e|echo)\s?(.*)$/i);
      if (mE) { lines.push({ channel: "echo", text: mE[1] }); return; }
      lines.push({ channel: "none", text: raw });    // bare line, verbatim
    });
    return { lines: lines };
  }
```

Then add `parseMacro: parseMacro,` to the `KefkaSays` export object.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test`
Expected: PASS (all tests including the 6 new ones).

- [ ] **Step 5: Commit**

```bash
git add kefkasays-engine.js kefkasays-engine.test.js
git commit -m "Add Kefka Says engine: parseMacro (channel detection, /micon drop)"
```

---

## Task 3: Engine — `serializeMacro` + round-trip

**Files:**
- Modify: `kefkasays-engine.js`
- Test: `kefkasays-engine.test.js`

- [ ] **Step 1: Write the failing test**

Append to `kefkasays-engine.test.js`:

```js
test("serializeMacro: party -> /p, echo -> /e, none -> bare", () => {
  const text = KS.serializeMacro({ lines: [
    { channel: "party", text: "hello" },
    { channel: "echo", text: "hi" },
    { channel: "none", text: "I'm Shriek" },
  ]});
  assert.strictEqual(text, "/p hello\n/e hi\nI'm Shriek");
});

test("serializeMacro: handles missing/empty lines", () => {
  assert.strictEqual(KS.serializeMacro({ lines: [] }), "");
  assert.strictEqual(KS.serializeMacro({}), "");
});

test("round-trip: parseMacro(serializeMacro(m)) preserves lines for every default macro", () => {
  for (const m of KS.DEFAULT_MACROS) {
    const back = KS.parseMacro(KS.serializeMacro(m)).lines;
    assert.deepStrictEqual(back, m.lines, "round-trip failed for " + m.name);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test`
Expected: FAIL — `KS.serializeMacro is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `kefkasays-engine.js`, add before the `var KefkaSays = {` line:

```js
  // Inverse of parseMacro, for loading a macro into the editor textarea.
  function serializeMacro(macro) {
    var lines = (macro && macro.lines) || [];
    return lines.map(function (ln) {
      if (ln.channel === "party") return "/p " + ln.text;
      if (ln.channel === "echo") return "/e " + ln.text;
      return ln.text; // none
    }).join("\n");
  }
```

Then add `serializeMacro: serializeMacro,` to the `KefkaSays` export object.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test`
Expected: PASS (round-trip holds for all 18 defaults).

- [ ] **Step 5: Commit**

```bash
git add kefkasays-engine.js kefkasays-engine.test.js
git commit -m "Add Kefka Says engine: serializeMacro + round-trip test"
```

---

## Task 4: Engine — `encodeSetup` / `decodeSetup`

**Files:**
- Modify: `kefkasays-engine.js`
- Test: `kefkasays-engine.test.js`

- [ ] **Step 1: Write the failing test**

Append to `kefkasays-engine.test.js`:

```js
function sampleSetup() {
  return {
    v: 1,
    macros: { "real-inferno": KS.DEFAULT_MACROS[0] },
    grid: new Array(25).fill(null).map((x, i) => (i === 0 ? "real-inferno" : null)),
    colors: { party: "#7ec8ff", echo: "#ff7ad9" },
  };
}

test("encodeSetup -> string with KS1: tag; decode round-trips deep-equal", () => {
  const setup = sampleSetup();
  const str = KS.encodeSetup(setup);
  assert.strictEqual(typeof str, "string");
  assert.ok(str.startsWith("KS1:"), "has version tag");
  assert.deepStrictEqual(KS.decodeSetup(str), setup);
});

test("encodeSetup round-trips unicode/special text", () => {
  const setup = sampleSetup();
  setup.macros["x"] = { id: "x", name: "weird", lines: [{ channel: "echo", text: "~~MOTION~~ // <3" }] };
  assert.deepStrictEqual(KS.decodeSetup(KS.encodeSetup(setup)), setup);
});

test("decodeSetup throws on garbage / wrong tag / bad shape", () => {
  assert.throws(() => KS.decodeSetup("garbage"));
  assert.throws(() => KS.decodeSetup("KS1:not-base64!!!"));
  assert.throws(() => KS.decodeSetup("KS1:" + Buffer.from('{"v":2}', "utf8").toString("base64")));
  assert.throws(() => KS.decodeSetup("KS1:" + Buffer.from('{"v":1}', "utf8").toString("base64"))); // missing fields
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test`
Expected: FAIL — `KS.encodeSetup is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `kefkasays-engine.js`, add before the `var KefkaSays = {` line:

```js
  // Cross-env base64 (Node Buffer, or browser btoa/atob with UTF-8 safety).
  function b64encode(str) {
    if (typeof Buffer !== "undefined") return Buffer.from(str, "utf8").toString("base64");
    return btoa(unescape(encodeURIComponent(str)));
  }
  function b64decode(b64) {
    if (typeof Buffer !== "undefined") return Buffer.from(b64, "base64").toString("utf8");
    return decodeURIComponent(escape(atob(b64)));
  }

  // Encode the whole setup as a portable, copy-pasteable string.
  function encodeSetup(setup) {
    return "KS1:" + b64encode(JSON.stringify(setup));
  }

  // Decode + validate. Throws on anything malformed.
  function decodeSetup(str) {
    var s = String(str == null ? "" : str).trim();
    if (s.indexOf("KS1:") !== 0) throw new Error("Not a Kefka Says setup string.");
    var obj = JSON.parse(b64decode(s.slice(4)));   // throws on bad base64/JSON
    if (!obj || obj.v !== 1 || typeof obj.macros !== "object" || obj.macros === null ||
        !Array.isArray(obj.grid) || !obj.colors ||
        typeof obj.colors.party !== "string" || typeof obj.colors.echo !== "string") {
      throw new Error("Malformed setup.");
    }
    return obj;
  }
```

Then add to the `KefkaSays` export object:

```js
    encodeSetup: encodeSetup,
    decodeSetup: decodeSetup,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test`
Expected: PASS (all engine tests green).

- [ ] **Step 5: Commit**

```bash
git add kefkasays-engine.js kefkasays-engine.test.js
git commit -m "Add Kefka Says engine: encodeSetup/decodeSetup for import/export"
```

---

## Task 5: Page scaffold — theme, toolnav, layout skeleton

**Files:**
- Create: `kefkasays.html`

Build the static shell. No interactivity yet beyond loading the engine. This task is build-then-manually-verify (DOM is not node-tested in this repo).

- [ ] **Step 1: Create `kefkasays.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>UMAD P4 Kefka Says — Macro Pad</title>
<style>
  :root {
    --bg: #07070e;
    --panel: #11121d;
    --edge: #2a2c42;
    --cyan: #38c6ff;
    --pink: #ff5fcb;
    --gold: #f5a623;
    --green: #36e07f;
    --red: #ff4d5e;
    --text: #e8eaf6;
    --muted: #8a8da8;
    --party: #7ec8ff;
    --echo: #ff7ad9;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; min-height: 100%;
    background: radial-gradient(circle at 50% 38%, #16172a 0%, var(--bg) 70%);
    color: var(--text);
    font-family: "Segoe UI", system-ui, sans-serif;
  }
  body {
    display: flex; flex-direction: column; align-items: center;
    min-height: 100vh; padding: 16px 12px 40px;
  }
  h1 {
    font-size: 1.25rem; letter-spacing: 0.14em; margin: 4px 0 2px;
    text-transform: uppercase; color: #fff; font-weight: 800;
  }
  .sub { color: var(--muted); font-size: 0.78rem; letter-spacing: 0.06em; margin-bottom: 12px; }

  /* ---- cross-tool nav (shared snippet across every tool page) ---- */
  .toolnav { display: flex; gap: 8px; margin: 2px 0 14px; flex-wrap: wrap; justify-content: center; }
  .toolnav a {
    font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; color: var(--muted);
    text-decoration: none; border: 1px solid var(--edge); border-radius: 999px; padding: 5px 14px;
  }
  .toolnav a:hover { color: var(--text); border-color: #4a4d70; }
  .toolnav a.active { color: #06070d; background: var(--cyan); border-color: var(--cyan); }

  .stage { width: 100%; max-width: 560px; display: flex; flex-direction: column; align-items: center; }

  /* ---- macro pad ---- */
  #pad {
    display: grid;
    grid-template-columns: repeat(5, 96px);
    grid-template-rows: repeat(5, 64px);
    gap: 7px; margin: 6px 0 12px;
  }
  .slot {
    border-radius: 10px; background: #0d0e18; border: 2px solid var(--edge);
    display: flex; align-items: center; justify-content: center; text-align: center;
    font-size: 0.72rem; font-weight: 700; color: var(--text); padding: 4px;
    cursor: pointer; overflow: hidden; user-select: none;
  }
  .slot.empty { border-style: dashed; color: var(--muted); cursor: default; }
  .slot:not(.empty):hover { border-color: #4a4d70; background: #141624; }
  .slot.dragover { border-color: var(--cyan); background: #141a2a; }

  /* ---- controls ---- */
  .controls { display: flex; gap: 10px; margin: 4px 0 14px; align-items: center; flex-wrap: wrap; justify-content: center; }
  button {
    font: inherit; font-weight: 700; letter-spacing: 0.04em;
    color: #06070d; background: var(--cyan);
    border: none; border-radius: 10px; padding: 9px 18px; cursor: pointer;
  }
  button:hover { filter: brightness(1.08); }
  button.ghost { background: transparent; color: var(--muted); border: 1px solid var(--edge); }
  button.ghost:hover { color: var(--text); border-color: #4a4d70; }
  .colorpick { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--muted); }
  .colorpick input[type=color] {
    width: 26px; height: 26px; padding: 0; border: 1px solid var(--edge);
    border-radius: 6px; background: none; cursor: pointer;
  }

  /* ---- chat log ---- */
  #log {
    width: 100%; min-height: 220px; max-height: 340px; overflow-y: auto;
    background: var(--panel); border: 1px solid var(--edge); border-radius: 12px;
    padding: 10px 14px; font-size: 0.86rem; line-height: 1.55;
    font-family: "Consolas", "Segoe UI", monospace;
  }
  .logline { white-space: pre-wrap; word-break: break-word; }
  .logline .ts { color: var(--muted); margin-right: 4px; }
  .logline.party .msg { color: var(--party); }
  .logline.echo  .msg { color: var(--echo); }
  .logline.none  .msg { color: var(--text); }
  #log .empty-hint { color: var(--muted); font-style: italic; }

  /* ---- palette drawer ---- */
  #palette {
    width: 100%; margin-top: 14px; background: var(--panel);
    border: 1px solid var(--edge); border-radius: 12px; padding: 10px 12px;
  }
  #palette h3 { margin: 0 0 8px; font-size: 0.72rem; letter-spacing: 0.1em; color: var(--cyan); text-transform: uppercase; }
  #paletteChips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    font-size: 0.74rem; font-weight: 700; color: var(--text);
    background: #0d0e18; border: 1px solid var(--edge); border-radius: 8px;
    padding: 5px 10px; cursor: grab; user-select: none;
  }
  .chip:hover { border-color: #4a4d70; }
  #palette.dragover { border-color: var(--cyan); }

  /* ---- modal ---- */
  .modal { position: fixed; inset: 0; background: rgba(4,5,12,.72); display: none; z-index: 10;
           align-items: center; justify-content: center; padding: 16px; }
  .modal.open { display: flex; }
  .sheet { background: var(--panel); border: 1px solid var(--edge); border-radius: 14px;
           padding: 16px 18px; width: 100%; max-width: 640px; max-height: 86vh; overflow-y: auto; }
  .sheet h2 { margin: 0 0 12px; font-size: 1rem; letter-spacing: 0.08em; color: #fff; }
  .sheet label { display: block; font-size: 0.74rem; color: var(--muted); margin: 10px 0 4px; letter-spacing: .04em; }
  .sheet input[type=text], .sheet textarea {
    width: 100%; font: inherit; color: var(--text); background: #0d0e18;
    border: 1px solid var(--edge); border-radius: 8px; padding: 8px 10px;
  }
  .sheet textarea { min-height: 140px; font-family: "Consolas", monospace; resize: vertical; }
  .sheet .rowbtns { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
  .editor-grid { display: grid; grid-template-columns: 180px 1fr; gap: 14px; }
  .macrolist { border: 1px solid var(--edge); border-radius: 8px; max-height: 320px; overflow-y: auto; }
  .macrolist .item { padding: 7px 9px; font-size: 0.8rem; cursor: pointer; border-bottom: 1px solid #1c1e2e; }
  .macrolist .item:hover { background: #141624; }
  .macrolist .item.active { background: #1a2030; color: var(--cyan); }
  .err { color: var(--red); font-size: 0.8rem; margin-top: 8px; min-height: 1em; }

  /* ---- about ---- */
  #about { margin-top: 14px; background: var(--panel); border: 1px solid var(--edge);
           border-radius: 12px; padding: 14px 18px; max-width: 560px; font-size: 0.82rem; line-height: 1.6; }
  #about[hidden] { display: none; }
  #about h3 { margin: 0 0 8px; font-size: 0.8rem; letter-spacing: 0.1em; color: var(--cyan); text-transform: uppercase; }
  #about a { color: var(--cyan); font-weight: 700; text-decoration: none; }
  #about .credit { margin-top: 10px; color: var(--muted); font-size: 0.8rem; }
</style>
</head>
<body>
  <h1>UMAD · P4 Kefka Says</h1>
  <div class="sub">Macro pad &amp; chat log — click a macro to call it out</div>

  <!-- Cross-tool nav. Add a link here when a new mechanic tool ships. -->
  <nav class="toolnav">
    <a href="index.html">P1 Arrows</a>
    <a href="limitcut.html">P3 Limit Cut</a>
    <a href="kefkasays.html" class="active">P4 Kefka Says</a>
    <a href="celestriad.html">P5 Celestriad</a>
  </nav>

  <div class="stage">
    <div id="pad"></div>

    <div class="controls">
      <button id="editBtn" class="ghost">Edit macros</button>
      <button id="clearBtn" class="ghost">Clear log</button>
      <button id="ioBtn" class="ghost">Import / Export</button>
      <span class="colorpick">Party <input type="color" id="partyColor"></span>
      <span class="colorpick">Echo <input type="color" id="echoColor"></span>
      <button id="aboutBtn" class="ghost">About</button>
    </div>

    <div id="log"><div class="empty-hint">Click a macro above to post its call-out here.</div></div>

    <div id="palette">
      <h3>Macro palette · drag onto the pad</h3>
      <div id="paletteChips"></div>
    </div>

    <div id="about" hidden>
      <h3>About</h3>
      <div>Assign your call-out macros to the pad, then click them during the pull to post
      party (<span style="color:var(--party)">/p</span>) and echo
      (<span style="color:var(--echo)">/e</span>) lines into the log. Everything is local;
      use <b>Import / Export</b> to share your setup. Handy to run alongside VOD review or
      a sim while drilling call-outs.</div>
      <h3 style="margin-top:12px">Resources</h3>
      <div>
        <a href="https://raidplan.io/plan/V-r1InYZW7VMRYAU" target="_blank" rel="noopener">Raidplan&nbsp;&#8599;</a> &middot;
        <a href="https://docs.google.com/spreadsheets/d/1Uo88anmlf2zectmvWMnm8j4ebMPOsFyQ-Lq33wFu7Y0/edit?usp=sharing" target="_blank" rel="noopener">Aery's P4 Macros&nbsp;&#8599;</a> &middot;
        <a href="https://github.com/WCGH/Waju-Sims/releases" target="_blank" rel="noopener">DMU Sim&nbsp;&#8599;</a>
      </div>
      <div class="credit">Created by <b>Daspien</b> &middot; with the assistance of Claude</div>
    </div>
  </div>

  <!-- Editor modal -->
  <div class="modal" id="editModal">
    <div class="sheet">
      <h2>Edit macros</h2>
      <div class="editor-grid">
        <div>
          <div class="macrolist" id="macroList"></div>
          <div class="rowbtns">
            <button id="newMacroBtn">+ New</button>
            <button id="dupMacroBtn" class="ghost">Duplicate</button>
            <button id="delMacroBtn" class="ghost">Delete</button>
          </div>
        </div>
        <div>
          <label for="macroName">Name (shown on the pad / hover)</label>
          <input type="text" id="macroName" autocomplete="off">
          <label for="macroBody">Macro text (paste from in-game; /p, /e, bare lines; /micon is ignored)</label>
          <textarea id="macroBody" spellcheck="false"></textarea>
          <div class="rowbtns">
            <button id="saveMacroBtn">Save</button>
            <button id="closeEditBtn" class="ghost">Close</button>
            <button id="resetBtn" class="ghost">Reset to defaults</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Import/Export modal -->
  <div class="modal" id="ioModal">
    <div class="sheet">
      <h2>Import / Export setup</h2>
      <label for="ioText">Setup string (macros + pad layout + colors)</label>
      <textarea id="ioText" spellcheck="false" placeholder="Paste a setup string here to import, or press Export to fill this box."></textarea>
      <div class="err" id="ioErr"></div>
      <div class="rowbtns">
        <button id="exportBtn">Export &rarr; fill box</button>
        <button id="copyBtn" class="ghost">Copy</button>
        <button id="importBtn">Import from box</button>
        <button id="closeIoBtn" class="ghost">Close</button>
      </div>
    </div>
  </div>

  <script src="kefkasays-engine.js"></script>
  <script>
  (function () {
    "use strict";
    // Interactivity is added in later tasks.
  })();
  </script>
</body>
</html>
```

- [ ] **Step 2: Manually verify the scaffold**

Run: `node -e "require('./kefkasays-engine.js'); console.log('engine loads')"`
Expected: prints `engine loads` (confirms the engine file the page references is valid).

Open `kefkasays.html` in a browser. Expected: dark themed page, the toolnav with **P4 Kefka Says** highlighted, an empty dashed 5×5 pad area (currently 0 slots — built next task), the controls row, an empty log with the hint text, and the palette/about/modals present in the DOM (modals hidden). No console errors.

- [ ] **Step 3: Commit**

```bash
git add kefkasays.html
git commit -m "Add Kefka Says page scaffold: theme, toolnav, layout + modals"
```

---

## Task 6: State, persistence, pad rendering, click-to-fire log

**Files:**
- Modify: `kefkasays.html` (the bottom `<script>` IIFE)

Replace the placeholder IIFE body with the core app: load/save state, render the 5×5 pad from `state.grid`, and fire a macro's lines into the log on click (with cosmetic timestamps).

- [ ] **Step 1: Implement core state + render + fire**

Replace this block:

```js
  (function () {
    "use strict";
    // Interactivity is added in later tasks.
  })();
```

with:

```js
  (function () {
    "use strict";

    var KS = window.KefkaSays;
    var STORE_KEY = "kefkasays.v1";
    var GRID_SIZE = 25;

    // ---- state ----
    var state = loadState();

    function defaultState() {
      var macros = {};
      KS.DEFAULT_MACROS.forEach(function (m) { macros[m.id] = cloneMacro(m); });
      return {
        v: 1,
        macros: macros,
        grid: new Array(GRID_SIZE).fill(null),
        colors: { party: KS.DEFAULT_COLORS.party, echo: KS.DEFAULT_COLORS.echo }
      };
    }

    function cloneMacro(m) {
      return { id: m.id, name: m.name, lines: m.lines.map(function (l) {
        return { channel: l.channel, text: l.text }; }) };
    }

    function loadState() {
      try {
        var raw = localStorage.getItem(STORE_KEY);
        if (!raw) return defaultState();
        var s = JSON.parse(raw);
        if (!s || s.v !== 1 || typeof s.macros !== "object" || !Array.isArray(s.grid)) return defaultState();
        // normalize grid length
        s.grid = s.grid.slice(0, GRID_SIZE);
        while (s.grid.length < GRID_SIZE) s.grid.push(null);
        if (!s.colors) s.colors = { party: KS.DEFAULT_COLORS.party, echo: KS.DEFAULT_COLORS.echo };
        return s;
      } catch (e) { return defaultState(); }
    }

    function save() {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
    }

    // ---- DOM refs ----
    var padEl = document.getElementById("pad");
    var logEl = document.getElementById("log");

    // ---- cosmetic fake clock for timestamps ----
    var fakeMin = 16 * 60 + 8; // start 16:08, like the reference
    function nextStamp() {
      var h = Math.floor(fakeMin / 60) % 24, m = fakeMin % 60;
      fakeMin += 1;
      return "[" + (h < 10 ? "0" + h : h) + ":" + (m < 10 ? "0" + m : m) + "]";
    }

    // ---- pad render ----
    function renderPad() {
      padEl.innerHTML = "";
      for (var i = 0; i < GRID_SIZE; i++) {
        var id = state.grid[i];
        var macro = id ? state.macros[id] : null;
        var el = document.createElement("div");
        el.className = "slot" + (macro ? "" : " empty");
        el.dataset.index = i;
        if (macro) {
          el.textContent = macro.name;
          el.title = macro.name;
          el.draggable = true;
          (function (m) {
            el.addEventListener("click", function () { fireMacro(m); });
          })(macro);
        }
        padEl.appendChild(el);
      }
    }

    // ---- fire a macro into the log ----
    function fireMacro(macro) {
      var hint = logEl.querySelector(".empty-hint");
      if (hint) hint.remove();
      var stamp = nextStamp();
      macro.lines.forEach(function (ln) {
        var row = document.createElement("div");
        row.className = "logline " + ln.channel;
        row.innerHTML = '<span class="ts"></span><span class="msg"></span>';
        row.querySelector(".ts").textContent = stamp;
        row.querySelector(".msg").textContent = ln.text;
        logEl.appendChild(row);
      });
      logEl.scrollTop = logEl.scrollHeight;
    }

    // ---- colors -> CSS vars ----
    function applyColors() {
      document.documentElement.style.setProperty("--party", state.colors.party);
      document.documentElement.style.setProperty("--echo", state.colors.echo);
    }

    // ---- init ----
    applyColors();
    renderPad();

    // expose for later tasks within this IIFE scope
    window.__KS_APP = {
      state: state, save: save, renderPad: renderPad, applyColors: applyColors,
      cloneMacro: cloneMacro, defaultState: defaultState
    };
  })();
```

> Note: `window.__KS_APP` is a deliberate in-file handle so later tasks can extend behavior in separate `<script>` blocks without one giant function. It is internal, not a public API.

- [ ] **Step 2: Manually verify**

Open `kefkasays.html`. Expected: a 5×5 pad of 25 dashed empty slots; the log shows the hint. Then in the browser console run:

```js
__KS_APP.state.grid[0] = "real-inferno"; __KS_APP.renderPad();
```

Expected: slot 0 now shows "Real Inferno"; clicking it appends two cyan-ish party lines `[16:08] [1] Chariot - GET OUT!! (Inferno)` and `[16:08] [1] AFTER: First Shriek + Levin Floor`; the hint disappears; clicking again posts under `[16:09]`. Reload the page — the grid resets (we set it via console, not through a saved path), confirming load works without errors.

- [ ] **Step 3: Commit**

```bash
git add kefkasays.html
git commit -m "Kefka Says: state, persistence, pad render, click-to-fire log"
```

---

## Task 7: Color pickers wire-up

**Files:**
- Modify: `kefkasays.html` (add a new `<script>` block after the core IIFE)

- [ ] **Step 1: Implement color picker wiring**

Immediately after the core IIFE's closing `})();` (still inside the page, before `</body>`), add a new script block:

```html
  <script>
  (function () {
    "use strict";
    var app = window.__KS_APP;
    var partyInput = document.getElementById("partyColor");
    var echoInput = document.getElementById("echoColor");

    // seed pickers from state
    partyInput.value = app.state.colors.party;
    echoInput.value = app.state.colors.echo;

    partyInput.addEventListener("input", function () {
      app.state.colors.party = partyInput.value;
      app.applyColors(); app.save();
    });
    echoInput.addEventListener("input", function () {
      app.state.colors.echo = echoInput.value;
      app.applyColors(); app.save();
    });
  })();
  </script>
```

- [ ] **Step 2: Manually verify**

Open the page. The two color swatches show the defaults (party light-blue, echo pink). Seed a macro into a slot via console (`__KS_APP.state.grid[0]="yellow-dude";__KS_APP.renderPad()`), click it to post echo lines, then change the **Echo** color picker — the posted echo lines recolor live. Reload: the chosen colors persist (swatches keep the new values).

- [ ] **Step 3: Commit**

```bash
git add kefkasays.html
git commit -m "Kefka Says: wire per-channel color pickers (persisted, live recolor)"
```

---

## Task 8: Palette + drag-and-drop assignment

**Files:**
- Modify: `kefkasays.html` (add a `<script>` block; relies on `__KS_APP`)

Render the palette chips and wire HTML5 drag-and-drop: palette→slot assigns, slot→slot moves/swaps, slot→palette (or right-click a slot) clears.

- [ ] **Step 1: Implement palette + DnD**

Add a new `<script>` block after the color-picker block:

```html
  <script>
  (function () {
    "use strict";
    var app = window.__KS_APP;
    var padEl = document.getElementById("pad");
    var paletteEl = document.getElementById("palette");
    var chipsEl = document.getElementById("paletteChips");

    // drag payload: {source:"palette"|"grid", id?, index?}
    var drag = null;

    function renderPalette() {
      chipsEl.innerHTML = "";
      Object.keys(app.state.macros).map(function (id) { return app.state.macros[id]; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); })
        .forEach(function (m) {
          var chip = document.createElement("div");
          chip.className = "chip";
          chip.textContent = m.name;
          chip.title = m.name;
          chip.draggable = true;
          chip.addEventListener("dragstart", function (e) {
            drag = { source: "palette", id: m.id };
            e.dataTransfer.setData("text/plain", m.id);
            e.dataTransfer.effectAllowed = "copy";
          });
          chipsEl.appendChild(chip);
        });
    }

    // Patch renderPad so each fresh render re-binds slot DnD handlers.
    var baseRenderPad = app.renderPad;
    function renderPadWithDnD() {
      baseRenderPad();
      Array.prototype.forEach.call(padEl.children, function (slot) {
        var idx = parseInt(slot.dataset.index, 10);

        if (!slot.classList.contains("empty")) {
          slot.addEventListener("dragstart", function (e) {
            drag = { source: "grid", index: idx };
            e.dataTransfer.setData("text/plain", String(idx));
            e.dataTransfer.effectAllowed = "move";
          });
          slot.addEventListener("contextmenu", function (e) {
            e.preventDefault();
            app.state.grid[idx] = null; app.save(); renderPadWithDnD();
          });
        }

        slot.addEventListener("dragover", function (e) { e.preventDefault(); slot.classList.add("dragover"); });
        slot.addEventListener("dragleave", function () { slot.classList.remove("dragover"); });
        slot.addEventListener("drop", function (e) {
          e.preventDefault(); slot.classList.remove("dragover");
          if (!drag) return;
          if (drag.source === "palette") {
            app.state.grid[idx] = drag.id;
          } else if (drag.source === "grid" && drag.index !== idx) {
            var tmp = app.state.grid[idx];
            app.state.grid[idx] = app.state.grid[drag.index];
            app.state.grid[drag.index] = tmp; // swap (tmp may be null = move)
          }
          drag = null; app.save(); renderPadWithDnD();
        });
      });
    }

    // Dropping a grid slot onto the palette clears it.
    paletteEl.addEventListener("dragover", function (e) {
      if (drag && drag.source === "grid") { e.preventDefault(); paletteEl.classList.add("dragover"); }
    });
    paletteEl.addEventListener("dragleave", function () { paletteEl.classList.remove("dragover"); });
    paletteEl.addEventListener("drop", function (e) {
      paletteEl.classList.remove("dragover");
      if (drag && drag.source === "grid") {
        e.preventDefault();
        app.state.grid[drag.index] = null; drag = null; app.save(); renderPadWithDnD();
      }
    });

    // expose upgraded render to the app handle + other tasks
    app.renderPad = renderPadWithDnD;
    app.renderPalette = renderPalette;

    renderPalette();
    renderPadWithDnD();
  })();
  </script>
```

- [ ] **Step 2: Manually verify**

Open the page. The palette lists all 18 macros as chips. Drag a chip onto a slot → the slot shows that macro's name and persists across reload. Drag a filled slot onto another slot → they swap (or move into an empty one). Drag a filled slot onto the palette area → it clears. Right-click a filled slot → it clears. Click a filled slot → it still fires into the log. No console errors.

- [ ] **Step 3: Commit**

```bash
git add kefkasays.html
git commit -m "Kefka Says: palette + drag-and-drop pad assignment"
```

---

## Task 9: Clear-log + About buttons

**Files:**
- Modify: `kefkasays.html` (add a `<script>` block)

- [ ] **Step 1: Implement clear-log and about toggle**

Add a new `<script>` block after the DnD block:

```html
  <script>
  (function () {
    "use strict";
    var logEl = document.getElementById("log");
    document.getElementById("clearBtn").addEventListener("click", function () {
      logEl.innerHTML = '<div class="empty-hint">Click a macro above to post its call-out here.</div>';
    });
    var aboutEl = document.getElementById("about");
    document.getElementById("aboutBtn").addEventListener("click", function () {
      aboutEl.hidden = !aboutEl.hidden;
    });
  })();
  </script>
```

- [ ] **Step 2: Manually verify**

Fire a few macros into the log, press **Clear log** → the log empties back to the hint. Press **About** → the about panel toggles. No console errors.

- [ ] **Step 3: Commit**

```bash
git add kefkasays.html
git commit -m "Kefka Says: clear-log and about-toggle buttons"
```

---

## Task 10: Macro editor modal

**Files:**
- Modify: `kefkasays.html` (add a `<script>` block; uses `KS.parseMacro` / `KS.serializeMacro`)

Wire the editor: list macros, select to load name+text, save (parse), new/duplicate/delete, reset to defaults.

- [ ] **Step 1: Implement the editor**

Add a new `<script>` block after the clear-log block:

```html
  <script>
  (function () {
    "use strict";
    var KS = window.KefkaSays;
    var app = window.__KS_APP;

    var modal = document.getElementById("editModal");
    var listEl = document.getElementById("macroList");
    var nameEl = document.getElementById("macroName");
    var bodyEl = document.getElementById("macroBody");
    var selectedId = null;

    function uid() {
      // browser-safe unique id (Date/Math allowed here, this is page code)
      return "m-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36);
    }

    function macrosArray() {
      return Object.keys(app.state.macros).map(function (id) { return app.state.macros[id]; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); });
    }

    function renderList() {
      listEl.innerHTML = "";
      macrosArray().forEach(function (m) {
        var item = document.createElement("div");
        item.className = "item" + (m.id === selectedId ? " active" : "");
        item.textContent = m.name;
        item.addEventListener("click", function () { selectMacro(m.id); });
        listEl.appendChild(item);
      });
    }

    function selectMacro(id) {
      selectedId = id;
      var m = app.state.macros[id];
      nameEl.value = m ? m.name : "";
      bodyEl.value = m ? KS.serializeMacro(m) : "";
      renderList();
    }

    function openEditor() {
      if (!selectedId || !app.state.macros[selectedId]) {
        var first = macrosArray()[0];
        selectedId = first ? first.id : null;
      }
      renderList();
      if (selectedId) selectMacro(selectedId); else { nameEl.value = ""; bodyEl.value = ""; }
      modal.classList.add("open");
    }
    function closeEditor() { modal.classList.remove("open"); }

    function saveCurrent() {
      if (!selectedId) return;
      var parsed = KS.parseMacro(bodyEl.value);
      app.state.macros[selectedId] = {
        id: selectedId,
        name: (nameEl.value || "Unnamed").trim(),
        lines: parsed.lines
      };
      app.save();
      app.renderPalette(); app.renderPad();
      renderList();
    }

    function newMacro() {
      var id = uid();
      app.state.macros[id] = { id: id, name: "New Macro", lines: [] };
      app.save(); app.renderPalette();
      selectMacro(id);
    }

    function duplicateMacro() {
      if (!selectedId) return;
      var src = app.state.macros[selectedId];
      var id = uid();
      app.state.macros[id] = { id: id, name: src.name + " copy",
        lines: src.lines.map(function (l) { return { channel: l.channel, text: l.text }; }) };
      app.save(); app.renderPalette();
      selectMacro(id);
    }

    function deleteMacro() {
      if (!selectedId) return;
      delete app.state.macros[selectedId];
      // clear any grid slots referencing it
      for (var i = 0; i < app.state.grid.length; i++) {
        if (app.state.grid[i] === selectedId) app.state.grid[i] = null;
      }
      selectedId = null;
      app.save(); app.renderPalette(); app.renderPad();
      openEditor();
    }

    function resetDefaults() {
      if (!window.confirm("Reset all macros, pad layout, and colors to defaults? This cannot be undone.")) return;
      var fresh = app.defaultState();
      app.state.macros = fresh.macros;
      app.state.grid = fresh.grid;
      app.state.colors = fresh.colors;
      app.save(); app.applyColors(); app.renderPalette(); app.renderPad();
      document.getElementById("partyColor").value = app.state.colors.party;
      document.getElementById("echoColor").value = app.state.colors.echo;
      selectedId = null; openEditor();
    }

    document.getElementById("editBtn").addEventListener("click", openEditor);
    document.getElementById("closeEditBtn").addEventListener("click", closeEditor);
    document.getElementById("saveMacroBtn").addEventListener("click", saveCurrent);
    document.getElementById("newMacroBtn").addEventListener("click", newMacro);
    document.getElementById("dupMacroBtn").addEventListener("click", duplicateMacro);
    document.getElementById("delMacroBtn").addEventListener("click", deleteMacro);
    document.getElementById("resetBtn").addEventListener("click", resetDefaults);
    modal.addEventListener("click", function (e) { if (e.target === modal) closeEditor(); });
  })();
  </script>
```

- [ ] **Step 2: Manually verify**

Press **Edit macros**. The list shows all macros; selecting one loads its name and FF-style text (e.g. "I'm Shriek" shows a bare first line then `/e SHRiEEEEEEEKKK!!!!`). Edit text, **Save** → drag it to the pad and fire it to confirm the change took. **+ New** creates "New Macro"; type `/p test`, Save, and it appears in the palette. **Duplicate** and **Delete** work (deleting a macro that was on the pad clears that slot). **Reset to defaults** restores the 18 macros, empties the pad, and resets colors (with a confirm). Reload persists all edits.

- [ ] **Step 3: Commit**

```bash
git add kefkasays.html
git commit -m "Kefka Says: macro editor (new/dup/delete/save/reset)"
```

---

## Task 11: Import / Export modal

**Files:**
- Modify: `kefkasays.html` (add a `<script>` block; uses `KS.encodeSetup` / `KS.decodeSetup`)

- [ ] **Step 1: Implement import/export**

Add a new `<script>` block after the editor block:

```html
  <script>
  (function () {
    "use strict";
    var KS = window.KefkaSays;
    var app = window.__KS_APP;

    var modal = document.getElementById("ioModal");
    var textEl = document.getElementById("ioText");
    var errEl = document.getElementById("ioErr");

    function open() { errEl.textContent = ""; modal.classList.add("open"); }
    function close() { modal.classList.remove("open"); }

    document.getElementById("ioBtn").addEventListener("click", open);
    document.getElementById("closeIoBtn").addEventListener("click", close);
    modal.addEventListener("click", function (e) { if (e.target === modal) close(); });

    document.getElementById("exportBtn").addEventListener("click", function () {
      errEl.textContent = "";
      textEl.value = KS.encodeSetup(app.state);
      textEl.focus(); textEl.select();
    });

    document.getElementById("copyBtn").addEventListener("click", function () {
      textEl.focus(); textEl.select();
      try {
        if (navigator.clipboard && textEl.value) navigator.clipboard.writeText(textEl.value);
        else document.execCommand("copy");
        errEl.style.color = "var(--green)"; errEl.textContent = "Copied.";
      } catch (e) { errEl.style.color = "var(--red)"; errEl.textContent = "Copy failed — select and copy manually."; }
    });

    document.getElementById("importBtn").addEventListener("click", function () {
      errEl.style.color = "var(--red)";
      var s;
      try { s = KS.decodeSetup(textEl.value); }
      catch (e) { errEl.textContent = "Could not import: " + e.message; return; }
      // adopt the imported setup
      app.state.v = 1;
      app.state.macros = s.macros;
      app.state.grid = s.grid.slice(0, 25);
      while (app.state.grid.length < 25) app.state.grid.push(null);
      app.state.colors = s.colors;
      app.save(); app.applyColors(); app.renderPalette(); app.renderPad();
      document.getElementById("partyColor").value = app.state.colors.party;
      document.getElementById("echoColor").value = app.state.colors.echo;
      errEl.style.color = "var(--green)"; errEl.textContent = "Imported.";
    });
  })();
  </script>
```

- [ ] **Step 2: Manually verify**

Set up a couple of pad slots + a color change. Press **Import / Export** → **Export** fills the box with a `KS1:...` string; **Copy** reports "Copied." Reset to defaults (via editor), then paste the string back and **Import** → the pad layout, macros, and colors return; "Imported." shows. Paste `garbage` and **Import** → red "Could not import: …" and nothing changes. Reload persists the imported setup.

- [ ] **Step 3: Commit**

```bash
git add kefkasays.html
git commit -m "Kefka Says: import/export setup string modal"
```

---

## Task 12: Cross-page nav links + README

**Files:**
- Modify: `index.html` (toolnav block)
- Modify: `limitcut.html` (toolnav block)
- Modify: `celestriad.html` (toolnav block)
- Modify: `README.md`

- [ ] **Step 1: Add the P4 link to the other three pages' toolnav**

In `index.html`, `limitcut.html`, and `celestriad.html`, find the `.toolnav` `<nav>` block (marked with the shared comment) and insert the P4 link between the P3 and P5 links so every page lists the same four tools in order. The inserted line:

```html
    <a href="kefkasays.html">P4 Kefka Says</a>
```

After editing, each page's nav must read (with that page's own link marked `class="active"`):

```html
    <a href="index.html">P1 Arrows</a>
    <a href="limitcut.html">P3 Limit Cut</a>
    <a href="kefkasays.html">P4 Kefka Says</a>
    <a href="celestriad.html">P5 Celestriad</a>
```

- [ ] **Step 2: Add a README section**

In `README.md`, after the "P3 Limit Cut" section and before "P5 Celestriad", insert:

```markdown
## P4 Kefka Says (`kefkasays.html`)

A macro-pad + chat-log utility for the Phase 4 **Kefka Says** mechanic — not a sim, but a
practice/comms aid. Assign your call-out macros to a 5×5 pad, then click them during the
pull to post their lines into a simulated chat log in the right channel colors.

- **Two channels:** Party (`/p`) and Echo (`/e`), each with its own customizable color;
  bare (no-command) lines post as plain text. `/micon` lines are ignored on import.
- **Customizable macros:** the **Edit macros** window lets you add/duplicate/delete macros
  and edit their text exactly like an in-game macro (paste straight in). Ships with 18
  default UMAD P4 call-outs.
- **Drag to assign:** drag macros from the palette onto the pad; drag a slot onto the
  palette (or right-click it) to clear it. **Clear log** wipes the log between attempts.
- **Import / Export:** share your whole setup (macros + pad layout + colors) as a single
  string.

Use it alongside VOD review or a sim while drilling call-outs.

Resources: [Raidplan](https://raidplan.io/plan/V-r1InYZW7VMRYAU) ·
[Aery's P4 Macros](https://docs.google.com/spreadsheets/d/1Uo88anmlf2zectmvWMnm8j4ebMPOsFyQ-Lq33wFu7Y0/edit?usp=sharing) ·
[DMU Sim (Waju-Sims)](https://github.com/WCGH/Waju-Sims/releases).

Pure logic (macro parse/serialize, setup encode/decode, the default macros) lives in
`kefkasays-engine.js`; run its tests with `node --test`.
```

Also update the "Controls" / "adding a tool" prose if it enumerates tools — ensure P4 is mentioned where the others are. (The "Project layout · adding a tool" section is generic and needs no change beyond the new page existing.)

- [ ] **Step 3: Manually verify**

Open each of `index.html`, `limitcut.html`, `celestriad.html`, `kefkasays.html`. Each shows the same four-item nav in order, with the current page highlighted, and every link navigates correctly. README renders with the new P4 section between P3 and P5.

- [ ] **Step 4: Commit**

```bash
git add index.html limitcut.html celestriad.html README.md
git commit -m "Add P4 Kefka Says to cross-page nav + README"
```

---

## Task 13: Full-suite test + final manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run the engine test suite**

Run: `node --test`
Expected: all engine tests pass (Tasks 1–4), with the existing `limitcut`/`celestriad` suites also green (they run together).

- [ ] **Step 2: End-to-end manual smoke test**

In a fresh browser profile / cleared localStorage, open `kefkasays.html` and confirm, in order:
1. Empty 5×5 pad, palette of 18 macros, empty log with hint.
2. Drag 3–4 macros onto the pad; reload — they persist.
3. Click each → correct party/echo/plain lines post with incrementing `[HH:MM]` stamps.
4. Change Party + Echo colors → posted + future lines recolor; persists on reload.
5. Clear log → back to hint.
6. Edit a macro's text, Save → fire it, the change shows.
7. New / Duplicate / Delete behave; deleting a placed macro clears its slot.
8. Export → Copy → Reset to defaults → Import the string → setup restored.
9. Import `garbage` → graceful red error, no state change.
10. Nav to the other three tools and back; P4 link present and active styling correct.
No console errors throughout.

- [ ] **Step 3: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "Kefka Says: verification fixes"
```

(If no fixes were needed, skip this commit.)

---

## Self-Review Notes (for the implementer)

- **Engine is TDD** (Tasks 1–4): test → fail → implement → pass → commit, run with `node --test`.
- **Page is build-then-verify** (Tasks 5–13): the repo does not unit-test DOM; each task has an explicit manual verification with concrete expected results.
- **No icons / `/micon`**: dropped on import by `parseMacro`; slots show text names (iconography deferred per the spec).
- **Empty default grid**: ships empty; the user will supply a default layout via an Import string before release.
- **Persistence**: every mutation calls `save()`; `loadState()` falls back to defaults on missing/corrupt data.
