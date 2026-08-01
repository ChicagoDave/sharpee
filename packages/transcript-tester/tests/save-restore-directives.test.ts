/**
 * save-restore-directives.test.ts — $save/$restore through the platform save
 * format (ADR-293 D7).
 *
 * The tester owns only WHERE a save file lives; the engine owns WHAT is in it.
 * These tests pin the REJECTS WHEN branches: legacy tester snapshots (no
 * save-format version) are never silently restored, missing files and a
 * missing platform engine are named errors, and $save persists exactly the
 * payload the engine hands the hook.
 *
 * Scaffolding note (rule 13a): the platform engine here is a stub because the
 * unit under test is the tester's directive handling, not the engine's save
 * format. The real-path proof — save→restore→continue byte-identical at a
 * pinned seed through the shipped bundle, version reader included — lives in
 * stories/dungeo/tests/transcripts/save-restore-basic.transcript and the
 * Phase 7 acceptance evidence (docs/work/adr-293-phase-a/plan.md).
 *
 * Owner context: transcript-tester test suite (tooling).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseTranscript } from '../src/parser.js';
import { runTranscript } from '../src/runner.js';

let savesDir: string;

beforeEach(() => {
  savesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-saves-'));
});

afterEach(() => {
  fs.rmSync(savesDir, { recursive: true, force: true });
});

/** A game wrapper whose platform engine round-trips through real files. */
function stubGame(saveData: unknown = { version: '3.0.0', engineState: {} }) {
  const calls: string[] = [];
  let hooks: {
    onSaveRequested(data: unknown): Promise<void>;
    onRestoreRequested(): Promise<unknown | null>;
  } | null = null;
  return {
    calls,
    game: {
      executeCommand: () => 'ok',
      world: {},
      engine: {
        registerSaveRestoreHooks(h: typeof hooks) {
          hooks = h;
        },
        async save() {
          calls.push('save');
          await hooks!.onSaveRequested(saveData);
          return true;
        },
        async restore() {
          calls.push('restore');
          const data = await hooks!.onRestoreRequested();
          return data !== null;
        }
      }
    }
  };
}

/** Run a directive-only transcript and return the synthetic failure, if any. */
async function runDirective(source: string, game: object) {
  const transcript = parseTranscript(source, 't.transcript');
  const result = await runTranscript(transcript, game as never, {
    savesDirectory: savesDir,
    stopOnFailure: true
  });
  return result;
}

describe('$save through the platform engine', () => {
  it('persists exactly the payload the engine hands the hook', async () => {
    const saveData = { version: '3.0.0', engineState: { streamStates: { 'p.a': 7 } } };
    const { game, calls } = stubGame(saveData);
    const result = await runDirective('title: T\n---\n\n$save alpha\n', game);
    expect(result.status).toBe('passed');
    expect(calls).toEqual(['save']);
    const written = JSON.parse(fs.readFileSync(path.join(savesDir, 'alpha.json'), 'utf-8'));
    expect(written).toEqual(saveData);
  });

  it('rejects when the wrapper has no platform engine', async () => {
    const result = await runDirective('title: T\n---\n\n$save alpha\n', {
      executeCommand: () => 'ok',
      world: {}
    });
    expect(result.status).toBe('failed');
    expect(result.commands[0].error).toContain('requires the platform engine');
    expect(fs.existsSync(path.join(savesDir, 'alpha.json'))).toBe(false);
  });
});

describe('$restore through the platform engine', () => {
  it('hands a versioned save file to the engine restore', async () => {
    const saved = { version: '3.0.0', engineState: { streamStates: { 'p.a': 7 } } };
    fs.writeFileSync(path.join(savesDir, 'alpha.json'), JSON.stringify(saved), 'utf-8');
    const { game, calls } = stubGame();
    const result = await runDirective('title: T\n---\n\n$restore alpha\n', game);
    expect(result.status).toBe('passed');
    expect(calls).toEqual(['restore']);
  });

  it('rejects a legacy tester snapshot ({ worldState, ... }) with a named error', async () => {
    fs.writeFileSync(
      path.join(savesDir, 'old.json'),
      JSON.stringify({ worldState: '{}', pluginStates: {} }),
      'utf-8'
    );
    const { game, calls } = stubGame();
    const result = await runDirective('title: T\n---\n\n$restore old\n', game);
    expect(result.status).toBe('failed');
    expect(result.commands[0].error).toContain('legacy tester snapshot');
    // The engine must never see a legacy snapshot — rejection happens first.
    expect(calls).toEqual([]);
  });

  it('rejects a version-less save file with the same named error', async () => {
    fs.writeFileSync(path.join(savesDir, 'unversioned.json'), JSON.stringify({ engineState: {} }), 'utf-8');
    const { game, calls } = stubGame();
    const result = await runDirective('title: T\n---\n\n$restore unversioned\n', game);
    expect(result.status).toBe('failed');
    expect(result.commands[0].error).toContain('legacy tester snapshot');
    expect(calls).toEqual([]);
  });

  it('rejects a missing save file by name', async () => {
    const { game } = stubGame();
    const result = await runDirective('title: T\n---\n\n$restore ghost\n', game);
    expect(result.status).toBe('failed');
    expect(result.commands[0].error).toContain('Save file not found');
  });

  it('rejects when the wrapper has no platform engine', async () => {
    fs.writeFileSync(
      path.join(savesDir, 'alpha.json'),
      JSON.stringify({ version: '3.0.0', engineState: {} }),
      'utf-8'
    );
    const result = await runDirective('title: T\n---\n\n$restore alpha\n', {
      executeCommand: () => 'ok',
      world: {}
    });
    expect(result.status).toBe('failed');
    expect(result.commands[0].error).toContain('requires the platform engine');
  });
});
