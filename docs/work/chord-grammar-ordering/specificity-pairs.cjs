#!/usr/bin/env node
/**
 * specificity-pairs.cjs — ADR-268 experiment, step 2 (static pairwise).
 *
 * For every pair of registered rules with DIFFERENT priorities, decides
 * whether the two patterns can both match some common token sequence
 * (co-match). Slots are modeled as consuming >=1 arbitrary tokens — an
 * overapproximation of the real slot consumers, so "no co-match" here is
 * definitive while "co-match" is only a candidate (the dynamic transcript
 * run is ground truth).
 *
 * Only clean matches are considered (no skipped optionals): a skipped
 * optional costs x0.9 confidence, and confidence sorts before priority, so
 * priority never arbitrates between a clean and an unclean match... UNLESS
 * the clean match has more slots (each slot costs x~0.9 too). Confidence
 * comparability is approximated by slot count:
 *   same slotCount  -> confidence plausibly ties -> priority CAN decide
 *   diff slotCount  -> confidence likely differs -> priority likely moot
 * Both classes are reported.
 *
 * For each co-matching pair, compares today's priority order with the
 * specificity order (litRequired = ADR-231 literalSpecificity of a clean
 * match):
 *   AGREE        specificity picks the same winner as priority
 *   TIE          specificity ties (would fall to definition order) — these
 *                are the rules that genuinely need an ordering notation
 *   REVERSE      specificity picks the OPPOSITE winner — behavior change
 *
 * Usage: node docs/work/chord-grammar-ordering/specificity-pairs.cjs
 */
const path = require('path');
const fs = require('fs');
const rules = JSON.parse(fs.readFileSync(path.join(__dirname, 'rules.json'), 'utf8'));
const repo = path.join(__dirname, '..', '..', '..');
const { EnglishGrammarEngine } = require(path.join(repo, 'packages/parser-en-us/dist/english-grammar-engine.js'));
const { defineGrammar } = require(path.join(repo, 'packages/parser-en-us/dist/grammar.js'));
const engine = new EnglishGrammarEngine();
defineGrammar(engine.createBuilder());
const compiled = engine.getRules().map(r => (r.compiledPattern?.tokens ?? []).map(t => ({
  type: t.type, value: t.value, alternates: t.alternates, optional: !!t.optional
})));

// Can token a (literal/alternates) and token b (literal/alternates) consume
// the same single word?
function litCompat(a, b) {
  const setA = a.type === 'alternates' ? a.alternates : [a.value];
  const setB = b.type === 'alternates' ? b.alternates : [b.value];
  return setA.some(w => setB.includes(w));
}

// DP over (i, j): can pattern A from token i and pattern B from token j both
// consume the same remaining word sequence (of some common length)?
// Slots consume >=1 arbitrary words. Optionals are HARD-SKIPPED (clean match
// only: optional tokens are ignored entirely on both sides... no — a clean
// match CONSUMES the optional). We therefore try both interpretations per
// pattern: with each optional either present-and-matched or absent, but
// absence flips the match to unclean; to keep it clean-only we require
// optionals to be PRESENT. Patterns whose optional word cannot co-match then
// simply fail — which matches the clean-only frame.
function coMatch(A, B) {
  const memo = new Map();
  function go(i, j) {
    const key = i * 1000 + j;
    if (memo.has(key)) return memo.get(key);
    let res;
    if (i === A.length && j === B.length) res = true;
    else if (i === A.length || j === B.length) res = false;
    else {
      const a = A[i], b = B[j];
      if (a.type === 'slot' && b.type === 'slot') {
        // Both slots eat >=1 words; any relative split works:
        // advance either or both (unbounded consumption folds into this).
        res = go(i + 1, j + 1) || go(i + 1, j) || go(i, j + 1);
      } else if (a.type === 'slot') {
        // Slot eats the word b consumes (and maybe more).
        res = go(i + 1, j + 1) || go(i, j + 1);
      } else if (b.type === 'slot') {
        res = go(i + 1, j + 1) || go(i + 1, j);
      } else {
        res = litCompat(a, b) && go(i + 1, j + 1);
      }
    }
    memo.set(key, res);
    return res;
  }
  return go(0, 0);
}

const pairs = { AGREE: [], TIE: [], REVERSE: [] };
for (let x = 0; x < rules.length; x++) {
  for (let y = x + 1; y < rules.length; y++) {
    const a = rules[x], b = rules[y];
    if (a.priority === b.priority) continue;
    if (!coMatch(compiled[x], compiled[y])) continue;
    const hi = a.priority > b.priority ? a : b;   // today's winner
    const lo = hi === a ? b : a;
    const cls = hi.litRequired === lo.litRequired ? 'TIE'
      : hi.litRequired > lo.litRequired ? 'AGREE' : 'REVERSE';
    pairs[cls].push({
      confComparable: a.slotCount === b.slotCount,
      winner: `${hi.priority}/[lit=${hi.litRequired}] ${hi.pattern} -> ${hi.action}`,
      loser: `${lo.priority}/[lit=${lo.litRequired}] ${lo.pattern} -> ${lo.action}`
    });
  }
}

fs.writeFileSync(path.join(__dirname, 'pairs.json'), JSON.stringify(pairs, null, 1));
for (const cls of ['REVERSE', 'TIE', 'AGREE']) {
  const list = pairs[cls];
  const comparable = list.filter(p => p.confComparable);
  console.log(`== ${cls}: ${list.length} pairs (${comparable.length} confidence-comparable) ==`);
  for (const p of (cls === 'AGREE' ? comparable.slice(0, 15) : list)) {
    console.log(`  ${p.confComparable ? '*' : ' '} ${p.winner}`);
    console.log(`      over ${p.loser}`);
  }
  if (cls === 'AGREE' && comparable.length > 15) console.log(`  ... ${comparable.length - 15} more comparable (see pairs.json)`);
  console.log('');
}
