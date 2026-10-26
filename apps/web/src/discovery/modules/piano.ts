/** Piano and intervals: two octaves you can play with the mouse, touch or the computer keyboard (A W S E D F T G Y H U J K
 *  for the first octave). Sound is made in the browser (Web Audio), so it works offline. Shows each note's name and
 *  frequency, the interval from the note before, and the wave shape. */
import { CanvasModule, type Action } from "../engine.ts";
import { fmt, frequency, intervalName, noteName } from "../science.ts";

const KEYS = "awsedftgyhujkolp;'";            // white and black keys in order from C
const WHITE = [0, 2, 4, 5, 7, 9, 11];

class Piano extends CanvasModule {
  private audio: AudioContext | null = null;
  private lastNote: number | null = null;
  private prev: number | null = null;
  private lit = new Map<number, number>();
  private glowTimer = 0;

  private get base() { return (this.num("octave") + 1) * 12; }          // MIDI number of the lowest C shown

  protected init() {
    this.el.tabIndex = 0;
    this.listen(this.canvas, "pointerdown", (e) => { const r = this.canvas.getBoundingClientRect(); const m = this.keyAt(e.clientX - r.left, e.clientY - r.top); if (m !== null) this.sound(m); });
    this.listen(this.el, "keydown", (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const i = KEYS.indexOf(e.key.toLowerCase());
      if (i >= 0) { e.preventDefault(); this.sound(this.base + i); }
    });
  }

  protected custom(a: Action) { if (a.type === "note" && "value" in a && typeof a.value === "number") this.sound(a.value); }

  // the keys: two octaves of white keys, black keys on top
  private layout() {
    const whites: { m: number; x: number; w: number }[] = [], blacks: { m: number; x: number; w: number }[] = [];
    const n = 15, top = this.h * 0.42, kw = Math.min(64, (this.w - 24) / n), x0 = (this.w - kw * n) / 2;
    for (let i = 0; i < n; i++) {
      const oct = Math.floor(i / 7), semi = WHITE[i % 7], m = this.base + oct * 12 + semi;
      whites.push({ m, x: x0 + i * kw, w: kw });
      if (i < n - 1 && [0, 2, 5, 7, 9].includes(semi)) blacks.push({ m: m + 1, x: x0 + (i + 1) * kw - kw * 0.3, w: kw * 0.6 });
    }
    return { whites, blacks, top, bottom: this.h - 14, blackBottom: top + (this.h - 14 - top) * 0.62 };
  }

  private keyAt(x: number, y: number): number | null {
    const L = this.layout();
    if (y < L.top || y > L.bottom) return null;
    if (y < L.blackBottom) for (const k of L.blacks) if (x >= k.x && x <= k.x + k.w) return k.m;
    for (const k of L.whites) if (x >= k.x && x <= k.x + k.w) return k.m;
    return null;
  }

  private sound(m: number) {
    try {
      this.audio ??= new AudioContext();
      const ac = this.audio, t = ac.currentTime, osc = ac.createOscillator(), amp = ac.createGain();
      osc.type = (this.p.waveform as OscillatorType) || "triangle";
      osc.frequency.value = frequency(m);
      const peak = osc.type === "square" ? 0.08 : 0.22;
      amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(peak, t + 0.01); amp.gain.exponentialRampToValueAtTime(0.0005, t + 1.1);
      osc.connect(amp).connect(ac.destination); osc.start(t); osc.stop(t + 1.15);
    } catch { /* no audio device: the picture and numbers still work */ }
    this.prev = this.lastNote; this.lastNote = m;
    this.lit.set(m, performance.now());
    window.clearTimeout(this.glowTimer);
    this.glowTimer = window.setTimeout(() => { this.lit.clear(); this.redraw(); }, 450);
    this.redraw(); this.ctx.onChange();
  }

  protected draw() {
    const g = this.g, P = this.ctx.palette, L = this.layout();
    // wave shape panel
    const wx = 24, wy = 18, ww = this.w - 48, wh = L.top - 40;
    g.fillStyle = "#f7f6fb"; g.fillRect(wx, wy, ww, wh);
    if (this.lastNote !== null && wh > 30) {
      const f = frequency(this.lastNote), cycles = Math.max(2, Math.min(12, f / 60));
      g.strokeStyle = P.lab; g.lineWidth = 2.4; g.beginPath();
      for (let i = 0; i <= ww; i++) {
        const ph = (i / ww) * cycles % 1;
        const type = this.p.waveform;
        const y = type === "sine" ? Math.sin(ph * 2 * Math.PI) : type === "square" ? (ph < 0.5 ? 1 : -1) : 1 - 4 * Math.abs(ph - 0.5);
        const py = wy + wh / 2 - y * (wh / 2 - 8);
        i ? g.lineTo(wx + i, py) : g.moveTo(wx + i, py);
      }
      g.stroke();
      this.text(`${noteName(this.lastNote)} · ${fmt(f, 1)} Hz`, wx + 10, wy + 14, P.text, "left", 13, 700);
      if (this.prev !== null) this.text(intervalName(this.prev, this.lastNote), wx + ww - 10, wy + 14, P.muted, "right", 12, 600);
    } else this.text("Play a key to see its wave", wx + ww / 2, wy + wh / 2, P.muted, "center", 13);
    // keys
    for (const k of L.whites) {
      const on = this.lit.has(k.m);
      g.fillStyle = on ? "#fbe7b5" : "#fff"; g.fillRect(k.x + 1, L.top, k.w - 2, L.bottom - L.top);
      g.strokeStyle = "#c9c4b8"; g.lineWidth = 1; g.strokeRect(k.x + 1, L.top, k.w - 2, L.bottom - L.top);
      const name = noteName(k.m);
      this.text(name.startsWith("C") ? name : name.replace(/\d+$/, ""), k.x + k.w / 2, L.bottom - 14, name.startsWith("C") ? P.primary : P.muted, "center", Math.min(12, k.w / 3.4), name.startsWith("C") ? 700 : 500);
    }
    for (const k of L.blacks) {
      const on = this.lit.has(k.m);
      g.fillStyle = on ? P.accent : "#1d1d1f"; g.fillRect(k.x, L.top, k.w, L.blackBottom - L.top);
    }
    if (this.w > 520) {
      const kw = L.whites[0].w;
      KEYS.slice(0, 13).split("").forEach((ch, i) => {
        const m = this.base + i, white = WHITE.includes(i % 12);
        const k = (white ? L.whites : L.blacks).find((q) => q.m === m);
        if (k) this.text(ch.toUpperCase(), k.x + k.w / 2, white ? L.blackBottom + 14 : L.blackBottom - 12, white ? "#9a9488" : "#d9d4c8", "center", Math.min(11, kw / 4));
      });
    }
  }

  protected observe() {
    return { note: this.lastNote === null ? "none yet" : noteName(this.lastNote), frequency: this.lastNote === null ? 0 : frequency(this.lastNote),
      interval: this.lastNote === null || this.prev === null ? "play two notes" : intervalName(this.prev, this.lastNote) };
  }
  describe() { const o = this.observe(); return `A two-octave piano keyboard. Last note ${o.note}${this.lastNote !== null ? `, ${fmt(Number(o.frequency), 1)} hertz` : ""}.`; }
  dispose() { window.clearTimeout(this.glowTimer); this.audio?.close().catch(() => {}); super.dispose(); }
}

export default () => new Piano();
