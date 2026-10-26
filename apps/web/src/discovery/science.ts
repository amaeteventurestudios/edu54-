/** Discovery Lab: the science behind every working experiment, kept apart from the drawing so it can be tested on its own
 *  (tests-unit/science.test.ts). Plain functions, SI units unless the name says otherwise. No imports: Node runs the tests
 *  on this file directly. */

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
/** A tidy number for labels: 2 → "2", 1.5 → "1.5", -0.25 → "−0.25" (true minus sign). */
export const fmt = (v: number, d = 2) => { const r = round(v, d); return (Object.is(r, -0) ? 0 : r).toString().replace("-", "−"); };

// ---- Mathematics: graphing --------------------------------------------------------------------------------------------
export type Family = "linear" | "quadratic" | "sine";
export function fx(family: Family, a: number, b: number, c: number, x: number): number {
  if (family === "linear") return a * x + b;
  if (family === "quadratic") return a * x * x + b * x + c;
  return a * Math.sin(b * x) + c;
}
export function analyzeGraph(family: Family, a: number, b: number, c: number) {
  const signed = (v: number) => (v < 0 ? ` − ${fmt(-v)}` : ` + ${fmt(v)}`);
  if (family === "linear") {
    const roots = a === 0 ? (b === 0 ? "every x" : "never") : `x = ${fmt(-b / a)}`;
    return { equation: `y = ${fmt(a)}x${signed(b)}`, y_intercept: b, roots, turning: "none (a straight line)" };
  }
  if (family === "quadratic") {
    const eq = `y = ${fmt(a)}x²${signed(b)}x${signed(c)}`;
    if (a === 0) return { equation: eq, y_intercept: c, roots: b === 0 ? (c === 0 ? "every x" : "never") : `x = ${fmt(-c / b)}`, turning: "none (a = 0 makes a line)" };
    const disc = b * b - 4 * a * c, vx = -b / (2 * a);
    const roots = disc < 0 ? "never" : disc === 0 ? `x = ${fmt(vx)}` : [(-b - Math.sqrt(disc)) / (2 * a), (-b + Math.sqrt(disc)) / (2 * a)].sort((p, q) => p - q).map((r) => `x = ${fmt(r)}`).join(" and ");
    return { equation: eq, y_intercept: c, roots, turning: `(${fmt(vx)}, ${fmt(fx("quadratic", a, b, c, vx))}) ${a > 0 ? "lowest" : "highest"} point` };
  }
  const eq = `y = ${fmt(a)}·sin(${fmt(b)}x)${signed(c)}`;
  if (a === 0 || b === 0) return { equation: eq, y_intercept: c, roots: c === 0 ? "every x" : "never", turning: "none (a flat line)" };
  const amp = Math.abs(a);
  const period = 2 * Math.PI / Math.abs(b), s = Math.asin(Math.max(-1, Math.min(1, -c / a)));
  const roots = Math.abs(c) > amp ? "never" : Math.abs(c) === amp ? `touches at x = ${fmt(s / b)}, every ${fmt(period)}`
    : c === 0 ? `x = 0, then every ${fmt(period / 2)}` : `x = ${fmt(s / b)} and x = ${fmt((Math.PI - s) / b)}, repeating every ${fmt(period)}`;
  return { equation: eq, y_intercept: c, roots, turning: `peaks at y = ${fmt(c + amp)}, dips to y = ${fmt(c - amp)}, period ${fmt(period)}` };
}

// ---- Mathematics: solids ----------------------------------------------------------------------------------------------
export type Shape = "cuboid" | "cylinder" | "cone" | "sphere";
export function solid(shape: Shape, d: { length: number; width: number; height: number; radius: number }) {
  const { length: l, width: w, height: h, radius: r } = d;
  switch (shape) {
    case "cuboid": return { volume: l * w * h, surface_area: 2 * (l * w + l * h + w * h), formula: "V = l × w × h" };
    case "cylinder": return { volume: Math.PI * r * r * h, surface_area: 2 * Math.PI * r * r + 2 * Math.PI * r * h, formula: "V = π r² h" };
    case "cone": return { volume: Math.PI * r * r * h / 3, surface_area: Math.PI * r * r + Math.PI * r * Math.hypot(r, h), formula: "V = π r² h ÷ 3" };
    case "sphere": return { volume: 4 / 3 * Math.PI * r ** 3, surface_area: 4 * Math.PI * r * r, formula: "V = 4/3 π r³" };
  }
}

// ---- Physics: projectile ----------------------------------------------------------------------------------------------
export const GRAVITY: Record<string, number> = { earth: 9.81, moon: 1.62, mars: 3.71 };
export function projectile(speed: number, angleDeg: number, height: number, g: number) {
  const th = angleDeg * Math.PI / 180, vx = speed * Math.cos(th), vy = speed * Math.sin(th);
  const flight = (vy + Math.sqrt(vy * vy + 2 * g * height)) / g;
  const maxH = vy > 0 ? height + vy * vy / (2 * g) : height;
  return { vx, vy, flight_time: flight, range: vx * flight, max_height: maxH,
    at: (t: number) => ({ x: vx * Math.min(t, flight), y: Math.max(0, height + vy * Math.min(t, flight) - g * Math.min(t, flight) ** 2 / 2) }) };
}

// ---- Chemistry: ideal gas ---------------------------------------------------------------------------------------------
export const R = 8.314;
/** n in mol, T in K, V in litres → pressure in kPa (J/L = kPa). */
export const gasPressure = (n: number, T: number, V: number) => n * R * T / V;
export const KPA_PER_ATM = 101.325;

// ---- Biology: predator and prey (Lotka-Volterra, RK4) ----------------------------------------------------------------
export interface LV { alpha: number; beta: number; delta: number; gamma: number }
const lvd = (p: LV, x: number, y: number): [number, number] => [p.alpha * x - p.beta * x * y, p.delta * x * y - p.gamma * y];
export function lvStep(p: LV, x: number, y: number, h: number): [number, number] {
  const [a1, b1] = lvd(p, x, y), [a2, b2] = lvd(p, x + h * a1 / 2, y + h * b1 / 2), [a3, b3] = lvd(p, x + h * a2 / 2, y + h * b2 / 2), [a4, b4] = lvd(p, x + h * a3, y + h * b3);
  return [Math.max(0, x + h / 6 * (a1 + 2 * a2 + 2 * a3 + a4)), Math.max(0, y + h / 6 * (b1 + 2 * b2 + 2 * b3 + b4))];
}
/** Conserved along every Lotka-Volterra orbit: a check that the numerical method is not drifting. */
export const lvInvariant = (p: LV, x: number, y: number) => p.delta * x - p.gamma * Math.log(x) + p.beta * y - p.alpha * Math.log(y);
export const lvBalance = (p: LV) => ({ prey: p.gamma / p.delta, predators: p.alpha / p.beta });

// ---- Electronics: Ohm's law -------------------------------------------------------------------------------------------
export function circuit(layout: "single" | "series" | "parallel", V: number, r1: number, r2: number) {
  const total = layout === "single" ? r1 : layout === "series" ? r1 + r2 : 1 / (1 / r1 + 1 / r2);
  const I = V / total;
  const v1 = layout === "series" ? I * r1 : V;
  return { total_resistance: total, current: I * 1000, power: V * I * 1000, v_r1: v1, i_r1: v1 / r1 * 1000, i_r2: layout === "single" ? 0 : (layout === "series" ? I : V / r2) * 1000 };
}

// ---- Music ------------------------------------------------------------------------------------------------------------
const NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
export const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
export const noteName = (midi: number) => `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
const INTERVALS = ["unison", "minor second", "major second", "minor third", "major third", "perfect fourth", "tritone", "perfect fifth", "minor sixth", "major sixth", "minor seventh", "major seventh", "octave"];
export function intervalName(from: number, to: number) {
  const n = Math.abs(to - from);
  const base = n % 12 === 0 && n > 0 ? (n === 12 ? "octave" : `${n / 12} octaves`) : INTERVALS[n % 12] + (n > 12 ? ` + ${Math.floor(n / 12)} octave${n >= 24 ? "s" : ""}` : "");
  return `${base} (${n} semitone${n === 1 ? "" : "s"}${to < from ? ", down" : n ? ", up" : ""})`;
}

// ---- Space: Moon phases -----------------------------------------------------------------------------------------------
export const SYNODIC = 29.53;
export function moonPhase(day: number) {
  const angle = ((day / SYNODIC) % 1) * 2 * Math.PI;                 // 0 = new moon (Moon between Earth and Sun)
  const lit = (1 - Math.cos(angle)) / 2;
  const f = (day / SYNODIC) % 1;
  const name = f < 0.017 || f > 0.983 ? "New moon" : f < 0.233 ? "Waxing crescent" : f < 0.267 ? "First quarter" : f < 0.483 ? "Waxing gibbous"
    : f < 0.517 ? "Full moon" : f < 0.733 ? "Waning gibbous" : f < 0.767 ? "Last quarter" : "Waning crescent";
  return { angle, illuminated: lit * 100, phase: name, waxing: f < 0.5 };
}

// ---- Earth: seismic waves ---------------------------------------------------------------------------------------------
export function seismic(distanceKm: number, vp: number, vs: number) {
  const p = distanceKm / vp, s = distanceKm / vs;
  return { p_arrival: p, s_arrival: s, lag: s - p, km_per_second_of_lag: 1 / (1 / vs - 1 / vp) };
}

// ---- Robotics: two-joint arm ------------------------------------------------------------------------------------------
export function arm(shoulderDeg: number, elbowDeg: number, l1: number, l2: number) {
  const t1 = shoulderDeg * Math.PI / 180, t2 = elbowDeg * Math.PI / 180;
  const ex = l1 * Math.cos(t1), ey = l1 * Math.sin(t1);
  const hx = ex + l2 * Math.cos(t1 + t2), hy = ey + l2 * Math.sin(t1 + t2);
  return { elbow: { x: ex, y: ey }, hand_x: hx, hand_y: hy, reach: Math.hypot(hx, hy), max_reach: l1 + l2 };
}

// ---- Mechanical: gears ------------------------------------------------------------------------------------------------
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
export function gears(driver: number, driven: number, rpm: number) {
  const g = gcd(driven, driver);
  return { ratio: `${driven / g} : ${driver / g}`, output_rpm: rpm * driver / driven, torque_factor: driven / driver, direction: "the opposite way" };
}

// ---- Computer science: sorting ----------------------------------------------------------------------------------------
export type SortStep = { compare: [number, number]; swap: boolean; array: number[] };
/** Every comparison as a step (with the array after it), so the animation and the counts come from the same run. */
export function* sortSteps(algorithm: "bubble" | "insertion" | "selection", input: number[]): Generator<SortStep> {
  const a = [...input];
  if (algorithm === "bubble") {
    for (let end = a.length - 1; end > 0; end--) {
      let swapped = false;
      for (let i = 0; i < end; i++) {
        const sw = a[i] > a[i + 1];
        if (sw) { [a[i], a[i + 1]] = [a[i + 1], a[i]]; swapped = true; }
        yield { compare: [i, i + 1], swap: sw, array: [...a] };
      }
      if (!swapped) return;
    }
  } else if (algorithm === "insertion") {
    for (let i = 1; i < a.length; i++) {
      for (let j = i; j > 0; j--) {
        const sw = a[j - 1] > a[j];
        if (sw) [a[j - 1], a[j]] = [a[j], a[j - 1]];
        yield { compare: [j - 1, j], swap: sw, array: [...a] };
        if (!sw) break;
      }
    }
  } else {
    for (let i = 0; i < a.length - 1; i++) {
      let min = i;
      for (let j = i + 1; j < a.length; j++) {
        yield { compare: [min, j], swap: false, array: [...a] };
        if (a[j] < a[min]) min = j;
      }
      if (min !== i) { [a[i], a[min]] = [a[min], a[i]]; yield { compare: [i, min], swap: true, array: [...a] }; }
    }
  }
}
export const isSorted = (a: number[]) => a.every((v, i) => i === 0 || a[i - 1] <= v);
/** A repeatable shuffle (same seed, same list), so a class can compare algorithms on the same bars. */
export function shuffled(n: number, seed: number): number[] {
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const a = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---- Geography: globe -------------------------------------------------------------------------------------------------
export const EARTH_RADIUS_KM = 6371;
export function greatCircle(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180, p1 = lat1 * r, p2 = lat2 * r, dp = (lat2 - lat1) * r, dl = (lon2 - lon1) * r;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const distance = 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  const bearing = (Math.atan2(y, x) / r + 360) % 360;
  let dLon = lon2 - lon1; if (dLon > 180) dLon -= 360; if (dLon < -180) dLon += 360;
  return { distance, bearing, sun_time: dLon / 15 };
}

// ---- Environment: energy balance --------------------------------------------------------------------------------------
export const SIGMA = 5.670374419e-8;
export function climate(solar: number, albedo: number, emissivity: number) {
  const absorbed = solar * (1 - albedo) / 4;
  const T = (absorbed / (emissivity * SIGMA)) ** 0.25, T0 = (absorbed / SIGMA) ** 0.25;
  return { absorbed, temperature: T - 273.15, no_greenhouse: T0 - 273.15, kelvin: T };
}
