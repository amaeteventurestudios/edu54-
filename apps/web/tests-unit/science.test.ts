// Discovery Lab science, checked against textbook values. Run: npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";
import * as S from "../src/discovery/science.ts";

const near = (a: number, b: number, tol = 1e-3) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} ≉ ${b}`);

test("projectile: flat-ground range, symmetry and landing", () => {
  const p = S.projectile(10, 45, 0, 9.81);
  near(p.range, 100 / 9.81); near(p.flight_time, 2 * 10 * Math.SQRT1_2 / 9.81); near(p.max_height, 50 / (2 * 9.81));
  near(S.projectile(15, 30, 0, 9.81).range, S.projectile(15, 60, 0, 9.81).range);
  const h = S.projectile(12, 20, 10, 9.81);
  near(h.at(h.flight_time).y, 0, 1e-6);
  assert.ok(h.range > S.projectile(12, 20, 0, 9.81).range);
  assert.ok(S.projectile(15, 45, 0, S.GRAVITY.moon).range > 6 * S.projectile(15, 45, 0, S.GRAVITY.earth).range);
});

test("ideal gas: one mole at STP is about one atmosphere", () => {
  near(S.gasPressure(1, 273.15, 22.414) / S.KPA_PER_ATM, 1, 2e-3);
  near(S.gasPressure(1, 300, 10), 2 * S.gasPressure(1, 300, 20));
});

test("predator and prey: RK4 keeps the conserved quantity", () => {
  const p = { alpha: 1, beta: 0.1, delta: 0.075, gamma: 1.5 };
  let [x, y] = [10, 5];
  const c0 = S.lvInvariant(p, x, y);
  for (let i = 0; i < 2000; i++) [x, y] = S.lvStep(p, x, y, 0.01);
  near(S.lvInvariant(p, x, y), c0, 1e-5);
  assert.deepEqual(S.lvBalance(p), { prey: 20, predators: 10 });
  const [bx, by] = S.lvStep(p, 20, 10, 0.01);
  near(bx, 20, 1e-9); near(by, 10, 1e-9);
});

test("circuits: series, parallel, Ohm's law", () => {
  const s = S.circuit("series", 9, 100, 220);
  near(s.total_resistance, 320); near(s.current, 28.125); near(s.v_r1, 2.8125); near(s.power, 9 * 28.125);
  near(S.circuit("parallel", 9, 100, 100).total_resistance, 50);
  near(S.circuit("single", 6, 200, 999).current, 30);
});

test("music: equal temperament and interval names", () => {
  near(S.frequency(69), 440); near(S.frequency(60), 261.626); near(S.frequency(81), 880);
  assert.equal(S.noteName(60), "C4"); assert.equal(S.noteName(61), "C♯4"); assert.equal(S.noteName(69), "A4");
  assert.match(S.intervalName(60, 67), /^perfect fifth \(7 semitones, up\)/);
  assert.match(S.intervalName(72, 60), /^octave \(12 semitones, down\)/);
});

test("moon phases: new, quarter, full", () => {
  near(S.moonPhase(0).illuminated, 0); assert.equal(S.moonPhase(0).phase, "New moon");
  near(S.moonPhase(S.SYNODIC / 2).illuminated, 100); assert.equal(S.moonPhase(S.SYNODIC / 2).phase, "Full moon");
  near(S.moonPhase(S.SYNODIC / 4).illuminated, 50); assert.equal(S.moonPhase(S.SYNODIC / 4).phase, "First quarter");
});

test("earthquake waves: arrivals and the 8.4 km rule", () => {
  const q = S.seismic(300, 6, 3.5);
  near(q.p_arrival, 50); near(q.s_arrival, 300 / 3.5); near(q.km_per_second_of_lag, 8.4);
  near(S.seismic(600, 6, 3.5).lag, 2 * q.lag);
});

test("robot arm: forward kinematics", () => {
  const a = S.arm(0, 0, 12, 10); near(a.hand_x, 22); near(a.hand_y, 0, 1e-9);
  const b = S.arm(90, 0, 12, 10); near(b.hand_x, 0, 1e-9); near(b.hand_y, 22);
  const c = S.arm(0, 90, 12, 10); near(c.hand_x, 12); near(c.hand_y, 10); near(c.reach, Math.hypot(12, 10));
});

test("gears: ratio, speed and turning force", () => {
  const g = S.gears(12, 36, 30);
  assert.equal(g.ratio, "3 : 1"); near(g.output_rpm, 10); near(g.torque_factor, 3);
  assert.equal(S.gears(20, 30, 60).ratio, "3 : 2");
});

test("sorting: every algorithm sorts, and the counts are right", () => {
  for (const alg of ["bubble", "insertion", "selection"] as const) {
    for (const seed of [1, 7, 42]) {
      const input = S.shuffled(15, seed);
      const steps = [...S.sortSteps(alg, input)];
      assert.ok(S.isSorted(steps.at(-1)!.array), alg);
      if (alg === "selection") assert.ok(steps.filter((s) => s.swap).length <= 14);
    }
  }
  assert.equal([...S.sortSteps("bubble", [5, 4, 3, 2, 1])].length, 10);
  assert.equal([...S.sortSteps("bubble", [1, 2, 3, 4, 5])].length, 4);      // stops after one pass with no swaps
  assert.deepEqual(S.shuffled(10, 3), S.shuffled(10, 3));
});

test("globe: great-circle distance, bearing and sun time", () => {
  near(S.greatCircle(0, 0, 0, 90).distance, Math.PI / 2 * S.EARTH_RADIUS_KM);
  near(S.greatCircle(0, 0, 90, 0).bearing, 0, 1e-9);
  near(S.greatCircle(0, 0, 0, 90).bearing, 90);
  near(S.greatCircle(0, 0, 0, 45).sun_time, 3);
  near(S.greatCircle(0, 170, 0, -170).sun_time, 20 / 15);             // across the date line, the short way
  const kl = S.greatCircle(6.5, -1.5, 51.5, 0).distance;
  assert.ok(kl > 4950 && kl < 5050, String(kl));
});

test("energy balance: about 15 °C today, about −18 °C without greenhouse gases", () => {
  const c = S.climate(1361, 0.3, 0.612);
  assert.ok(c.temperature > 13 && c.temperature < 16, String(c.temperature));
  near(c.no_greenhouse, -18.6, 0.02);
  near(S.climate(1361, 0.3, 1).temperature, c.no_greenhouse);
});

test("solids: textbook formulas", () => {
  const d = { length: 6, width: 4, height: 6, radius: 3 };
  near(S.solid("cylinder", d).volume, Math.PI * 54); near(S.solid("cone", d).volume * 3, S.solid("cylinder", d).volume);
  near(S.solid("sphere", { ...d, radius: 1 }).volume, 4 * Math.PI / 3); near(S.solid("cuboid", d).surface_area, 2 * (24 + 36 + 24));
});

test("graphing: roots and turning points", () => {
  assert.equal(S.analyzeGraph("quadratic", 1, 0, -4).roots, "x = −2 and x = 2");
  assert.match(S.analyzeGraph("quadratic", 1, 0, -4).turning, /^\(0, −4\) lowest/);
  assert.equal(S.analyzeGraph("quadratic", 1, 0, 4).roots, "never");
  assert.equal(S.analyzeGraph("linear", 2, 4, 0).roots, "x = −2");
  assert.equal(S.analyzeGraph("sine", 2, 1, 0).roots, `x = 0, then every ${S.fmt(Math.PI)}`);
  assert.equal(S.analyzeGraph("sine", 1, 1, 3).roots, "never");
});
