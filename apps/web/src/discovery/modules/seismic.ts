/** Earthquake waves: P and S wave fronts spread from the earthquake to a seismograph station, and the station's trace
 *  records them. The arrival times are calculated; the wiggles are an illustration. Long waits play faster, and say so. */
import { CanvasModule } from "../engine.ts";
import { fmt, seismic } from "../science.ts";

const PLAY_SECONDS = 6;

// a fixed, repeatable "noise" so the trace looks the same every time
const wiggle = (t: number) => Math.sin(t * 7.3) * 0.5 + Math.sin(t * 13.1 + 1) * 0.3 + Math.sin(t * 29.7 + 2) * 0.2;

class Seismic extends CanvasModule {
  private t = 0;

  private q() { return seismic(this.num("distance"), this.num("p_speed"), this.num("s_speed")); }
  private get end() { return this.q().s_arrival * 1.35; }
  protected onReset() { this.t = 0; }
  protected onParam() { if (!this.running) this.t = 0; }
  protected play() { if (this.t >= this.end) this.t = 0; super.play(); }
  protected step(dt: number) { this.t = Math.min(this.end, this.t + dt * this.end / PLAY_SECONDS); if (this.t >= this.end) this.stop(); }

  private amp(t: number) {
    const q = this.q();
    let a = 0.04 * wiggle(t * 3);
    if (t >= q.p_arrival) a += 0.35 * Math.exp(-(t - q.p_arrival) / 6) * Math.sin((t - q.p_arrival) * 9);
    if (t >= q.s_arrival) a += 0.9 * Math.exp(-(t - q.s_arrival) / 9) * Math.sin((t - q.s_arrival) * 5.5) * (0.8 + 0.2 * wiggle(t));
    return Math.max(-1, Math.min(1, a));
  }

  protected draw() {
    const g = this.g, P = this.ctx.palette, q = this.q(), d = this.num("distance");
    // the ground: earthquake on the left, station on the right
    const mapH = this.h * 0.42, x0 = 40, x1 = this.w - 50, y = mapH * 0.62;
    g.fillStyle = "#efe6d6"; g.fillRect(0, 0, this.w, mapH);
    g.fillStyle = "#d9c7a6"; g.fillRect(0, y + 10, this.w, mapH - y - 10);
    const kmPx = (x1 - x0) / d;
    g.save(); g.beginPath(); g.rect(0, 0, this.w, mapH); g.clip();
    const front = (speed: number, color: string, label: string) => {
      const r = this.t * speed * kmPx;
      if (r <= 0) return;
      this.circle(x0, y, r, undefined, color, 2.5);
      if (r < x1 - x0 + 60) this.text(label, x0 + r * 0.72, y - r * 0.69 - 8, color, "center", 11, 700);
    };
    front(this.num("p_speed"), "#1D4E89", "P"); front(this.num("s_speed"), "#C2462B", "S");
    g.restore();
    // star and station
    g.fillStyle = "#C2462B"; g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 5 : 12; g.lineTo(x0 + r * Math.cos(a), y + r * Math.sin(a)); }
    g.fill();
    g.fillStyle = P.primary; g.fillRect(x1 - 10, y - 18, 20, 18); this.line(x1, y - 18, x1, y - 30, P.primary, 2);
    this.text("Earthquake", x0, y + 26, P.text, "center", 11, 700); this.text("Station", x1, y + 26, P.text, "center", 11, 700);
    this.line(x0 + 16, 18, x1 - 16, 18, P.muted, 1.2); this.text(`${fmt(d, 0)} km`, (x0 + x1) / 2, 10, P.text, "center", 12, 700);
    // the seismogram
    const top = mapH + 22, bot = this.h - 30, mid = (top + bot) / 2, X = (t: number) => 40 + t / this.end * (this.w - 70);
    g.fillStyle = "#fff"; g.fillRect(30, top - 8, this.w - 50, bot - top + 16);
    for (let s = 0; s <= this.end; s += this.end > 120 ? 30 : this.end > 40 ? 10 : 5) { this.line(X(s), top, X(s), bot, "#f0f0f0", 1); this.text(`${fmt(s, 0)} s`, X(s), bot + 14, P.muted, "center", 10); }
    g.strokeStyle = P.text; g.lineWidth = 1.4; g.beginPath();
    const n = Math.round(this.w * 1.2);
    for (let i = 0; i <= n; i++) { const t = this.t * i / n; const yy = mid - this.amp(t) * (bot - top) / 2.2; i ? g.lineTo(X(t), yy) : g.moveTo(X(t), yy); }
    g.stroke();
    const mark = (t: number, color: string, label: string) => { if (this.t >= t) { this.line(X(t), top, X(t), bot, color, 1.5, [4, 4]); this.text(label, X(t) + 4, top + 6, color, "left", 11, 700); } };
    mark(q.p_arrival, "#1D4E89", `P at ${fmt(q.p_arrival, 1)} s`); mark(q.s_arrival, "#C2462B", `S at ${fmt(q.s_arrival, 1)} s`);
    if (this.t >= q.s_arrival) {
      this.line(X(q.p_arrival), bot - 10, X(q.s_arrival), bot - 10, P.primary, 2);
      this.text(`gap ${fmt(q.lag, 1)} s`, (X(q.p_arrival) + X(q.s_arrival)) / 2, bot - 20, P.primary, "center", 12, 700);
    }
    this.text(`Seismograph · playing ${fmt(this.end / PLAY_SECONDS, 0)}× faster than real time`, 36, top - 16, P.muted, "left", 11);
  }

  protected observe() { const q = this.q(); return { p_arrival: q.p_arrival, s_arrival: q.s_arrival, lag: q.lag }; }
  describe() { const q = this.q(); return `An earthquake ${this.p.distance} kilometres away. The P wave arrives after ${fmt(q.p_arrival, 1)} seconds and the S wave after ${fmt(q.s_arrival, 1)} seconds, a gap of ${fmt(q.lag, 1)} seconds.`; }
}

export default () => new Seismic();
