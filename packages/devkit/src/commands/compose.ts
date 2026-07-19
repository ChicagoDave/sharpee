/**
 * compose.ts — `sharpee compose`: compile a Chord `.story` file to Story IR (ADR-210).
 *
 * Parses + analyzes the source and reports every diagnostic with `.story`
 * line numbers (load-time gates, AC-3). `--check` stops there — the CI gate
 * mode. The default mode additionally constructs the story via
 * @sharpee/story-loader (hatches bound, world built, player created) to prove
 * the IR actually loads, then emits the IR JSON to stdout (or `-o <file>`).
 * Status/diagnostics go to stderr so stdout carries only the IR.
 *
 * Public interface: runCompose(rest) → process exit code.
 * Owner context: @sharpee/devkit — the standalone `sharpee` CLI (author tool).
 */
import * as path from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { lintHatchSources } from '../hatch-lint.js';
// Shared hatch-module resolution policy (one implementation — also used by
// the author-game loader behind `sharpee test`/`play`).
import { requireHatchModule } from '../standalone/author-game.js';

const USAGE = 'usage: sharpee compose <file.story> [--check] [-o <ir.json>]';

/**
 * Run `sharpee compose`.
 *
 * @param rest CLI args after the subcommand: `<file.story>` plus optional
 *   `--check` (gates only, no IR emit/load) and `-o|--out <file>`.
 * @returns process exit code — 0 gate-clean, 1 gate errors, 2 usage error.
 */
export async function runCompose(rest: string[]): Promise<number> {
  let check = false;
  let out: string | undefined;
  let file: string | undefined;

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--check') check = true;
    else if (arg === '-o' || arg === '--out') out = rest[++i];
    else if (!arg.startsWith('-') && !file) file = arg;
    else {
      console.error(`compose: unexpected argument '${arg}'\n${USAGE}`);
      return 2;
    }
  }

  if (!file) {
    console.error(USAGE);
    return 2;
  }
  if (!existsSync(file)) {
    console.error(`compose: no such file: ${file}`);
    return 2;
  }

  // Lazy require (introspect.ts pattern): pull the compiler only when composing.
  const chord = require('@sharpee/chord') as typeof import('@sharpee/chord');
  const result = chord.compile(readFileSync(file, 'utf-8'));

  for (const d of result.diagnostics) {
    console.error(`${file}:${d.span.line}:${d.span.column} ${d.severity} [${d.code}] ${d.message}`);
  }
  if (!result.ok) {
    const errors = result.diagnostics.filter((d) => d.severity === 'error').length;
    console.error(`compose: ${file} failed the load-time gates (${errors} error(s))`);
    return 1;
  }

  // Hatch source lint (design.md §5.6, authoritative layer): the chord.*
  // state namespace is loader-private; a quoted literal in hatch source is
  // a build error in --check and full mode alike. Comments don't trip it.
  const storyDir = path.dirname(path.resolve(file));
  const hatchFindings = lintHatchSources(
    storyDir,
    result.ir.hatches.map((h) => h.modulePath)
  );
  for (const f of hatchFindings) {
    console.error(
      `${f.file}:${f.line} error [hatch.chord-namespace] \`${f.text}\` — the chord.* state namespace is loader-private; hatches read the world through their context only (design.md §5.6)`
    );
  }
  if (hatchFindings.length > 0) {
    console.error(`compose: ${file} hatch source references chord.* (${hatchFindings.length} hit(s))`);
    return 1;
  }

  if (check) {
    console.error(`compose: ${file} is gate-clean (--check: IR not emitted)`);
    return 0;
  }

  // Load proof: bind hatches and build the world so "composes" means "loads".
  const { createStory } = require('@sharpee/story-loader') as typeof import('@sharpee/story-loader');
  const { WorldModel } = require('@sharpee/world-model') as typeof import('@sharpee/world-model');

  const hatchModules: Record<string, Record<string, unknown>> = {};
  for (const hatch of result.ir.hatches) {
    if (!(hatch.modulePath in hatchModules)) {
      hatchModules[hatch.modulePath] = requireHatchModule(storyDir, hatch.modulePath);
    }
  }

  const story = createStory(result.ir, { hatchModules });
  const world = new WorldModel();
  story.initializeWorld(world);
  story.createPlayer(world);
  console.error(
    `compose: ${file} loaded — ${result.ir.entities.length} entities, ` +
      `${result.ir.traits.length} trait(s), ${result.ir.actions.length} action(s), ` +
      `${result.ir.hatches.length} hatch(es)`
  );

  const json = JSON.stringify(result.ir, null, 2) + '\n';
  if (out) {
    writeFileSync(out, json);
    console.error(`compose: IR written to ${out}`);
  } else {
    process.stdout.write(json);
  }
  return 0;
}
