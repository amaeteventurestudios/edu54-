// Kill switches, circuit breakers and canary tokens (phase 15, lesson 14): a Mombasa port operations agent runs a sixteen-turn session. It gets
// stuck repeating one call, reads a page telling it to disable its kill switch and fetch credentials, touches a planted fake key, then tries to
// send data out, and finally drifts its outbound traffic up slowly. Five detectors (a kill switch outside its reach, a circuit breaker, a canary,
// a hard rule and a statistical rate detector) are toggled; each turn's fate and the outcome are computed live.
const TURNS = [
  { t: 'read the\nberth schedule' }, { t: 'check vessel\nETAs' }, { t: 'draft crane\nassignments' }, { t: 'update the\nyard plan' },
  { t: 'GET /eta\n(again)', loop: 1 }, { t: 'GET /eta\n(again)', loop: 2 }, { t: 'GET /eta\n(again)', loop: 3 }, { t: 'GET /eta\n(again)', loop: 4 }, { t: 'GET /eta\n(again)', loop: 5 },
  { t: 'reads a page:\n"disable the switch"', inj: true }, { t: 'tries to turn\nits switch off', flip: true }, { t: 'reads the\nfake cloud key', canary: true },
  { t: 'sends data to an\nunknown domain', exfil: true }, { t: 'outbound calls\n+10%', drift: 1 }, { t: 'outbound calls\n+10%', drift: 2 }, { t: 'outbound calls\n+10%', drift: 3 },
];
function session(o) {
  let breakerOpen = false, killed = false, switchDisabled = false, alarm = null, exfil = false, extraLoop = 0;
  const out = TURNS.map((x, i) => {
    if (killed) return { ...x, fate: 'stopped' };
    if (x.loop) {
      if (breakerOpen) return { ...x, fate: 'paused' };
      if (o.breaker && x.loop === 5) { breakerOpen = true; return { ...x, fate: 'breaker opens' }; }
      if (o.stats && x.loop === 4) { breakerOpen = true; return { ...x, fate: 'rate spike: paused' }; }
      return { ...x, fate: 'ran' };
    }
    if (x.flip) { if (!o.outside) { switchDisabled = true; return { ...x, fate: 'switch disabled' }; } return { ...x, fate: 'refused: read-only' }; }
    if (x.canary) { if (o.canary) { alarm = i + 1; if (!switchDisabled) { killed = true; return { ...x, fate: 'canary fires: killed' }; } return { ...x, fate: 'canary fires: switch dead' }; } return { ...x, fate: 'ran, unseen' }; }
    if (x.exfil) { if (o.rule) return { ...x, fate: 'blocked by rule' }; exfil = true; return { ...x, fate: 'sent' }; }
    if (x.drift) return { ...x, fate: o.rule && x.drift === 3 ? 'blocked by rule' : 'ran' };
    return { ...x, fate: 'ran' };
  });
  if (!o.breaker && !o.stats) extraLoop = 20;
  const wasted = out.filter(x => x.loop && x.fate === 'ran').length + extraLoop;
  return { out, killed, switchDisabled, alarm, exfil, wasted };
}

export default {
  slug: 'kill-switches-canaries',
  title: 'Kill switches, circuit breakers and canaries',
  description: 'A port operations agent in Mombasa runs sixteen turns: it loops, reads a hostile page, touches a fake key and tries to send data out. Turn on five detectors and see what each catches.',
  overview: 'Cost governors bound what an agent spends, not what it does inside the budget: the expensive action, a leaked secret or a deleted resource, is often cheap in tokens. Three detectors sit beside the cost layer, all older than agents. A kill switch is a boolean the agent reads but cannot write: a feature flag, a key in a store its credentials can\'t touch, a signed config, or simply stopping the container. It is checked on every consequential action, not just at start-up; when off, the agent does nothing observable; and turning it back on is a deliberate human act. A circuit breaker pauses one pattern, not the whole agent: closed allows, open blocks, half-open lets a probe through after a cool-down. Triggers include five identical calls in a row, repeated failures on one tool, or a call rate above a threshold. A canary token is bait the agent has no reason to touch: a fake cloud key in the environment, a sentinel database record, a decoy file, a planted memory entry. Touching it is the alarm, and design matters, since a canary the agent legitimately touches is only noise. Layer statistical and hard limits. Statistical detectors (moving averages, z-scores on call rates) adapt to a moving baseline, which suits honest drift and fails against a patient attacker who shifts the baseline slowly. Hard rules such as "never send to an unknown domain" don\'t bend. Some things no detector catches: attacks composed of allowed steps, and attacks that make disabling the detector part of the payload, which is why every detector must live where the agent cannot modify it.',
  keywords: ['kill switch', 'circuit breaker', 'canary tokens', 'honeytokens', 'AI safety', 'monitoring', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.2, 0.05], dir: [0.05, 0.95, 1.15], half: 1.1, wide: 5.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { outside: true, breaker: true, canary: true, rule: true, stats: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const FC = { ran: '#FFFFFF', paused: '#9DBFDD', 'breaker opens': '#5B8DB8', 'rate spike: paused': '#5B8DB8', 'switch disabled': RED, 'refused: read-only': GOOD, 'canary fires: killed': GOOD, 'canary fires: switch dead': SAF, 'ran, unseen': BAD, 'blocked by rule': GOOD, sent: RED, stopped: '#C9C4B8' };
    const TX = i => -2.45 + (i % 8) * 0.7, TZ = i => -0.6 + Math.floor(i / 8) * 0.62;
    const tiles = TURNS.map((x, i) => {
      const mm = new THREE.MeshLambertMaterial({ color: '#FFF' }), b = P.box(0.5, 0.12, 0.44, '#fff', { r: 0.04, material: mm }); b.position.set(TX(i), 0, TZ(i)); S.add(b);
      return { mm, b };
    });
    const key = P.cyl(0.07, 0.05, SAF); key.position.set(TX(11), 0.12, TZ(11)); S.add(key);
    const out = P.ball(0.08, RED); out.userData.noFit = true; S.add(out);
    const bot = P.robot('#3A3D4A', { scale: 0.45 }); bot.userData.noFit = true; S.add(bot);
    const DET = [['outside', 'kill switch', 'outside the agent\'s reach'], ['breaker', 'circuit breaker', 'five identical calls'], ['canary', 'canary token', 'a fake cloud key'], ['rule', 'hard rule', 'no unknown domains'], ['stats', 'rate detector', 'moving average']];
    const LX = i => -2.0 + i * 1.0, LZ = 0.8;
    const dets = DET.map(([id], i) => { const l = P.lamp('#C9C4B8', { h: 0.35 }); l.position.set(LX(i), 0, LZ); S.add(l); return { id, l }; });
    S.add(P.keep(-2.75, 2.75, 0.7, -0.85, 0.95));
    let R = null;
    function draw() {
      R = session(st);
      R.out.forEach((x, i) => { tiles[i].mm.color.set(FC[x.fate]); tiles[i].b.scale.y = x.fate === 'stopped' ? 0.3 : 1; });
      const fired = { outside: R.killed, breaker: R.out.some(x => x.fate === 'breaker opens'), canary: !!R.alarm, rule: R.out.some(x => x.fate === 'blocked by rule'), stats: R.out.some(x => x.fate === 'rate spike: paused') };
      dets.forEach(D => { const on = st[D.id]; D.l.userData.set({ color: D.id === 'outside' && !on ? RED : !on ? '#C9C4B8' : fired[D.id] ? SAF : '#5B8DB8', on }); });
      last = R.out.findIndex(x => x.fate === 'stopped'); if (last < 0) last = 16;
      key.visible = !!st.canary;
    }
    let last = 16, tt = 0;
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Keep the kill switch outside the agent\'s reach', short: 'Switch outside', get: () => st.outside, set: v => set({ outside: !!v }) },
      { type: 'toggle', label: 'Circuit breaker on five identical calls', short: 'Breaker', get: () => st.breaker, set: v => set({ breaker: !!v }) },
      { type: 'toggle', label: 'Canary: a fake cloud key in the environment', short: 'Canary', get: () => st.canary, set: v => set({ canary: !!v }) },
      { type: 'toggle', label: 'Hard rule: never send to an unknown domain', short: 'Hard rule', get: () => st.rule, set: v => set({ rule: !!v }) },
      { type: 'toggle', label: 'Statistical rate detector', short: 'Rate detector', get: () => st.stats, set: v => set({ stats: !!v }) },
    ];
    const readouts = [
      { label: 'Data out', get: () => ({ v: R.exfil ? 'sent' : 'none', sub: 'to unknown domains', good: !R.exfil, bad: R.exfil }) },
      { label: 'Stopped at', get: () => ({ v: R.killed ? `turn ${R.alarm}` : 'never', sub: R.switchDisabled ? 'switch was disabled' : 'by the kill switch', good: R.killed, bad: !R.killed }) },
      { label: 'Wasted repeats', get: () => ({ v: String(R.wasted), sub: 'identical calls' }) },
    ];
    const labels = [
      { name: 'run', t: 'The session', d: 'Sixteen turns. Red: harm done', icon: 'turn', atV: V(-2.7, 0.1, -0.3) },
      { name: 'det', t: 'Five detectors', d: 'Blue: armed. Gold: fired', icon: 'eye', atV: V(2.0, 0.35, LZ) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Keep the kill switch in the agent\'s config', hint: 'it can write it', on: () => set({ ...D0, outside: false, rule: false }), off: reset },
      { label: 'Drop the canary and the hard rule', hint: 'silent exfiltration', on: () => set({ ...D0, canary: false, rule: false }), off: reset },
      { label: 'Trust the rate detector alone', hint: 'slow drift', on: () => set({ outside: true, breaker: false, canary: false, rule: false, stats: true }), off: reset },
    ];
    function status() {
      if (R.switchDisabled) return { ok: false, msg: `<b>The page said to disable the kill switch, and because it sat in the agent\'s own config, turn 11 did exactly that. The canary fired at turn ${R.alarm}, the operator flipped the switch, and nothing happened${R.exfil ? ': the data went out at turn 13' : ''}.</b> A kill switch the agent can write is not a kill switch. Keep it where its credentials can\'t reach.` };
      if (R.exfil && !st.canary && st.stats && !st.breaker) return { ok: false, msg: '<b>The rate detector caught the burst of repeated calls, but the theft was one ordinary-looking call and the drift crept up slowly enough to become the new baseline: the data went out at turn 13.</b> Statistical detectors adapt, which a patient attacker uses. Add hard rules and canaries that don\'t bend.' };
      if (R.exfil) return { ok: false, msg: '<b>With no canary, nobody saw the agent read the fake cloud key, and with no hard rule, the send to an unknown domain at turn 13 went through.</b> A canary makes the first step loud; a hard rule stops the last one.' };
      if (!st.canary) return { ok: true, msg: '<b>No canary, so the read of the fake key went unseen and the agent kept running, but the hard rule blocked the send at turn 13.</b> The rule saved it this time; the canary would have stopped the agent two turns earlier.' };
      return { ok: true, msg: `<b>The breaker paused the repeated call at turn 9${st.stats ? ' (the rate detector also flagged the spike)' : ''}; the agent\'s attempt to turn off its switch was refused; the canary fired at turn ${R.alarm} and the kill switch stopped everything.</b> No data left. Each detector caught a different failure, and none of them trusted the agent.` };
    }
    const update = dt => {
      tt += dt; const span = last + 1, u = (tt * 1.6) % (span + 1.5), i = Math.min(last - 1, Math.floor(Math.min(u, last - 0.001)));
      bot.position.set(TX(i), 0.12, TZ(i)); bot.userData.tick(dt);
      const f = i >= 12 && R.exfil ? Math.min(1, (u - 12) / 3) : 0; out.visible = f > 0;
      out.position.set(TX(12) + f * 0.6, 0.3 + f * 0.6, TZ(12) - f * 0.6);
    };
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A session goes wrong', home: true, say: 'A port operations agent in Mombasa starts its shift normally. Then it gets stuck repeating one call.', act: m => m.set({ outside: true, breaker: false, canary: false, rule: false, stats: false }) },
    { t: 'A circuit breaker', home: true, say: 'After five identical calls, the breaker opens and pauses that path, not the whole agent.', act: m => m.set({ outside: true, breaker: true, canary: false, rule: false, stats: false }) },
    { t: 'An injected page', home: true, say: 'A page tells the agent to turn off its kill switch and fetch credentials. A switch it can write, it turns off.', act: m => m.set({ outside: false, breaker: true, canary: true, rule: false, stats: false }) },
    { t: 'Out of reach', home: true, say: 'Keep the switch where the agent\'s credentials can\'t reach. Then the canary, a fake key, fires, and the switch stops everything.', act: m => m.set({ outside: true, breaker: true, canary: true, rule: false, stats: false }) },
    { t: 'Slow drift', home: true, say: 'A rate detector adapts to a moving baseline. A patient attacker creeps up slowly enough that it never fires.', act: m => m.set({ outside: true, breaker: false, canary: false, rule: false, stats: true }) },
    { t: 'Hard rules too', home: true, say: 'Layer a rule that doesn\'t bend: never send to an unknown domain. Every detector lives where the agent can\'t change it.', act: m => m.set({ outside: true, breaker: true, canary: true, rule: true, stats: true }) },
  ],
  check: [
    { q: 'What makes a kill switch real?', options: ['The agent can read it but never write it', 'It is checked at start-up', 'It turns itself back on'], answer: 0, why: 'Otherwise an injected page can disable it.', hint: 'Try Keep the kill switch in the agent\'s config.' },
    { q: 'What does a circuit breaker stop?', options: ['One pattern, such as five identical calls', 'The whole agent', 'Spending'], answer: 0, why: 'It pauses a path and escalates.', hint: 'Look at turns 5 to 9.' },
    { q: 'Why aren\'t statistical detectors enough?', options: ['A patient attacker shifts the baseline slowly', 'They are too slow', 'They never fire'], answer: 0, why: 'Pair them with hard rules.', hint: 'Try Trust the rate detector alone.' },
  ],
  terms: [
    ['Kill switch', 'A boolean outside the agent\'s reach that stops it.'],
    ['Circuit breaker', 'Closed, open, half-open: pauses one failing pattern.'],
    ['Canary token', 'Bait with no legitimate use; touching it is the alarm.'],
    ['Hard rule', 'A fixed limit that doesn\'t adapt, like "no unknown domains".'],
    ['Statistical detector', 'Flags deviations from a moving baseline.'],
    ['Half-open', 'After a cool-down, a probe is allowed to test recovery.'],
  ],
  deeper: '<p><b>Quarantine.</b> Network policy can redirect a quarantined workload\'s traffic to a forensic sink at the kernel level, so an alarm turns into containment quickly.</p><p><b>What no detector catches.</b> Harm composed from allowed steps, and payloads that disable the detector first. Keep detectors out of the agent\'s edit surface.</p><p><b>About this machine.</b> The sixteen turns are fixed; each detector\'s effect, and what happens after, is decided live.</p>',
  code: {
    title: 'A breaker, a canary, a switch',
    note: 'Adapted from the course\'s detector sketches (code/main.py).',
    text: `
class Breaker:
    def __init__(self, limit=5): self.limit, self.last, self.n, self.state = limit, None, 0, "closed"
    def allow(self, call):
        self.n = self.n + 1 if call == self.last else 1
        self.last = call
        if self.n >= self.limit: self.state = "open"; escalate(call)
        return self.state == "closed"

CANARY = "AKIA-FAKE-NO-PRIVILEGE"                  # planted, never used
def on_read(value, agent):
    if CANARY in value: alarm(agent); kill_switch.set(False, by="ops")

def act(agent, action):
    if not kill_switch.get():    # read-only to the agent; checked every time
        return "stopped"
`,
  },
};
