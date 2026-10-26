/** Gas in a box: the box width follows the volume, the number of dots the amount, their speed the square root of the
 *  temperature. The dots are an illustration; the pressure on the gauge is PV = nRT. */
import { CanvasModule } from "../engine.ts";
import { fmt, gasPressure, KPA_PER_ATM } from "../science.ts";

interface Dot { x: number; y: number; vx: number; vy: number }

class Gas extends CanvasModule {
  private dots: Dot[] = [];
  private seed = 7;

  private rnd() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 2 ** 32; }
  private count() { return Math.round(this.num("amount") * (this.ctx.lowPower ? 25 : 60)); }
  private speed() { return Math.sqrt(this.num("temperature") / 300) * 0.55; }        // box widths per second, illustrative

  protected init() { this.fill(); }
  protected onReset() { this.seed = 7; this.dots = []; this.fill(); }
  protected onParam(key: string) {
    if (key === "amount") this.fill();
    if (key === "temperature") { const s = this.speed(); this.dots.forEach((d) => { const v = Math.hypot(d.vx, d.vy) || 1; const target = s * (0.6 + 0.8 * this.rnd()); d.vx *= target / v; d.vy *= target / v; }); }
    if (key === "volume") this.dots.forEach((d) => { d.x = Math.min(d.x, 1); });
  }
  setLowPower(on: boolean) { super.setLowPower(on); this.fill(); }

  private fill() {
    const n = this.count();
    while (this.dots.length > n) this.dots.pop();
    while (this.dots.length < n) {
      const a = this.rnd() * Math.PI * 2, s = this.speed() * (0.6 + 0.8 * this.rnd());
      this.dots.push({ x: this.rnd(), y: this.rnd(), vx: Math.cos(a) * s, vy: Math.sin(a) * s });
    }
  }

  protected step(dt: number) {
    for (const d of this.dots) {          // positions are 0..1 inside the box; the box itself stretches with the volume
      d.x += d.vx * dt * 50 / this.num("volume"); d.y += d.vy * dt;
      if (d.x < 0) { d.x = -d.x; d.vx = Math.abs(d.vx); } if (d.x > 1) { d.x = 2 - d.x; d.vx = -Math.abs(d.vx); }
      if (d.y < 0) { d.y = -d.y; d.vy = Math.abs(d.vy); } if (d.y > 1) { d.y = 2 - d.y; d.vy = -Math.abs(d.vy); }
    }
  }

  protected draw() {
    const g = this.g, P = this.ctx.palette;
    const gaugeW = Math.min(200, this.w * 0.32), maxBoxW = this.w - gaugeW - 70;
    const boxH = Math.min(this.h - 80, 300), boxW = Math.max(40, maxBoxW * this.num("volume") / 50), x0 = 30, y0 = (this.h - boxH) / 2;
    // heat glow under the box follows the temperature
    const T = this.num("temperature"), warm = Math.min(1, Math.max(0, (T - 100) / 500));
    g.fillStyle = `rgba(${Math.round(80 + 175 * warm)}, ${Math.round(140 - 60 * warm)}, ${Math.round(220 - 190 * warm)}, 0.10)`;
    g.fillRect(x0, y0, boxW, boxH);
    g.strokeStyle = P.primary; g.lineWidth = 4; g.strokeRect(x0, y0, boxW, boxH);
    // the piston on the right
    g.fillStyle = "#cfd6cc"; g.fillRect(x0 + boxW, y0 - 6, 10, boxH + 12);
    this.line(x0 + boxW + 10, y0 + boxH / 2, x0 + maxBoxW + 10, y0 + boxH / 2, "#9aa79a", 6);
    this.text(`${fmt(this.num("volume"), 0)} L`, x0 + boxW / 2, y0 + boxH + 18, P.muted, "center", 12, 600);
    for (const d of this.dots) this.circle(x0 + 4 + d.x * (boxW - 8), y0 + 4 + d.y * (boxH - 8), 3.2, P.lab);
    // gauge
    const p = gasPressure(this.num("amount"), T, this.num("volume")), cx = this.w - gaugeW / 2 - 16, cy = this.h / 2, r = gaugeW / 2 - 8, max = 1000;
    this.circle(cx, cy, r, "#fff", P.primary, 3);
    for (let v = 0; v <= max; v += 100) {
      const a = Math.PI * (0.75 + 1.5 * v / max), inner = v % 200 === 0 ? r - 12 : r - 7;
      this.line(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner, cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2), P.muted, 1.5);
      if (v % 200 === 0) this.text(String(v), cx + Math.cos(a) * (r - 24), cy + Math.sin(a) * (r - 24), P.muted, "center", 10);
    }
    const a = Math.PI * (0.75 + 1.5 * Math.min(p, max) / max);
    this.line(cx, cy, cx + Math.cos(a) * (r - 14), cy + Math.sin(a) * (r - 14), "#A8321F", 3);
    this.circle(cx, cy, 5, P.primary);
    this.text(`${fmt(p, 1)} kPa`, cx, cy + r * 0.45, P.text, "center", 15, 700);
    this.text(p > max ? "off the scale" : "pressure", cx, cy + r * 0.45 + 18, P.muted, "center", 11);
    this.text(`${fmt(T, 0)} K (${fmt(T - 273.15, 0)} °C) · ${fmt(this.num("amount"), 1)} mol`, x0, y0 - 16, P.text, "left", 12, 600);
  }

  protected observe() {
    const p = gasPressure(this.num("amount"), this.num("temperature"), this.num("volume"));
    return { pressure: p, pressure_atm: p / KPA_PER_ATM, celsius: this.num("temperature") - 273.15 };
  }
  describe() { return `A box of ${this.p.amount} moles of gas at ${this.p.temperature} kelvin in ${this.p.volume} litres. Pressure ${fmt(Number(this.observe().pressure), 1)} kilopascals.`; }
}

export default () => new Gas();
