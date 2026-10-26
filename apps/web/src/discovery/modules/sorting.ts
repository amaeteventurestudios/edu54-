/** Sorting algorithms: bars of different heights, sorted one comparison at a time. The two bars being compared light up,
 *  and a swap flashes. The list comes from a seeded shuffle, so switching algorithm sorts the same bars again. */
import { CanvasModule, type Action } from "../engine.ts";
import { isSorted, shuffled, sortSteps, type SortStep } from "../science.ts";

type Algorithm = "bubble" | "insertion" | "selection";

class Sorting extends CanvasModule {
  private seed = 7;
  private start: number[] = [];
  private bars: number[] = [];
  private steps: Generator<SortStep> | null = null;
  private current: SortStep | null = null;
  private comparisons = 0;
  private swaps = 0;
  private done = false;
  private carry = 0;

  protected init() { this.restart(true); }

  /** Back to the start of a sort: a new list when `fresh`, otherwise the same list again. */
  private restart(fresh: boolean) {
    if (fresh || this.start.length !== this.num("size")) this.start = shuffled(this.num("size"), this.seed);
    this.bars = [...this.start];
    this.steps = sortSteps(this.p.algorithm as Algorithm, this.bars);
    this.current = null; this.comparisons = 0; this.swaps = 0; this.carry = 0;
    this.done = isSorted(this.bars);
  }

  private advance() {
    if (this.done || !this.steps) return;
    const r = this.steps.next();
    if (r.done) { this.done = true; this.current = null; return; }
    this.current = r.value; this.bars = r.value.array;
    if (r.value.swap) this.swaps++; else this.comparisons++;
    // selection sort reports its single swap as its own step; every other step is one comparison
    if (r.value.swap && this.p.algorithm !== "selection") this.comparisons++;
  }

  protected onParam(key: string) { if (key === "speed") return; this.pause(); this.restart(key === "size"); }
  protected onReset() { this.restart(false); }
  protected play() { if (this.done) this.restart(false); super.play(); }
  protected custom(a: Action) {
    if (a.type === "shuffle") { this.pause(); this.seed = (this.seed * 31 + 17) % 100000; this.restart(true); }
    else if (a.type === "step") { this.pause(); if (this.done) this.restart(false); this.advance(); }
  }

  protected step(dt: number) {
    this.carry += dt * this.num("speed");
    while (this.carry >= 1 && !this.done) { this.carry -= 1; this.advance(); }
    if (this.done) { this.current = null; this.stop(); }
  }

  protected draw() {
    const g = this.g, P = this.ctx.palette, n = this.bars.length, top = 34, bot = this.h - 30;
    const gap = n > 20 ? 2 : 4, bw = (this.w - 32 - gap * (n - 1)) / n;
    const [i, j] = this.current?.compare ?? [-1, -1];
    this.bars.forEach((v, k) => {
      const hgt = (v / n) * (bot - top), x = 16 + k * (bw + gap);
      const active = k === i || k === j;
      g.fillStyle = this.done ? P.lab : active ? (this.current?.swap ? "#C2462B" : P.accent) : "#c9ced6";
      g.beginPath(); g.roundRect(x, bot - hgt, bw, hgt, Math.min(4, bw / 3)); g.fill();
      if (bw > 16) this.text(String(v), x + bw / 2, bot + 12, P.muted, "center", 11);
    });
    const name = { bubble: "Bubble sort", insertion: "Insertion sort", selection: "Selection sort" }[this.p.algorithm as Algorithm];
    const status = this.done ? "Sorted" : this.current ? (this.current.swap ? "Swap" : "Compare") : "Press Play or Step";
    this.text(`${name} · ${status}`, 16, 16, this.done ? P.primary : P.text, "left", 13, 700);
    this.text(`${this.comparisons} comparisons · ${this.swaps} swaps`, this.w - 16, 16, P.muted, "right", 12);
  }

  protected observe() { return { comparisons: this.comparisons, swaps: this.swaps, sorted: this.done ? "yes" : "no" }; }
  describe() { return `${this.bars.length} bars being sorted by ${this.p.algorithm} sort. ${this.comparisons} comparisons and ${this.swaps} swaps so far${this.done ? "; the bars are sorted" : ""}.`; }
}

export default () => new Sorting();
