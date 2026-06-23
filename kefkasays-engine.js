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

  // Default pad layout (5x5, row-major). null = empty slot; ids reference DEFAULT_MACROS.
  var DEFAULT_GRID = [
    "real-inferno", "fake-inferno", null, "real-exdeath", "fake-exdeath",
    "real-typhoon", "fake-typhoon", null, null,           null,
    null,           null,           null, null,           null,
    "accel-bomb",   "im-shriek",    null, "dps-prpl-lt",  "dps-prpl-gt",
    null,           null,           null, "dps-water-lt", "dps-water-gt"
  ];

  // Parse raw FF-style macro text into structured lines.
  // /p|/party -> party, /e|/echo -> echo, /micon -> dropped, else -> none.
  // The command must be a whole token (followed by whitespace or end-of-line),
  // so non-commands like "/please" fall through to "none" verbatim rather than
  // being truncated. Blank lines are skipped.
  function parseMacro(text) {
    var lines = [];
    String(text == null ? "" : text).split(/\r?\n/).forEach(function (raw) {
      if (/^\s*$/.test(raw)) return;                 // skip blank
      if (/^\/micon\b/i.test(raw)) return;           // drop icon directive
      var mP = raw.match(/^\/(?:party|p)(?:\s+(.*))?$/i);
      if (mP) { lines.push({ channel: "party", text: mP[1] || "" }); return; }
      var mE = raw.match(/^\/(?:echo|e)(?:\s+(.*))?$/i);
      if (mE) { lines.push({ channel: "echo", text: mE[1] || "" }); return; }
      lines.push({ channel: "none", text: raw });    // bare line, verbatim
    });
    return { lines: lines };
  }

  // Inverse of parseMacro, for loading a macro into the editor textarea.
  function serializeMacro(macro) {
    var lines = (macro && macro.lines) || [];
    return lines.map(function (ln) {
      if (ln.channel === "party") return "/p " + ln.text;
      if (ln.channel === "echo") return "/e " + ln.text;
      return ln.text; // none
    }).join("\n");
  }

  // Cross-env base64 (Node Buffer, or browser btoa/atob with UTF-8 safety).
  function b64encode(str) {
    if (typeof Buffer !== "undefined") return Buffer.from(str, "utf8").toString("base64");
    return btoa(unescape(encodeURIComponent(str)));
  }
  // Note: Node's Buffer.from(x,"base64") is lenient (it won't throw on junk);
  // bad input is caught downstream by JSON.parse. Browser atob() does throw.
  function b64decode(b64) {
    if (typeof Buffer !== "undefined") return Buffer.from(b64, "base64").toString("utf8");
    return decodeURIComponent(escape(atob(b64)));
  }

  function isHexColor(v) { return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v); }

  // A macro is valid if it has a string name and an array of {channel, text} lines.
  function isValidMacro(m) {
    if (!m || typeof m !== "object" || typeof m.name !== "string" || !Array.isArray(m.lines)) return false;
    return m.lines.every(function (ln) {
      return ln && typeof ln === "object" &&
        (ln.channel === "party" || ln.channel === "echo" || ln.channel === "none") &&
        typeof ln.text === "string";
    });
  }

  // Encode the whole setup as a portable, copy-pasteable string.
  function encodeSetup(setup) {
    return "KS1:" + b64encode(JSON.stringify(setup));
  }

  // Decode + validate. This is the import trust boundary: callers adopt the
  // result straight into persisted state, so we deep-check contents (not just
  // outer types) and throw on anything malformed.
  function decodeSetup(str) {
    var s = String(str == null ? "" : str).trim();
    if (s.indexOf("KS1:") !== 0) throw new Error("Not a Kefka Says setup string.");
    var obj = JSON.parse(b64decode(s.slice(4)));   // throws on bad base64/JSON
    if (!obj || obj.v !== 1 ||
        typeof obj.macros !== "object" || obj.macros === null || Array.isArray(obj.macros) ||
        !Array.isArray(obj.grid) ||
        !obj.colors || !isHexColor(obj.colors.party) || !isHexColor(obj.colors.echo)) {
      throw new Error("Malformed setup.");
    }
    if (!obj.grid.every(function (g) { return g === null || typeof g === "string"; })) {
      throw new Error("Malformed setup: grid entries must be a macro id or null.");
    }
    if (!Object.keys(obj.macros).every(function (id) { return isValidMacro(obj.macros[id]); })) {
      throw new Error("Malformed setup: a macro has an invalid shape.");
    }
    return obj;
  }

  var KefkaSays = {
    DEFAULT_COLORS: DEFAULT_COLORS,
    DEFAULT_MACROS: DEFAULT_MACROS,
    DEFAULT_GRID: DEFAULT_GRID,
    parseMacro: parseMacro,
    serializeMacro: serializeMacro,
    encodeSetup: encodeSetup,
    decodeSetup: decodeSetup,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = KefkaSays;
  if (typeof window !== "undefined") window.KefkaSays = KefkaSays;
})();
