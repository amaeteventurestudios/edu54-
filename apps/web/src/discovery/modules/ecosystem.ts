/** Predators and prey: Lotka-Volterra solved with RK4 (science.ts). Left, both populations over time; right, the loop they
 *  trace against each other. Changing a rate carries on from today's numbers; changing a start value starts again. */
import { CanvasModule, niceStep } from "../engine.ts";
import { fmt, lvBalance, lvStep, type LV } from "../science.ts";

const YEARS_PER_SECOND = 2, H = 0.01, WINDOW = 30;

class Ecosystem extends CanvasModule {
  private year = 0;
  private x = 0;
  private y = 0;
  private hist: [number, number, number][] = [];

  private rates(): LV { return { alpha: this.num("prey_birth"), beta: this.num("predation"), delta: this.num("predator_gain"), gamma: this.num("predator_death") }; }
  protected init() { this.onReset(); }
  protected onReset() { this.year = 0; this.x = this.num("start_prey"); this.y = this.num("start_predators"); this.hist = [[0, this.x, this.y]]; }
  protected onParam(key: string) { if (key.startsWith("start_")) this.onReset(); }

  protected step(dt: number) {
    const p = this.rates();
    let left = dt * YEARS_PER_SECOND;
    while (left > 1e-9) {
      const h = Math.min(H, left);
      [this.x, this.y] = lvStep(p, this.x, this.y, h);
      this.year += h; left -= h;
      if (this.year - this.hist[this.hist.length - 1][0] >= 0.05) this.hist.push([this.year, this.x, this.y]);
    }
    if (this.hist.length > 4000) this.hist = this.hist.slice(-3000);
  }

  protected draw() {
    const P = this.ctx.palette, fox = "#C2462B", wide = this.w > 620;
    const plotW = wide ? this.w * 0.62 : this.w, phaseX = wide ? plotW + 24 : 0;
    const top = 30, bottom = wide ? this.h - 34 : this.h * 0.58, left = 44, right = plotW - 10;
    const t1 = Math.max(WINDOW, this.year), t0 = t1 - WINDOW;
    const shown = this.hist.filter((h) => h[0] >= t0);
    const ymax = Math.max(10, ...shown.map((h) => Math.max(h[1], h[2]))) * 1.1;
    const X = (t: number) => left + (t - t0) / WINDOW * (right - left), Y = (v: number) => bottom - v / ymax * (bottom - top);
    const ys = niceStep(ymax, 4);
    for (let v = 0; v <= ymax; v += ys) { this.line(left, Y(v), right, Y(v), "#edf0eb", 1); this.text(fmt(v, 0), left - 8, Y(v), P.muted, "right", 11); }
    for (let t = Math.ceil(t0 / 5) * 5; t <= t1; t += 5) this.text(`year ${fmt(t, 0)}`, X(t), bottom + 14, P.muted, "center", 11);
    const series = (i: 1 | 2, color: string) => {
      const g = this.g; g.strokeStyle = color; g.lineWidth = 2.6; g.beginPath();
      shown.forEach((h, j) => (j ? g.lineTo(X(h[0]), Y(h[i])) : g.moveTo(X(h[0]), Y(h[i])))); g.stroke();
    };
    const bal = lvBalance(this.rates());
    this.line(left, Y(bal.prey), right, Y(bal.prey), P.lab, 1, [4, 5]);
    this.line(left, Y(bal.predators), right, Y(bal.predators), fox, 1, [4, 5]);
    series(1, P.lab); series(2, fox);
    this.circle(X(this.year), Y(this.x), 4.5, P.lab); this.circle(X(this.year), Y(this.y), 4.5, fox);
    this.text("● Rabbits", left, 12, P.lab, "left", 12, 700); this.text("● Foxes", left + 80, 12, fox, "left", 12, 700);
    this.text("dashed: balance point", left + 150, 12, P.muted, "left", 11);
    // phase loop
    const px0 = wide ? phaseX + 34 : 50, py1 = wide ? 30 : bottom + 40, size = wide ? Math.min(this.w - phaseX - 50, this.h - 80) : Math.min(this.w - 80, this.h - bottom - 70);
    if (size < 60) return;
    const all = this.hist, mx = Math.max(10, ...all.map((h) => h[1])) * 1.1, my = Math.max(5, ...all.map((h) => h[2])) * 1.1;
    const PX = (v: number) => px0 + v / mx * size, PY = (v: number) => py1 + size - v / my * size;
    this.g.strokeStyle = P.line; this.g.lineWidth = 1; this.g.strokeRect(px0, py1, size, size);
    this.g.strokeStyle = P.primary; this.g.lineWidth = 1.6; this.g.beginPath();
    all.forEach((h, j) => (j ? this.g.lineTo(PX(h[1]), PY(h[2])) : this.g.moveTo(PX(h[1]), PY(h[2])))); this.g.stroke();
    this.circle(PX(this.x), PY(this.y), 4.5, P.accent, P.primary, 1.5);
    this.circle(PX(bal.prey), PY(bal.predators), 3, P.muted);
    this.text("rabbits →", px0 + size, py1 + size + 12, P.muted, "right", 11);
    this.text("↑ foxes", px0 - 4, py1 - 8, P.muted, "left", 11);
  }

  protected observe() { const b = lvBalance(this.rates()); return { year: this.year, prey: this.x, predators: this.y, balance_prey: b.prey, balance_predators: b.predators }; }
  describe() { return `Year ${fmt(this.year, 1)}: ${fmt(this.x, 0)} rabbits and ${fmt(this.y, 0)} foxes. The populations rise and fall in a repeating cycle.`; }
}

export default () => new Ecosystem();
