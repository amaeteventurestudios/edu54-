// EDU54 Workbench changes to the source site's home page (kit/home.js), applied by build-edu54-workbench-page.sh.
// On desktop the circle never touches the words or the cube: on the hero it sits round the cube in the space right of the
// headline (the cube moves over or shrinks to make room); on a chapter it sits round the words and stops short of the
// cube; and it fades while it travels between the two. The headline fades before the cube slides under it.
// Usage: node edu54-workbench-home.mjs path/to/kit/home.js  (stops if the source has changed shape)
import { readFileSync, writeFileSync } from 'node:fs';
const file = process.argv[2];
let js = readFileSync(file, 'utf8');
const swap = (from, to) => {
  if (js.split(from).length !== 2) { console.error(`edu54-workbench-home: cannot find, exactly once:\n${from}`); process.exit(1); }
  js = js.replace(from, () => to);
};
// state for the desktop fit
swap('let fitD = 24, fitY = 0.3, fitN = 0,', 'let fitD = 24, fitY = 0.3, fitN = 0, xs = 0, fd = 1, wN = 0, corner = new THREE.Vector3(),');
// the words go first; the cube only starts across once they are nearly gone
swap('hero.style.opacity = 1 - h; hero.style.pointerEvents = h > 0.5 ?', 'hero.style.opacity = 1 - clamp(h * 2.2); hero.style.pointerEvents = h > 0.4 ?');
swap('const d = portrait ? fitD : 14.5 + h * 2.5,', 'const hc = ease(clamp((h - 0.4) / 0.6)), d = portrait ? fitD : (14.5 + h * 2.5) * (1 + (fd - 1) * (1 - hc)),');
swap('const sx = portrait ? 0 : 0.2 * (1 - h) - 0.21 * h,', 'const sx = portrait ? 0 : (0.2 + xs) * (1 - hc) - 0.21 * hc,');
// measure the hero words and the cube on screen, then fit the circle between them
swap('    let tx = cx, ty = cy, tr = rc * 1.08;\n', `    let tx = cx, ty = cy, tr = rc * 1.08;
    let cr = cx + rc;
    if (!portrait) {
      cube.updateMatrixWorld(); cr = -1e9;
      for (const s of slabs) for (let i = 0; i < 8; i++) {
        corner.set(i & 1 ? W / 2 : -W / 2, i & 2 ? H / 2 + 0.25 : -H / 2, i & 4 ? W / 2 : -W / 2).add(s.g.position);
        cube.localToWorld(corner).project(cam); cr = Math.max(cr, (corner.x + 1) / 2 * vw);
      }
      const pr = pin.getBoundingClientRect();
      let hr = 0; for (const el of hero.children) hr = Math.max(hr, el.getBoundingClientRect().left - pr.left + el.scrollWidth);
      hr += h * 140;
      const L = hr + 48, R = vw - 32, room = Math.min(R - L, vh - 130), k = wN < 30 ? 1 : 1 - Math.exp(-dt * 6); wN++;
      if (h < 0.4) {
        fd = clamp(fd + (Math.max(1, fd * (tr * 2) / room) - fd) * k, 1, 2.5);
        const want = clamp(0.7 * vw, L + tr, R - tr);
        xs = clamp(xs + (want - cx) / vw * k, -0.1, 0.25);
      }
    }
`);
swap(`      tr = tr + (Math.max(Math.hypot(r.width, r.height) / 2 + 40, vh * 0.46) - tr) * k;
    }`, `      // round the words, as big as before (but inside the screen's height), moved right if that is what it takes to clear the cube
      const wr = Math.min(Math.max(Math.hypot(r.width, r.height) / 2 + 40, vh * 0.46), vh / 2 - 8);
      tx = cx + (Math.max(r.left - pr.left + r.width / 2, cr + 32 + wr) - cx) * k;
      tr = tr + (wr - tr) * k;
      sun.style.opacity = (0.16 * Math.min(clamp((Math.abs(2 * k - 1) - 0.2) * 2), k < 0.5 ? 1 - clamp(best * 5) : 1)).toFixed(3);
    } else sun.style.opacity = '';`);
writeFileSync(file, js);
