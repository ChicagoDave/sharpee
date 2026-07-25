#!/usr/bin/env node
/*
 * generate-stdlib-chord.js — ADR-265: render the entire core standard library
 * as REFERENCE-ONLY Chord-form artifacts.
 *
 * Reads the platform's OWN metadata (built dist) — the action registry, the
 * lifecycle descriptors, the lang-en-us message tables, and the override-alias
 * map — and emits one readable, compiling `.story` per standard action under
 * docs/reference/stdlib-chord/. Every file carries the `reference-only: true`
 * marker (ADR-265 D2): it compiles, but the loader refuses to run it. It is a
 * projection of the TypeScript stdlib, never the implementation (D5).
 *
 * NOT hand-written and NOT hand-edited — regenerate with:
 *     node scripts/generate-stdlib-chord.js
 * A drift test (stdlib-chord-drift) fails if the tree is stale.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'reference', 'stdlib-chord');
const STDLIB_STD = path.join(ROOT, 'packages', 'stdlib', 'src', 'actions', 'standard');

const { standardActions, actionLifecycleDescriptors } = require(path.join(ROOT, 'packages/stdlib/dist'));
const { standardActionLanguage } = require(path.join(ROOT, 'packages/lang-en-us/dist'));
const { MESSAGE_ALIAS_TO_ACTION_ID } = require(path.join(ROOT, 'packages/story-loader/dist/message-alias-map.js'));

const langByAction = new Map(standardActionLanguage.filter((a) => a && a.actionId).map((a) => [a.actionId, a]));
const descByAction = new Map(actionLifecycleDescriptors.map((d) => [d.actionId, d]));

/** alias -> id, reversed to id -> alias, so a message id maps back to its override alias. */
const aliasById = new Map();
for (const [alias, id] of Object.entries(MESSAGE_ALIAS_TO_ACTION_ID)) aliasById.set(id, alias);

/** `if.action.taking` -> `taking`; `if.action.taking_off` -> `taking-off` (dir/file slug). */
const slug = (actionId) => actionId.replace(/^if\.action\./, '').replace(/_/g, '-');

/** Best-effort event ids an action emits — scanned from its source dir. */
function eventIdsFor(actionId) {
  const dir = path.join(STDLIB_STD, slug(actionId));
  if (!fs.existsSync(dir)) return [];
  const ids = new Set();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.ts')) continue;
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const m of src.matchAll(/['"`](if\.event\.[a-z_]+)['"`]/g)) ids.add(m[1]);
  }
  return [...ids].sort();
}

const oneLine = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/** Verb list from the lang `patterns` (`take [something]` -> `take`). */
function verbsFor(lang) {
  if (!lang || !Array.isArray(lang.patterns)) return [];
  const verbs = [];
  for (const p of lang.patterns) {
    const v = String(p).replace(/\[.*?\]/g, '').trim();
    if (v && !verbs.includes(v)) verbs.push(v);
  }
  return verbs;
}

/** Pad a string to width for column alignment inside a comment. */
const pad = (s, w) => (s + ' '.repeat(w)).slice(0, w);

function render(action) {
  const id = action.id;
  const name = slug(id);
  const lang = langByAction.get(id);
  const desc = descByAction.get(id);
  const verbs = verbsFor(lang);
  const events = eventIdsFor(id);
  const slots = desc ? desc.slots.map((s) => s.id) : [];
  const meta = action.metadata || {};
  const messageKeys = lang && lang.messages ? Object.keys(lang.messages) : (action.requiredMessages || []);

  const L = [];
  const c = (line) => L.push(line === '' ? '##' : `## ${line}`);

  // Banner (human marker, D2).
  c('='.repeat(72));
  c(`REFERENCE ONLY — generated Chord-form rendering of \`${id}\`.`);
  c('This is NOT the implementation. The real action is TypeScript in');
  c(`packages/stdlib/src/actions/standard/${name}/. Do not edit — regenerate`);
  c('with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a');
  c('reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is');
  c('about surface, not implementation: this shows what the action does and');
  c('how to change it, in Chord form.');
  c('='.repeat(72));
  L.push('');

  // The compiling story skeleton, carrying the machine marker.
  L.push(`story "Standard action: ${name}" by "Sharpee (generated)"`);
  L.push(`  id: stdlib-chord-${name}`);
  L.push('  version: 1.0.0');
  L.push('  reference-only: true');
  L.push('');

  // The action surface, as an indent-0 comment block.
  c(`Action  : ${id}`);
  if (action.group) c(`Group   : ${action.group}`);
  c(`Verbs   : ${verbs.length ? verbs.join(', ') : '(meta / no player verb)'}`);
  const objParts = [];
  if (meta.requiresDirectObject) objParts.push('direct object required');
  if (meta.requiresIndirectObject) objParts.push('indirect object required');
  if (objParts.length) c(`Objects : ${objParts.join('; ')}`);
  if (slots.length) c(`Slots   : ${slots.join(', ')}   (interceptor-consulted entity slots, ADR-228)`);
  if (events.length) c(`Emits   : ${events.join(', ')}`);
  if (lang && lang.help && lang.help.summary) c(`Summary : ${oneLine(lang.help.summary)}`);
  L.push('');

  // Messages + their override aliases (D4 — the change-the-message mechanism).
  c('Messages — override any with `override message <alias>`:');
  c('');
  c(`  ${pad('alias', 34)}${pad('message id', 40)}text`);
  for (const key of messageKeys) {
    const msgId = `${id}.${key}`;
    const alias = aliasById.get(msgId) || '(no alias)';
    const text = lang && lang.messages ? oneLine(lang.messages[key]) : '';
    c(`  ${pad(alias, 34)}${pad(key, 40)}${text}`);
  }
  L.push('');

  // The three real change seams (D4).
  c('Change how this action behaves (the real, supported seams — D4):');
  c('  • message  — `override message <alias>` (see the table above)');
  c('  • guard    — register an action interceptor on this action id (ADR-090/228)');
  if (events.length) c(`  • react    — an event handler on ${events[0]} (ADR-052)`);
  else c('  • react    — an event handler on the action\'s emitted event (ADR-052)');
  L.push('');

  // A minimal, compiling body so `sharpee --play` reaches the loader's refusal.
  L.push('create the Void');
  L.push('  a room');
  L.push('');
  L.push('  A reference document — the standard library rendered in Chord for');
  L.push('  reading. The real implementation is TypeScript. See packages/stdlib.');
  L.push('');
  L.push('create the player');
  L.push('  starts in the Void');
  L.push('');
  L.push('  You.');
  L.push('');

  return L.join('\n');
}

const OUT_MDX = path.join(ROOT, 'website', 'src', 'app', 'chord', 'stdlib', 'reference', 'content.mdx');

/** Escape a prose string for MDX (`{`, `}`, `<` are JSX-significant). */
const mdxSafe = (s) => oneLine(s).replace(/[{}<]/g, (ch) => `\\${ch}`);

/**
 * Render the single website page (ADR-265): every standard action as an
 * anchored section — surface + the message/override-alias table (in a fenced
 * block, so `{You}`-style templates stay literal) + the D4 change seams.
 */
function renderWebsiteMdx() {
  const actions = standardActions
    .filter((a) => a && typeof a.id === 'string' && a.id.startsWith('if.action.'))
    .sort((a, b) => a.id.localeCompare(b.id));

  const L = [];
  L.push('{/* GENERATED by scripts/generate-stdlib-chord.js (ADR-265) — do NOT edit by hand. */}');
  L.push('');
  L.push('The standard library, rendered in **Chord form**, one section per action —');
  L.push('generated from the platform\'s own metadata, never hand-written. It shows *what*');
  L.push('each action does and *how to change it* in Chord; the implementation stays');
  L.push('TypeScript in `packages/stdlib/`. This is a projection, not a port (ADR-265).');
  L.push('');
  L.push(`${actions.length} standard actions:`);
  L.push('');

  for (const action of actions) {
    const id = action.id;
    const name = slug(id);
    const lang = langByAction.get(id);
    const desc = descByAction.get(id);
    const verbs = verbsFor(lang);
    const events = eventIdsFor(id);
    const slots = desc ? desc.slots.map((s) => s.id) : [];
    const meta = action.metadata || {};
    const messageKeys = lang && lang.messages ? Object.keys(lang.messages) : (action.requiredMessages || []);

    const head = verbs.length ? verbs.slice(0, 4).join(', ') : name;
    L.push(`## ${mdxSafe(head)} — \`${id}\``);
    L.push('');

    const facts = [];
    if (action.group) facts.push(`**Group** \`${action.group}\``);
    if (meta.requiresDirectObject) facts.push('direct object required');
    if (meta.requiresIndirectObject) facts.push('indirect object required');
    if (slots.length) facts.push(`**Slots** ${slots.map((s) => `\`${s}\``).join(', ')}`);
    if (events.length) facts.push(`**Emits** ${events.map((e) => `\`${e}\``).join(', ')}`);
    L.push(facts.join(' · '));
    L.push('');
    if (lang && lang.help && lang.help.summary) {
      L.push(mdxSafe(lang.help.summary));
      L.push('');
    }

    // Message table in a fenced block — `{You}`/`|` stay literal (MDX-safe).
    L.push('Messages — override any with `override message <alias>`:');
    L.push('');
    L.push('```text');
    L.push(`${pad('alias', 34)}${pad('message id', 40)}text`);
    for (const key of messageKeys) {
      const alias = aliasById.get(`${id}.${key}`) || '(no alias)';
      const text = lang && lang.messages ? oneLine(lang.messages[key]) : '';
      L.push(`${pad(alias, 34)}${pad(key, 40)}${text}`);
    }
    L.push('```');
    L.push('');

    const seams = ['`override message` (above)', 'an action interceptor on the action id (ADR-090/228)'];
    seams.push(events.length ? `an event handler on \`${events[0]}\` (ADR-052)` : 'an event handler (ADR-052)');
    L.push(`**Change it:** ${seams.join(' · ')}.`);
    L.push('');
  }
  return L.join('\n');
}

/**
 * Render every reference in memory: `{ "<name>.story": content, "README.md": ... }`.
 * Pure — no filesystem writes — so the drift test can regenerate and compare.
 */
function renderAll() {
  const actions = standardActions
    .filter((a) => a && typeof a.id === 'string' && a.id.startsWith('if.action.'))
    .sort((a, b) => a.id.localeCompare(b.id));

  const out = {};
  const written = [];
  for (const action of actions) {
    const name = slug(action.id);
    out[`${name}.story`] = render(action);
    written.push(name);
  }

  const idx = [];
  idx.push('# The standard library in readable Chord form (ADR-265)');
  idx.push('');
  idx.push('**REFERENCE ONLY — generated, do not edit.** Regenerate with');
  idx.push('`node scripts/generate-stdlib-chord.js`. Each `.story` here is a Chord-form');
  idx.push('rendering of one standard action, carrying `reference-only: true` — it compiles,');
  idx.push('but `sharpee` refuses to run it. The real implementation is TypeScript in');
  idx.push('`packages/stdlib/`. This is a projection, not a port (ADR-265 D5).');
  idx.push('');
  idx.push(`${written.length} standard actions:`);
  idx.push('');
  for (const name of written) idx.push(`- [\`${name}\`](./${name}.story)`);
  idx.push('');
  out['README.md'] = idx.join('\n');
  return out;
}

/** Write the reference tree (docs) and the website page. */
function writeAll() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const files = renderAll();
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(OUT_DIR, name), content);
  }
  // The website page (ADR-265 — surfaced in the Standard Library section).
  const mdx = renderWebsiteMdx();
  fs.mkdirSync(path.dirname(OUT_MDX), { recursive: true });
  fs.writeFileSync(OUT_MDX, mdx);
  console.log(`stdlib-chord: wrote ${Object.keys(files).length} docs files + the website page (${path.relative(ROOT, OUT_MDX)})`);
  return files;
}

module.exports = { renderAll, renderWebsiteMdx, writeAll, OUT_DIR, OUT_MDX, slug };

if (require.main === module) writeAll();
