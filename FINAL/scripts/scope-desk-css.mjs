/* Scopes Requirements/bss-desk/styles.css under a .bssDesk wrapper so the desk's
   tile look can be reused without its global element selectors leaking out.
   Needs: postcss + postcss-prefix-selector (run with NODE_PATH pointing at them). */
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import prefix from 'postcss-prefix-selector';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'Requirements/bss-desk/styles.css');
const OUT = path.join(ROOT, 'Web/src/lib/desk/desk.css');

let css = fs.readFileSync(SRC, 'utf8');
css = css.replace(/^html,\s*body\s*\{/m, '.bssDesk {');
css = css.replace(/^body\s*\{/m, '.bssDesk {');
css = css.replace(/body\.locked/g, '.bssDesk.locked');
css = css.replace(/:root\s*\{/g, '.bssDesk {');
css = css.replace(/@keyframes\s+pulse\b/g, '@keyframes bssDeskPulse');
css = css.replace(/(animation:[^;]*?)\bpulse\b/g, '$1bssDeskPulse');

const OVERRIDES = `
/* ---------- BSS integration overrides ---------- */
/* The desk body sits under the portal header. */
.bssDesk { height: calc(100dvh - var(--bss-header-height, 3.5rem)); overflow: hidden; }
/* 6 document tiles: 3 columns. */
.bssDesk .desk { grid-template-columns: 320px minmax(0, 1fr); }
.bssDesk .tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); }
@media (max-width: 1280px) {
  .bssDesk .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(0, 1fr)); }
}
`;

postcss([
  prefix({
    prefix: '.bssDesk',
    transform(_prefix, selector, prefixed, _filePath, rule) {
      const parent = rule && rule.parent;
      if (parent && parent.type === 'atrule' && /keyframes/.test(parent.name)) return selector;
      if (/^\s*(from|to|\d+%)\s*$/i.test(selector)) return selector;
      if (selector.includes('.bssDesk')) return selector;
      return prefixed;
    },
  }),
])
  .process(css, { from: SRC })
  .then((r) => {
    const out = r.css
      .replace('.bssDesk html, .bssDesk body { height: auto; }', '.bssDesk { height: auto; }')
      .replace('.bssDesk body { display: block; }', '.bssDesk { display: block; }');
    fs.writeFileSync(OUT, out + OVERRIDES);
    console.log('wrote', OUT);
  })
  .catch((e) => { console.error(e); process.exit(1); });
