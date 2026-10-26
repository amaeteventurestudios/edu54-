/** Ohm's law circuit: a battery and one or two resistors. Dots move around each loop at a speed that follows the current
 *  in that branch (illustrative speed, real direction of conventional current); resistors glow with the power they use. */
import { CanvasModule } from "../engine.ts";
import { circuit, fmt } from "../science.ts";

type Pt = [number, number];

function along(path: Pt[], d: number): Pt {
  const lens = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  const total = lens.reduce((a, b) => a + b, 0);
  let s = ((d % total) + total) % total;
  for (let i = 0; i < lens.length; i++) {
    if (s <= lens[i]) { const f = s / lens[i]; return [path[i][0] + (path[i + 1][0] - path[i][0]) * f, path[i][1] + (path[i + 1][1] - path[i][1]) * f]; }
    s -= lens[i];
  }
  return path[0];
}
const length = (path: Pt[]) => path.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0);

class Circuit extends CanvasModule {
  private phase = 0;

  private values() { return circuit(this.p.layout as "single" | "series" | "parallel", this.num("voltage"), this.num("r1"), this.num("r2")); }
  protected step(dt: number) { this.phase += dt; }
  protected onReset() { this.phase = 0; }

  private resistor(x1: number, y: number, x2: number, label: string, glow: number) {
    const g = this.g, P = this.ctx.palette, mid = (x1 + x2) / 2, half = 34;
    this.line(x1, y, mid - half, y, P.primary, 3); this.line(mid + half, y, x2, y, P.primary, 3);
    if (glow > 0) { g.save(); g.shadowColor = "rgba(242, 160, 40, .9)"; g.shadowBlur = 6 + 22 * glow; this.line(mid - half, y, mid + half, y, `rgba(242, 160, 40, ${0.25 + 0.5 * glow})`, 10); g.restore(); }
    g.strokeStyle = P.primary; g.lineWidth = 3; g.lineJoin = "round"; g.beginPath(); g.moveTo(mid - half, y);
    for (let i = 0; i < 6; i++) g.lineTo(mid - half + (i + 0.5) * (2 * half / 6), y + (i % 2 ? 9 : -9));
    g.lineTo(mid + half, y); g.stroke();
    this.text(label, mid, y - 22, P.text, "center", 12, 700);
  }

  protected draw() {
    const P = this.ctx.palette, v = this.values(), layout = this.p.layout;
    const L = Math.max(40, this.w * 0.12), R = this.w - Math.max(40, this.w * 0.12), T = this.h * 0.24, B = this.h * 0.78, mid = (L + R) / 2;
    const maxP = 12 * 12 / 10 * 1000;                                                  // the most one resistor can use (12 V across 10 Ω), mW
    // wires
    this.line(L, T, L, (T + B) / 2 - 26, P.primary, 3); this.line(L, (T + B) / 2 + 26, L, B, P.primary, 3);
    this.line(L, B, R, B, P.primary, 3); this.line(R, T, R, B, P.primary, 3);
    // battery: long plate (+) on top
    const by = (T + B) / 2;
    this.line(L - 22, by - 8, L + 22, by - 8, P.primary, 3); this.line(L - 12, by + 8, L + 12, by + 8, P.primary, 6);
    this.text("+", L + 30, by - 12, P.primary, "left", 15, 700); this.text(`${fmt(this.num("voltage"), 1)} V`, L - 30, by, P.text, "right", 13, 700);
    const glow = (mw: number) => Math.min(1, Math.sqrt(mw / maxP));
    const p1 = v.i_r1 * v.v_r1, p2 = layout === "single" ? 0 : (layout === "series" ? v.i_r2 * (this.num("voltage") - v.v_r1) : v.i_r2 * this.num("voltage"));
    let loops: { path: Pt[]; mA: number }[];
    if (layout === "parallel") {
      const T2 = T + (B - T) * 0.38, half = Math.min(110, (R - L) / 2 - 24), a = mid - half, b = mid + half;
      this.line(L, T, a, T, P.primary, 3); this.line(b, T, R, T, P.primary, 3);
      this.line(a, T, a, T2, P.primary, 3); this.line(b, T, b, T2, P.primary, 3);
      this.resistor(a, T, b, `R1 = ${fmt(this.num("r1"), 0)} Ω`, glow(p1));
      this.resistor(a, T2, b, `R2 = ${fmt(this.num("r2"), 0)} Ω`, glow(p2));
      loops = [{ path: [[L, B], [L, T], [R, T], [R, B], [L, B]], mA: v.i_r1 }, { path: [[L, B], [L, T], [a, T], [a, T2], [b, T2], [b, T], [R, T], [R, B], [L, B]], mA: v.i_r2 }];
    } else if (layout === "series") {
      this.resistor(L, T, mid, `R1 = ${fmt(this.num("r1"), 0)} Ω`, glow(p1));
      this.resistor(mid, T, R, `R2 = ${fmt(this.num("r2"), 0)} Ω`, glow(p2));
      loops = [{ path: [[L, B], [L, T], [R, T], [R, B], [L, B]], mA: v.current }];
    } else {
      this.resistor(L, T, R, `R1 = ${fmt(this.num("r1"), 0)} Ω`, glow(p1));
      loops = [{ path: [[L, B], [L, T], [R, T], [R, B], [L, B]], mA: v.current }];
    }
    // charge dots: speed follows the branch current (conventional current flows out of + at the top)
    for (const loop of loops) {
      const len = length(loop.path), spacing = 34, n = Math.floor(len / spacing), speed = 18 + loop.mA * 2.2;
      for (let i = 0; i < n; i++) { const [x, y] = along(loop.path, i * spacing + this.phase * speed); this.circle(x, y, 3.4, P.accent, P.primary, 1); }
    }
    // ammeter on the bottom wire
    this.circle(mid, B, 22, "#fff", P.primary, 3); this.text("A", mid, B, P.primary, "center", 15, 700);
    this.text(`${fmt(v.current, 1)} mA`, mid, B + 36, P.text, "center", 14, 700);
    if (!this.running) this.text("Press Play to see the current flow", mid, this.h - 12, P.muted, "center", 12);
  }

  protected observe() { const v = this.values(); return { total_resistance: v.total_resistance, current: v.current, power: v.power, v_r1: v.v_r1 }; }
  describe() { const v = this.values(); return `${this.p.voltage} volt battery with ${this.p.layout === "single" ? "one resistor" : `two resistors in ${this.p.layout}`}. Total resistance ${fmt(v.total_resistance, 1)} ohms, current ${fmt(v.current, 1)} milliamps.`; }
}

export default () => new Circuit();
