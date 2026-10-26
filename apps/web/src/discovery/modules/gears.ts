/** Gear trains: two meshed spur gears drawn to scale (same tooth size), turning at the speeds the ratio gives. A marker on
 *  each gear makes the turns easy to count. */
import { CanvasModule } from "../engine.ts";
import { fmt, gears } from "../science.ts";

class Gears extends CanvasModule {
  private angle = 0;
  private turns = 0;

  protected onReset() { this.angle = 0; this.turns = 0; }
  protected step(dt: number) { const d = this.num("input_rpm") / 60 * 2 * Math.PI * dt; this.angle += d; this.turns += d / (2 * Math.PI); }

  private gear(cx: number, cy: number, teeth: number, m: number, rot: number, fill: string, label: string) {
    const g = this.g, r = m * teeth / 2, ra = r + m, rd = r - 1.25 * m;
    g.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a0 = rot + i * 2 * Math.PI / teeth, w = Math.PI / teeth;
      g.lineTo(cx + rd * Math.cos(a0 - w * 0.55), cy + rd * Math.sin(a0 - w * 0.55));
      g.lineTo(cx + ra * Math.cos(a0 - w * 0.28), cy + ra * Math.sin(a0 - w * 0.28));
      g.lineTo(cx + ra * Math.cos(a0 + w * 0.28), cy + ra * Math.sin(a0 + w * 0.28));
      g.lineTo(cx + rd * Math.cos(a0 + w * 0.55), cy + rd * Math.sin(a0 + w * 0.55));
    }
    g.closePath(); g.fillStyle = fill; g.fill(); g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 1; g.stroke();
    this.circle(cx, cy, Math.max(4, r * 0.18), "#fff", "rgba(0,0,0,.3)", 1);
    const mx = cx + r * 0.62 * Math.cos(rot), my = cy + r * 0.62 * Math.sin(rot);
    this.circle(mx, my, Math.max(4, m * 0.9), "#F2C94C", "#5a4210", 1.5);
    this.text(label, cx, cy + ra + 18, this.ctx.palette.text, "center", 12, 700);
  }

  protected draw() {
    const P = this.ctx.palette, n1 = this.num("driver_teeth"), n2 = this.num("driven_teeth"), q = gears(n1, n2, this.num("input_rpm"));
    // module (tooth size) so both gears fit side by side
    const m = Math.min((this.w - 60) / (n1 + n2 + 4), (this.h - 70) / (Math.max(n1, n2) + 2));
    const r1 = m * n1 / 2, r2 = m * n2 / 2, cy = (this.h - 24) / 2, cx1 = (this.w - (r1 + r2) * 2 - 4 * m) / 2 + r1 + m, cx2 = cx1 + r1 + r2;
    // the driven gear turns the other way, offset half a tooth so the teeth sit in each other's gaps
    const rot2 = -this.angle * n1 / n2 + Math.PI + Math.PI / n2;
    this.gear(cx1, cy, n1, m, this.angle, P.lab, `Driving · ${n1} teeth · ${fmt(this.num("input_rpm"), 0)} rpm`);
    this.gear(cx2, cy, n2, m, rot2, "#8C97A3", `Driven · ${n2} teeth · ${fmt(q.output_rpm, 1)} rpm`);
    this.text(`Ratio ${q.ratio} · turning force ×${fmt(q.torque_factor, 2)}`, this.w / 2, 16, P.primary, "center", 13, 700);
    this.text(this.running ? `Driving gear turns: ${fmt(this.turns, 1)}` : "Press Play to turn the gears", this.w / 2, this.h - 10, P.muted, "center", 12);
  }

  protected observe() { const q = gears(this.num("driver_teeth"), this.num("driven_teeth"), this.num("input_rpm")); return { ratio: q.ratio, output_rpm: q.output_rpm, torque_factor: q.torque_factor, direction: q.direction }; }
  describe() { const q = gears(this.num("driver_teeth"), this.num("driven_teeth"), this.num("input_rpm")); return `A ${this.p.driver_teeth}-tooth gear drives a ${this.p.driven_teeth}-tooth gear, ratio ${q.ratio}. The driven gear turns at ${fmt(q.output_rpm, 1)} revolutions per minute, the opposite way.`; }
}

export default () => new Gears();
