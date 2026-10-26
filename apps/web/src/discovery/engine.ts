/** Discovery Lab experiment contract (docs/discovery-lab §05): one shell, many swappable experiments. Every module has the
 *  same six functions, and the shell only ever hands it actions that pass `validate` against the catalog entry, so nothing
 *  (a click, a keyboard shortcut or, later, an AI Guide suggestion the student confirms) can push an experiment outside the
 *  values it declares. */

export type Value = number | string;
export type Params = Record<string, Value>;

export interface ParamSpec { key: string; label: string; unit?: string; type?: "choice"; min?: number; max?: number; step?: number; default: Value;
  options?: { value: string; label: string }[]; for?: Record<string, string[]> }
export interface ObservationSpec { key: string; label: string; unit?: string; digits?: number }
export interface ActionSpec { type: string; min?: number; max?: number }
export interface Experience {
  id: string; labId: string; collectionId: string; topicId: string; status: "working" | "prototype" | "planned"; module?: string;
  title: string; modality: "2d" | "3d"; ages: string; summary: string; keywords?: string[]; depths?: string[];
  model?: "calculation" | "simulation" | "illustration"; assumptions?: string; safety?: string; review?: string;
  params?: ParamSpec[]; observations?: ObservationSpec[]; actions?: ActionSpec[]; playable?: boolean;
  guide?: { explore: string; learn: string; steps: string[]; advanced: string }; suggestions?: string[];
  source?: { kind: string; license: string }; offline?: boolean;
}
export interface Topic { id: string; name: string; keywords?: string[] }
export interface Collection { id: string; name: string; topics: Topic[] }
export interface Lab { id: string; name: string; icon: string; color: string; blurb: string; collections: Collection[] }
export interface Journey { id: string; title: string; summary: string; steps: string[] }
export interface Catalog { version: number; labs: Lab[]; experiences: Experience[]; journeys: Journey[] }

export type Action = { type: "set"; key: string; value: Value } | { type: "play" } | { type: "pause" } | { type: "reset" } | { type: string; value?: Value; key?: string };

export interface Palette { primary: string; accent: string; text: string; muted: string; line: string; paper: string; lab: string }
export interface ModuleContext { params: Params; reducedMotion: boolean; lowPower: boolean; palette: Palette; onChange: () => void }
export interface ModuleState { params: Params; observations: Record<string, Value>; running: boolean }

export interface ExperimentModule {
  mount(el: HTMLElement, ctx: ModuleContext): void;
  getState(): ModuleState;
  applyAction(a: Action): void;
  reset(): void;
  pause(): void;
  dispose(): void;
  /** One or two sentences a screen reader can read instead of the picture. */
  describe(): string;
  /** Low-power mode changed: fewer particles, fewer frames. */
  setLowPower?(on: boolean): void;
}

export const defaults = (e: Experience): Params => Object.fromEntries((e.params ?? []).map((p) => [p.key, p.default]));

/** A control is shown when its `for` conditions match the current choices (radius only for round shapes, and so on). */
export const visible = (p: ParamSpec, params: Params) => !p.for || Object.entries(p.for).every(([k, vals]) => vals.includes(String(params[k])));

/** The only gate into a module: returns the action, cleaned (numbers clamped and snapped to the slider step), or null. */
export function validate(e: Experience, a: Action, params: Params): Action | null {
  if (a.type === "set") {
    const p = (e.params ?? []).find((x) => x.key === a.key);
    if (!p || !visible(p, params)) return null;
    if (p.type === "choice") return typeof a.value === "string" && p.options!.some((o) => o.value === a.value) ? { type: "set", key: p.key, value: a.value } : null;
    const v = Number(a.value);
    if (!Number.isFinite(v)) return null;
    const step = p.step ?? 1, clamped = Math.min(p.max!, Math.max(p.min!, v));
    const snapped = Math.round((clamped - p.min!) / step) * step + p.min!;
    return { type: "set", key: p.key, value: Number(snapped.toFixed(6)) };
  }
  if (a.type === "reset") return a;
  if (a.type === "play" || a.type === "pause") return e.playable ? a : null;
  const spec = (e.actions ?? []).find((x) => x.type === a.type);
  if (!spec) return null;
  if (spec.min !== undefined || spec.max !== undefined) {
    const v = Number((a as { value?: Value }).value);
    if (!Number.isFinite(v) || v < (spec.min ?? -Infinity) || v > (spec.max ?? Infinity)) return null;
    return { type: a.type, value: Math.round(v) };
  }
  return { type: a.type };
}

export function palette(labColor: string): Palette {
  const cs = typeof window === "undefined" ? null : getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => cs?.getPropertyValue(name).trim() || fallback;
  return { primary: v("--primary", "#0F4D3A"), accent: v("--brand-accent", "#D9A520"), text: v("--foreground", "#1B1B1B"), muted: v("--muted-foreground", "#556070"),
    line: v("--border", "#ece9e4"), paper: "#ffffff", lab: labColor };
}

/** Shared plumbing for canvas experiments: a crisp canvas that follows its box, a frame loop that runs only while playing,
 *  and clean-up of every listener on dispose. Subclasses draw, step time forward and report their readings. */
export abstract class CanvasModule implements ExperimentModule {
  protected el!: HTMLElement;
  protected canvas!: HTMLCanvasElement;
  protected g!: CanvasRenderingContext2D;
  protected ctx!: ModuleContext;
  protected p: Params = {};
  protected running = false;
  protected w = 0;
  protected h = 0;
  private raf = 0;
  private last = 0;
  private skip = false;
  private lastNotify = 0;
  private ro?: ResizeObserver;
  private off: (() => void)[] = [];

  mount(el: HTMLElement, ctx: ModuleContext) {
    this.el = el; this.ctx = ctx; this.p = { ...ctx.params };
    this.canvas = document.createElement("canvas");
    this.canvas.className = "block h-full w-full touch-none select-none";
    this.canvas.setAttribute("aria-hidden", "true");
    el.appendChild(this.canvas);
    this.g = this.canvas.getContext("2d")!;
    this.init();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(el);
    this.resize();
  }

  protected init() {}
  protected abstract draw(): void;
  protected step(_dt: number) {}
  protected abstract observe(): Record<string, Value>;
  abstract describe(): string;
  protected onParam(_key: string) {}
  protected onReset() {}
  protected custom(_a: Action) {}

  protected listen<K extends keyof HTMLElementEventMap>(target: HTMLElement | Window, type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions) {
    target.addEventListener(type, fn as EventListener, opts);
    this.off.push(() => target.removeEventListener(type, fn as EventListener, opts));
  }

  private resize() {
    const r = this.el.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, this.ctx.lowPower ? 1 : 2);
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.redraw();
  }

  protected redraw() {
    if (this.running) return;                    // the frame loop draws
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => { this.g.clearRect(0, 0, this.w, this.h); this.draw(); });
  }

  private frame = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    if (this.ctx.lowPower && (this.skip = !this.skip)) return;          // about 30 frames a second in low-power mode
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0;
    this.last = now;
    this.step(dt);
    this.g.clearRect(0, 0, this.w, this.h);
    this.draw();
    if (now - this.lastNotify > 120) { this.lastNotify = now; this.ctx.onChange(); }
  };

  protected play() {
    if (this.running) return;
    this.running = true; this.last = 0;
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.frame);
  }

  /** Called by a subclass when its run has finished on its own (the ball has landed, the list is sorted). */
  protected stop() { this.running = false; cancelAnimationFrame(this.raf); this.redraw(); this.ctx.onChange(); }

  getState() { return { params: { ...this.p }, observations: this.observe(), running: this.running }; }

  applyAction(a: Action) {
    if (a.type === "set" && "key" in a && a.key !== undefined && a.value !== undefined) { this.p[a.key] = a.value; this.onParam(a.key); }
    else if (a.type === "play") this.play();
    else if (a.type === "pause") return this.pause();
    else if (a.type === "reset") return this.reset();
    else this.custom(a);
    this.redraw();
    this.ctx.onChange();
  }

  reset() { this.running = false; cancelAnimationFrame(this.raf); this.onReset(); this.redraw(); this.ctx.onChange(); }
  pause() { if (!this.running) return; this.running = false; cancelAnimationFrame(this.raf); this.redraw(); this.ctx.onChange(); }
  setLowPower(on: boolean) { this.ctx = { ...this.ctx, lowPower: on }; this.resize(); }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.off.forEach((f) => f());
    this.canvas.remove();
  }

  // ---- small drawing helpers ------------------------------------------------------------------------------------------
  protected font(px: number, weight = 500) { this.g.font = `${weight} ${px}px "Inter Variable", system-ui, sans-serif`; }
  protected text(s: string, x: number, y: number, color = this.ctx.palette.text, align: CanvasTextAlign = "left", px = 13, weight = 500) {
    this.font(px, weight); this.g.fillStyle = color; this.g.textAlign = align; this.g.textBaseline = "middle"; this.g.fillText(s, x, y);
  }
  protected line(x1: number, y1: number, x2: number, y2: number, color: string, width = 1.5, dash: number[] = []) {
    const g = this.g; g.save(); g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.restore();
  }
  protected circle(x: number, y: number, r: number, fill?: string, stroke?: string, width = 1.5) {
    const g = this.g; g.beginPath(); g.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = width; g.stroke(); }
  }
  protected num(key: string) { return Number(this.p[key]); }
}

/** Nice tick spacing for an axis covering `span` units with about `n` ticks. */
export function niceStep(span: number, n = 6) {
  const raw = span / n, mag = 10 ** Math.floor(Math.log10(raw)), f = raw / mag;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
}
