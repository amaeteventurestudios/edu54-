/** Globe and coordinates: an orthographic globe with a 15° grid, two places A and B, and the shortest route between them
 *  (a great circle; the part on the far side is dashed). Drag or use the arrow keys to turn the globe; tap the globe to
 *  move B there. Coastlines are not drawn: the grid is the map. */
import { CanvasModule } from "../engine.ts";
import { fmt, greatCircle } from "../science.ts";

const D = Math.PI / 180;
type V3 = [number, number, number];

const toVec = (lat: number, lon: number): V3 => [Math.cos(lat * D) * Math.cos(lon * D), Math.cos(lat * D) * Math.sin(lon * D), Math.sin(lat * D)];
const snap = (v: number) => Math.round(v * 2) / 2;

class Globe extends CanvasModule {
  private viewLat = 20;
  private viewLon = 0;
  private drag: { x: number; y: number; lat: number; lon: number; moved: boolean } | null = null;

  private geo() { const r = Math.min(this.w, this.h - 40) / 2 - 12; return { cx: this.w / 2, cy: (this.h - 30) / 2 + 4, r }; }

  /** Rotate a point on the sphere into view space: x right, y up, z towards the viewer. */
  private view([x, y, z]: V3): V3 {
    const l = -this.viewLon * D, p = this.viewLat * D;
    const x1 = x * Math.cos(l) - y * Math.sin(l), y1 = x * Math.sin(l) + y * Math.cos(l);
    return [y1, z * Math.cos(p) - x1 * Math.sin(p), x1 * Math.cos(p) + z * Math.sin(p)];
  }
  private screen(v: V3) { const o = this.geo(); return [o.cx + v[0] * o.r, o.cy - v[1] * o.r, v[2]] as const; }

  /** The latitude and longitude under a screen point, or null off the globe. */
  private pick(sx: number, sy: number) {
    const o = this.geo(), x = (sx - o.cx) / o.r, y = (o.cy - sy) / o.r, d = x * x + y * y;
    if (d > 1) return null;
    const z = Math.sqrt(1 - d), p = this.viewLat * D, l = this.viewLon * D;
    const x1 = z * Math.cos(p) - y * Math.sin(p), zz = z * Math.sin(p) + y * Math.cos(p), y1 = x;
    const gx = x1 * Math.cos(l) - y1 * Math.sin(l), gy = x1 * Math.sin(l) + y1 * Math.cos(l);
    return { lat: Math.asin(Math.max(-1, Math.min(1, zz))) / D, lon: Math.atan2(gy, gx) / D };
  }

  protected init() {
    this.el.tabIndex = 0;
    this.viewLat = Math.max(-60, Math.min(60, (this.num("lat1") + this.num("lat2")) / 2));
    this.viewLon = this.num("lon1") + ((((this.num("lon2") - this.num("lon1")) % 360) + 540) % 360 - 180) / 2;
    const at = (e: PointerEvent) => { const r = this.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };
    this.listen(this.canvas, "pointerdown", (e) => { const [x, y] = at(e); this.drag = { x, y, lat: this.viewLat, lon: this.viewLon, moved: false }; this.canvas.setPointerCapture(e.pointerId); });
    this.listen(this.canvas, "pointermove", (e) => {
      if (!this.drag) return;
      const [x, y] = at(e), k = 180 / Math.PI / this.geo().r;
      if (Math.hypot(x - this.drag.x, y - this.drag.y) > 4) this.drag.moved = true;
      this.viewLon = this.drag.lon - (x - this.drag.x) * k;
      this.viewLat = Math.max(-85, Math.min(85, this.drag.lat + (y - this.drag.y) * k));
      this.redraw();
    });
    this.listen(this.canvas, "pointerup", (e) => {
      const d = this.drag; this.drag = null;
      if (!d || d.moved) return;
      const [x, y] = at(e), hit = this.pick(x, y);
      if (hit) { this.p.lat2 = snap(hit.lat); this.p.lon2 = snap(((hit.lon + 540) % 360) - 180); this.redraw(); this.ctx.onChange(); }
    });
    this.listen(this.el, "keydown", (e) => {
      const m: Record<string, [number, number]> = { ArrowLeft: [0, -10], ArrowRight: [0, 10], ArrowUp: [10, 0], ArrowDown: [-10, 0] };
      const d = m[e.key]; if (!d) return;
      e.preventDefault(); this.viewLat = Math.max(-85, Math.min(85, this.viewLat + d[0])); this.viewLon += d[1]; this.redraw();
    });
  }

  /** Draw a path of sphere points, solid on the near side and dashed on the far side. */
  private path(pts: V3[], color: string, width: number, back: boolean) {
    const g = this.g;
    g.save(); g.strokeStyle = color; g.lineWidth = width; g.setLineDash(back ? [3, 5] : []);
    g.beginPath();
    let pen = false;
    for (const p of pts) {
      const [x, y, z] = this.screen(this.view(p));
      if ((z >= 0) !== back) { pen ? g.lineTo(x, y) : g.moveTo(x, y); pen = true; } else pen = false;
    }
    g.stroke(); g.restore();
  }

  protected draw() {
    const g = this.g, P = this.ctx.palette, o = this.geo();
    const sea = g.createRadialGradient(o.cx - o.r * 0.35, o.cy - o.r * 0.35, o.r * 0.1, o.cx, o.cy, o.r);
    sea.addColorStop(0, "#5aa7d6"); sea.addColorStop(1, "#1d5f8f");
    this.circle(o.cx, o.cy, o.r, undefined); g.fillStyle = sea; g.fill();
    // grid: parallels and meridians every 15°, equator and prime meridian stronger
    for (let lat = -75; lat <= 75; lat += 15) {
      const pts: V3[] = []; for (let lon = -180; lon <= 180; lon += 3) pts.push(toVec(lat, lon));
      this.path(pts, lat === 0 ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.3)", lat === 0 ? 1.6 : 1, false);
    }
    for (let lon = -180; lon < 180; lon += 15) {
      const pts: V3[] = []; for (let lat = -90; lat <= 90; lat += 3) pts.push(toVec(lat, lon));
      this.path(pts, lon === 0 ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.3)", lon === 0 ? 1.6 : 1, false);
    }
    this.circle(o.cx, o.cy, o.r, undefined, "rgba(0,0,0,.25)", 1.5);
    // the great circle from A to B (slerp)
    const a = toVec(this.num("lat1"), this.num("lon1")), b = toVec(this.num("lat2"), this.num("lon2"));
    const om = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))), route: V3[] = [];
    for (let i = 0; i <= 120; i++) {
      const t = i / 120, s = Math.sin(om);
      const k1 = s < 1e-6 ? 1 - t : Math.sin((1 - t) * om) / s, k2 = s < 1e-6 ? t : Math.sin(t * om) / s;
      route.push([a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2]);
    }
    this.path(route, "rgba(242,201,76,.75)", 2.5, true);
    this.path(route, P.accent, 3.5, false);
    for (const [v, label, fill] of [[a, "A", "#fff"], [b, "B", P.accent]] as const) {
      const [x, y, z] = this.screen(this.view(v));
      if (z < 0) continue;
      this.circle(x, y, 7, fill, P.primary, 2.5);
      this.text(label, x + 11, y - 11, "#fff", "left", 13, 800);
    }
    const q = greatCircle(this.num("lat1"), this.num("lon1"), this.num("lat2"), this.num("lon2"));
    const ll = (lat: number, lon: number) => `${fmt(Math.abs(lat), 1)}°${lat >= 0 ? "N" : "S"} ${fmt(Math.abs(lon), 1)}°${lon >= 0 ? "E" : "W"}`;
    this.text(`A ${ll(this.num("lat1"), this.num("lon1"))}  →  B ${ll(this.num("lat2"), this.num("lon2"))}`, this.w / 2, this.h - 22, P.text, "center", 12, 700);
    this.text(`${fmt(q.distance, 0)} km · heading ${fmt(q.bearing, 0)}° · drag to turn, tap to move B`, this.w / 2, this.h - 6, P.muted, "center", 11);
  }

  protected observe() { const q = greatCircle(this.num("lat1"), this.num("lon1"), this.num("lat2"), this.num("lon2")); return { distance: q.distance, bearing: q.bearing, sun_time: q.sun_time }; }
  describe() { const q = greatCircle(this.num("lat1"), this.num("lon1"), this.num("lat2"), this.num("lon2")); return `A globe with point A at latitude ${this.p.lat1}, longitude ${this.p.lon1} and point B at latitude ${this.p.lat2}, longitude ${this.p.lon2}. The shortest route is ${fmt(q.distance, 0)} kilometres, setting off at ${fmt(q.bearing, 0)} degrees.`; }
}

export default () => new Globe();
