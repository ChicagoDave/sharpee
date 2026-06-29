/**
 * Generate a side-by-side Inform 7 v10 ↔ Sharpee comparison (HTML).
 * The Sharpee column is LIVE-RENDERED through the built lang-en-us assembler,
 * so the output is real, not transcribed.
 *
 *   node docs/work/experiments/gen-sidebyside.cjs
 *
 * Branch: experiment/i7-text-comparison
 */

const { parsePhraseTemplate, EnglishAssembler } = require('@sharpee/lang-en-us');

const asm = new EnglishAssembler();

function ctx(params, narrative = { person: 'third' }) {
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params, settings: { serialComma: true }, narrative,
    reference: { lastMentioned: () => undefined, note: () => undefined },
    textState: { get: () => undefined, set: () => undefined },
    contribute: () => undefined,
  };
}
function render(template, params = {}, narrative) {
  return asm.realize(parsePhraseTemplate(template, params), ctx(params, narrative))
    .map((b) => b.content.map((c) => (typeof c === 'string' ? c : '')).join('')).join('\n');
}
const noun = (name, over = {}) => ({ kind: 'noun', name, number: 'singular', articleType: 'indefinite', ...over });
const list = (conj, ...items) => ({ kind: 'list', conj, items });

// Each sample: I7 (source+output) and Sharpee (template + a live render thunk) or a future-atom note.
const samples = [
  { n: 1, cat: 'Definite article', status: 'ok',
    i7: `say "[The noun] is here."`, i7out: 'The cabinet is here.',
    tpl: '{capitalize the item} is here.',
    run: () => render('{capitalize the item} is here.', { item: noun('cabinet', { articleType: 'definite' }) }) },
  { n: 2, cat: 'Indefinite a/an (Sharpee auto; I7 needs per-object override)', status: 'win',
    i7: `The indefinite article of the honest lawyer is "an".\nsay "You meet [a honest lawyer]."`, i7out: 'You meet an honest lawyer.',
    tpl: 'You see {a item}.   (no per-object data)',
    run: () => [['owl'],['goat'],['hour'],['university']].map(([w]) => render('You see {a item}.', { item: noun(w) })).join('  ·  ') },
  { n: 3, cat: 'Capitalized sentence-start indefinite', status: 'ok',
    i7: `say "[A lamp] sits here."`, i7out: 'A lamp sits here.',
    tpl: '{capitalize a item} blocks the way.',
    run: () => render('{capitalize a item} blocks the way.', { item: noun('ogre') }) },
  { n: 4, cat: 'Mass noun', status: 'ok',
    i7: `The indefinite article of the water is "some".\nsay "There is [a water]."`, i7out: 'There is some water.',
    tpl: 'There is {some stuff} here.',
    run: () => render('There is {some stuff} here.', { stuff: noun('water', { number: 'mass', articleType: 'some' }) }) },
  { n: 5, cat: 'Proper noun (no article)', status: 'ok',
    i7: `say "[The noun] nods."  (proper-named)`, i7out: 'Alice nods.',
    tpl: '{who} nods.',
    run: () => render('{who} nods.', { who: noun('Alice', { properName: true, articleType: 'none', capitalize: true }) }) },
  { n: 6, cat: 'List: grouping + Oxford comma', status: 'ok',
    i7: `Use the serial comma.\nsay "You can see [a list of things here]."`, i7out: 'You can see a lamp, a brass key, and two coins here.',
    tpl: 'You can see {items} here.',
    run: () => render('You can see {items} here.', { items: list('and', noun('lamp'), noun('brass key'), noun('coin'), noun('coin')) }) },
  { n: 7, cat: 'List + is/are subject-verb agreement', status: 'ok',
    i7: `say "On the table [regarding the list][are] [a list of things on the table]."`, i7out: 'On the table are a lamp and two coins.',
    tpl: 'On the table {verb:is items} {items}.',
    run: () => render('On the table {verb:is items} {items}.', { items: list('and', noun('lamp'), noun('coin'), noun('coin')) }) },
  { n: 8, cat: 'Coordinated subject → plural verb', status: 'ok',
    i7: `say "[The troll] and [the goats][regarding the troll and the goats][are] blocking the bridge."`, i7out: 'The troll and the goats are blocking the bridge.',
    tpl: '{subj} {verb:is subj} blocking the bridge.',
    run: () => render('{subj} {verb:is subj} blocking the bridge.', { subj: list('and', noun('troll', { articleType: 'definite' }), noun('goat', { number: 'plural', articleType: 'definite' })) }) },
  { n: 9, cat: 'is/are by number', status: 'ok',
    i7: `say "[The noun] [regarding the noun][are] locked."`, i7out: 'The door is locked. / The gates are locked.',
    tpl: '{capitalize the x} {verb:is x} locked.',
    run: () => render('{capitalize the x} {verb:is x} locked.', { x: noun('door', { articleType: 'definite' }) }) + '  /  ' +
               render('{capitalize the x} {verb:is x} locked.', { x: noun('gate', { number: 'plural', articleType: 'definite' }) }) },
  { n: 10, cat: 'Second-person player verb', status: 'ok',
    i7: `say "[We] [are] carrying too much."  (2nd person)`, i7out: 'You are carrying too much.',
    tpl: '{You} {verb:is actor} carrying too much.   ({You} via perspective)',
    run: () => 'You ' + render('{verb:is actor} carrying too much.', { actor: noun('you', { referableId: 'p', properName: true, articleType: 'none' }) }, { person: 'second', playerId: 'p' }) },
  { n: 11, cat: 'has/have agreement', status: 'ok',
    i7: `say "[The noun] [have] a lid."`, i7out: 'The box has a lid. / The boxes have lids.',
    tpl: '{capitalize the x} {verb:has x} a lid.',
    run: () => render('{capitalize the x} {verb:has x} a lid.', { x: noun('box', { articleType: 'definite' }) }) + '  /  ' +
               render('{capitalize the x} {verb:has x} lids.', { x: noun('box', { number: 'plural', articleType: 'definite' }) }) },
  { n: 12, cat: 'Static adjectives; article over leading adj', status: 'ok',
    i7: `say "You find [a strongbox]."  (printed adjectives)`, i7out: 'You find a small iron chest. / an old empty box.',
    tpl: 'You find {a item}.',
    run: () => render('You find {a item}.', { item: noun('chest', { adjectives: ['small', 'iron'] }) }) + '  /  ' +
               render('You find {a item}.', { item: noun('box', { adjectives: ['old', 'empty'] }) }) },
  { n: 13, cat: 'Regular verb agreement', status: 'ok',
    i7: `say "[The noun] [open] slowly."`, i7out: 'The door opens slowly. / The doors open slowly.',
    tpl: '{capitalize the x} {verb:opens x} slowly.',
    run: () => render('{capitalize the x} {verb:opens x} slowly.', { x: noun('door', { articleType: 'definite' }) }) + '  /  ' +
               render('{capitalize the x} {verb:opens x} slowly.', { x: noun('door', { number: 'plural', articleType: 'definite' }) }) },
  { n: 14, cat: 'Small-count spelling in lists', status: 'ok',
    i7: `say "[the number of coins in words] coins"`, i7out: 'three coins',
    tpl: '{items}',
    run: () => render('{items}', { items: list('and', noun('coin'), noun('coin'), noun('coin')) }) },
  { n: 15, cat: 'Verbatim / preformatted block', status: 'ok',
    i7: `say "[fixed letter spacing]...[line break]..."`, i7out: '+----+\\n| ZORK |\\n+----+',
    tpl: '{verbatim:banner}',
    run: () => render('{verbatim:banner}', { banner: '+--------+\n| ZORK I |\n+--------+' }) },

  { n: 16, cat: 'Conditional text [if]…[otherwise]', status: 'future', adr: 'ADR-196 (Choice/Optional)',
    i7: `say "The torch is [if lit]blazing[otherwise]dark[end if]."`, i7out: 'The torch is blazing.',
    note: 'No in-string if (ADR-192). A named Choice producer the template references; selection logic lives in code.' },
  { n: 17, cat: 'Cycling / random / stopping text', status: 'future', adr: 'ADR-196 (Choice + textState seam)',
    i7: `say "[one of]green[or]amber[or]red[cycling]"`, i7out: 'green → amber → red → green …',
    note: 'Choice backed by the per-(entity,messageKey) textState store → deterministic & save/replay-safe (I7 cycling is not).' },
  { n: 18, cat: 'Number in words / ordinal', status: 'future', adr: 'ADR-198 (Numeral)',
    i7: `say "[the number of coins in words] coins"`, i7out: 'seven coins',
    note: '{number:coins words}. The spelling logic (countWord) already exists in the Assembler for list counts; ADR-198 exposes it as an atom.' },
  { n: 19, cat: 'Pronoun reference (it/them/gendered)', status: 'future', adr: 'ADR-197 (Pronoun)',
    i7: `say "[The noun]… [regarding the noun][They] [are] heavy. Take [them]?"`, i7out: 'It is heavy. Take it? / They are heavy. Take them?',
    note: '{pronoun:it} consumes the reference seam (last-mentioned) the Assembler already feeds; pronounSet carries gender.' },
  { n: 20, cat: 'Adaptive verb TENSE (deliberate non-goal)', status: 'gap', adr: 'out of scope (ADR-199 §Scope)',
    i7: `say "[We] [open] … and [step] through."  (present vs past story tense)`, i7out: 'You open … / You opened …',
    note: 'Sharpee does NOT adapt tense: the author writes the surface form. Additive future option if a real need appears.' },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const badge = { ok: ['✓ implemented', '#1a7f37'], win: ['✓ better than I7', '#8250df'], future: ['→ future atom', '#9a6700'], gap: ['◇ non-goal', '#57606a'] };

const rows = samples.map((s) => {
  let sharpeeCell;
  if (s.run) {
    let out;
    try { out = s.run(); } catch (e) { out = 'ERROR: ' + e.message; }
    sharpeeCell = `<div class="tpl">${esc(s.tpl)}</div><div class="out live">▸ ${esc(out)}</div>`;
  } else {
    sharpeeCell = `<div class="note">${esc(s.note)}</div><div class="adr">${esc(s.adr)}</div>`;
  }
  const [label, color] = badge[s.status];
  return `<tr>
    <td class="n">${s.n}</td>
    <td class="cat">${esc(s.cat)}<div class="badge" style="color:${color}">${label}</div></td>
    <td class="i7"><pre>${esc(s.i7)}</pre><div class="out">▸ ${esc(s.i7out)}</div></td>
    <td class="sh">${sharpeeCell}</td>
  </tr>`;
}).join('\n');

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Inform 7 v10 ↔ Sharpee — text output side-by-side</title>
<style>
 body{font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;margin:0;color:#1f2328;background:#f6f8fa}
 header{padding:20px 28px;background:#24292f;color:#fff}
 header h1{margin:0 0 4px;font-size:19px} header p{margin:0;color:#c9d1d9;font-size:13px}
 table{border-collapse:collapse;width:100%;background:#fff}
 th,td{border:1px solid #d0d7de;padding:10px 12px;vertical-align:top;text-align:left}
 th{background:#eaeef2;position:sticky;top:0;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
 td.n{width:30px;text-align:center;color:#57606a;font-weight:600}
 td.cat{width:200px;font-weight:600}
 td.i7,td.sh{width:38%}
 pre{margin:0;white-space:pre-wrap;font:12.5px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;background:#f6f8fa;border:1px solid #eaeef2;border-radius:6px;padding:8px}
 .tpl{font:12.5px/1.45 ui-monospace,Menlo,monospace;background:#fbf7ff;border:1px solid #efe4ff;border-radius:6px;padding:8px}
 .out{margin-top:6px;font-weight:600;color:#0a3069}
 .out.live{color:#1a7f37}
 .note{color:#3d4147}.adr{margin-top:6px;font:12px ui-monospace,Menlo,monospace;color:#9a6700}
 .badge{margin-top:6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em}
 .legend{padding:10px 28px;background:#fff;border-bottom:1px solid #d0d7de;font-size:12.5px;color:#57606a}
</style></head><body>
<header><h1>Inform 7 (v10) ↔ Sharpee phrase algebra — complex text output</h1>
<p>The Sharpee column is <b>live-rendered</b> through the built lang-en-us Assembler (▸ = real output). Branch experiment/i7-text-comparison · ADR-192/199/200.</p></header>
<div class="legend">✓ implemented &nbsp;·&nbsp; ✓ better than I7 (auto a/an over rendered head) &nbsp;·&nbsp; → future atom (ADR-193–198) &nbsp;·&nbsp; ◇ deliberate non-goal</div>
<table><thead><tr><th>#</th><th>Feature</th><th>Inform 7 v10</th><th>Sharpee</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`;

require('fs').writeFileSync(require('path').join(__dirname, 'i7-sidebyside.html'), html);
console.log('Wrote docs/work/experiments/i7-sidebyside.html  (' + samples.length + ' samples; ' + samples.filter(s=>s.run).length + ' live-rendered)');
