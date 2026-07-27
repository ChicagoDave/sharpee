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
 * Compile diagnostics and hatch-lint findings join ONE in-memory diagnostics
 * collection (ADR-276 D4). `--json` (ADR-258 D5) serializes it: gates + IR,
 * NO load-proof — the payload (`ComposeJsonPayload`, wire-typed in
 * @sharpee/ide-protocol) goes to stdout; `--json --check` omits the IR.
 * Text modes are unchanged in behavior.
 *
 * Public interface: runCompose(rest) → process exit code;
 * runComposeGates(file) → ComposeGatesResult (the unified diagnostics stream).
 * Owner context: @sharpee/devkit — the standalone `sharpee` CLI (author tool).
 */
import * as path from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { CompileResult } from '@sharpee/chord';
// Type-only (DEVARCH 8b: one declaration, in ide-protocol) — the VALUE import
// of the schema constant is lazy-required in the --json branch so the CLI's
// startup keeps the lazy-compiler pattern (ide-protocol's barrel pulls chord).
import type { ComposeDiagnosticRecord, ComposeJsonPayload } from '@sharpee/ide-protocol';
import { lintHatchSources, type HatchLintFinding } from '../hatch-lint.js';
// Shared hatch-module resolution + fs import-resolver policy (one
// implementation — also used by the author-game loader behind
// `sharpee test`/`play`).
import { requireHatchModule, makeFsImportResolver } from '../standalone/author-game.js';

const USAGE = 'usage: sharpee compose <file.story> [--check] [--json] [-o <ir.json>]';

/**
 * One record in compose's unified diagnostics stream (ADR-276 D4). The shape
 * is declared ONCE, in @sharpee/ide-protocol (ADR-258 D5 wire contract);
 * this alias keeps the Phase 7 export name.
 */
export type ComposeDiagnostic = ComposeDiagnosticRecord;

/** Result of running compose's gates: compile + hatch lint, one diagnostics stream. */
export interface ComposeGatesResult {
  /** The raw chord compile result (`ir` meaningful only when `compile.ok`). */
  compile: CompileResult;
  /** Raw hatch-lint findings (empty when clean). */
  hatchFindings: HatchLintFinding[];
  /** The ONE collection (D4): compile diagnostics first, then hatch records. */
  diagnostics: ComposeDiagnostic[];
  /** True iff the compile succeeded and the hatch lint found nothing. */
  ok: boolean;
}

/**
 * Run compose's gates on a `.story` file: chord compile, then the hatch
 * source lint (design.md §5.6), folding both into one diagnostics
 * collection (ADR-276 D4). The lint runs even when the compile failed —
 * hatch declarations still lower into the IR, so the stream is complete
 * in one pass; text-mode `runCompose` keeps its historical gating and
 * only PRINTS hatch findings after a clean compile.
 *
 * @param file path to the `.story` file, as given (used verbatim as the
 *   compile diagnostics' site file)
 * @returns the compile result, raw findings, and the unified stream
 */
export function runComposeGates(file: string): ComposeGatesResult {
  // Lazy require (introspect.ts pattern): pull the compiler only when composing.
  const chord = require('@sharpee/chord') as typeof import('@sharpee/chord');
  const storyDir = path.dirname(path.resolve(file));
  const compile = chord.compile(readFileSync(file, 'utf-8'), {
    importResolver: makeFsImportResolver(storyDir),
  });

  // Hatch source lint (design.md §5.6, authoritative layer): the chord.*
  // state namespace is loader-private; a quoted literal in hatch source is
  // a build error in --check and full mode alike. Comments don't trip it.
  const hatchFindings = lintHatchSources(
    storyDir,
    compile.ir.hatches.map((h) => h.modulePath)
  );

  const diagnostics: ComposeDiagnostic[] = [
    ...compile.diagnostics.map((d) => ({
      severity: d.severity,
      code: d.code,
      message: d.message,
      file,
      line: d.span.line,
      span: d.span,
    })),
    ...hatchFindings.map((f) => ({
      severity: 'error' as const,
      code: 'hatch.chord-namespace',
      message: `\`${f.text}\` — the chord.* state namespace is loader-private; hatches read the world through their context only (design.md §5.6)`,
      file: f.file,
      line: f.line,
    })),
  ];

  return { compile, hatchFindings, diagnostics, ok: compile.ok && hatchFindings.length === 0 };
}

/**
 * Format one diagnostic record as compose's stderr line. Compile records
 * (span present) include the column; hatch records are file:line only.
 */
function formatDiagnostic(r: ComposeDiagnostic): string {
  const site = r.span ? `${r.file}:${r.line}:${r.span.column}` : `${r.file}:${r.line}`;
  return `${site} ${r.severity} [${r.code}] ${r.message}`;
}

/**
 * Run `sharpee compose`.
 *
 * @param rest CLI args after the subcommand: `<file.story>` plus optional
 *   `--check` (gates only, no IR emit/load), `--json` (ADR-258 D5: gates + IR
 *   payload on stdout, NO load-proof; with `--check`, gates only — no IR), and
 *   `-o|--out <file>` (default text mode only).
 * @returns process exit code — 0 gate-clean, 1 gate errors, 2 usage error.
 */
export async function runCompose(rest: string[]): Promise<number> {
  let check = false;
  let json = false;
  let out: string | undefined;
  let file: string | undefined;

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--check') check = true;
    else if (arg === '--json') json = true;
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

  const gates = runComposeGates(file);
  const result = gates.compile;

  if (json) {
    // ADR-258 D5: gates + IR, no load-proof — hatch modules are never
    // resolved on this path (the IDE's editor loop must not require the
    // author's toolchain). The payload is the whole stdout; nothing else
    // is printed. `--json --check` omits the `ir` key entirely; a failed
    // compile never carries an IR (atomic load, ADR-210).
    const { COMPOSE_JSON_SCHEMA_VERSION } =
      require('@sharpee/ide-protocol') as typeof import('@sharpee/ide-protocol');
    const payload: ComposeJsonPayload = {
      schemaVersion: COMPOSE_JSON_SCHEMA_VERSION,
      diagnostics: gates.diagnostics,
      ...(!check && result.ok ? { ir: result.ir } : {}),
    };
    process.stdout.write(JSON.stringify(payload) + '\n');
    return gates.ok ? 0 : 1;
  }

  for (const r of gates.diagnostics) {
    if (r.span) console.error(formatDiagnostic(r));
  }
  if (!result.ok) {
    const errors = result.diagnostics.filter((d) => d.severity === 'error').length;
    console.error(`compose: ${file} failed the load-time gates (${errors} error(s))`);
    return 1;
  }

  for (const r of gates.diagnostics) {
    if (!r.span) console.error(formatDiagnostic(r));
  }
  if (gates.hatchFindings.length > 0) {
    console.error(`compose: ${file} hatch source references chord.* (${gates.hatchFindings.length} hit(s))`);
    return 1;
  }

  if (check) {
    // ADR-257 D4: echo the Chord LANGUAGE version that compiled the story.
    console.error(`compose: Chord ${result.ir.languageVersion} — ${file} is gate-clean (--check: IR not emitted)`);
    return 0;
  }

  // Load proof: bind hatches and build the world so "composes" means "loads".
  const { createStory } = require('@sharpee/story-loader') as typeof import('@sharpee/story-loader');
  const { WorldModel } = require('@sharpee/world-model') as typeof import('@sharpee/world-model');

  const storyDir = path.dirname(path.resolve(file));
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
    `compose: Chord ${result.ir.languageVersion} — ${file} loaded — ${result.ir.entities.length} entities, ` +
      `${result.ir.traits.length} trait(s), ${result.ir.actions.length} action(s), ` +
      `${result.ir.hatches.length} hatch(es)`
  );

  const irJson = JSON.stringify(result.ir, null, 2) + '\n';
  if (out) {
    writeFileSync(out, irJson);
    console.error(`compose: IR written to ${out}`);
  } else {
    process.stdout.write(irJson);
  }
  return 0;
}
