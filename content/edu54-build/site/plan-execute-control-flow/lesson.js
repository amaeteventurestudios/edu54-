// Plan and execute (phase 19, lesson 24): a Windhoek logistics agent makes a plan of typed steps. An executor walks them with a cursor. On failure, control goes back to the planner with the error, and it replans from the cursor; finished steps stay.
// Replanning from scratch redoes work. Replanning blind repeats the mistake. A diff shows what changed. The step list is really edited below.
const PLAN = ['Find order', 'Check stock', 'Book truck', 'Print label', 'Notify client'];
function run(o) {
  const steps = PLAN.map(n => ({ n, st: 'wait' })); let done = 0, redo = 0, rev = 0, fail = o.fail, tries = 0, loop = false;
  for (let i = 0; i < steps.length; i++) {
    if (i === fail) {
      rev++;
      if (!o.err) { tries = 3; loop = true; steps[i].st = 'failed'; break; }
      if (o.scratch) { redo += i; }
      steps[i] = { n: 'Book rail instead', st: 'new' }; done++; continue;
    }
    steps[i].st = 'done'; done++;
  }
  return { steps, done, redo, rev, tries, loop, ok: !loop, turns: done + redo + (rev ? 1 : 0) + tries };
}

export default {
  slug: 'plan-execute-control-flow',
  title: 'Plan and execute: replan from where you are',
  description: 'A plan is a list of typed steps with a cursor. When one fails, the error goes back, and only the rest changes.',
  overview: 'Reacting one step at a time works for small jobs, and loses the thread on long ones. Plan-execute separates the two. A planner writes an ordered list of typed steps. An executor walks them with a cursor, and on failure hands control back with the error. The planner replans from the cursor: finished steps stay finished, and it knows why the last one failed. A plan diff shows what changed, which helps people and logs. Replanning from zero repeats work, and any side effects with it. Replanning without the error repeats the mistake. This lesson runs a truck booking for a logistics firm in Windhoek.',
  keywords: ['plan and execute', 'replanning', 'agent control flow', 'plan diff', 'AI agents', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { fail: 2, err: true, scratch: false, diff: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const planner = add(P.robot('#7B6FA8', { scale: 0.85 })); planner.position.set(-2.1, 0.03, -0.3);
    const X = i => -1.2 + i * 0.68;
    const B = PLAN.map((n, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.box(0.55, 0.32, 0.55, '#fff', { r: 0.05, material: m }); b.position.set(X(i), 0.03, -0.1); S.add(b); return m; });
    const rail = P.box(3.5, 0.03, 0.1, '#6B6E7E', { r: 0.01 }); rail.position.set(0.16, 0.03, 0.42); S.add(rail);
    const cursor = add(P.robot(SAF, { scale: 0.4 })); cursor.userData.noFit = true;
    const diff = add(P.stack(0.42, 0.34, 0.09, { max: 4, color: SAF })); diff.position.set(2.3, 0.03, -0.1);
    S.add(P.keep(-2.45, 2.5, 0.9, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      B.forEach((m, i) => m.color.set({ done: GOOD, new: SAF, failed: RED, wait: GREY }[R.steps[i].st]));
      diff.userData.set({ n: st.diff ? R.rev : 0, colors: Array(4).fill(SAF) }); planner.userData.set({ busy: R.rev > 0 });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [
      { type: 'slider', label: 'Failure at step', min: 0, max: 5, step: 1, get: () => st.fail, set: v => set({ fail: v }), fmt: v => v > 4 ? 'none' : PLAN[v] },
      tg('err', 'Pass the error to the planner', 'Pass error'), tg('scratch', 'Replan from the start', 'From zero'), tg('diff', 'Record a plan diff', 'Diff'),
    ];
    const readouts = [
      { label: 'Result', get: () => ({ v: R.ok ? 'plan finished' : 'stuck on a step', sub: `${R.rev} revisions`, good: R.ok, bad: !R.ok }) },
      { label: 'Steps repeated', get: () => ({ v: `${R.redo + R.tries}`, sub: 'done again', good: !(R.redo + R.tries), bad: R.redo + R.tries > 1 }) },
      { label: 'Turns', get: () => ({ v: `${R.turns}` }) },
    ];
    const labels = [
      { name: 'p', t: 'The planner', d: 'Only it changes the plan', icon: 'user', atV: V(-2.35, 0.5, -0.3) },
      { name: 'd', t: 'Plan diffs', d: 'What changed, and why', icon: 'book', atV: V(2.42, 0.2, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Replan without the error', hint: 'same plan again', on: () => set({ ...D0, err: false }), off: reset },
      { label: 'Start again from the top', hint: 'finished work repeats', on: () => set({ ...D0, scratch: true, fail: 3 }), off: reset },
      { label: 'No record of changes', hint: 'what happened?', on: () => set({ ...D0, diff: false }), off: reset },
    ];
    function status() {
      if (R.loop) return { ok: false, msg: `<b>Three more tries at the same step.</b> The planner never learned why it failed, so it wrote the same plan. Hand back the error, not just "failed".` };
      if (st.scratch && R.redo) return { ok: false, msg: `<b>${R.redo} finished steps ran again.</b> Replanning from zero repeats work and any side effects. Keep what is done, and replan from the cursor.` };
      if (!st.diff && R.rev) return { ok: false, msg: '<b>The plan changed, and nobody can say how.</b> A diff per revision tells a reviewer what happened and why.' };
      if (!R.rev) return { ok: true, msg: '<b>Five steps, no failures.</b> Move the failure slider and watch it adapt.' };
      return { ok: true, msg: `<b>Step ${st.fail + 1} failed, and the rest was replanned from there.</b> The truck was full, so the new step books rail. Finished work stayed finished.` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.4) % 5; cursor.position.set(X(Math.floor(u)), 0.06, 0.42); cursor.userData.set({ busy: true }); },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'A plan', home: true, say: 'A logistics agent in Windhoek writes a plan of five typed steps. An executor walks them with a cursor.', act: m => m.set({ fail: 5, err: true, scratch: false, diff: true }) },
    { t: 'A failure', home: true, say: 'The truck is full, and step three fails. The executor stops, and hands back.', act: m => m.set({ fail: 2, err: false, scratch: false, diff: true }) },
    { t: 'Pass the error', home: true, say: 'Give the planner the reason, and it can choose differently.', act: m => m.set({ fail: 2, err: true, scratch: false, diff: true }) },
    { t: 'From the cursor', home: true, say: 'Finished steps stay finished. Only the rest changes.', act: m => m.set({ fail: 2, err: true, scratch: false, diff: true }) },
    { t: 'Not from zero', home: true, say: 'Start again from the top, and finished work repeats, with any side effects.', act: m => m.set({ fail: 3, err: true, scratch: true, diff: true }) },
    { t: 'A diff', home: true, say: 'Record what changed in each revision. Reviewers can then follow the story.', act: m => m.set({ fail: 2, err: true, scratch: false, diff: true }) },
  ],
  check: [
    { q: 'What goes back to the planner on failure?', options: ['The error and the cursor', 'Nothing', 'The whole transcript'], answer: 0, why: 'It must know where and why.', hint: 'Try Replan without the error.' },
    { q: 'Why replan from the cursor?', options: ['Finished steps stay finished', 'It is more typing', 'Models prefer it'], answer: 0, why: 'Repeating steps repeats side effects.', hint: 'Try Start again from the top.' },
    { q: 'What is a plan diff for?', options: ['Showing what changed and why', 'Saving tokens', 'Faster runs'], answer: 0, why: 'People and logs can follow it.', hint: 'Try No record of changes.' },
  ],
  terms: [['Planner', 'Writes the list of steps.'], ['Executor', 'Runs steps in order.'], ['Cursor', 'The current step.'], ['Replan', 'Revising what remains.'], ['Plan diff', 'What changed between plans.']],
  deeper: '<p><b>When to use it.</b> Long jobs with a known shape. Short exploratory work can stay reactive.</p><p><b>Typed steps.</b> A step with a type and arguments can be validated before it runs.</p><p><b>This run</b> really edits the step list.</p>',
  code: {
    title: 'Execute and replan',
    note: 'Adapted from the course\'s control flow (code/main.py).',
    text: `
def run(goal):
    plan, cursor = planner(goal), 0
    while cursor < len(plan):
        result = execute(plan[cursor])
        if result.ok:
            cursor += 1
        else:
            new = planner(goal, done=plan[:cursor], error=result.error)
            log_diff(plan, new)
            plan = plan[:cursor] + new
`,
  },
};
