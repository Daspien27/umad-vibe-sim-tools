"use strict";
const test = require("node:test");
const assert = require("node:assert");
const KS = require("./kefkasays-engine.js");

test("DEFAULT_COLORS has party + echo hex strings", () => {
  assert.match(KS.DEFAULT_COLORS.party, /^#[0-9a-fA-F]{6}$/);
  assert.match(KS.DEFAULT_COLORS.echo, /^#[0-9a-fA-F]{6}$/);
});

test("DEFAULT_MACROS: 22 macros, unique ids, valid shape", () => {
  assert.strictEqual(KS.DEFAULT_MACROS.length, 22);
  const ids = KS.DEFAULT_MACROS.map(m => m.id);
  assert.strictEqual(new Set(ids).size, 22, "ids are unique");
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

test("DEFAULT_GRID: 25 slots, every non-null entry is a known macro id", () => {
  assert.strictEqual(KS.DEFAULT_GRID.length, 25);
  const ids = new Set(KS.DEFAULT_MACROS.map(m => m.id));
  for (const g of KS.DEFAULT_GRID) {
    assert.ok(g === null || ids.has(g), "valid grid entry: " + g);
  }
});

test("DEFAULT_MACROS: spot-check known macros", () => {
  const byName = Object.fromEntries(KS.DEFAULT_MACROS.map(m => [m.name, m]));

  assert.deepStrictEqual(byName["Real Inferno"].lines, [
    { channel: "party", text: "[1] Chariot - GET OUT!! (Inferno)" },
    { channel: "party", text: "[1] AFTER: First Shriek + Levin Floor" },
  ]);

  assert.deepStrictEqual(byName["Yellow Dude"].lines, [
    { channel: "echo", text: "-" },
    { channel: "echo", text: "Opposite (Real) // Same (Fake)" },
  ]);

  assert.deepStrictEqual(byName["I'm Shriek"].lines, [
    { channel: "echo", text: "SHRiEEEEEEEKKK!!!!" },
  ]);

  // Typhoon was renamed to Tsunami (name + line text)
  assert.deepStrictEqual(byName["Real Tsunami"].lines, [
    { channel: "party", text: "[2] DONUT - STAY IN!! (Tsunami)" },
    { channel: "party", text: "[2] AFTER: Second Shriek - During Stock Floor" },
  ]);

  // Stocked-element call-outs
  assert.deepStrictEqual(byName["Real Lighting"].lines, [{ channel: "party", text: "Real Lighting Stocked" }]);
  assert.deepStrictEqual(byName["Fake Ice"].lines, [{ channel: "party", text: "Fake Ice Stocked" }]);
});

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

test("parseMacro: a non-command word is not a command -> none, verbatim", () => {
  assert.deepStrictEqual(KS.parseMacro("/please stand by").lines,
    [{ channel: "none", text: "/please stand by" }]);
  assert.deepStrictEqual(KS.parseMacro("/echoes here").lines,
    [{ channel: "none", text: "/echoes here" }]);
});

test("parseMacro: bare /p (no text) -> party with empty text", () => {
  assert.deepStrictEqual(KS.parseMacro("/p").lines, [{ channel: "party", text: "" }]);
});

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

// serializeMacro is the inverse of parseMacro only over parse-canonical macros
// (the defaults, and everything the editor produces via parseMacro on save). A
// hand-built "none" line whose text starts with "/p" would re-parse as party,
// but such lines never enter state through the parse/import pipelines.
test("round-trip: parseMacro(serializeMacro(m)) preserves lines for every default macro", () => {
  for (const m of KS.DEFAULT_MACROS) {
    const back = KS.parseMacro(KS.serializeMacro(m)).lines;
    assert.deepStrictEqual(back, m.lines, "round-trip failed for " + m.name);
  }
});

function sampleSetup() {
  return {
    v: 1,
    // deep clone so a test can't mutate the shared DEFAULT_MACROS through the fixture
    macros: { "real-inferno": JSON.parse(JSON.stringify(KS.DEFAULT_MACROS[0])) },
    grid: new Array(25).fill(null).map((x, i) => (i === 0 ? "real-inferno" : null)),
    colors: { party: "#7ec8ff", echo: "#ff7ad9" },
  };
}

function enc(o) { return "KS1:" + Buffer.from(JSON.stringify(o), "utf8").toString("base64"); }

test("encodeSetup -> string with KS1: tag; decode round-trips deep-equal", () => {
  const setup = sampleSetup();
  const str = KS.encodeSetup(setup);
  assert.strictEqual(typeof str, "string");
  assert.ok(str.startsWith("KS1:"), "has version tag");
  assert.deepStrictEqual(KS.decodeSetup(str), setup);
});

test("encodeSetup round-trips genuine multibyte unicode", () => {
  const setup = sampleSetup();
  setup.macros["x"] = { id: "x", name: "café 🔥", lines: [{ channel: "echo", text: "~~MOTION~~ // <3 café 🔥" }] };
  assert.deepStrictEqual(KS.decodeSetup(KS.encodeSetup(setup)), setup);
});

test("decodeSetup throws on garbage / wrong tag / version / missing fields", () => {
  assert.throws(() => KS.decodeSetup("garbage"));
  assert.throws(() => KS.decodeSetup("KS1:not-base64!!!"));
  assert.throws(() => KS.decodeSetup("KS1:" + Buffer.from('{"v":2}', "utf8").toString("base64")));
  assert.throws(() => KS.decodeSetup("KS1:" + Buffer.from('{"v":1}', "utf8").toString("base64"))); // missing fields
});

test("decodeSetup throws on deep-malformed contents (it is the import trust boundary)", () => {
  const base = sampleSetup();
  assert.throws(() => KS.decodeSetup(enc(Object.assign({}, base, { macros: [] }))), /Malformed/, "macros as array");
  assert.throws(() => KS.decodeSetup(enc(Object.assign({}, base, { grid: [42] }))), /Malformed/, "non-string grid entry");
  assert.throws(() => KS.decodeSetup(enc(Object.assign({}, base, { macros: { x: { id: "x", name: "x" } } }))), /Malformed/, "macro missing lines");
  assert.throws(() => KS.decodeSetup(enc(Object.assign({}, base, { macros: { x: { id: "x", name: "x", lines: [{ channel: "whisper", text: "hi" }] } } }))), /Malformed/, "bad line channel");
  assert.throws(() => KS.decodeSetup(enc(Object.assign({}, base, { colors: { party: "", echo: "#ff7ad9" } }))), /Malformed/, "empty color");
  assert.throws(() => KS.decodeSetup(enc(Object.assign({}, base, { colors: { party: "blue", echo: "#ff7ad9" } }))), /Malformed/, "non-hex color");
});

test("decodeSetup accepts a valid setup with grid ids and null slots", () => {
  const ok = KS.decodeSetup(KS.encodeSetup(sampleSetup()));
  assert.strictEqual(ok.grid[0], "real-inferno");
  assert.strictEqual(ok.grid[1], null);
});
