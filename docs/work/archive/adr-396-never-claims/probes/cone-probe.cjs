#!/usr/bin/env node
/**
 * cone-probe.cjs — the measurements ADR-396's Context cites about the
 * compiler's cone of influence (ADR-365 D12).
 *
 * For each `never` claim of a claims fragment it runs `claimCone` twice:
 * under the claim's own set, and under the whole story (every room, every
 * other entity, and every leading verb of the standard grammar manifest plus
 * the story's own action verbs). It prints how many things the cone keeps,
 * how long it took, and whether the firing pass alone shows the predicate
 * can never become true.
 *
 * Reads the BUILT chord package (`./repokit build` first). `claims-cone.js`
 * is loaded with three internals exported in memory; no file is changed.
 *
 * Usage:
 *   node docs/work/adr-396-never-claims/probes/cone-probe.cjs <story.story> <claims.chord> [--why] [--own-only] [--common]
 *     --why       print the reason each thing is kept under the whole story
 *     --own-only  skip the whole-story run (it does not finish on a large story)
 *     --common    use 17 everyday verbs for the whole-story set, not all of them
 *
 * Owner context: ADR-396 evidence. Not a test and not run by any gate.
 */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const repo = path.resolve(__dirname, '..', '..', '..', '..');
const dist = path.join(repo, 'packages', 'chord', 'dist');
const chord = require(path.join(dist, 'index.js'));
const { extractRules } = require(path.join(dist, 'claims-cone-rules.js'));
const { STDLIB_MANIFEST } = require(path.join(dist, 'stdlib-manifest.js'));

const conePath = path.join(dist, 'claims-cone.js');
const coneModule = new Module(conePath, module);
coneModule.filename = conePath;
coneModule.paths = Module._nodeModulePaths(path.dirname(conePath));
coneModule._compile(`${fs.readFileSync(conePath, 'utf-8')}\nexports.__ConeWorld = ConeWorld;\n`, conePath);
const cone = coneModule.exports;

const flags = new Set(process.argv.slice(2).filter((arg) => arg.startsWith('--')));
const [storyFile, claimsFile] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
if (!storyFile || !claimsFile) {
  console.error('usage: cone-probe.cjs <story.story> <claims.chord> [--why] [--own-only] [--common]');
  process.exit(2);
}

/** The leading words of one grammar shape: its verb. */
const leading = (parts) => {
  const words = [];
  for (const part of parts) {
    if (part.kind !== 'word' || part.optional) break;
    words.push(part.word.toLowerCase());
  }
  return words.join(' ');
};
const shapes = STDLIB_MANIFEST.locales['en-US'].grammarShapes;
const everyVerb = [...new Set(Object.values(shapes).flatMap((patterns) => patterns.map(leading)).filter((verb) => verb !== ''))];
const commonVerbs = ['take', 'drop', 'put', 'give', 'throw', 'open', 'close', 'lock', 'unlock', 'turn', 'push', 'pull', 'read', 'eat', 'wear', 'ask', 'wait'];
console.log(`standard grammar: ${Object.keys(shapes).length} actions, ${everyVerb.length} leading verbs`);

const compiled = chord.compileClaims(fs.readFileSync(storyFile, 'utf-8'), fs.readFileSync(claimsFile, 'utf-8'), { claimsFile });
if (!compiled.ok || !compiled.claims) {
  console.error(compiled.diagnostics.filter((d) => d.severity === 'error'));
  process.exit(1);
}
const ir = compiled.ir;
const isKind = (entity, kind) => entity.kinds.some((k) => k.name === kind);
const rooms = ir.entities.filter((e) => isKind(e, 'room')).map((e) => e.id);
const things = ir.entities.filter((e) => !isKind(e, 'room') && !isKind(e, 'region')).map((e) => e.id);
const storyVerbs = (ir.actions ?? []).flatMap((action) => (action.patterns ?? []).map((pattern) => leading(pattern.parts))).filter((verb) => verb !== '');
const whole = { rooms, things, verbs: [...new Set([...(flags.has('--common') ? commonVerbs : everyVerb), ...storyVerbs])] };
console.log(`story: ${rooms.length} rooms, ${things.length} things; whole-story verbs: ${whole.verbs.length}`);

const block = compiled.claims;
for (const claim of block.claims) {
  if (!claim.never) continue;
  const own = {
    rooms: claim.needs?.rooms ?? block.rooms ?? [],
    things: claim.needs?.things ?? block.things ?? [],
    verbs: (claim.needs?.verbs ?? block.verbs ?? []).map((verb) => verb.toLowerCase()),
  };
  console.log(`\nnever ${claim.name}`);
  for (const [label, set] of flags.has('--own-only') ? [['author set', own]] : [['author set', own], ['whole story', whole]]) {
    const started = process.hrtime.bigint();
    const result = cone.claimCone(ir, claim, set);
    const ms = Number(process.hrtime.bigint() - started) / 1e6;

    // Can the predicate become true in any state the firing pass allows?
    const world = new cone.__ConeWorld(ir, set);
    world.fire(extractRules(ir, set));
    let verdict = 'not attempted for this predicate kind';
    if (claim.placement?.notIn) {
      const always = world.mayBeIn(claim.placement.thing, claim.placement.notIn);
      verdict = always === 'true' ? 'the thing can only ever be there' : `no proof (the thing is in that room: ${always})`;
    } else if (claim.placement?.in) {
      const may = world.mayBeIn(claim.placement.thing, claim.placement.in);
      verdict = may === 'false' ? 'the thing can never be there' : `no proof (${may})`;
    } else if (claim.room !== undefined) {
      const may = world.mayBeIn('player', claim.room);
      verdict = may === 'false' ? 'the player can never be there' : `no proof (${may})`;
    } else if (claim.state) {
      const may = world.mayHaveState(claim.state.entity, claim.state.value);
      verdict = may === 'false' ? 'the state is never taken' : `no proof (${may})`;
    }

    console.log(`  ${label}: ${set.rooms.length} rooms, ${set.things.length} things, ${set.verbs.length} verbs — cone keeps ${result.kept.length} [${result.kept.map((k) => k.thing).join(', ')}], ${ms.toFixed(1)} ms`);
    console.log(`    by the rules alone: ${verdict}`);
    if (flags.has('--why') && label === 'whole story') for (const kept of result.kept) console.log(`      keeps ${kept.thing}: ${kept.reason}`);
  }
}
