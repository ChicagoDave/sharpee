/**
 * compose-json.test.ts — ADR-258 D5: `sharpee compose --json` through the
 * REAL runCompose path (rule 13a — no stubs).
 *
 * Pins: the payload shape (via ide-protocol's own guard — rule 8b, one
 * declaration), full spans on compile diagnostics, the file+line-no-span
 * story-config record, both record kinds in one run, IR presence rules
 * (present iff compile ok and no --check; never on failure), and exit codes.
 *
 * Owner context: @sharpee/devkit test suite.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

/** Write `<stem>.story` with a broken `<stem>.config.json` sidecar beside it. */
function writeWithBrokenConfig(stem: string, extraLines: string[] = []): string {
  const file = join(DIR, `${stem}.story`);
  writeFileSync(file, storySource(extraLines));
  writeFileSync(join(DIR, `${stem}.config.json`), '{ not json');
  return file;
}

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
    writeFileSync(file, storySource(['create the widget', '  a thing, frobnicating', '  in the Lab', '', '  A widget.', '']));
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

  it('a broken story config is a second record type: file+line site, NO span key', async () => {
    const file = writeWithBrokenConfig('broken-config');
    const { code, stdout } = await run([file, '--json']);
    expect(code).toBe(1);
    const payload = payloadOf(stdout);
    const record = payload.diagnostics.find((d) => d.code === 'story-config.broken');
    expect(record).toBeDefined();
    expect(record!.severity).toBe('error');
    expect(record!.file).toBe(join(DIR, 'broken-config.config.json'));
    expect(record!.line).toBe(1);
    expect('span' in record!).toBe(false);
    // Compile was ok — the IR still rides the payload (gate failure ≠ compile failure).
    expect(payload.ir).toBeDefined();
  });

  it('both record kinds arrive in ONE diagnostics array from one run, story config first', async () => {
    const file = writeWithBrokenConfig('both', [
      'create the widget', '  a thing, frobnicating', '  in the Lab', '', '  A widget.', '',
    ]);
    const { code, stdout } = await run([file, '--json']);
    expect(code).toBe(1);
    const payload = payloadOf(stdout);
    const configIdx = payload.diagnostics.findIndex((d) => d.code === 'story-config.broken');
    const compileIdx = payload.diagnostics.findIndex((d) => d.code === 'analysis.trait-not-declared');
    expect(configIdx).toBeGreaterThanOrEqual(0);
    expect(compileIdx).toBeGreaterThanOrEqual(0);
    expect(configIdx).toBeLessThan(compileIdx);
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
    const { fileURLToPath } = await import('node:url');
    const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));

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

/** A thing in the Lab, declared with `declaration` (ADR-409 D1). */
function thingLines(name: string, declaration: string): string[] {
  return [`create the ${name}`, `  a thing, ${declaration}`, '  in the Lab', '', '  It is there.', ''];
}

/**
 * Apply every edit to a source, last first so earlier spans stay put. Spans are
 * 1-based and half-open, the way the heads read them.
 */
function applyEdits(source: string, edits: { span: { line: number; column: number; endLine: number; endColumn: number }; text: string }[]): string {
  const lines = source.split('\n');
  const offset = (line: number, column: number) =>
    lines.slice(0, line - 1).reduce((sum, l) => sum + l.length + 1, 0) + (column - 1);
  const ordered = [...edits].sort((a, b) => offset(b.span.line, b.span.column) - offset(a.span.line, a.span.column));
  let out = source;
  for (const { span, text } of ordered) {
    out = out.slice(0, offset(span.line, span.column)) + text + out.slice(offset(span.endLine, span.endColumn));
  }
  return out;
}

describe('compose --json — a refusal carries a fix filled from the story language (ADR-409 D7.2, AC-10)', () => {
  it('fills the bare `plural` on "houses" as `plural of house`, with no slot or marker on the wire', async () => {
    const file = join(DIR, 'houses.story');
    writeFileSync(file, storySource(thingLines('houses', 'plural')));
    const { code, stdout } = await run([file, '--json']);
    expect(code).toBe(1);
    expect(stdout).not.toContain('{form}');
    const payload = payloadOf(stdout);
    const record = payload.diagnostics.find((d) => d.code === 'analysis.singular-plural-unsafe-ending');
    expect(record?.fix).toBeDefined();
    expect(record!.fix!.label).toBe('Write `plural of house`');
    expect(record!.fix!.edits).toHaveLength(1);
    expect(record!.fix!.edits[0].text).toBe('plural of house');
    expect(record!.fix!.edits[0].span).toEqual(record!.span);
    expect('slot' in record!.fix!.edits[0]).toBe(false);
  });

  it('leaves a source that compiles once the fix is applied, the form written', async () => {
    const file = join(DIR, 'houses-apply.story');
    const source = storySource(thingLines('houses', 'plural'));
    writeFileSync(file, source);
    const first = payloadOf((await run([file, '--json'])).stdout);
    const fix = first.diagnostics.find((d) => d.fix)!.fix!;
    writeFileSync(file, applyEdits(source, fix.edits));
    expect(readFileSync(file, 'utf8')).toContain('  a thing, plural of house\n');
    const { code, stdout } = await run([file, '--json']);
    expect(code).toBe(0);
    const payload = payloadOf(stdout);
    expect(payload.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const houses = payload.ir!.entities.find((e) => e.name === 'houses') as unknown as { forms?: unknown };
    expect(houses.forms).toMatchObject({ singular: 'house', plural: 'houses', origin: 'written' });
  });

  it('fix-all: every refusal in a story fixed at once recompiles clean', async () => {
    const file = join(DIR, 'fix-all.story');
    const source = storySource([
      ...thingLines('houses', 'plural'),
      ...thingLines('shelf', 'singular'),
      ...thingLines('mice', 'plural'),
      ...thingLines('pot of gold', 'singular'),
      ...thingLines('candles', 'plural'),
    ]);
    writeFileSync(file, source);
    const first = payloadOf((await run([file, '--json'])).stdout);
    const fixes = first.diagnostics.filter((d) => d.fix).map((d) => d.fix!);
    expect(fixes.map((f) => f.edits[0].text)).toEqual([
      'plural of house',
      'singular of shelves',
      'plural of mouse',
      'singular of pots of gold',
    ]);
    writeFileSync(file, applyEdits(source, fixes.flatMap((f) => f.edits)));
    const { code, stdout } = await run([file, '--json']);
    expect(code).toBe(0);
    expect(payloadOf(stdout).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('ships the filled fix through the built CLI the heads spawn', async () => {
    const { execFileSync } = await import('node:child_process');
    const { fileURLToPath } = await import('node:url');
    const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
    const file = join(DIR, 'houses-cli.story');
    writeFileSync(file, storySource(thingLines('houses', 'plural')));
    let stdout = '';
    try {
      execFileSync(process.execPath, [cli, 'compose', file, '--json'], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      stdout = (error as { stdout: string }).stdout; // a refusal exits 1
    }
    const record = payloadOf(stdout).diagnostics.find((d) => d.code === 'analysis.singular-plural-unsafe-ending');
    expect(record?.fix?.edits[0].text).toBe('plural of house');
  });
});
