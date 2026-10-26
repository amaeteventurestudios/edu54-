/** Projectile motion: exact path with no air resistance, drawn to scale (same metres across and up). Long flights on the
 *  Moon play faster than real time, and the picture says so. The last three throws stay on screen to compare. */
import { CanvasModule, niceStep } from "../engine.ts";
import { fmt, GRAVITY, projectile } from "../science.ts";

const MAX_PLAY_S = 5;

class Projectile extends CanvasModule {
  private t = 0;
  private trails: { pts: [number, number][]; label: string }[] = [];

  private shot() { return projectile(this.num("speed"), this.num("angle"), this.num("height"), GRAVITY[String(this.p.gravity)] ?? 9.81); }
  private get speedup() { return Math.max(1, this.shot().flight_time / MAX_PLAY_S); }

  protected onParam() { if (!this.running) this.t = 0; }
  protected onReset() { this.t = 0; this.trails = []; }

  protected step(dt: number) {
    const s = this.shot();
    this.t = Math.min(s.flight_time, this.t + dt * this.speedup);
    if (this.t >= s.flight_time) {
      const pts: [number, number][] = Array.from({ length: 61 }, (_, i) => { const q = s.at(s.flight_time * i / 60); return [q.x, q.y]; });
      this.trails = [...this.trails, { pts, label: `${this.p.angle}° at ${this.p.speed} m/s` }].slice(-3);
      this.stop();
    }
  }

  protected play() { if (this.t >= this.shot().flight_time) this.t = 0; super.play(); }

  protected draw() {
    const g = this.g, P = this.ctx.palette, s = this.shot();
    const worldW = Math.max(10, s.range, ...this.trails.map((tr) => tr.pts.at(-1)![0])) * 1.08;
    const worldH = Math.max(5, s.max_height, ...this.trails.flatMap((tr) => tr.pts.map((p) => p[1]))) * 1.15;
    const pad = { l: 46, r: 18, t: 18, b: 40 };
    const k = Math.min((this.w - pad.l - pad.r) / worldW, (this.h - pad.t - pad.b) / worldH);
    const X = (x: number) => pad.l + x * k, Y = (y: number) => this.h - pad.b - y * k;
    // sky and ground
    g.fillStyle = "#f6f9fc"; g.fillRect(0, 0, this.w, this.h - pad.b);
    g.fillStyle = "#e4ecd9"; g.fillRect(0, this.h - pad.b, this.w, pad.b);
    const step = niceStep(worldW);
    for (let x = 0; x <= worldW; x += step) { this.line(X(x), this.h - pad.b, X(x), this.h - pad.b + 5, P.muted, 1); this.text(`${fmt(x, 1)} m`, X(x), this.h - pad.b + 16, P.muted, "center", 11); }
    const hs = niceStep(worldH, 4);
    for (let y = hs; y <= worldH; y += hs) { this.line(pad.l - 4, Y(y), this.w - pad.r, Y(y), "#e6ebf0", 1); this.text(`${fmt(y, 1)} m`, pad.l - 8, Y(y), P.muted, "right", 11); }
    // launch platform
    if (this.num("height") > 0) { g.fillStyle = "#c9b48a"; g.fillRect(X(0) - 14, Y(this.num("height")), 14, this.num("height") * k); }
    // earlier throws
    this.trails.forEach((tr, i) => {
      g.save(); g.globalAlpha = 0.25 + 0.15 * i; g.strokeStyle = P.muted; g.lineWidth = 2; g.beginPath();
      tr.pts.forEach(([x, y], j) => (j ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke(); g.restore();
      const [lx, ly] = tr.pts[30]; this.text(tr.label, X(lx), Y(ly) - 10, P.muted, "center", 11);
    });
    // predicted path (dashed) and the path so far
    g.save(); g.setLineDash([6, 6]); g.strokeStyle = P.lab; g.globalAlpha = 0.45; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= 80; i++) { const q = s.at(s.flight_time * i / 80); i ? g.lineTo(X(q.x), Y(q.y)) : g.moveTo(X(q.x), Y(q.y)); }
    g.stroke(); g.restore();
    if (this.t > 0) {
      g.strokeStyle = P.lab; g.lineWidth = 3; g.beginPath();
      for (let i = 0; i <= 60; i++) { const q = s.at(this.t * i / 60); i ? g.lineTo(X(q.x), Y(q.y)) : g.moveTo(X(q.x), Y(q.y)); }
      g.stroke();
    }
    // highest point marker
    const tp = Math.max(0, s.vy / (GRAVITY[String(this.p.gravity)] ?? 9.81)), top = s.at(tp);
    this.line(X(top.x), Y(top.y), X(top.x), Y(0), P.accent, 1.2, [3, 4]);
    this.text(`highest ${fmt(s.max_height, 1)} m`, X(top.x) + 6, Y(top.y) - 10, P.text, "left", 11, 600);
    // launch direction arrow and the ball
    const a = this.num("angle") * Math.PI / 180, ox = X(0), oy = Y(this.num("height"));
    this.line(ox, oy, ox + 34 * Math.cos(a), oy - 34 * Math.sin(a), P.primary, 3);
    const b = s.at(this.t);
    this.circle(X(b.x), Y(b.y), 7, P.accent, P.primary, 2);
    if (this.speedup > 1.05) this.text(`Playing ${fmt(this.speedup, 1)}× faster than real time`, this.w - pad.r, pad.t, P.muted, "right", 12);
    if (this.t >= s.flight_time && s.flight_time > 0) this.text(`Landed at ${fmt(s.range, 1)} m`, X(s.range), Y(0) - 16, P.primary, "center", 12, 700);
  }

  protected observe() { const s = this.shot(); return { flight_time: s.flight_time, range: s.range, max_height: s.max_height, t: this.t }; }
  describe() { const s = this.shot(); return `A ball launched at ${this.p.speed} metres per second and ${this.p.angle} degrees lands ${fmt(s.range, 1)} metres away after ${fmt(s.flight_time, 2)} seconds.`; }
}

export default () => new Projectile();
