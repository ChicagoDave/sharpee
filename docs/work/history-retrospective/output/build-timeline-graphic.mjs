/**
 * build-timeline-graphic.mjs — emit the wide scrolling timeline graphic.
 *
 * Every number here comes from the indices in this directory: commit counts from
 * index-genai.json, conversations from index-chats.json, summaries from the
 * per-month manifests, C# activity from file mtimes recorded in index-origin.md.
 * Generating rather than hand-authoring keeps 42 aligned month columns honest.
 *
 * Public interface: `node build-timeline-graphic.mjs` → timeline-graphic.html.
 * Owner: retrospective tooling.
 */

import { writeFileSync } from 'node:fs';

const OUT = '/Volumes/Workspace/sharpee-corpus/retrospective/timeline-graphic.html';

/* ---- months: 2023-03 .. 2026-08 ---- */
const MONTHS = [];
for (let y = 2023, m = 3; y < 2026 || m <= 8; ) {
  MONTHS.push(`${y}-${String(m).padStart(2, '0')}`);
  m++;
  if (m > 12) { m = 1; y++; }
  if (y > 2026) break;
}

/* ---- tracks. Each states its own unit; scales are per-track, never shared. ---- */
const csFiles = { '2023-03': 23, '2023-04': 29, '2024-02': 1, '2024-03': 3, '2024-05': 3 };
const convos = { '2024-06': 2, '2024-07': 13, '2024-08': 74, '2024-09': 28, '2024-10': 9, '2024-12': 3, '2025-03': 23, '2025-04': 14, '2025-05': 25, '2025-06': 39 };
const commits = { '2025-03': 2, '2025-06': 1, '2025-07': 13, '2025-08': 85, '2025-09': 3, '2025-12': 151, '2026-01': 429, '2026-02': 126, '2026-03': 85, '2026-04': 231, '2026-05': 104, '2026-06': 255, '2026-07': 391, '2026-08': 179 };
const summaries = { '2025-06': 3, '2025-07': 6, '2025-08': 100, '2025-09': 7, '2025-12': 82, '2026-01': 446, '2026-02': 186, '2026-03': 40, '2026-04': 86, '2026-05': 45, '2026-06': 62, '2026-07': 130, '2026-08': 54 };

const TRACKS = [
  { key: 'cs', label: 'C# files touched', unit: 'peak 29', data: csFiles, tone: 'taupe' },
  { key: 'conv', label: 'Conversations', unit: 'peak 74', data: convos, tone: 'slate' },
  { key: 'commit', label: 'Commits', unit: 'peak 429', data: commits, tone: 'navy' },
  { key: 'summary', label: 'Session summaries', unit: 'peak 446', data: summaries, tone: 'navy-light' },
];

/* ---- the model that signed the most commits each month ---- */
const models = {
  '2025-08': 'Claude', '2025-09': 'Claude',
  '2025-12': 'Opus 4.5', '2026-01': 'Opus 4.5', '2026-02': 'Opus 4.6',
  '2026-03': 'Opus 4.6 · 1M', '2026-04': 'Opus 4.6 · 1M', '2026-05': 'Sonnet 4.6',
  '2026-06': 'Opus 4.8 · 1M', '2026-07': 'Fable 5', '2026-08': 'Fable 5',
};
const MODEL_TONE = {
  'Claude': 'm0', 'Opus 4.5': 'm1', 'Opus 4.6': 'm2', 'Opus 4.6 · 1M': 'm3',
  'Sonnet 4.6': 'm4', 'Opus 4.8 · 1M': 'm5', 'Fable 5': 'm6',
};

/* ---- eras ---- */
const ERAS = [
  { from: '2023-03', to: '2024-05', label: 'C#' },
  { from: '2024-06', to: '2024-12', label: 'C#, with a collaborator' },
  { from: '2025-03', to: '2025-09', label: 'TypeScript' },
  { from: '2025-12', to: '2026-06', label: 'The platform' },
  { from: '2026-07', to: '2026-08', label: 'Chord' },
];

/**
 * The silences. `tracks: null` means every track went quiet; a list means only
 * those did — wall 2 stopped the commits while 39 conversations carried on,
 * which is the distinction the prose cannot draw and this graphic can.
 */
const WALLS = [
  { from: '2023-05', to: '2024-01', label: '11 months', sub: 'first ChatGPT — hallucinated code', tracks: null },
  { from: '2025-04', to: '2025-05', label: '12 weeks', sub: '', tracks: ['commit'] },
  { from: '2025-10', to: '2025-11', label: '16 weeks', sub: 'silent in every source', tracks: null },
];

/* ---- the three returns, the only thing that gets the accent ---- */
const RETURNS = { '2024-03': 'picked back up', '2025-06': 'one commit, twelve weeks', '2025-12': 'Opus 4.5 · 200k · Pro Max' };

const MILESTONES = [
  ['2023-03', 'First C# prototype'],
  ['2023-04', 'StoryRunner: the decomposition that held'],
  ['2024-06', 'First Claude conversation'],
  ['2024-07', 'The name: <code>repos\\sharpee</code>'],
  ['2024-12', 'TypeScript evaluated — not decided'],
  ['2025-03', 'Repo created — twice, same day'],
  ['2025-04', 'The build stops compiling. Work continues in conversation'],
  ['2025-07', 'SpatialIndex replaces the graph'],
  ['2025-12', 'Dungeo launched as dog-food'],
  ['2026-01', 'npm beta · text-services deleted at 13 days old'],
  ['2026-04', 'Server deleted · No-Stub-Under-Test'],
  ['2026-05', 'ADR-174 deletes the text service'],
  ['2026-06', 'Sharpee 1.0.0 · the book in five days'],
  ['2026-07', 'Chord: design to compiler in ten hours'],
  ['2026-08', '5.0.0 on npm · DMG in Apple’s queue'],
];

/**
 * Assign each milestone the first stagger level whose previous label has already
 * ended. Fixed modulo staggering collides whenever two milestones land within a
 * label's width of each other, which they do repeatedly in 2026.
 */
const LABEL_COLS = 4.6; // label width measured in month columns
function stagger(milestones) {
  const levelEnd = [];
  return milestones.map(([m, label]) => {
    const start = MONTHS.indexOf(m);
    let lvl = levelEnd.findIndex((end) => end <= start);
    if (lvl === -1) { lvl = levelEnd.length; }
    levelEnd[lvl] = start + LABEL_COLS;
    return { m, label, lvl };
  });
}

const idx = (m) => MONTHS.indexOf(m) + 2; // +1 for gutter, +1 for 1-based grid
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* ---- build ---- */
let cells = '';

// axis: year label on January (and on the first column)
MONTHS.forEach((m, i) => {
  const [y, mo] = m.split('-');
  const isYear = mo === '01' || i === 0;
  cells += `<div class="ax${isYear ? ' ax-y' : ''}" style="grid-column:${i + 2};grid-row:1">${isYear ? y : ''}<span class="mo">${mo}</span></div>`;
});

// eras
ERAS.forEach((e) => {
  cells += `<div class="era" style="grid-column:${idx(e.from)}/${idx(e.to) + 1};grid-row:2">${esc(e.label)}</div>`;
});

// tracks
TRACKS.forEach((t, ti) => {
  const row = 3 + ti;
  const max = Math.max(...Object.values(t.data));
  cells += `<div class="gut" style="grid-row:${row}"><span class="gl">${esc(t.label)}</span><span class="gu">${esc(t.unit)}</span></div>`;
  MONTHS.forEach((m, i) => {
    const v = t.data[m] ?? 0;
    const h = v ? Math.max(3, Math.round((v / max) * 100)) : 0;
    cells += `<div class="cell" style="grid-column:${i + 2};grid-row:${row}">${
      v ? `<div class="bar ${t.tone}" style="height:${h}%" title="${m}: ${v}"></div>` : ''
    }</div>`;
  });
});

// model band
const modelRow = 3 + TRACKS.length;
cells += `<div class="gut gut-mid" style="grid-row:${modelRow}"><span class="gl">Signed by</span></div>`;
MONTHS.forEach((m, i) => {
  const mod = models[m];
  cells += `<div class="cell mb" style="grid-column:${i + 2};grid-row:${modelRow}">${
    mod ? `<div class="chip ${MODEL_TONE[mod]}" title="${esc(mod)}"></div>` : ''
  }</div>`;
});

// walls, drawn over the tracks they actually silenced
WALLS.forEach((w) => {
  const rows = w.tracks
    ? w.tracks.map((k) => 3 + TRACKS.findIndex((t) => t.key === k))
    : [3, 2 + TRACKS.length];
  const rowSpec = w.tracks ? `${rows[0]}/${rows[0] + 1}` : `${rows[0]}/${rows[1] + 1}`;
  cells += `<div class="wall${w.tracks ? ' wall-partial' : ''}" style="grid-column:${idx(w.from)}/${idx(w.to) + 1};grid-row:${rowSpec}">
    <div class="wl">${esc(w.label)}</div><div class="ws">${esc(w.sub)}</div>
  </div>`;
});

// returns
Object.entries(RETURNS).forEach(([m, label]) => {
  cells += `<div class="ret" style="grid-column:${idx(m)};grid-row:3/${3 + TRACKS.length}"><span>${esc(label)}</span></div>`;
});

// milestones
const msRow = 4 + TRACKS.length;
const staggered = stagger(MILESTONES);
const levels = Math.max(...staggered.map((s) => s.lvl)) + 1;
cells += `<div class="gut gut-top" style="grid-row:${msRow}"><span class="gl">Turning points</span></div>`;
staggered.forEach(({ m, label, lvl }) => {
  cells += `<div class="ms" style="grid-column:${idx(m)};grid-row:${msRow}">
    <div class="msl" style="--n:${lvl}">${label}</div>
  </div>`;
});

const html = `<title>Sharpee — three and a half years</title>
<style>
  :root {
    --ground: #ffffff; --ink: #1b2c41; --muted: #585a6a; --rule: #d1d1d1;
    --panel: #f4f5f7; --void: #eceef1;
    --navy: #294466; --navy-mid: #4775ae; --navy-light: #9cb5d3;
    --slate: #6f7186; --taupe: #926f62; --accent: #a64f5a;
    --m0:#b2b3be; --m1:#294466; --m2:#385c8a; --m3:#4775ae; --m4:#926f62; --m5:#6e94c4; --m6:#9cb5d3;
    --col: 46px;
    --serif: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
    --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --ground:#121d2c; --ink:#f6f4f4; --muted:#b8b8b8; --rule:#41424e;
      --panel:#1b2c41; --void:#182739;
      --navy:#9cb5d3; --navy-mid:#6e94c4; --navy-light:#4775ae;
      --slate:#9091a2; --taupe:#ad8f85; --accent:#bd757e;
      --m0:#585a6a; --m1:#9cb5d3; --m2:#6e94c4; --m3:#4775ae; --m4:#ad8f85; --m5:#385c8a; --m6:#c4b1ab;
    }
  }
  :root[data-theme="dark"] {
    --ground:#121d2c; --ink:#f6f4f4; --muted:#b8b8b8; --rule:#41424e;
    --panel:#1b2c41; --void:#182739;
    --navy:#9cb5d3; --navy-mid:#6e94c4; --navy-light:#4775ae;
    --slate:#9091a2; --taupe:#ad8f85; --accent:#bd757e;
    --m0:#585a6a; --m1:#9cb5d3; --m2:#6e94c4; --m3:#4775ae; --m4:#ad8f85; --m5:#385c8a; --m6:#c4b1ab;
  }
  :root[data-theme="light"] {
    --ground:#ffffff; --ink:#1b2c41; --muted:#585a6a; --rule:#d1d1d1;
    --panel:#f4f5f7; --void:#eceef1;
    --navy:#294466; --navy-mid:#4775ae; --navy-light:#9cb5d3;
    --slate:#6f7186; --taupe:#926f62; --accent:#a64f5a;
    --m0:#b2b3be; --m1:#294466; --m2:#385c8a; --m3:#4775ae; --m4:#926f62; --m5:#6e94c4; --m6:#9cb5d3;
  }

  body { background: var(--ground); color: var(--ink); font-family: var(--mono); margin: 0; padding: 40px 0 64px; }
  header, footer, .legend { max-width: 74ch; padding: 0 28px; }
  h1 { font-family: var(--serif); font-weight: 600; font-size: clamp(28px, 4vw, 44px); line-height: 1.1; margin: 0 0 12px; text-wrap: balance; letter-spacing: -0.01em; }
  .stand { font-family: var(--serif); font-size: 17px; line-height: 1.55; color: var(--muted); margin: 0 0 6px; max-width: 62ch; }
  .meta { font-size: 11.5px; letter-spacing: .07em; text-transform: uppercase; color: var(--muted); margin: 18px 0 26px; }

  .scroller { overflow-x: auto; overflow-y: hidden; padding-bottom: 10px; border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
  .grid {
    display: grid;
    grid-template-columns: 168px repeat(${MONTHS.length}, var(--col));
    grid-template-rows: 34px 26px repeat(${TRACKS.length}, 62px) 26px ${28 + levels * 30}px;
    min-width: max-content;
  }

  /* Bottom-aligned so a track's name sits on the baseline its bars grow from. */
  .gut { grid-column: 1; position: sticky; left: 0; z-index: 5; background: var(--ground);
         border-right: 1px solid var(--rule); display: flex; flex-direction: column; justify-content: flex-end;
         padding: 0 12px 6px 28px; gap: 1px; }
  .gut-mid { justify-content: center; padding-bottom: 0; }
  .gut-top { justify-content: flex-start; padding: 14px 12px 0 28px; }
  .gl { font-size: 11px; letter-spacing: .04em; text-transform: uppercase; }
  .gu { font-size: 10.5px; color: var(--muted); }

  .ax { grid-row: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
        font-size: 10px; color: var(--muted); padding-bottom: 4px; font-variant-numeric: tabular-nums; }
  .ax-y { color: var(--ink); font-weight: 600; }
  .mo { font-size: 9px; opacity: .62; }

  .era { grid-row: 2; font-size: 10.5px; letter-spacing: .09em; text-transform: uppercase; color: var(--muted);
         border-top: 1px solid var(--rule); display: flex; align-items: center; padding-left: 8px; overflow: hidden; white-space: nowrap; }

  .cell { display: flex; align-items: flex-end; justify-content: center; border-left: 1px solid color-mix(in srgb, var(--rule) 45%, transparent); padding: 6px 0 0; }
  .bar { width: 15px; border-radius: 1px 1px 0 0; }
  .bar.taupe { background: var(--taupe); }
  .bar.slate { background: var(--slate); }
  .bar.navy { background: var(--navy); }
  .bar.navy-light { background: var(--navy-mid); }

  .mb { align-items: center; }
  .chip { width: 100%; height: 9px; }
  .m0{background:var(--m0)} .m1{background:var(--m1)} .m2{background:var(--m2)} .m3{background:var(--m3)}
  .m4{background:var(--m4)} .m5{background:var(--m5)} .m6{background:var(--m6)}

  .wall { z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
    background:
      repeating-linear-gradient(135deg, transparent 0 7px, color-mix(in srgb, var(--muted) 22%, transparent) 7px 8px),
      var(--void);
    border-left: 1px solid var(--rule); border-right: 1px solid var(--rule); }
  .wall-partial { background:
      repeating-linear-gradient(135deg, transparent 0 7px, color-mix(in srgb, var(--muted) 16%, transparent) 7px 8px); }
  .wl { font-family: var(--serif); font-size: 19px; }
  .ws { font-size: 10px; color: var(--muted); text-align: center; padding: 0 6px; line-height: 1.35; }

  /* Returns run vertically inside the track block so they never reach the axis
     or the era ribbon. writing-mode keeps the glyphs upright-legible without a
     transform that would escape the grid cell. */
  .ret { z-index: 4; position: relative; pointer-events: none; overflow: hidden; }
  .ret::before { content: ""; position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: var(--accent); transform: translateX(-50%); }
  .ret span { position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
    writing-mode: vertical-rl; white-space: nowrap; font-size: 9.5px; letter-spacing: .02em;
    color: var(--accent); background: var(--ground); padding: 5px 1px; }

  .ms { position: relative; }
  .ms::before { content: ""; position: absolute; left: 50%; top: 0; width: 1px; height: calc(14px + var(--n, 0) * 30px); background: var(--rule); }
  .msl { position: absolute; left: 50%; top: calc(16px + var(--n, 0) * 30px); width: 205px;
    font-size: 11px; line-height: 1.3; color: var(--ink); border-left: 2px solid var(--navy-mid); padding-left: 7px; }
  .msl code { font-size: 10.5px; color: var(--muted); }

  .legend { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 24px; font-size: 11px; color: var(--muted); }
  .key { display: flex; align-items: center; gap: 6px; }
  .sw { width: 22px; height: 9px; }
  .sw.hatch { background: repeating-linear-gradient(135deg, transparent 0 5px, color-mix(in srgb, var(--muted) 30%, transparent) 5px 6px), var(--void); }
  .sw.acc { background: var(--accent); width: 2px; height: 14px; }
  footer { margin-top: 34px; font-size: 12px; line-height: 1.6; color: var(--muted); }
  footer b { color: var(--ink); font-weight: 600; }
  .hint { font-size: 11px; color: var(--muted); padding: 0 28px 10px; }
</style>

<header>
  <h1>Three and a half years, and what the record can’t see</h1>
  <p class="stand">Sharpee, from a C# sketch in March 2023 to 33 packages on npm in August 2026. Four tracks, because the instrument kept changing: files, then conversations, then commits, then session summaries. Each hands off to the next.</p>
  <p class="stand">The hatched voids are the three times the work stopped. Two were silent in every source. The middle one only silenced the commits — thirty-nine conversations ran through it, which is what fighting a build that won’t compile looks like from the outside.</p>
  <p class="meta">Scroll sideways · every count from the corpus indices</p>
</header>

<p class="hint">↔ 42 months</p>
<div class="scroller">
  <div class="grid">
    ${cells}
  </div>
</div>

<div class="legend">
  <span class="key"><span class="sw hatch"></span> a wall</span>
  <span class="key"><span class="sw acc"></span> the return</span>
  <span class="key"><span class="sw" style="background:var(--taupe)"></span> C# files</span>
  <span class="key"><span class="sw" style="background:var(--slate)"></span> conversations</span>
  <span class="key"><span class="sw" style="background:var(--navy)"></span> commits</span>
  <span class="key"><span class="sw" style="background:var(--navy-mid)"></span> summaries</span>
  <span class="key">bars scale within their own track, never across</span>
</div>

<footer>
  <p><b>What the graphic cannot show.</b> The conversation that actually moved the project off C# — a question about which languages the model was strongest at — happened in the web app, where saving context was hard. It is in no archive. Neither is the reason the text service sat untouched through December 2025 while forty-nine commits went into the core: it was known-bad and deliberately deferred while Project Dungeo closed seams in the middle of the platform.</p>
  <p>Every wall here is a person putting the project down. Absence carries no cause; those came from asking.</p>
</footer>
`;

writeFileSync(OUT, html);
console.log(`wrote ${OUT} (${(html.length / 1024).toFixed(0)} KB, ${MONTHS.length} months)`);
