/**
 * compose-json.test.ts — ADR-258 D5: `sharpee compose --json` through the
 * REAL runCompose path (rule 13a — no stubs).
 *
 * Pins: the payload shape (via ide-protocol's own guard — rule 8b, one
 * declaration), full spans on compile diagnostics, file+line-no-span hatch
 * records, both record kinds in one run, IR presence rules (present iff
 * compile ok and no --check; never on failure), exit codes, and the D5
 * core claim: --json performs NO load-proof — a story whose hatch module
 * cannot resolve still succeeds under --json while the default (load-proof)
 * mode fails on the same story.
 *
 * Owner context: @sharpee/devkit test suite.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import {
  COMPOSE_JSON_SCHEMA_VERSION,
  isComposeJsonPayload,
  type ComposeJsonPayload,
} from '@sharpee/ide-protocol';
import { CHORD_LANGUAGE_VERSION } from '@sharpee/chord';
import { runCompose } from '../src/commands/compose.js';

const DIR = mkdtempSync(join(tmpdir(), 'compose-json-test-'));
afterAll(() => rmSync(DIR, { recursive: true, force: true }));

/** Minimal clean story; `extraLines` appends declarations. */
function storySource(extraLines: string[] = []): string {
  return [
    'story',
    '  title: Json Case',
    '  authors:',
    '    Test',
    '  id: json-case',
    '',
    'create the Lab',
    '  a room',
    '',
    '  A bare room.',
    '',
    'create Alex',
    '  a person',
    '  playable',
    '  starts in the Lab',
    '',
    '  You.',
    '',
    ...extraLines,
    // ADR-327 D10: a story says who the player is. Last, so appended
    // declarations still land at top level.
    'before the game starts',
    '  change the player to Alex',
    'end before',
    '',
  ].join('\n');
}

const HATCH_STORY_TAIL = [
  'create the note',
  '  readable',
  '  in the Lab',
  '',
  '  A note.',
  '',
  '  on the player reading',
  '    phrase note-text',
  '  end on',
  '',
  'define phrases en-US',
  '  note-text:',
  '    It reads: {garbled}',
  '',
  'define text garbled from "./garbled.ts"',
  '',
];

/** Run compose capturing stdout/stderr; returns exit code + captured output. */
async function run(args: string[]): Promise<{ code: number; stdout: string; stderr: string[] }> {
  let stdout = '';
  const outSpy = vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: unknown) => {
    stdout += String(chunk);
    return true;
  }) as never);
  const errs: string[] = [];
  const errSpy = vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => {
    errs.push(a.map(String).join(' '));
  });
  try {
    const code = await runCompose(args);
    return { code, stdout, stderr: errs };
  } finally {
    outSpy.mockRestore();
    errSpy.mockRestore();
  }
}

function payloadOf(stdout: string): ComposeJsonPayload {
  const parsed: unknown = JSON.parse(stdout);
  expect(isComposeJsonPayload(parsed)).toBe(true);
  return parsed as ComposeJsonPayload;
}

describe('compose --json — clean story (gates + IR)', () => {
  it('writes a guard-valid payload with the IR and its languageVersion, exit 0, silent stderr', async () => {
    const file = join(DIR, 'clean.story');
    writeFileSync(file, storySource());
    const { code, stdout, stderr } = await run([file, '--json']);
    expect(code).toBe(0);
    expect(stderr).toEqual([]);
    const payload = payloadOf(stdout);
    expect(payload.schemaVersion).toBe(COMPOSE_JSON_SCHEMA_VERSION);
    expect(payload.diagnostics.filter((d) => d.code !== 'analysis.missing-ifid')).toEqual([]);
    expect(payload.ir).toBeDefined();
    expect(payload.ir!.languageVersion).toBe(CHORD_LANGUAGE_VERSION); // D9
    expect(payload.ir!.entities.map((e) => e.name)).toContain('Lab'); // D6: tree source rides the run
  });

  it('--json --check omits the ir key entirely and matches plain --check exit code', async () => {
    const file = join(DIR, 'clean-check.story');
    writeFileSync(file, storySource());
    const { code, stdout } = await run([file, '--json', '--check']);
    expect(code).toBe(0);
    const payload = payloadOf(stdout);
    expect('ir' in payload).toBe(false);
    const plainCheck = await run([file, '--check']);
    expect(plainCheck.code).toBe(0);
  });
});

describe('compose --json — diagnostics', () => {
  it('a compile diagnostic carries the FULL span (endLine/endColumn — the underline range)', async () => {
    const file = join(DIR, 'analyzer-error.story');
    writeFileSync(file, storySource(['create the widget', '  frobnicating', '  in the Lab', '', '  A widget.', '']));
    const { code, stdout } = await run([file, '--json']);
    expect(code).toBe(1);
    const payload = payloadOf(stdout);
    expect('ir' in payload).toBe(false); // failed compile: never a garbage IR
    const record = payload.diagnostics.find((d) => d.code === 'analysis.trait-not-declared');
    expect(record).toBeDefined();
    expect(record!.file).toBe(file);
    expect(record!.span).toBeDefined();
    for (const k of ['line', 'column', 'endLine', 'endColumn'] as const) {
      expect(record!.span![k], `span.${k}`).toBeGreaterThan(0);
    }
  });

  it('a hatch finding is a second record type: file+line site, NO span key', async () => {
    writeFileSync(
      join(DIR, 'garbled.ts'),
      "export const garbled = () => ({ kind: 'literal', text: 'chord.private-key' });\n"
    );
    const file = join(DIR, 'hatch-violation.story');
    writeFileSync(file, storySource(HATCH_STORY_TAIL));
    const { code, stdout } = await run([file, '--json']);
    expect(code).toBe(1);
    const payload = payloadOf(stdout);
    const record = payload.diagnostics.find((d) => d.code === 'hatch.chord-namespace');
    expect(record).toBeDefined();
    expect(record!.severity).toBe('error');
    expect(record!.file).toBe(join(DIR, 'garbled.ts'));
    expect(record!.line).toBe(1);
    expect('span' in record!).toBe(false);
    // Compile was ok — the IR still rides the payload (gate failure ≠ compile failure).
    expect(payload.ir).toBeDefined();
  });

  it('both record kinds arrive in ONE diagnostics array from one run, compile first', async () => {
    const file = join(DIR, 'both.story');
    writeFileSync(
      file,
      storySource([...HATCH_STORY_TAIL, 'create the widget', '  frobnicating', '  in the Lab', '', '  A widget.', ''])
    );
    const { code, stdout } = await run([file, '--json']);
    expect(code).toBe(1);
    const payload = payloadOf(stdout);
    const compileIdx = payload.diagnostics.findIndex((d) => d.code === 'analysis.trait-not-declared');
    const hatchIdx = payload.diagnostics.findIndex((d) => d.code === 'hatch.chord-namespace');
    expect(compileIdx).toBeGreaterThanOrEqual(0);
    expect(hatchIdx).toBeGreaterThanOrEqual(0);
    expect(compileIdx).toBeLessThan(hatchIdx);
  });
});

describe('compose --json — NO load-proof (the D5 core claim)', () => {
  it('succeeds with gates + IR where the default mode fails resolving the hatch module', async () => {
    const sub = mkdtempSync(join(DIR, 'noload-'));
    const file = join(sub, 'unresolvable.story');
    // Declares "./garbled.ts" which does NOT exist in `sub`: the lint skips
    // absent files, the compile is clean — only the load-proof would fail.
    writeFileSync(file, storySource(HATCH_STORY_TAIL));

    const { code, stdout } = await run([file, '--json']);
    expect(code).toBe(0);
    const payload = payloadOf(stdout);
    expect(payload.diagnostics.filter((d) => d.code !== 'analysis.missing-ifid')).toEqual([]);
    expect(payload.ir).toBeDefined();

    // The same story through the default (load-proof) mode fails — proving
    // --json genuinely skipped hatch-module resolution rather than surviving it.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const outSpy = vi.spyOn(process.stdout, 'write').mockImplementation((() => true) as never);
    try {
      await expect(runCompose([file])).rejects.toThrow(/garbled|hatch|module/i);
    } finally {
      outSpy.mockRestore();
      errSpy.mockRestore();
    }
  });
});

describe('compose --json — piped stdout integrity (the real IDE transport)', () => {
  // The IDE consumes --json over a PIPE, where node's stdout is asynchronous:
  // a process.exit() in the CLI tears the process down mid-flush and silently
  // truncates any payload past the 64KB pipe buffer (caught by the Swift side
  // against fernhill, 110KB). This pins the subprocess path — dist/cli.js with
  // stdio pipes — not the in-process runCompose call, which never exits.
  it('delivers a >64KB payload intact through a pipe', async () => {
    const { execFileSync } = await import('node:child_process');
    const cli = new URL('../dist/cli.js', import.meta.url).pathname;

    const first = ['Amber', 'Basalt', 'Cedar', 'Dune', 'Ember', 'Flint', 'Garnet',
      'Hazel', 'Iris', 'Jasper', 'Kestrel', 'Larch', 'Maple', 'Nettle', 'Onyx', 'Pine'];
    const second = ['Hall', 'Gallery', 'Cellar', 'Attic', 'Study', 'Parlor', 'Vault',
      'Landing', 'Passage', 'Alcove', 'Rotunda', 'Annex', 'Loggia', 'Solar', 'Undercroft', 'Gatehouse'];
    const lines = ['story', '  title: Big Pipe', '  authors:', '    Test', '  id: big-pipe', ''];
    for (const a of first) {
      for (const b of second) {
        lines.push(`create the ${a} ${b}`, '  a room', '',
          `  The ${a} ${b} stretches on, panelled and echoing, its far corners lost in shadow.`, '');
      }
    }
    lines.push('create Alex', '  a person', '  playable', `  starts in the ${first[0]} ${second[0]}`, '', '  You.', '', 'before the game starts', '  change the player to Alex', 'end before', '');

    const sub = mkdtempSync(join(DIR, 'bigpipe-'));
    const file = join(sub, 'big.story');
    writeFileSync(file, lines.join('\n'));

    const stdout = execFileSync(process.execPath, [cli, 'compose', file, '--json'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60_000,
      maxBuffer: 16 * 1024 * 1024,
    });

    expect(stdout.length, 'payload must exceed the 64KB pipe buffer to pin the flush').toBeGreaterThan(65_536);
    const payload = JSON.parse(stdout) as ComposeJsonPayload; // throws on truncation
    expect(isComposeJsonPayload(payload)).toBe(true);
    expect(payload.ir?.entities).toHaveLength(first.length * second.length + 1);
  });
});
