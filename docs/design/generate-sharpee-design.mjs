/**
 * generate-sharpee-design.mjs — Sharpee website-redesign palette sheet.
 *
 * Develops David's five seed colors (docs/design/sharpee-colors.png, Coolors,
 * 2026-07-19) into the working design palette: tint/shade ramps, light + dark
 * theme role mappings, and WCAG contrast ratios computed for every text
 * pairing. Emits sharpee-design.html (self-contained, viewable directly) and
 * screenshots it to sharpee-design.png via the zifmia playwright install
 * (the g2/g3 browser-proof pattern).
 *
 * Run: node docs/design/generate-sharpee-design.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
// The version badge tracks the lockstep platform version — read it, never hardcode.
const SHARPEE_VERSION = createRequire(import.meta.url)(
  join(REPO_ROOT, 'packages', 'sharpee', 'package.json'),
).version;

// ---------------------------------------------------------------- seeds
const SEEDS = {
  rose: '#C6878F',
  taupe: '#B79D94',
  gray: '#969696',
  slate: '#67697C',
  navy: '#253D5B',
};

// ---------------------------------------------------------------- color math
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h, s, l];
}
function hslToRgb([h, s, l]) {
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
/** WCAG relative luminance. */
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** WCAG contrast ratio between two hex colors. */
function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// Ramp steps: name → target lightness. Saturation eases off in the tints so
// pale steps read as washes, not pastel candy; shades keep the seed's chroma.
const STEPS = [
  ['50', 0.96, 0.45], ['100', 0.90, 0.6], ['200', 0.82, 0.75], ['300', 0.72, 0.9],
  ['400', 0.60, 1], ['500', 0.48, 1], ['600', 0.38, 1], ['700', 0.28, 1],
  ['800', 0.18, 1], ['900', 0.12, 1],
];
function ramp(seedHex) {
  const [h, s] = rgbToHsl(hexToRgb(seedHex));
  const out = {};
  for (const [name, l, satMul] of STEPS) out[name] = rgbToHex(hslToRgb([h, s * satMul, l]));
  return out;
}
const R = Object.fromEntries(Object.entries(SEEDS).map(([k, v]) => [k, ramp(v)]));

// ---------------------------------------------------------------- themes
const WHITE = '#FFFFFF';
const LIGHT = {
  // Crisp white background (David, 2026-07-23) — dropped the warm taupe·50 canvas
  // that read as rose. Canvas == surface now (no page/card contrast, by choice).
  canvas: { hex: WHITE, note: 'white' },
  surface: { hex: WHITE, note: 'white' },
  ink: { hex: R.navy['800'], note: 'navy·800', on: ['canvas', 'surface'] },
  muted: { hex: R.slate['600'], note: 'slate·600', on: ['canvas', 'surface'] },
  link: { hex: R.navy['600'], note: 'navy·600', on: ['canvas', 'surface'] },
  border: { hex: R.gray['200'], note: 'gray·200' },
  wash: { hex: R.navy['100'], note: 'navy·100' },
  codeBg: { hex: R.slate['100'], note: 'slate·100' },
  button: { hex: SEEDS.navy, note: 'navy·seed', text: WHITE },
};
const DARK = {
  canvas: { hex: R.navy['900'], note: 'navy·900' },
  surface: { hex: R.navy['800'], note: 'navy·800' },
  ink: { hex: R.taupe['50'], note: 'taupe·50', on: ['canvas', 'surface'] },
  muted: { hex: R.gray['300'], note: 'gray·300', on: ['canvas', 'surface'] },
  link: { hex: R.navy['300'], note: 'navy·300', on: ['canvas', 'surface'] },
  border: { hex: R.slate['700'], note: 'slate·700' },
  wash: { hex: R.slate['800'], note: 'slate·800' },
  codeBg: { hex: R.navy['700'], note: 'navy·700' },
  button: { hex: R.navy['300'], note: 'navy·300', text: R.navy['900'] },
};

function badge(ratio) {
  const r = ratio.toFixed(2);
  if (ratio >= 7) return `${r} AAA`;
  if (ratio >= 4.5) return `${r} AA`;
  if (ratio >= 3) return `${r} AA-lg`;
  return `${r} ✗`;
}

// Console report so the mapping can be tuned against the numbers.
for (const [themeName, theme] of [['LIGHT', LIGHT], ['DARK', DARK]]) {
  for (const [role, def] of Object.entries(theme)) {
    if (def.on) for (const bg of def.on) console.log(`${themeName} ${role} on ${bg}: ${badge(contrast(def.hex, theme[bg].hex))}`);
    if (def.text) console.log(`${themeName} ${role} text: ${badge(contrast(def.text, def.hex))}`);
  }
}

// ---------------------------------------------------------------- html
const swatch = (hex, label, sub) => `
  <div class="sw"><div class="chip" style="background:${hex}"></div>
  <div class="swl"><b>${label}</b><span>${hex}</span>${sub ? `<span>${sub}</span>` : ''}</div></div>`;

const rampRow = (name, seedHex) => {
  // Mark the step whose lightness sits closest to the seed's.
  const seedL = rgbToHsl(hexToRgb(seedHex))[2];
  const nearest = STEPS.reduce((a, b) => (Math.abs(b[1] - seedL) < Math.abs(a[1] - seedL) ? b : a))[0];
  return `
  <div class="ramp"><div class="rname">${name}<span>${seedHex}</span></div>
  ${Object.entries(R[name]).map(([step, hex]) => `
    <div class="rstep" style="background:${hex};color:${contrast(hex, WHITE) >= 3 ? '#FFF' : R.navy['900']}">
      <b>${step}</b><span>${hex.slice(1)}</span>${step === nearest ? '<em>≈ seed</em>' : ''}</div>`).join('')}
  </div>`;
};

const roleCard = (title, theme) => `
  <div class="theme" style="background:${theme.canvas.hex};border:1px solid ${theme.border.hex}">
    <h3 style="color:${theme.ink.hex}">${title}</h3>
    <div class="roles">
      ${Object.entries(theme).map(([role, def]) => `
        <div class="role" style="border-color:${theme.border.hex}">
          <div class="chip" style="background:${def.hex};border:1px solid ${theme.border.hex}"></div>
          <div class="swl" style="color:${theme.ink.hex}"><b>${role}</b><span>${def.hex} · ${def.note}</span>
          ${def.on ? def.on.map((bg) => `<span>on ${bg}: ${badge(contrast(def.hex, theme[bg].hex))}</span>`).join('') : ''}
          ${def.text ? `<span>label: ${badge(contrast(def.text, def.hex))}</span>` : ''}</div>
        </div>`).join('')}
    </div>
    <div class="mock" style="background:${theme.surface.hex};border:1px solid ${theme.border.hex}">
      <div class="mocknav" style="background:${title === 'Light' ? SEEDS.navy : theme.surface.hex};border-bottom:1px solid ${theme.border.hex}">
        <b style="color:${title === 'Light' ? WHITE : theme.ink.hex}">Sharpee</b>
        <span style="color:${title === 'Light' ? R.taupe['200'] : theme.muted.hex}">Chord · Docs · Tutorial · Play</span>
      </div>
      <div class="mockbody">
        <h4 style="color:${theme.ink.hex}">Parser IF, composed.</h4>
        <p style="color:${theme.muted.hex}">Write worlds in Chord, run them anywhere. <a style="color:${theme.link.hex}">Read the Fernhill tutorial</a>.</p>
        <code style="background:${theme.codeBg.hex};color:${theme.ink.hex}">create Tobias · a person, proper · pronouns he</code>
        <div><button style="background:${theme.button.hex};color:${theme.button.text}">Get started</button>
        <span class="tag" style="background:${theme.wash.hex};color:${theme.ink.hex}">v${SHARPEE_VERSION}</span></div>
      </div>
    </div>
  </div>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Sharpee — Design Palette v1</title><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font: 14px/1.5 -apple-system, 'Segoe UI', sans-serif; background:#FFFFFF; color:${R.navy['900']}; padding:48px; width:1280px; }
  h1 { font-size:28px; letter-spacing:-0.02em; }
  .sub { color:${R.slate['500']}; margin:4px 0 32px; }
  h2 { font-size:15px; text-transform:uppercase; letter-spacing:0.08em; color:${R.slate['600']}; margin:36px 0 14px; }
  .seeds { display:flex; gap:16px; }
  .sw { flex:1; } .sw .chip { height:84px; border-radius:8px; }
  .swl { display:flex; flex-direction:column; margin-top:6px; font-size:12px; color:${R.slate['600']}; }
  .swl b { color:${R.navy['800']}; font-size:13px; }
  .ramp { display:flex; align-items:stretch; margin-bottom:8px; }
  .rname { width:110px; font-weight:600; display:flex; flex-direction:column; justify-content:center; }
  .rname span { font-weight:400; font-size:11px; color:${R.slate['500']}; }
  .rstep { flex:1; height:64px; padding:6px 0 0 8px; font-size:10px; display:flex; flex-direction:column; }
  .rstep:first-of-type { border-radius:8px 0 0 8px; } .rstep:last-of-type { border-radius:0 8px 8px 0; }
  .rstep b { font-size:11px; } .rstep em { font-style:normal; font-size:9px; opacity:0.85; }
  .themes { display:flex; gap:24px; }
  .theme { flex:1; border-radius:12px; padding:20px; }
  .theme h3 { margin-bottom:12px; }
  .roles { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:16px; }
  .role { display:flex; gap:8px; } .role .chip { width:40px; height:40px; border-radius:6px; flex:none; }
  .role .swl { margin-top:0; font-size:10px; color:inherit; } .role .swl b { font-size:12px; color:inherit; }
  .role .swl span { color:inherit; opacity:0.75; }
  .mock { border-radius:10px; overflow:hidden; }
  .mocknav { display:flex; justify-content:space-between; align-items:center; padding:10px 16px; font-size:13px; }
  .mockbody { padding:18px 16px; display:flex; flex-direction:column; gap:10px; }
  .mockbody h4 { font-size:20px; } .mockbody a { text-decoration:underline; }
  .mockbody code { font:12px ui-monospace, monospace; padding:8px 10px; border-radius:6px; display:inline-block; }
  .mockbody button { border:0; padding:8px 16px; border-radius:6px; font-weight:600; font-size:13px; }
  .tag { font-size:11px; padding:4px 8px; border-radius:99px; margin-left:10px; }
  .foot { margin-top:36px; font-size:11px; color:${R.slate['500']}; }
</style></head><body>
  <h1>Sharpee — Design Palette v1</h1>
  <div class="sub">Developed from David's seed set (docs/design/sharpee-colors.png, Coolors) · 2026-07-19 · contrast ratios are computed WCAG values</div>
  <h2>Seeds</h2>
  <div class="seeds">${Object.entries(SEEDS).map(([n, h]) => swatch(h, n, 'seed')).join('')}</div>
  <h2>Ramps</h2>
  ${Object.entries(SEEDS).map(([n, h]) => rampRow(n, h)).join('')}
  <h2>Theme roles &amp; sample</h2>
  <div class="themes">${roleCard('Light', LIGHT)}${roleCard('Dark', DARK)}</div>
  <div class="foot">Roles: canvas/surface/ink/muted/link/border/wash/codeBg/button. Navy = brand &amp; structure, rose = accent &amp; action, slate = secondary voice, taupe = warm ground, gray = chrome. Generated by docs/design/generate-sharpee-design.mjs — edit mappings there and re-run.</div>
</body></html>`;

writeFileSync(join(HERE, 'sharpee-design.html'), html);

// ---------------------------------------------------------------- css tokens
// Single source of truth for the website theme: ramp variables + semantic
// role variables (light defaults, dark via prefers-color-scheme). Written
// beside this sheet and copied into the website when the tree exists.
const roleVars = (theme) => Object.entries(theme)
  .map(([role, def]) => `  --sh-${role}: ${def.hex};${def.text ? `\n  --sh-${role}-text: ${def.text};` : ''}`)
  .join('\n');
const rampVars = Object.entries(R)
  .flatMap(([name, steps]) => Object.entries(steps).map(([step, hex]) => `  --sh-${name}-${step}: ${hex};`))
  .join('\n');
const css = `/* sharpee-palette.css — GENERATED by docs/design/generate-sharpee-design.mjs.
 * Do not edit by hand: change the generator's mappings and re-run.
 * Ramps + semantic roles from the v1 palette (docs/design/sharpee-design.png). */
:root {
${rampVars}
${roleVars(LIGHT)}
}
@media (prefers-color-scheme: dark) {
  :root {
${roleVars(DARK)}
  }
}
`;
writeFileSync(join(HERE, 'sharpee-palette.css'), css);
const websiteCss = join(REPO_ROOT, 'website', 'src', 'app', 'palette.css');
try {
  writeFileSync(websiteCss, css);
  console.log('wrote website/src/app/palette.css');
} catch { /* website tree absent — sheet-only run */ }

const zifmiaRequire = createRequire(join(REPO_ROOT, 'tools', 'zifmia', 'package.json'));
const { chromium } = zifmiaRequire('@playwright/test');
const browser = await chromium.launch({ headless: true }).catch(() => chromium.launch({ channel: 'chrome', headless: true }));
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await page.goto('file://' + join(HERE, 'sharpee-design.html'), { waitUntil: 'load' });
await page.screenshot({ path: join(HERE, 'sharpee-design.png'), fullPage: true });
await browser.close();
console.log('wrote sharpee-design.html + sharpee-design.png');
