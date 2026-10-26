/** Two-joint robot arm: forward kinematics from the sliders, or drag the hand and the arm works its joint angles out
 *  backwards (inverse kinematics, keeping the elbow on the side it is already on). Grid squares are 2 cm. */
import { CanvasModule } from "../engine.ts";
import { arm, fmt } from "../science.ts";

class RobotArm extends CanvasModule {
  private dragging = false;
  private trail: [number, number][] = [];

  private view() { const reach = this.num("upper") + this.num("fore"); const s = Math.min(this.w / (2 * reach + 8), (this.h - 40) / (reach + 6)); return { s, ox: this.w / 2, oy: this.h - 34 }; }
  private toScreen(x: number, y: number) { const v = this.view(); return [v.ox + x * v.s, v.oy - y * v.s] as const; }

  protected init() {
    this.el.tabIndex = 0;
    const toWorld = (e: PointerEvent) => { const r = this.canvas.getBoundingClientRect(), v = this.view(); return [(e.clientX - r.left - v.ox) / v.s, (v.oy - (e.clientY - r.top)) / v.s] as const; };
    this.listen(this.canvas, "pointerdown", (e) => {
      const a = this.state(), [hx, hy] = this.toScreen(a.hand_x, a.hand_y), r = this.canvas.getBoundingClientRect();
      if (Math.hypot(e.clientX - r.left - hx, e.clientY - r.top - hy) < 28) { this.dragging = true; this.canvas.setPointerCapture(e.pointerId); }
    });
    this.listen(this.canvas, "pointermove", (e) => { if (this.dragging) this.reachFor(...toWorld(e)); });
    this.listen(this.canvas, "pointerup", () => { this.dragging = false; });
  }

  private state() { return arm(this.num("shoulder"), this.num("elbow"), this.num("upper"), this.num("fore")); }

  /** Inverse kinematics: the joint angles that put the hand at (x, y), within the joints' limits. */
  private reachFor(x: number, y: number) {
    const l1 = this.num("upper"), l2 = this.num("fore"), d = Math.min(l1 + l2 - 1e-6, Math.max(Math.abs(l1 - l2) + 1e-6, Math.hypot(x, y)));
    const c2 = (d * d - l1 * l1 - l2 * l2) / (2 * l1 * l2), sign = this.num("elbow") >= 0 ? 1 : -1;
    const t2 = sign * Math.acos(Math.max(-1, Math.min(1, c2))), phi = Math.atan2(y, x);
    const t1 = phi - Math.atan2(l2 * Math.sin(t2), l1 + l2 * Math.cos(t2));
    const deg = (r: number) => Math.round(r * 180 / Math.PI);
    this.p.shoulder = Math.max(0, Math.min(180, ((deg(t1) % 360) + 360) % 360 > 270 ? 0 : ((deg(t1) % 360) + 360) % 360));
    this.p.elbow = Math.max(-150, Math.min(150, deg(t2)));
    this.trail = [...this.trail, [this.state().hand_x, this.state().hand_y] as [number, number]].slice(-120);
    this.redraw(); this.ctx.onChange();
  }

  protected onParam() { const a = this.state(); this.trail = [...this.trail, [a.hand_x, a.hand_y] as [number, number]].slice(-120); }
  protected onReset() { this.trail = []; }

  protected draw() {
    const g = this.g, P = this.ctx.palette, v = this.view(), a = this.state();
    for (let x = -40; x <= 40; x += 2) { const [sx] = this.toScreen(x, 0); this.line(sx, 0, sx, v.oy, "#f0f2ee", 1); }
    for (let y = 0; y <= 40; y += 2) { const [, sy] = this.toScreen(0, y); this.line(0, sy, this.w, sy, "#f0f2ee", 1); }
    const [ox, oy] = this.toScreen(0, 0);
    this.circle(ox, oy, a.max_reach * v.s, undefined, P.muted, 1); g.save(); g.setLineDash([5, 6]); g.restore();
    this.text(`longest reach ${fmt(a.max_reach, 1)} cm`, ox + a.max_reach * v.s * 0.7, oy - a.max_reach * v.s * 0.72 - 8, P.muted, "left", 11);
    g.fillStyle = "#e4ecd9"; g.fillRect(0, v.oy, this.w, this.h - v.oy);
    // the path the hand has drawn
    if (this.trail.length > 1) { g.strokeStyle = "rgba(217,165,32,.6)"; g.lineWidth = 2; g.beginPath(); this.trail.forEach(([x, y], i) => { const [sx, sy] = this.toScreen(x, y); i ? g.lineTo(sx, sy) : g.moveTo(sx, sy); }); g.stroke(); }
    const [ex, ey] = this.toScreen(a.elbow.x, a.elbow.y), [hx, hy] = this.toScreen(a.hand_x, a.hand_y);
    g.fillStyle = P.primary; g.fillRect(ox - 26, oy - 4, 52, 10);
    g.lineCap = "round";
    this.line(ox, oy, ex, ey, P.lab, 16); this.line(ex, ey, hx, hy, P.lab, 12);
    g.lineCap = "butt";
    this.circle(ox, oy, 10, "#fff", P.primary, 3); this.circle(ex, ey, 8, "#fff", P.primary, 3);
    // gripper
    const ang = Math.atan2(-(hy - ey), hx - ex);
    for (const s of [-1, 1]) this.line(hx, hy, hx + 14 * Math.cos(ang + s * 0.5), hy - 14 * Math.sin(ang + s * 0.5), P.primary, 4);
    this.circle(hx, hy, 6, P.accent, P.primary, 2);
    this.text(`(${fmt(a.hand_x, 1)}, ${fmt(a.hand_y, 1)}) cm`, hx + 14, hy - 16, P.text, "left", 12, 700);
    this.text(`${fmt(this.num("shoulder"), 0)}°`, ox + 16, oy - 14, P.primary, "left", 11, 700);
    this.text(`${fmt(this.num("elbow"), 0)}°`, ex + 12, ey - 12, P.primary, "left", 11, 700);
    this.text("Drag the yellow hand to move the arm", 12, this.h - 12, P.muted, "left", 11);
  }

  protected observe() { const a = this.state(); return { hand_x: a.hand_x, hand_y: a.hand_y, reach: a.reach, max_reach: a.max_reach }; }
  describe() { const a = this.state(); return `Robot arm with shoulder at ${this.p.shoulder} degrees and elbow at ${this.p.elbow} degrees. The hand is ${fmt(a.hand_x, 1)} centimetres across and ${fmt(a.hand_y, 1)} up.`; }
}

export default () => new RobotArm();
