/** 3D solids: a shaded cube, cylinder, cone or sphere you can turn (drag, arrow keys) and zoom (wheel, + and −). Volume and
 *  surface area come from science.ts; the picture is drawn with a small painter's-algorithm renderer, no 3D library. */
import { CanvasModule } from "../engine.ts";
import { fmt, solid, type Shape } from "../science.ts";

type V3 = [number, number, number];
type Face = V3[];

function mesh(shape: Shape, l: number, w: number, h: number, r: number): Face[] {
  const faces: Face[] = [];
  if (shape === "cuboid") {
    const [x, y, z] = [l / 2, h / 2, w / 2];
    const c = (sx: number, sy: number, sz: number): V3 => [sx * x, sy * y, sz * z];
    faces.push([c(-1, -1, 1), c(1, -1, 1), c(1, 1, 1), c(-1, 1, 1)], [c(1, -1, -1), c(-1, -1, -1), c(-1, 1, -1), c(1, 1, -1)],
      [c(1, -1, 1), c(1, -1, -1), c(1, 1, -1), c(1, 1, 1)], [c(-1, -1, -1), c(-1, -1, 1), c(-1, 1, 1), c(-1, 1, -1)],
      [c(-1, 1, 1), c(1, 1, 1), c(1, 1, -1), c(-1, 1, -1)], [c(-1, -1, -1), c(1, -1, -1), c(1, -1, 1), c(-1, -1, 1)]);
    return faces;
  }
  const N = 40;
  const ring = (y: number, rad: number) => Array.from({ length: N }, (_, i): V3 => [rad * Math.cos(2 * Math.PI * i / N), y, rad * Math.sin(2 * Math.PI * i / N)]);
  if (shape === "cylinder" || shape === "cone") {
    const bottom = ring(-h / 2, r), top = shape === "cylinder" ? ring(h / 2, r) : null, apex: V3 = [0, h / 2, 0];
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      faces.push(top ? [bottom[i], bottom[j], top[j], top[i]] : [bottom[i], bottom[j], apex]);
    }
    faces.push([...bottom].reverse());
    if (top) faces.push(top);
    return faces;
  }
  const LAT = 14, LON = 28;
  const pt = (a: number, b: number): V3 => { const t = Math.PI * a / LAT, p = 2 * Math.PI * b / LON; return [r * Math.sin(t) * Math.cos(p), r * Math.cos(t), r * Math.sin(t) * Math.sin(p)]; };
  for (let a = 0; a < LAT; a++) for (let b = 0; b < LON; b++) faces.push([pt(a, b), pt(a + 1, b), pt(a + 1, b + 1), pt(a, b + 1)]);
  return faces;
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16), f = (c: number) => Math.round(Math.min(255, c * k + (255 - c) * Math.max(0, k - 1)));
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

class Solids extends CanvasModule {
  private yaw = -0.6;
  private pitch = 0.42;
  private zoom = 1;
  private drag: { x: number; y: number } | null = null;

  protected init() {
    this.el.tabIndex = 0;
    this.listen(this.canvas, "pointerdown", (e) => { this.drag = { x: e.clientX, y: e.clientY }; this.canvas.setPointerCapture(e.pointerId); });
    this.listen(this.canvas, "pointermove", (e) => {
      if (!this.drag) return;
      this.yaw += (e.clientX - this.drag.x) * 0.01; this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch + (e.clientY - this.drag.y) * 0.01));
      this.drag = { x: e.clientX, y: e.clientY }; this.redraw();
    });
    this.listen(this.canvas, "pointerup", () => { this.drag = null; });
    this.listen(this.canvas, "wheel", (e) => { e.preventDefault(); this.zoom = Math.max(0.5, Math.min(2.2, this.zoom * (e.deltaY < 0 ? 1.08 : 0.93))); this.redraw(); }, { passive: false });
    this.listen(this.el, "keydown", (e) => {
      const k = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.15], ArrowDown: [0, 0.15] }[e.key];
      if (k) { e.preventDefault(); this.yaw += k[0]; this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch + k[1])); this.redraw(); }
      if (e.key === "+" || e.key === "=") { this.zoom = Math.min(2.2, this.zoom * 1.1); this.redraw(); }
      if (e.key === "-") { this.zoom = Math.max(0.5, this.zoom / 1.1); this.redraw(); }
    });
  }

  private dims() { return { length: this.num("length"), width: this.num("width"), height: this.num("height"), radius: this.num("radius") }; }

  protected draw() {
    const g = this.g, P = this.ctx.palette, d = this.dims(), shape = this.p.shape as Shape;
    const faces = mesh(shape, d.length, d.width, d.height, d.radius);
    const cy = Math.cos(this.yaw), syw = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const rot = ([x, y, z]: V3): V3 => { const x1 = x * cy - z * syw, z1 = x * syw + z * cy; return [x1, y * cp - z1 * sp, y * sp + z1 * cp]; };
    // fixed scale: 10 cm always fills the same space, so changing a size really looks bigger or smaller
    const scale = Math.min(this.w, this.h) / 22 * this.zoom, cam = 40;
    const proj = ([x, y, z]: V3) => { const k = cam / (cam + z); return [this.w / 2 + x * scale * k, this.h / 2 - y * scale * k] as const; };
    // floor grid for a sense of size (1 cm squares)
    const floorY = -(shape === "sphere" ? d.radius : d.height / 2);
    for (let i = -6; i <= 6; i++) {
      const a = proj(rot([i, floorY, -6])), b = proj(rot([i, floorY, 6])), c = proj(rot([-6, floorY, i])), e = proj(rot([6, floorY, i]));
      this.line(a[0], a[1], b[0], b[1], "#e7ebe4", 1); this.line(c[0], c[1], e[0], e[1], "#e7ebe4", 1);
    }
    const light: V3 = [0.4, 0.75, -0.55];
    const drawn = faces.map((f) => {
      const r = f.map(rot), n = cross(sub(r[1], r[0]), sub(r[2], r[0])), len = Math.hypot(...n) || 1;
      const lambert = Math.abs(n[0] * light[0] + n[1] * light[1] + n[2] * light[2]) / len;
      return { r, depth: r.reduce((s, v) => s + v[2], 0) / r.length, k: 0.55 + 0.6 * lambert };
    }).sort((a, b) => b.depth - a.depth);       // far faces first (painter's algorithm; every solid here is convex)
    for (const f of drawn) {
      g.beginPath(); f.r.forEach((v, i) => { const [x, y] = proj(v); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath();
      g.fillStyle = shade(P.lab, f.k); g.fill();
      g.strokeStyle = shape === "cuboid" ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.12)"; g.lineWidth = shape === "cuboid" ? 1.5 : 0.6; g.stroke();
    }
    this.text("Drag to turn · scroll or + − to zoom · grid squares are 1 cm", this.w / 2, this.h - 16, P.muted, "center", 12);
  }

  protected observe() { const s = solid(this.p.shape as Shape, this.dims()); return { volume: s.volume, surface_area: s.surface_area, formula: s.formula }; }
  describe() { const s = this.observe(); return `A ${this.p.shape} with volume ${fmt(Number(s.volume), 1)} cubic centimetres and surface area ${fmt(Number(s.surface_area), 1)} square centimetres.`; }
}

export default () => new Solids();
