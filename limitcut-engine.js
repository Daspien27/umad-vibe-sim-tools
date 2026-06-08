// =====================================================================
//  UMAD P3 Limit Cut — pure resolution engine (DOM-free, no deps).
//
//  Coordinate convention: degrees, 0 = North (up), increasing CLOCKWISE
//  (E = 90, S = 180, W = 270).
//
//  Mechanic: Kefka dashes across the arena crossing each waymark to its
//  diametric opposite, stepping around the ring. The order reveals his
//  rotation. Players line up 1..8 on the inter-inter-cardinal dodge spots,
//  starting from Rel N (opposite the first dash origin) and counting in the
//  OPPOSITE direction to Kefka's spin. "Opposite origin, opposite spin."
// =====================================================================
(function () {
  "use strict";

  // 8 waymark reference points, 45° apart.
  var WAYMARKS = [
    { mark: "A", angle: 0,   kind: "card"  }, // N
    { mark: "2", angle: 45,  kind: "inter" }, // NE
    { mark: "B", angle: 90,  kind: "card"  }, // E
    { mark: "3", angle: 135, kind: "inter" }, // SE
    { mark: "C", angle: 180, kind: "card"  }, // S
    { mark: "4", angle: 225, kind: "inter" }, // SW
    { mark: "D", angle: 270, kind: "card"  }, // W
    { mark: "1", angle: 315, kind: "inter" }  // NW
  ];

  // 8 dodge spots: the inter-inter-cardinals, halfway between adjacent waymarks.
  var DODGE_SPOTS = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];

  function norm(a) { return ((a % 360) + 360) % 360; }

  // Rel N — the counting anchor — is diametrically opposite the dash origin.
  function relNorth(originAngle) { return norm(originAngle + 180); }

  // Resolve a scenario to the player's dodge spot.
  //   originAngle : one of the 8 waymark angles (first dash origin)
  //   rotation    : Kefka's spin, 'CW' | 'CCW'
  //   number      : Limit Cut number, 1..8
  function resolve(opts) {
    var R = relNorth(opts.originAngle);
    var countSgn = opts.rotation === "CCW" ? 1 : -1; // count OPPOSITE Kefka; CW = +angle
    var angle = norm(R + countSgn * (45 * opts.number - 22.5));
    var spotIndex = norm((angle - 22.5)) / 45; // integer 0..7
    return { angle: angle, spotIndex: Math.round(spotIndex) % 8 };
  }

  // Random scenario. rng() -> [0,1) injectable for deterministic tests.
  function deal(rng) {
    rng = rng || Math.random;
    var origin = WAYMARKS[Math.floor(rng() * WAYMARKS.length)];
    return {
      origin: { mark: origin.mark, angle: origin.angle, kind: origin.kind },
      rotation: rng() < 0.5 ? "CW" : "CCW",
      number: Math.floor(rng() * 8) + 1
    };
  }

  // Place a point at `angle` on a circle of `radius`, 0 = up, CW positive.
  function angleToXY(angle, radius) {
    var rad = (angle * Math.PI) / 180;
    return { x: radius * Math.sin(rad), y: -radius * Math.cos(rad) };
  }

  var LimitCut = {
    WAYMARKS: WAYMARKS,
    DODGE_SPOTS: DODGE_SPOTS,
    relNorth: relNorth,
    resolve: resolve,
    deal: deal,
    angleToXY: angleToXY
  };

  if (typeof module !== "undefined" && module.exports) module.exports = LimitCut;
  if (typeof window !== "undefined") window.LimitCut = LimitCut;
})();
