/**
 * compose.ts — `sharpee compose`: compile a Chord `.story` file to Story IR (ADR-210).
 *
 * Parses + analyzes the source and reports every diagnostic with `.story`
 * line numbers (load-time gates, AC-3). `--check` stops there — the CI gate
 * mode. The default mode additionally constructs the story via
 * @sharpee/story-loader (world built, player created) to prove the IR
 * actually loads, then emits the IR JSON to stdout (or `-o <file>`).
 * Status/diagnostics go to stderr so stdout carries only the IR.
 *
 * Story-config and compile diagnostics join ONE in-memory diagnostics
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
// Shared fs import-resolver policy (one implementation — also used by the
// author-game loader behind `sharpee test`/`play`).
import { makeFsImportResolver } from '../standalone/author-game.js';
import { configPathFor, readStoryConfig } from '../standalone/story-config.js';

const USAGE = 'usage: sharpee compose <file.story> [--check] [--json] [-o <ir.json>]';

/**
 * One record in compose's unified diagnostics stream (ADR-276 D4). The shape
 * is declared ONCE, in @sharpee/ide-protocol (ADR-258 D5 wire contract);
 * this alias keeps the Phase 7 export name.
 */
export type ComposeDiagnostic = ComposeDiagnosticRecord;

/** Result of running compose's gates: story config + compile, one diagnostics stream. */
export interface ComposeGatesResult {
  /** The raw chord compile result (`ir` meaningful only when `compile.ok`). */
  compile: CompileResult;
  /** The ONE collection (D4): story-config records first, then compile diagnostics. */
  diagnostics: ComposeDiagnostic[];
  /** True iff the compile succeeded and the story config is not broken. */
  ok: boolean;
}

/**
 * Run compose's gates on a `.story` file: the story-config read, then the
 * chord compile, folded into one diagnostics collection (ADR-276 D4).
 *
 * @param file path to the `.story` file, as given (used verbatim as the
 *   compile diagnostics' site file)
 * @returns the compile result and the unified stream
 */
export function runComposeGates(file: string): ComposeGatesResult {
  // Lazy require (introspect.ts pattern): pull the compiler only when composing.
  const chord = require('@sharpee/chord') as typeof import('@sharpee/chord');
  const storyDir = path.dirname(path.resolve(file));

  // ADR-309 D5: a broken config sidecar is a named gate error. Compose is a
  // READ-ONLY surface — the IDE feeds it unsaved-buffer snapshots, so it
  // never reconciles, mints, or writes (those are init/build/publish's and
  // the IDE save path's moments); it only reports. A snapshot's stem finds
  // no config and reads as ABSENT, which is not an error here — the broken
  // case surfaces on every on-disk compose of the real story file.
  const configPath = configPathFor(file);
  const configRead = readStoryConfig(configPath);
  const configDiagnostics: ComposeDiagnostic[] =
    configRead.status === 'broken'
      ? [{
          severity: 'error' as const,
          code: 'story-config.broken',
          message: `${path.basename(configPath)} is broken — ${configRead.message}. The story config is the canonical home of the story's IFID (ADR-309); fix or restore it, never re-mint.`,
          file: configPath,
          line: 1,
        }]
      : [];

  const compile = chord.compile(readFileSync(file, 'utf-8'), {
    importResolver: makeFsImportResolver(storyDir),
  });

  const diagnostics: ComposeDiagnostic[] = [
    ...configDiagnostics,
    ...compile.diagnostics.map((d) => ({
      severity: d.severity,
      code: d.code,
      message: d.message,
      // A span's `file` names an imported fragment relative to the story's
      // directory; absent means the story file itself (ADR-251 D6).
      file: d.span.file ? path.join(path.dirname(file), d.span.file) : file,
      line: d.span.line,
      span: d.span,
    })),
  ];

  return {
    compile,
    diagnostics,
    ok: compile.ok && configDiagnostics.length === 0,
  };
}

/**
 * Format one diagnostic record as compose's stderr line. Compile records
 * (span present) include the column; story-config records are file:line only.
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
    // ADR-258 D5: gates + IR, no load-proof. The payload is the whole stdout; nothing else
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
  if (!gates.ok) {
    // Compile ok — the remaining gate is the story config (ADR-309 D5):
    // broken is a named failure, already printed above.
    console.error(`compose: ${file} has a broken story config (story-config.broken)`);
    return 1;
  }

  if (check) {
    // ADR-257 D4: echo the Chord LANGUAGE version that compiled the story.
    console.error(`compose: Chord ${result.ir.languageVersion} — ${file} is gate-clean (--check: IR not emitted)`);
    return 0;
  }

  // Load proof: build the world so "composes" means "loads".
  const { createStory } = require('@sharpee/story-loader') as typeof import('@sharpee/story-loader');
  const { WorldModel } = require('@sharpee/world-model') as typeof import('@sharpee/world-model');

  const story = createStory(result.ir);
  const world = new WorldModel();
  story.initializeWorld(world);
  story.createPlayer(world);
  console.error(
    `compose: Chord ${result.ir.languageVersion} — ${file} loaded — ${result.ir.entities.length} entities, ` +
      `${result.ir.traits.length} trait(s), ${result.ir.actions.length} action(s)`
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
