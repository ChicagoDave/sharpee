/**
 * cli.test.ts — AC-9, driven through the real subprocess.
 *
 * Every test here spawns the built `dist/cli.js` as an actual child process and
 * parses its real stdout. Nothing is injected and nothing is stubbed: the thing
 * under test is the thing the IDE spawns, because a hand-written stand-in for a
 * subprocess proves only that the stand-in works (DEVARCH 13a).
 *
 * The build is a precondition. If `dist/cli.js` is missing these fail loudly
 * rather than skipping — a silently skipped real-path test is the same as not
 * having one.
 *
 * Owner context: @sharpee/world-index — tests.
 *
 * @see ADR-321 AC-9, the IDE↔analyzer boundary
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildDocument, WORLD_INDEX_SCHEMA, type WorldIndexResponse } from '../src/document.js';
import { CORPUS, compileStory } from './corpus.js';

/** The built entry point the IDE spawns. */
const CLI = fileURLToPath(new URL('../dist/cli.js', import.meta.url));

/** One real run of the analyzer subprocess. */
interface CliRun {
  /** Process exit status. */
  status: number | null;
  /** Everything it wrote to stdout, parsed. */
  document: WorldIndexResponse;
  /** Everything it wrote to stderr — expected to be empty, always. */
  stderr: string;
}

/**
 * Spawn the analyzer and parse its answer.
 *
 * @param args the command line to give it
 * @returns the run's status, parsed document, and stderr
 */
function runAnalyzer(args: string[]): CliRun {
  const result = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  if (result.error !== undefined) throw result.error;
  return {
    status: result.status,
    document: JSON.parse(result.stdout) as WorldIndexResponse,
    stderr: result.stderr,
  };
}

let scratch: string;

beforeAll(() => {
  if (!existsSync(CLI)) {
    throw new Error(`${CLI} is not built — run \`pnpm --filter @sharpee/world-index build\` first.`);
  }
  scratch = mkdtempSync(join(tmpdir(), 'world-index-'));
});

describe('a compiled story', () => {
  let run: CliRun;

  beforeAll(() => {
    // Compile Fernhill here and hand the analyzer that, rather than the
    // committed build artifact: the run then depends on this checkout's
    // compiler, not on when someone last built the story.
    const irPath = join(scratch, 'fernhill.ir.json');
    writeFileSync(irPath, JSON.stringify(compileStory(CORPUS.fernhill)));
    run = runAnalyzer([irPath]);
  });

  it('answers with one document and exits clean', () => {
    expect(run.status).toBe(0);
    expect(run.stderr).toBe('');
    expect(run.document.schema).toBe(WORLD_INDEX_SCHEMA);
    expect(run.document.ok).toBe(true);
  });

  it('names the story it analyzed', () => {
    expect(run.document).toMatchObject({
      ok: true,
      story: { id: 'fernhill', version: '0.3.0', start: 'iron-gates' },
      analyzerVersion: expect.stringMatching(/^\d+\.\d+\.\d+$/),
    });
  });

  it('carries all three views', () => {
    expect(run.document.ok).toBe(true);
    if (!run.document.ok) return;

    expect(run.document.map.positions).toHaveLength(13);
    expect(run.document.map.unplaced).toEqual([]);
    expect(run.document.reach.findingCount).toBe(0);
    // Both prose sources cross the wire (Amendment 1 D10) — the description half of
    // these figures is pinned against the pre-amendment numbers in incomplete.test.ts.
    expect(run.document.incomplete.counts).toEqual({
      missingWord: 30,
      ambiguous: 15,
      noObject: 118,
      undescribed: 0,
    });
  });

  // POINT AT THE THING, NOT AT ITS ID (Amendment 2). A finding names `oil-lamp`; the
  // author wrote *the oil lamp* and declared it somewhere. Both facts cross the wire so
  // the surface can say the name and go to the declaration.
  it('carries every entity\'s name and where it was declared', () => {
    expect(run.document.ok).toBe(true);
    if (!run.document.ok) return;

    const lamp = run.document.declarations['oil-lamp'];
    expect(lamp?.name).toBe('oil lamp');
    expect(lamp?.span?.line).toBeGreaterThan(0);

    const missing = run.document.incomplete.missingWord;
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.every((finding) => run.document.ok && finding.entity in run.document.declarations)).toBe(true);
  });

  it('loses nothing crossing the wire', () => {
    const inProcess = buildDocument(compileStory(CORPUS.fernhill), '');
    expect(run.document.ok).toBe(true);
    if (!run.document.ok) return;

    expect(run.document.map).toEqual(inProcess.map);
    expect(run.document.reach).toEqual(inProcess.reach);
    expect(run.document.incomplete).toEqual(inProcess.incomplete);
  });
});

describe('AC-9 — failure is a document, not a crash', () => {
  it('says so when no story was given', () => {
    const run = runAnalyzer([]);
    expect(run.status).toBe(1);
    expect(run.stderr).toBe('');
    expect(run.document).toMatchObject({
      ok: false,
      failure: { cause: 'usage', path: null, message: expect.stringContaining('ir.json') },
    });
  });

  it('says so when the story is missing', () => {
    const missing = join(scratch, 'absent.ir.json');
    const run = runAnalyzer([missing]);

    expect(run.status).toBe(1);
    expect(run.stderr).toBe('');
    expect(run.document).toMatchObject({
      ok: false,
      failure: { cause: 'unreadable-ir', path: missing, message: expect.stringContaining(missing) },
    });
  });

  it('says so when the file is not JSON at all', () => {
    const garbage = join(scratch, 'garbage.ir.json');
    writeFileSync(garbage, 'this is not json');
    const run = runAnalyzer([garbage]);

    expect(run.status).toBe(1);
    expect(run.stderr).toBe('');
    expect(run.document).toMatchObject({ ok: false, failure: { cause: 'malformed-ir', path: garbage } });
  });

  it('says so when the JSON is not a Story IR', () => {
    const wrongShape = join(scratch, 'other.ir.json');
    writeFileSync(wrongShape, JSON.stringify({ hello: 'world' }));
    const run = runAnalyzer([wrongShape]);

    expect(run.status).toBe(1);
    expect(run.stderr).toBe('');
    expect(run.document).toMatchObject({ ok: false, failure: { cause: 'malformed-ir', path: wrongShape } });
  });

  it('carries the schema stamp on a failure too, so the IDE parses one shape', () => {
    for (const run of [runAnalyzer([]), runAnalyzer([join(scratch, 'absent.ir.json')])]) {
      expect(run.document.schema).toBe(WORLD_INDEX_SCHEMA);
      expect(run.document.analyzerVersion).toEqual(expect.any(String));
    }
  });
});
