// Security, secrets and audit for LLM services (phase 17, lesson 25): a Kano health insurer runs a claims assistant. Three incidents arrive in one
// quarter: an intern commits a .env file with the provider key; a member types their NIN and phone number into the chat; an injected prompt tries
// to exfiltrate data through a DNS lookup. A vault the gateway reads keys from, PII redaction with consistent placeholders, an egress allow-list
// and an append-only audit log are toggled; exposure, time to rotate, what the provider sees and the evidence left are computed live.
const MSG = 'My NIN is 12345678901 and my phone is 0803 555 0192. Is my claim for 0803 555 0192 approved?';
function redact(text, consistent) {
  const map = new Map(); let n = 0;
  return text.replace(/\b\d{11}\b|\b0\d{3} \d{3} \d{4}\b/g, m => {
    const kind = m.length === 11 ? 'NIN' : 'PHONE';
    if (!consistent) return `[${kind}]`;
    if (!map.has(m)) map.set(m, `[${kind}_${++n}]`);
    return map.get(m);
  });
}
function q(o) {
  const keyLeak = !o.vault, rotate = o.vault ? 2 : 6 * 60;
  const sent = o.redact ? redact(MSG, o.consistent) : MSG;
  const exfil = !o.egress;
  return { keyLeak, rotate, sent, exfil, evidence: o.audit };
}

export default {
  slug: 'llm-security-secrets-audit',
  title: 'Securing an LLM service: keys, personal data, egress, audit',
  description: 'A health insurer in Kano runs a claims assistant, and its quarter brings a key leak, personal data in prompts and an exfiltration try. Hold every boundary.',
  overview: 'An LLM service has to defend four things and then prove it did. Secrets: keys in config files, environment files in version control, spreadsheets or static long-lived credentials leak, and once in git history they stay there; a scanner such as TruffleHog or GitGuardian finds them, but rotating means editing every file and redeploying. Put credentials in one vault (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, Google Secret Manager), let services authenticate with their workload identity rather than a stored key, and have the AI gateway fetch the provider key at request time, so rotation is a change in one place, done at least every ninety days. Personal data: users type identity numbers, phone numbers and health details into chats. Redact before the prompt leaves your infrastructure, at inference time rather than as later cleanup, and use consistent placeholders, the same value becoming the same token each time, so the model can still tell that two mentions are the same phone number. Map placeholders back only for the response, inside your boundary. Egress: an inference pod that can reach any host can be tricked by an injected prompt into exfiltrating data, even through DNS lookups to an attacker\'s domain; allow only the provider endpoints and needed services. Audit: keep an append-only log of who called which model with what data class, key version and decision, so after an incident you have evidence rather than guesses. The supply chain matters too: CI systems hold powerful credentials, so scope them narrowly and use short-lived tokens.',
  keywords: ['secrets management', 'PII redaction', 'egress control', 'audit logging', 'LLM security', 'data protection', 'DevSecOps'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.3, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { vault: true, redact: true, consistent: true, egress: true, audit: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* your boundary, with the provider and an attacker outside it */
    const wall = P.box(0.08, 0.44, 1.7, '#3B3F52', { r: 0.02 }); wall.position.set(0.85, 0, -0.45); S.add(wall);
    const prov = P.box(0.6, 0.44, 0.56, '#5F6375', { r: 0.06 }); prov.position.set(1.65, 0, -0.5); S.add(prov);
    const atk = P.box(0.6, 0.3, 0.46, '#B5462F', { r: 0.06 }); atk.position.set(1.65, 0, 0.42); S.add(atk);
    /* the key in a vault, or lying out in the open */
    const safeM = new THREE.MeshLambertMaterial({ color: GOOD }), safe = P.box(0.46, 0.42, 0.42, '#fff', { r: 0.05, material: safeM }); safe.position.set(-2.1, 0, -0.95); S.add(safe);
    const loose = P.box(0.32, 0.06, 0.12, BAD, { r: 0.02 }); loose.position.set(-1.55, 0, -0.95); S.add(loose);
    /* messages ride to the provider through the redaction gate */
    const line = P.belt(V(-2.4, 0, -0.5), V(1.3, 0, -0.5), { w: 0.3, speed: 0.85 }); S.add(line);
    const red = P.gate(0.44, GOOD, { h: 0.38 }); red.rotation.y = Math.PI / 2; red.position.set(-0.8, 0, -0.5); S.add(red);
    /* the way out: an allow-list gate, or a leak to the attacker */
    const gap = P.box(0.1, 0.44, 0.56, GOOD, { r: 0.02 }); gap.position.set(0.85, 0, 0.42); S.add(gap);
    const leak = P.pipe([V(-1.2, 0.18, 0.42), V(0.2, 0.2, 0.42), V(1.35, 0.18, 0.42)], BAD, { r: 0.035, n: 6 }); S.add(leak);
    /* the audit log */
    const audit = P.stack(0.46, 0.4, 0.09, { max: 7, color: '#5B8DB8' }); audit.position.set(-2.05, 0, 0.42); S.add(audit);
    S.add(P.keep(-2.45, 2.0, 0.8, -1.25, 0.75));
    const parts = [line, leak];
    let clock = 0;

    let R = null;
    function draw() {
      R = q(st);
      safeM.color.set(st.vault ? GOOD : OFF); loose.visible = !st.vault;
      red.visible = !!st.redact; red.userData.set({ color: st.consistent ? GOOD : SAF });
      gap.visible = !R.exfil; leak.visible = !!R.exfil;
      audit.userData.set({ n: st.audit ? 7 : 1 });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Keys in a vault, fetched by the gateway per request', short: 'Vault', get: () => st.vault, set: v => set({ vault: !!v }) },
      { type: 'toggle', label: 'Redact personal data before it leaves', short: 'Redact', get: () => st.redact, set: v => set({ redact: !!v }) },
      { type: 'toggle', label: 'Consistent placeholders: same value, same token', short: 'Consistent', get: () => st.consistent, set: v => set({ consistent: !!v }) },
      { type: 'toggle', label: 'Egress allow-list', short: 'Egress', get: () => st.egress, set: v => set({ egress: !!v }) },
      { type: 'toggle', label: 'Append-only audit log', short: 'Audit', get: () => st.audit, set: v => set({ audit: !!v }) },
    ];
    const readouts = [
      { label: 'Key rotation', get: () => ({ v: st.vault ? `${R.rotate} min` : `${R.rotate / 60} h`, sub: st.vault ? 'one change in the vault' : '40 files, redeploys', good: st.vault, bad: !st.vault }) },
      { label: 'Personal data sent', get: () => ({ v: st.redact ? 'none' : '2 numbers', sub: 'to the provider', good: st.redact, bad: !st.redact }) },
      { label: 'Evidence', get: () => ({ v: st.audit ? 'logged' : 'none', sub: 'for the regulator', good: st.audit, bad: !st.audit }) },
    ];
    const labels = [
      { name: 'in', t: 'Inside your boundary', d: 'Keys, redaction, egress', icon: 'shield', atV: V(-2.36, 0.25, -0.95) },
      { name: 'aud', t: 'The way out', d: 'Red: data reaches the attacker', icon: 'book', atV: V(1.96, 0.2, 0.42) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Keep keys in config files', hint: 'a committed .env', on: () => set({ ...D0, vault: false }), off: reset },
      { label: 'Redact to one generic tag', hint: 'meaning lost', on: () => set({ ...D0, consistent: false }), off: reset },
      { label: 'Let the service call any host', hint: 'DNS exfiltration', on: () => set({ ...D0, egress: false }), off: reset },
    ];
    function status() {
      if (!st.vault) return { ok: false, msg: '<b>The intern\'s committed .env put the provider key into git history; deleting the file doesn\'t remove it. Rotating meant editing 40 configuration files and redeploying for six hours, with the old key live.</b> Keep keys in a vault, let services authenticate by identity, and have the gateway fetch the key per request: rotation becomes one change.' };
      if (!st.redact) return { ok: false, msg: `<b>The member\'s national ID number and phone number went to the provider in plain text.</b> Redact at inference time, before the prompt leaves your infrastructure; cleaning logs later doesn\'t undo the disclosure.` };
      if (!st.consistent) return { ok: false, msg: `<b>Redacted to generic tags, the provider sees "${R.sent}". It can no longer tell that the phone number asked about is the member\'s own.</b> Use consistent placeholders, the same value becoming the same token, and map them back only inside your boundary.` };
      if (!st.egress) return { ok: false, msg: '<b>An injected prompt made the assistant look up attacker.example with claim data encoded in the name, and nothing blocked the DNS query.</b> Allow outbound traffic only to the provider endpoints and the services you need.' };
      if (!st.audit) return { ok: false, msg: '<b>All three incidents were handled, but there is no record of which key version was used, what data class each call carried or which egress was denied.</b> Without an append-only log, you can\'t show a regulator or a customer what happened.' };
      return { ok: true, msg: `<b>The leaked key was rotated in the vault in ${R.rotate} minutes; the provider saw "${R.sent}"; the DNS exfiltration was blocked; and every step is in an append-only log.</b> Defend the keys, the data and the network, then prove it.` };
    }
    return { update: dt => {
      clock += dt; if (clock > 1.1) { clock = 0; line.userData.send(st.redact ? (st.consistent ? GOOD : SAF) : BAD, { size: 0.16 }); }
      parts.forEach(p => p.userData.tick(dt));
    }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Three incidents', home: true, say: 'A health insurer in Kano runs a claims assistant. In one quarter: a leaked key, personal data in a chat, and an exfiltration attempt.', act: m => m.set({ vault: false, redact: false, consistent: false, egress: false, audit: false }) },
    { t: 'Keys in a vault', home: true, say: 'A committed key stays in git history. Keep keys in a vault the gateway reads, and rotation is one change.', act: m => m.set({ vault: true, redact: false, consistent: false, egress: false, audit: false }) },
    { t: 'Redact before it leaves', home: true, say: 'A member types their ID and phone number. Replace them before the prompt leaves your infrastructure.', act: m => m.set({ vault: true, redact: true, consistent: false, egress: false, audit: false }) },
    { t: 'Keep the meaning', home: true, say: 'Generic tags lose the meaning. Consistent placeholders let the model see that two mentions are the same number.', act: m => m.set({ vault: true, redact: true, consistent: true, egress: false, audit: false }) },
    { t: 'Close the exits', home: true, say: 'An injected prompt tries to leak data through a DNS lookup. An allow-list blocks it.', act: m => m.set({ vault: true, redact: true, consistent: true, egress: true, audit: false }) },
    { t: 'Prove it', home: true, say: 'An append-only audit log turns each defence into evidence.', act: m => m.set({ vault: true, redact: true, consistent: true, egress: true, audit: true }) },
  ],
  check: [
    { q: 'Why isn\'t deleting a committed key file enough?', options: ['The key stays in git history', 'It is enough', 'Git encrypts it'], answer: 0, why: 'Rotate it, and keep keys in a vault.', hint: 'Try Keep keys in config files.' },
    { q: 'Why use consistent placeholders when redacting?', options: ['The model can still tell two mentions are the same value', 'They are shorter', 'They are reversible by anyone'], answer: 0, why: 'Meaning survives redaction.', hint: 'Try Redact to one generic tag.' },
    { q: 'What stops data leaving through an injected DNS lookup?', options: ['An egress allow-list', 'Redaction', 'A vault'], answer: 0, why: 'Only known destinations.', hint: 'Try Let the service call any host.' },
  ],
  terms: [
    ['Secret sprawl', 'Credentials scattered across files, repos and spreadsheets.'],
    ['Vault', 'One managed store for secrets, read by identity.'],
    ['PII redaction', 'Replacing personal data before it leaves your systems.'],
    ['Consistent placeholder', 'The same value always mapped to the same token.'],
    ['Egress allow-list', 'Outbound traffic only to approved destinations.'],
    ['Audit log', 'An append-only record of who did what, with which data.'],
  ],
  deeper: '<p><b>Short-lived credentials.</b> Workload identity and OIDC tokens for CI mean there is no long-lived key to leak; scope each to what it needs.</p><p><b>Supply chain.</b> CI/CD systems hold some of the most powerful credentials an organisation has; a breach there reaches everything they deploy.</p><p><b>About this machine.</b> The incidents and timings are illustrative; the redaction runs live on the example message with a simple pattern for 11-digit IDs and phone numbers.</p>',
  code: {
    title: 'Consistent redaction',
    note: 'Adapted from the course\'s PII scrubber (code/main.py).',
    text: `
import re
PATTERNS = {"NIN": r"\\b\\d{11}\\b", "PHONE": r"\\b0\\d{3} \\d{3} \\d{4}\\b"}

def redact(text):
    mapping, counts = {}, {}
    def sub(kind):
        def f(m):
            v = m.group(0)
            if v not in mapping:
                counts[kind] = counts.get(kind, 0) + 1
                mapping[v] = f"[{kind}_{counts[kind]}]"
            return mapping[v]                    # same value, same placeholder
        return f
    for kind, pat in PATTERNS.items():
        text = re.sub(pat, sub(kind), text)
    return text, {v: k for k, v in mapping.items()}   # keep the reverse map inside

key = vault.read("providers/claude", identity=workload_identity)   # not a .env file
`,
  },
};
