#!/usr/bin/env node
/**
 * chord-gap-report.cjs — the ADR-266 D5 gap report.
 *
 * Registers the standard grammar (`packages/parser-en-us/dist/grammar.js`)
 * against a real EnglishGrammarEngine and enumerates every registered rule
 * whose constructs Chord cannot yet express, with counts by construct.
 * Two sections stay distinct (D5): BLOCKING (rules the standard grammar has
 * that Chord cannot write) and NOT BLOCKING (builder capabilities nothing
 * exercises). The former ordering carve-out (priority ≠ 100) retired with
 * ADR-268: numeric priority no longer exists — ordering is implicit
 * (tier → specificity → definition order), so the report must read EMPTY,
 * full stop.
 *
 * Lifetime: the migration's (ADR-266 D5) — when ADR-269 lands, grammar.ts
 * stops being the source and this generator retires with its report.
 *
 * Usage: node scripts/chord-gap-report.cjs   (run after a platform build)
 */
const path = require('path');
const repo = path.join(__dirname, '..');
const { EnglishGrammarEngine } = require(path.join(repo, 'packages/parser-en-us/dist/english-grammar-engine.js'));
const { defineGrammar } = require(path.join(repo, 'packages/parser-en-us/dist/grammar.js'));

const engine = new EnglishGrammarEngine();
defineGrammar(engine.createBuilder());
const rules = engine.getRules();

// Chord's expressible surface after ADR-267 groups 1–4 (language 2.3.0):
//   slots `the <name>` (D15), alternation `a|b` (D8), optional `[x]` (D9),
//   greedy `:slot...` (D10), typed slots INSTRUMENT/TOPIC (D11), static
//   defaultSemantics incl. the direction cross-product (D12).
const CHORD_SLOT_TYPES = new Set(['instrument', 'topic', 'text_greedy', 'entity', undefined]);

const gaps = new Map(); // construct → [rule patterns]
const addGap = (construct, rule) => {
  if (!gaps.has(construct)) gaps.set(construct, []);
  gaps.get(construct).push(rule.pattern);
};

// Ruled exceptions (owner rulings — each stays a platform-side TS
// registration outside the ADR-269 Chord-source migration):
//   '?' → help (grammar.ts:860): punctuation-literal pattern, ruled a
//   platform-side exception by David 2026-07-25 (session 2d5bc7).
const RULED_EXCEPTIONS = new Set(['?']);

let exceptions = 0;
for (const rule of rules) {
  if (RULED_EXCEPTIONS.has(rule.pattern.trim())) {
    exceptions++;
    continue;
  }

  // Slot types beyond Chord's set (D11 narrowed to the two with call sites).
  for (const [name, slot] of rule.slots ?? []) {
    const t = slot.slotType;
    if (!CHORD_SLOT_TYPES.has(t)) addGap(`slot-type:${t}`, rule);
  }

  // Computed semantic mappings (withSemanticVerbs / withSemanticDirections /
  // withSemanticPrepositions) — unportable by ruling (functions), so any
  // live use is a BLOCKING row, not an accepted omission.
  if (rule.semantics && Object.keys(rule.semantics).length > 0) addGap('semantic-mapping', rule);

  // Static defaults are D12-expressible; nothing to check — carried whole.
  // Pattern-string constructs (|, [..], :slot, :slot...) are all D8/D9/D10/
  // D15-expressible; unknown syntax would fail the compiler, so scan for
  // anything outside the known token shapes as a tripwire.
  for (const token of rule.pattern.trim().split(/\s+/)) {
    const stripped = token.replace(/^\[/, '').replace(/\]$/, '');
    const ok = /^:?[a-zA-Z_][\w-]*(\.\.\.)?$/.test(stripped) || /^[a-zA-Z_'-]+(\|[a-zA-Z_'-]+)+$/.test(stripped) || /^:[a-zA-Z_]\w*$/.test(stripped);
    if (!ok) addGap(`pattern-syntax:${token}`, rule);
  }
}

console.log(`TOTAL REGISTERED RULES: ${rules.length}`);
console.log(`\n== BLOCKING (rules Chord cannot write) ==`);
if (gaps.size === 0) console.log('  (none)');
for (const [construct, patterns] of gaps) {
  console.log(`  ${construct}: ${patterns.length}`);
  for (const p of [...new Set(patterns)].slice(0, 10)) console.log(`    ${p}`);
}
console.log(`\n== RULED EXCEPTIONS (platform-side TS registrations, by owner ruling) ==`);
console.log(`  ${exceptions} rule(s): ${[...RULED_EXCEPTIONS].join(', ')}`);
console.log(`\nRESULT: ${gaps.size === 0 ? 'EMPTY — ADR-268 acceptance 2 satisfied' : `${gaps.size} blocking construct(s) remain`}`);
