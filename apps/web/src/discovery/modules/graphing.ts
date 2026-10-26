/** Graphing functions: y = a·x + b, a·x² + b·x + c or a·sin(b·x) + c on a fixed −10..10 grid. Point at the curve to read it. */
import { CanvasModule } from "../engine.ts";
import { analyzeGraph, fmt, fx, type Family } from "../science.ts";

const SPAN = 10;

class Graphing extends CanvasModule {
  private hover: number | null = null;

  protected init() {
    this.listen(this.canvas, "pointermove", (e) => { const r = this.canvas.getBoundingClientRect(); this.hover = this.toX(e.clientX - r.left); this.redraw(); });
    this.listen(this.canvas, "pointerleave", () => { this.hover = null; this.redraw(); });
  }

  private get box() { const pad = 34, size = Math.min(this.w - pad * 2, this.h - pad * 2); return { x0: (this.w - size) / 2, y0: (this.h - size) / 2, size }; }
  private sx(x: number) { const b = this.box; return b.x0 + (x + SPAN) / (2 * SPAN) * b.size; }
  private sy(y: number) { const b = this.box; return b.y0 + (SPAN - y) / (2 * SPAN) * b.size; }
  private toX(px: number) { const b = this.box; return (px - b.x0) / b.size * 2 * SPAN - SPAN; }
  private f(x: number) { return fx(this.p.family as Family, this.num("a"), this.num("b"), this.num("c"), x); }

  protected draw() {
    const g = this.g, P = this.ctx.palette, b = this.box;
    g.fillStyle = "#fff"; g.fillRect(b.x0, b.y0, b.size, b.size);
    for (let i = -SPAN; i <= SPAN; i++) {
      const c = i === 0 ? P.primary : i % 5 === 0 ? "#d6dbd3" : "#eef1ec";
      this.line(this.sx(i), b.y0, this.sx(i), b.y0 + b.size, c, i === 0 ? 1.6 : 1);
      this.line(b.x0, this.sy(i), b.x0 + b.size, this.sy(i), c, i === 0 ? 1.6 : 1);
      if (i % 2 === 0 && i !== 0) { this.text(String(i).replace("-", "−"), this.sx(i), this.sy(0) + 12, P.muted, "center", 11); this.text(String(i).replace("-", "−"), this.sx(0) - 8, this.sy(i), P.muted, "right", 11); }
    }
    this.text("x", b.x0 + b.size - 6, this.sy(0) - 12, P.primary, "right", 13, 600);
    this.text("y", this.sx(0) + 10, b.y0 + 10, P.primary, "left", 13, 600);
    // the curve, clipped to the grid
    g.save(); g.beginPath(); g.rect(b.x0, b.y0, b.size, b.size); g.clip();
    g.strokeStyle = P.lab; g.lineWidth = 3; g.lineJoin = "round"; g.beginPath();
    const n = Math.round(b.size * 1.5);
    for (let i = 0; i <= n; i++) { const x = -SPAN + 2 * SPAN * i / n, y = this.f(x); i ? g.lineTo(this.sx(x), this.sy(y)) : g.moveTo(this.sx(x), this.sy(y)); }
    g.stroke();
    // y-intercept, roots and the turning point as dots
    this.circle(this.sx(0), this.sy(this.f(0)), 5, P.accent, "#fff", 2);
    for (let i = 0; i < n; i++) {
      const x1 = -SPAN + 2 * SPAN * i / n, x2 = -SPAN + 2 * SPAN * (i + 1) / n, y1 = this.f(x1), y2 = this.f(x2);
      if (y1 === 0 || y1 * y2 < 0) { const x = y1 === 0 ? x1 : x1 - y1 * (x2 - x1) / (y2 - y1); this.circle(this.sx(x), this.sy(0), 5, P.primary, "#fff", 2); }
    }
    if (this.p.family === "quadratic" && this.num("a") !== 0) { const vx = -this.num("b") / (2 * this.num("a")); this.circle(this.sx(vx), this.sy(this.f(vx)), 6, "#fff", P.lab, 3); }
    if (this.hover !== null && Math.abs(this.hover) <= SPAN) {
      const x = this.hover, y = this.f(x);
      this.line(this.sx(x), b.y0, this.sx(x), b.y0 + b.size, P.muted, 1, [4, 4]);
      if (Math.abs(y) <= SPAN) { this.circle(this.sx(x), this.sy(y), 4.5, P.lab); this.text(`(${fmt(x, 1)}, ${fmt(y, 2)})`, this.sx(x) + 8, this.sy(y) - 14, P.text, "left", 12, 600); }
    }
    g.restore();
    g.strokeStyle = P.line; g.lineWidth = 1; g.strokeRect(b.x0, b.y0, b.size, b.size);
  }

  protected observe() {
    const r = analyzeGraph(this.p.family as Family, this.num("a"), this.num("b"), this.num("c"));
    return { equation: r.equation, y_intercept: r.y_intercept, roots: r.roots, turning: r.turning };
  }

  describe() { const r = this.observe(); return `Graph of ${r.equation}. It crosses the y-axis at ${fmt(Number(r.y_intercept))} and the x-axis at ${r.roots}.`; }
}

export default () => new Graphing();
