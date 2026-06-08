"use strict";
const test = require("node:test");
const assert = require("node:assert");
const LC = require("./limitcut-engine.js");

const ANG = LC.WAYMARKS.map((w) => w.angle);

function angDiff(a, b) {
  // signed smallest difference a - b in (-180, 180]
  let d = ((a - b + 540) % 360) - 180;
  return d;
}

test("canonical example: A->C, Kefka CCW, #1 -> 202.5 (between S and SW)", () => {
  const r = LC.resolve({ originAngle: 0, rotation: "CCW", number: 1 });
  assert.strictEqual(r.angle, 202.5);
  assert.strictEqual(LC.DODGE_SPOTS[r.spotIndex], 202.5);
});

test("canonical example: D->B, Kefka CW, #2 -> 22.5 (between N and NE)", () => {
  const r = LC.resolve({ originAngle: 270, rotation: "CW", number: 2 });
  assert.strictEqual(r.angle, 22.5);
  assert.strictEqual(LC.DODGE_SPOTS[r.spotIndex], 22.5);
});

test("every resolved spot lands on a real dodge spot", () => {
  for (const originAngle of ANG) {
    for (const rotation of ["CW", "CCW"]) {
      for (let number = 1; number <= 8; number++) {
        const r = LC.resolve({ originAngle, rotation, number });
        assert.ok(LC.DODGE_SPOTS.includes(r.angle), `${originAngle}/${rotation}/${number} -> ${r.angle}`);
        assert.strictEqual(LC.DODGE_SPOTS[r.spotIndex], r.angle);
      }
    }
  }
});

test("bijection: numbers 1..8 fill all 8 distinct spots exactly once", () => {
  for (const originAngle of ANG) {
    for (const rotation of ["CW", "CCW"]) {
      const seen = new Set();
      for (let number = 1; number <= 8; number++) {
        seen.add(LC.resolve({ originAngle, rotation, number }).spotIndex);
      }
      assert.strictEqual(seen.size, 8, `${originAngle}/${rotation} did not fill all 8`);
    }
  }
});

test("Rel N is always exactly opposite the origin, preserving kind", () => {
  for (const w of LC.WAYMARKS) {
    const rn = LC.relNorth(w.angle);
    assert.strictEqual(rn, (w.angle + 180) % 360);
    const match = LC.WAYMARKS.find((x) => x.angle === rn);
    assert.ok(match, `no waymark opposite ${w.mark}`);
    assert.strictEqual(match.kind, w.kind, `opposite of ${w.mark} changed kind`);
  }
});

test("#1 is adjacent to Rel N (22.5 off) and #8 is just before Rel N (337.5 off)", () => {
  for (const originAngle of ANG) {
    for (const rotation of ["CW", "CCW"]) {
      const sgn = rotation === "CCW" ? 1 : -1;
      const R = LC.relNorth(originAngle);
      const first = LC.resolve({ originAngle, rotation, number: 1 });
      const last = LC.resolve({ originAngle, rotation, number: 8 });
      // #1 sits 22.5 from Rel N in the count direction.
      assert.strictEqual(angDiff(first.angle, R), sgn * 22.5);
      // #8 sits 22.5 from Rel N in the OPPOSITE (i.e. just before, 337.5 around).
      assert.strictEqual(angDiff(last.angle, R), -sgn * 22.5);
    }
  }
});

test("CW and CCW are mirror images across Rel N for the same number", () => {
  for (const originAngle of ANG) {
    const R = LC.relNorth(originAngle);
    for (let number = 1; number <= 8; number++) {
      const cw = LC.resolve({ originAngle, rotation: "CW", number }).angle;
      const ccw = LC.resolve({ originAngle, rotation: "CCW", number }).angle;
      assert.strictEqual(angDiff(cw, R), -angDiff(ccw, R), `n=${number}`);
    }
  }
});

test("deal() returns valid scenarios", () => {
  // deterministic-ish sweep with a cycling rng to hit varied branches
  let i = 0;
  const seq = [0.01, 0.6, 0.99, 0.3, 0.49, 0.5, 0.75, 0.12, 0.88, 0.42];
  const rng = () => seq[i++ % seq.length];
  for (let n = 0; n < 50; n++) {
    const d = LC.deal(rng);
    assert.ok(ANG.includes(d.origin.angle), `bad origin ${d.origin.angle}`);
    assert.ok(["CW", "CCW"].includes(d.rotation), `bad rotation ${d.rotation}`);
    assert.ok(d.number >= 1 && d.number <= 8, `bad number ${d.number}`);
  }
});

test("angleToXY: N is up, E is right, S is down, W is left", () => {
  const eq = (a, b) => Math.abs(a - b) < 1e-9;
  const N = LC.angleToXY(0, 100);
  const E = LC.angleToXY(90, 100);
  const S = LC.angleToXY(180, 100);
  const W = LC.angleToXY(270, 100);
  assert.ok(eq(N.x, 0) && eq(N.y, -100), "N");
  assert.ok(eq(E.x, 100) && eq(E.y, 0), "E");
  assert.ok(eq(S.x, 0) && eq(S.y, 100), "S");
  assert.ok(eq(W.x, -100) && eq(W.y, 0), "W");
});
