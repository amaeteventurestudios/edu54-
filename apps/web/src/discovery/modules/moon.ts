/** Moon phases: above, the Earth and the Moon's orbit seen from over the North Pole with sunlight from the right; drag the
 *  Moon to move it. Beside it, what the Moon looks like from Earth (seen from the northern hemisphere). */
import { CanvasModule } from "../engine.ts";
import { fmt, moonPhase, SYNODIC } from "../science.ts";

const DAYS_PER_SECOND = 3;

class Moon extends CanvasModule {
  private dragging = false;

  protected init() {
    const toDay = (e: PointerEvent) => {
      const r = this.canvas.getBoundingClientRect(), o = this.orbit();
      const a = Math.atan2(-(e.clientY - r.top - o.cy), e.clientX - r.left - o.cx);
      this.p.day = Math.round(((a + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI) * SYNODIC * 2) / 2 % 29.5;
      this.redraw(); this.ctx.onChange();
    };
    this.listen(this.canvas, "pointerdown", (e) => { const r = this.canvas.getBoundingClientRect(), o = this.orbit(), d = Math.hypot(e.clientX - r.left - o.cx, e.clientY - r.top - o.cy); if (Math.abs(d - o.R) < 36) { this.dragging = true; this.canvas.setPointerCapture(e.pointerId); toDay(e); } });
    this.listen(this.canvas, "pointermove", (e) => { if (this.dragging) toDay(e); });
    this.listen(this.canvas, "pointerup", () => { this.dragging = false; });
  }

  private orbit() { const side = this.w > 560; const size = side ? Math.min(this.w * 0.58, this.h) : Math.min(this.w, this.h * 0.62); return { cx: size / 2 + 6, cy: side ? this.h / 2 : size / 2 + 4, R: size * 0.36, side, size }; }

  protected step(dt: number) { this.p.day = (this.num("day") + dt * DAYS_PER_SECOND) % 29.5; }

  private moonDisk(cx: number, cy: number, r: number, angle: number) {
    const g = this.g, lit = "#f4efdc", dark = "#2b2f3a", k = Math.cos(angle), waxing = Math.sin(angle) >= 0;
    this.circle(cx, cy, r, dark);
    g.save(); g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, !waxing); g.closePath(); g.fillStyle = lit; g.fill(); g.restore();   // lit half: right when waxing
    g.beginPath(); g.ellipse(cx, cy, Math.abs(k) * r, r, 0, 0, Math.PI * 2); g.fillStyle = k > 0 ? dark : lit; g.fill();                   // the terminator
    this.circle(cx, cy, r, undefined, "rgba(0,0,0,.25)", 1);
  }

  protected draw() {
    const g = this.g, P = this.ctx.palette, o = this.orbit(), ph = moonPhase(this.num("day"));
    g.fillStyle = "#0d1430"; g.fillRect(0, 0, this.w, this.h);
    // sunlight from the right
    for (let i = 0; i < 7; i++) { const y = 20 + i * (this.h - 40) / 6; this.line(this.w - 10, y, this.w - 46, y, "rgba(242,201,76,.55)", 2); this.line(this.w - 46, y, this.w - 38, y - 4, "rgba(242,201,76,.55)", 2); this.line(this.w - 46, y, this.w - 38, y + 4, "rgba(242,201,76,.55)", 2); }
    this.text("Sunlight", this.w - 12, 10, "#F2C94C", "right", 11, 700);
    // orbit, Earth (night side away from the Sun) and the Moon
    this.circle(o.cx, o.cy, o.R, undefined, "rgba(255,255,255,.25)", 1.2);
    const er = o.size * 0.07;
    this.circle(o.cx, o.cy, er, "#1E5BA8");
    g.beginPath(); g.arc(o.cx, o.cy, er, Math.PI / 2, Math.PI * 1.5); g.fillStyle = "rgba(0,0,0,.55)"; g.fill();
    this.text("Earth", o.cx, o.cy + er + 12, "rgba(255,255,255,.8)", "center", 11);
    const mx = o.cx + o.R * Math.cos(ph.angle), my = o.cy - o.R * Math.sin(ph.angle), mr = o.size * 0.035;
    this.circle(mx, my, mr, "#2b2f3a");
    g.beginPath(); g.arc(mx, my, mr, -Math.PI / 2, Math.PI / 2); g.fillStyle = "#f4efdc"; g.fill();                        // the half facing the Sun is always lit
    this.circle(mx, my, mr + 6, undefined, "rgba(242,201,76,.6)", 1.5);
    this.text(`day ${fmt(this.num("day"), 1)}`, mx, my - mr - 14, "#fff", "center", 11, 700);
    // what we see from Earth
    const vx = o.side ? o.size + (this.w - o.size - 60) / 2 : this.w / 2, vy = o.side ? this.h / 2 - 20 : o.size + (this.h - o.size) / 2 - 10;
    const vr = Math.min(o.side ? (this.w - o.size - 90) / 2 : (this.h - o.size) / 2 - 30, 90);
    if (vr > 18) {
      this.moonDisk(vx, vy, vr, ph.angle);
      this.text("Seen from Earth", vx, vy - vr - 16, "rgba(255,255,255,.75)", "center", 12);
      this.text(ph.phase, vx, vy + vr + 18, "#fff", "center", 15, 700);
      this.text(`${fmt(ph.illuminated, 0)}% lit`, vx, vy + vr + 38, "rgba(255,255,255,.75)", "center", 12);
    }
    if (!this.running) this.text("Drag the Moon around its orbit, or press Play", 12, this.h - 12, "rgba(255,255,255,.6)", "left", 11);
    void P;
  }

  protected observe() { const ph = moonPhase(this.num("day")); return { phase: ph.phase, illuminated: ph.illuminated, day: this.num("day") }; }
  describe() { const ph = moonPhase(this.num("day")); return `Day ${fmt(this.num("day"), 1)} of the Moon's cycle: ${ph.phase}, ${fmt(ph.illuminated, 0)} percent of the side we see is lit.`; }
}

export default () => new Moon();
