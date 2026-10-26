/** Energy balance: sunlight comes in, some is reflected straight back (albedo), the rest warms the ground, and the warm
 *  ground sends heat out; the atmosphere lets only part of it escape. The thermometer shows the temperature at which heat
 *  out equals sunlight in. One average number for the whole planet: no seasons, no weather. */
import { CanvasModule } from "../engine.ts";
import { climate, fmt } from "../science.ts";

const T_MIN = -40, T_MAX = 60;

class Climate extends CanvasModule {
  private q() { return climate(this.num("solar"), this.num("albedo"), this.num("emissivity")); }

  /** A wide arrow whose thickness shows how much energy it carries. */
  private arrow(x1: number, y1: number, x2: number, y2: number, width: number, color: string) {
    const g = this.g, a = Math.atan2(y2 - y1, x2 - x1), head = Math.max(10, width * 1.6);
    const bx = x2 - head * Math.cos(a), by = y2 - head * Math.sin(a);
    g.save(); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = width; g.lineCap = "butt";
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(bx, by); g.stroke();
    g.beginPath(); g.moveTo(x2, y2);
    g.lineTo(bx + head * 0.7 * Math.sin(a), by - head * 0.7 * Math.cos(a)); g.lineTo(bx - head * 0.7 * Math.sin(a), by + head * 0.7 * Math.cos(a));
    g.closePath(); g.fill(); g.restore();
  }

  /** A label on a white tag, so it reads over the sky, the atmosphere or an arrow. */
  private tag(s: string, x: number, y: number, color: string, align: "left" | "right" | "center" = "left") {
    const g = this.g; this.font(11, 700);
    const w = g.measureText(s).width + 12, x0 = align === "left" ? x : align === "right" ? x - w : x - w / 2;
    g.fillStyle = "rgba(255,255,255,.92)"; g.beginPath(); g.roundRect(x0, y - 10, w, 20, 6); g.fill();
    this.text(s, x0 + 6, y, color, "left", 11, 700);
  }

  protected draw() {
    const g = this.g, P = this.ctx.palette, q = this.q();
    const solar = this.num("solar"), albedo = this.num("albedo"), eps = this.num("emissivity");
    const thermoW = this.w > 520 ? 110 : 76, W = this.w - thermoW, ground = this.h - 40, atmTop = this.h * 0.3;
    // sky, atmosphere band and ground
    g.fillStyle = "#0d1430"; g.fillRect(0, 0, W, atmTop);
    g.fillStyle = `rgba(120,170,220,${0.15 + (1 - eps) * 1.1})`; g.fillRect(0, atmTop, W, ground - atmTop);
    this.text("Atmosphere", 10, atmTop + 12, "#1d3557", "left", 11, 700);
    g.fillStyle = "#6b8f4e"; g.fillRect(0, ground, W, this.h - ground);
    if (W >= 420) this.text("Ground", 10, ground + 18, "#fff", "left", 11, 700);
    // the Sun
    const sx = 34, sy = 30;
    this.circle(sx, sy, 20, "#F2C94C"); this.circle(sx, sy, 27, undefined, "rgba(242,201,76,.4)", 4);
    // arrows: widths scale with energy (absorbed ≈ 240 W/m² is about 18 px)
    const px = (wm2: number) => Math.max(2, Math.min(34, wm2 / 13));
    const incoming = solar / 4, reflected = incoming * albedo, absorbed = q.absorbed;
    const inX = W * 0.32, outX = W * 0.72;
    const surfaceOut = 5.670374419e-8 * q.kelvin ** 4;
    this.arrow(inX - 30, 18, inX, ground - 4, px(incoming), "#F2C94C");
    this.arrow(inX + 10, atmTop + 30, inX + 60, 22, px(reflected), "#e6e6e6");
    this.arrow(outX, ground - 4, outX, atmTop + 6, px(surfaceOut), "#E8833A");
    this.arrow(outX + 22, atmTop + 6, outX + 40, 18, px(absorbed), "#C2462B");
    const mid = (atmTop + ground) / 2, narrow = W < 420;
    if (narrow) this.tag(`Sun in ${fmt(incoming, 0)}`, inX + px(incoming) / 2 + 4, mid - 40, "#7a5a06");
    else this.tag(`Sunlight in ${fmt(incoming, 0)}`, inX - 22 - px(incoming), mid - 14, "#7a5a06", "right");
    this.tag(`Reflected ${fmt(reflected, 0)}`, inX + 66, 30, "#3c4656");
    this.tag(narrow ? `From ground ${fmt(surfaceOut, 0)}` : `Heat from ground ${fmt(surfaceOut, 0)}`, outX - 8 - px(surfaceOut) / 2, mid + 14, "#9a4a12", "right");
    this.tag(`Escapes ${fmt(absorbed, 0)}`, Math.min(W - 6, outX + 46 + 70), narrow ? 56 : 30, "#8a1c2b", "right");
    this.text(narrow ? `Absorbed ${fmt(absorbed, 0)} · all in W/m²` : `Absorbed ${fmt(absorbed, 0)} W/m² · all numbers in W/m²`, W / 2, ground + 18, "#fff", "center", 11, 700);
    // thermometer
    const tx = W + thermoW / 2, top = 30, bot = this.h - 66, Y = (t: number) => bot - (t - T_MIN) / (T_MAX - T_MIN) * (bot - top);
    g.fillStyle = "#fff"; g.fillRect(W, 0, thermoW, this.h);
    g.fillStyle = "#eef0f2"; g.beginPath(); g.roundRect(tx - 8, top - 6, 16, bot - top + 12, 8); g.fill();
    const t = Math.max(T_MIN, Math.min(T_MAX, q.temperature)), hot = q.temperature > 30 ? "#C2462B" : q.temperature < 0 ? "#1D4E89" : "#E8833A";
    g.fillStyle = hot; g.beginPath(); g.roundRect(tx - 5, Y(t), 10, bot - Y(t) + 6, 5); g.fill();
    this.circle(tx, bot + 14, 13, hot);
    for (let s = T_MIN; s <= T_MAX; s += 20) { this.line(tx + 10, Y(s), tx + 16, Y(s), P.muted, 1); this.text(`${s}°`, tx + 19, Y(s), P.muted, "left", 10); }
    this.line(tx - 16, Y(15), tx - 9, Y(15), P.primary, 2);
    if (thermoW > 90) this.text("today ≈ 15°", tx - 18, Y(15), P.primary, "right", 10, 700);
    this.text(`${fmt(q.temperature, 1)} °C`, tx, 14, hot, "center", 14, 800);
    this.text("no greenhouse:", tx, this.h - 24, P.muted, "center", 10); this.text(`${fmt(q.no_greenhouse, 0)} °C`, tx, this.h - 10, P.muted, "center", 10, 700);
  }

  protected observe() { const q = this.q(); return { temperature: q.temperature, absorbed: q.absorbed, no_greenhouse: q.no_greenhouse }; }
  describe() { const q = this.q(); return `An energy balance for the whole planet. ${fmt(q.absorbed, 0)} watts per square metre of sunlight is absorbed, which balances at an average surface temperature of ${fmt(q.temperature, 1)} degrees Celsius.`; }
}

export default () => new Climate();
