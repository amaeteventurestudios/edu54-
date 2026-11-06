// Bayes' theorem: 1,000 mobile-money transfers, a few of them fraud. A fraud alarm catches most frauds but also flags some honest ones.
// Of the flagged transfers, how many are really fraud? Count them, then check again with a second, independent test.
// Break it: forget how rare fraud is, use a noisy alarm, and run the same test twice as if it were new evidence.
const COLS = 40, ROWS = 25, N = COLS * ROWS, CELL = 0.1, GX = -0.75, TX = 2.55;
const hash = i => { let x = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return x - Math.floor(x); };

export default {
  slug: 'bayes',
  title: 'Bayes: how sure after the alarm?',
  description: 'A fraud alarm on 1,000 mobile-money transfers catches 95% of frauds and wrongly flags 3% of honest ones. When it goes off, how likely is fraud? Count the flagged transfers and see why the answer is far below 95%, then check again.',
  overview: 'Bayes\' theorem turns "how often does the alarm go off for fraud?" into the question you actually care about: "the alarm went off, so how likely is fraud?". The answer depends on how rare fraud was to begin with. When fraud is rare, even a good alarm flags far more honest transfers than frauds, simply because there are so many more honest ones. A second, independent check changes the picture completely.',
  keywords: ['bayes theorem explained', 'base rate fallacy', 'false positive rate', 'posterior probability', 'naive bayes'],
  orient: 'any',
  phoneTurn: false,
  view: { target: [0.3, 0.3, 0], dir: [0.15, 1.3, 1.1], half: 3, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { prior: 0.005, sens: 0.95, fa: 0.03, second: false, same: false };
    /* ---------- the transfers ---------- */
    const board = P.box(COLS * CELL + 0.4, 0.1, ROWS * CELL + 0.4, '#F1EEE6', { r: 0.1 }); board.position.set(GX, 0, 0); S.add(board);
    const boardF = S.text('1,000 TRANSFERS', { size: 0.13, face: 'front', weight: 800, color: '#151827', maxW: 3 }); boardF.position.set(GX, 0.05, ROWS * CELL / 2 + 0.205); S.add(boardF);
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL * 0.8, 0.06, CELL * 0.8).translate(0, 0.03, 0), new THREE.MeshLambertMaterial(), N);
    im.castShadow = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const pos = i => V(GX - COLS * CELL / 2 + CELL * (i % COLS + 0.5), 0.1, -ROWS * CELL / 2 + CELL * (Math.floor(i / COLS) + 0.5));
    /* ---------- the flagged tray and the second check ---------- */
    const tray = P.box(1.3, 0.12, 2.4, '#E3A72F', { r: 0.08 }); tray.position.set(TX, 0, -0.1); S.add(tray);
    const trayF = S.text('FLAGGED', { size: 0.12, face: 'front', weight: 800, color: '#151827', maxW: 1.2 }); trayF.position.set(TX, 0.06, 1.105); S.add(trayF);
    const trayT = S.text('FLAGGED', { size: 0.12, weight: 800, color: '#151827', maxW: 1.2 }); trayT.position.set(TX, 0.125, -1.15); S.add(trayT);
    const MAXF = 220, fm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.085, 0.06, 0.085).translate(0, 0.03, 0), new THREE.MeshLambertMaterial(), MAXF);
    fm.castShadow = true; fm.userData.noFit = true; S.add(fm);
    const bar = P.box(3.0, 0.1, 0.28, '#D8D4C8', { r: 0.05 }); bar.position.set(0.1, 0, 1.95); S.add(bar);
    const barR = P.box(1, 0.12, 0.3, C.red, { r: 0.03 }); barR.userData.noFit = true; S.add(barR);
    const barT = S.text('', { size: 0.13, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 3.2 }); barT.position.set(0.1, 0.55, 1.95); barT.userData.noFit = true; S.add(barT);
    /* ---------- the counting ---------- */
    let model = null;
    function count() {
      // exact expected counts: the frauds and false alarms are picked in a fixed shuffled order, so the picture is steady
      const nF = Math.max(0, Math.round(N * st.prior));
      const order = [...Array(N).keys()].sort((a, b) => hash(a) - hash(b));
      const F = order.slice(0, nF), Hn = order.slice(nF).sort((a, b) => hash(a + 7777) - hash(b + 7777));
      const fraud = new Array(N).fill(false), flag = new Array(N).fill(false), again = new Array(N).fill(false);
      F.forEach(i => { fraud[i] = true; });
      const fF = F.slice(0, Math.round(F.length * st.sens)), fH = Hn.slice(0, Math.round(Hn.length * st.fa));
      [...fF, ...fH].forEach(i => { flag[i] = true; });
      // a second, independent check passes its own share of each; the same test again repeats every answer
      const by = (xs, k) => [...xs].sort((a, b) => hash(a + 31337) - hash(b + 31337)).slice(0, k);
      (st.same ? [...fF, ...fH] : [...by(fF, Math.round(fF.length * st.sens)), ...by(fH, Math.round(fH.length * st.fa))]).forEach(i => { again[i] = true; });
      const pick = st.second ? again : flag;
      const nFl = pick.filter(Boolean).length, nFF = pick.filter((x, i) => x && fraud[i]).length;
      model = { fraud, flag, pick, nFl, nFF, nF };
    }
    let tAnim = 0;
    function draw() {
      count(); tAnim = 0;
      const { fraud, flag, pick } = model;
      for (let i = 0; i < N; i++) {
        const p = pos(i), up = flag[i] ? 0.06 : 0;
        dummy.position.set(p.x, p.y + up, p.z); dummy.scale.setScalar(1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
        im.setColorAt(i, col.set(fraud[i] ? (flag[i] ? '#D9483B' : '#7A2A22') : flag[i] ? '#F2C94C' : '#C9C4B6'));
      }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      // the flagged ones, gathered in the tray: frauds first
      const list = []; for (let i = 0; i < N; i++) if (pick[i]) list.push(fraud[i]);
      list.sort((a, b) => b - a);
      for (let k = 0; k < MAXF; k++) {
        const on = k < list.length, c = k % 10, r = Math.floor(k / 10);
        dummy.position.set(TX - 0.45 + c * 0.1, 0.12, -1.0 + r * 0.1); dummy.scale.setScalar(on ? 1 : 0.0001); dummy.updateMatrix(); fm.setMatrixAt(k, dummy.matrix);
        fm.setColorAt(k, col.set(on && list[k] ? '#D9483B' : '#F7F5EE'));
      }
      fm.instanceMatrix.needsUpdate = true; fm.instanceColor.needsUpdate = true;
    }
    const post = () => model.nFl ? model.nFF / model.nFl : 0;
    const exact = () => { const pf = st.prior * st.sens, ph = (1 - st.prior) * st.fa; let p = pf / (pf + ph); if (st.second && !st.same) { const a = p * st.sens, b = (1 - p) * st.fa; p = a / (a + b); } return p; };
    function update(dt) {
      tAnim = Math.min(1, tAnim + dt * 1.5);
      const p = post(), w = 3.0 * Math.max(0.005, p) * tAnim;
      barR.scale.x = w; barR.position.set(0.1 - 1.5 + w / 2, 0, 1.95);
      barT.userData.set(`flagged and really fraud: ${model.nFF} of ${model.nFl} (${Math.round(p * 100)}%)`);
    }
    draw();
    const pct = v => `${(v * 100).toFixed(v < 0.01 ? 1 : 0)}%`;
    const controls = [
      { type: 'slider', label: 'How common fraud is', min: 0.001, max: 0.3, log: true, get: () => st.prior, set: v => { st.prior = v; draw(); }, fmt: pct },
      { type: 'slider', label: 'Frauds the alarm catches', min: 0.5, max: 0.99, step: 0.01, get: () => st.sens, set: v => { st.sens = v; draw(); }, fmt: pct },
      { type: 'slider', label: 'Honest transfers it flags', min: 0.005, max: 0.2, log: true, get: () => st.fa, set: v => { st.fa = v; draw(); }, fmt: pct },
      { type: 'toggle', label: 'Check flagged ones again, independently', short: 'Second check', get: () => st.second, set: v => { st.second = v; st.same = false; draw(); } },
    ];
    const readouts = [
      { label: 'Flagged', get: () => ({ v: model.nFl, sub: `${model.nFF} of them fraud` }) },
      { label: 'Fraud, given a flag', get: () => ({ v: `${Math.round(post() * 100)}%`, sub: `Bayes says ${Math.round(exact() * 100)}%`, bad: post() < 0.5, good: post() >= 0.8 }) },
    ];
    const labels = [
      { name: 'grid', t: 'Every transfer', d: 'Red: fraud. Raised and gold: flagged', icon: 'box', atV: V(GX - COLS * CELL / 2 - 0.2, 0.1, -ROWS * CELL / 2) },
      { name: 'rare', t: 'Frauds are rare', d: 'Only 5 in 1,000 here', icon: 'info', atV: V(GX - COLS * CELL / 2 - 0.2, 0.1, ROWS * CELL / 2) },
      { name: 'tray', t: 'Every flagged transfer', d: 'Red: real fraud. White: false alarms', icon: 'spark', atV: V(TX + 0.65, 0.12, -1.3) },
      { name: 'bar', t: 'How sure to be', d: 'The share of flags that are fraud', icon: 'scale', atV: V(TX + 0.65, 0.12, 1.1) },
    ];
    const reset = () => { Object.assign(st, { prior: 0.005, sens: 0.95, fa: 0.03, second: false, same: false }); draw(); };
    const breaks = [
      { label: 'Believe the alarm at 95%', hint: 'Forget how rare fraud is', on: () => { reset(); st.believe = true; }, off: () => { st.believe = false; reset(); } },
      { label: 'A noisy alarm', hint: 'Flags 20% of honest transfers', on: () => { reset(); st.fa = 0.2; draw(); }, off: reset },
      { label: 'Run the same test twice', hint: 'And call it new evidence', on: () => { reset(); st.second = true; st.same = true; draw(); }, off: reset },
    ];
    function status() {
      const p = post();
      if (st.believe) return { ok: false, msg: `<b>The alarm is right 95% of the time, so a flag means 95% fraud? No.</b> Fraud is rare: about ${model.nF} in 1,000. The alarm catches ${model.nFF} of them, but it also flags 3% of the ${N - model.nF} honest transfers, about ${model.nFl - model.nFF}. Of ${model.nFl} flags only ${model.nFF} are fraud: ${Math.round(p * 100)}%. Forgetting the base rate is the most common mistake in reading any test.` };
      if (st.same && st.second) return { ok: false, msg: `<b>The same test twice tells you nothing new.</b> Running the alarm again on the same transfer gives the same answer, mistakes included, so all ${model.nFl} stay flagged and the share of fraud is still ${Math.round(p * 100)}%. Bayes only multiplies the evidence when the second check is independent, such as calling the customer.` };
      if (st.fa >= 0.15) return { ok: false, msg: `<b>Drowned in false alarms.</b> Flagging ${pct(st.fa)} of honest transfers gives ${model.nFl - model.nFF} false alarms against ${model.nFF} real frauds, so a flag means fraud only ${Math.round(p * 100)}% of the time. The agents checking them will soon stop trusting the alarm.` };
      if (st.second) return { ok: true, msg: `<b>A second, independent check.</b> Of the transfers flagged twice, ${model.nFF} of ${model.nFl} are fraud: ${Math.round(p * 100)}%. The first flag raised the chance from ${pct(st.prior)} to about ${Math.round(st.prior * st.sens / (st.prior * st.sens + (1 - st.prior) * st.fa) * 100)}%; the second, starting from there, raised it again.` };
      return { ok: p >= 0.5 ? true : undefined, msg: `<b>${model.nFl} flags, ${model.nFF} of them fraud: ${Math.round(p * 100)}%.</b> Fraud starts at ${pct(st.prior)}; the alarm lifts it to ${Math.round(exact() * 100)}%. ${p >= 0.5 ? 'Most flags are real fraud here, because fraud is common to begin with.' : 'Better than before, but most flags are still honest people. Try a second check.'}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A thousand transfers', home: true, say: 'Here are a thousand mobile money transfers, sent across Kenya, Ghana and Uganda. Five of them, in red, are fraud.', act: m => m.reset() },
    { t: 'The alarm', focus: [-0.75, 0.2, 0], zoom: 1.35, say: 'A fraud alarm checks every transfer. It catches ninety-five percent of frauds, and wrongly flags three percent of honest transfers. The flagged ones rise up.' },
    { t: 'Count the flags', focus: [2.55, 0.2, -0.1], zoom: 1.5, say: 'Gather every flagged transfer into the tray. Five are fraud. About thirty are honest people, flagged by mistake, simply because honest transfers are so many.' },
    { t: 'How sure to be', home: true, say: 'So when the alarm goes off, fraud is only about one chance in seven. That is Bayes\' theorem: what you believed before, multiplied by how well the evidence fits.', wait: 5 },
    { t: 'Check again', home: true, say: 'Now check the flagged ones again with a second, independent test, such as calling the customer. Most false alarms fall away. Yesterday\'s answer becomes today\'s starting point.', act: m => m.set({ second: true, same: false }), wait: 5 },
    { t: 'Rarity matters', home: true, say: 'Where fraud is common, the same alarm is far more often right. The rarer the thing you look for, the more false alarms you must expect.', act: m => m.set({ second: false, prior: 0.1 }), wait: 5 },
  ],
  check: [
    { q: 'An alarm catches 95% of frauds and flags 3% of honest transfers. Fraud is 1 in 200. The alarm goes off. How likely is fraud?', options: ['About 95%', 'About 14%', 'About 3%'], answer: 1, why: 'There are so many honest transfers that the 3% of them flagged outnumber the frauds about six to one.' },
    { q: 'What raises the chance of fraud the most after a first flag?', options: ['Running the same alarm again', 'A second, independent check', 'Waiting a day'], answer: 1, why: 'Independent evidence multiplies in. The same test repeats its own mistakes.' },
    { q: 'In Bayes\' theorem, what is the prior?', options: ['What you believed before the evidence', 'The test result', 'The final answer'], answer: 0, why: 'The prior is the starting belief (how common fraud is); the evidence updates it into the posterior.' },
  ],
  terms: [
    ['Prior', 'What you believe before the evidence: here, how common fraud is.'],
    ['Likelihood', 'How likely the evidence is if the thing is true: how often the alarm fires on fraud.'],
    ['Posterior', 'What you believe after the evidence: the chance of fraud given a flag.'],
    ['False positive', 'An alarm on something innocent.'],
    ['Base rate fallacy', 'Ignoring how rare something is when reading a test result.'],
  ],
  deeper: '<p><b>The formula.</b> P(fraud | flag) = P(flag | fraud) × P(fraud) ÷ P(flag). The bottom line counts every flag, fraud or not: 0.95 × 0.005 + 0.03 × 0.995.</p><p><b>Naive Bayes</b> classifies messages as spam the same way: start with how common spam is, then multiply in each word\'s evidence as if the words were independent. It is crude, fast, and often surprisingly good.</p><p><b>Priors in training.</b> Weight decay is a prior in disguise: it says "small weights are more likely", and the training balances that belief against the data.</p>',
  code: {
    title: 'Bayes, by counting and by formula',
    note: 'Adapted from the course\'s Bayes lesson.',
    text: `
def bayes(prior, hit_rate, false_alarm):
    flagged = hit_rate * prior + false_alarm * (1 - prior)
    return hit_rate * prior / flagged

p = bayes(prior=0.005, hit_rate=0.95, false_alarm=0.03)
print(f"after one flag:  {p:.0%}")       # 14%

# a second, independent check starts from the first answer
p2 = bayes(prior=p, hit_rate=0.95, false_alarm=0.03)
print(f"after two flags: {p2:.0%}")      # 83%

# by counting 1,000 transfers
frauds, honest = 5, 995
flags = 0.95 * frauds + 0.03 * honest
print(f"{0.95 * frauds:.0f} of {flags:.0f} flags are fraud")
`,
  },
};
