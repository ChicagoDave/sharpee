/**
 * tree-undo-snapshots.test.ts — a tree line that cannot ask for undo runs on
 * an engine that takes no undo snapshot, and a line that types `undo` keeps
 * its snapshots and its undo works (engine-test-performance plan, Phase 3).
 *
 * Against a REAL game: compiled by `@sharpee/chord`, loaded by
 * `@sharpee/story-loader`, assembled by `@sharpee/bootstrap`. The loader
 * here follows the rule `sharpee test` follows: the walker says whether the
 * line's commands can ask for undo, and the loader boots with no snapshots
 * when they cannot. The count is of world serializations, which is what an
 * undo snapshot is; nothing here measures time.
 *
 * The second case is the first one's fixture known to fail: the same line
 * with `undo` typed at its end must serialize, and must put the crate back.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import type { GameLoadRequest } from '../src/game-load-request.js';
import { typesUndo } from '../src/game-load-request.js';
import { emptyTreeDocument, type TreeCard, type TreeDocument } from '../src/tree-document.js';
import { runTreeDocument, type TreeWalkerGame } from '../src/tree-walker.js';
import { irIdOf, type ClaimsWorld } from '../src/claims/claims-game.js';

const SEED = 7;
const source = readFileSync(resolve(__dirname, 'fixtures/claims/outside-set-fixture.story'), 'utf8');

function compiled() {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}

/** One booted game, what the walker asked of its loader, and how often its world was serialized. */
interface Booted {
  readonly request: GameLoadRequest;
  readonly world: ClaimsWorld;
  readonly canUndo: () => boolean;
  serializations: number;
}

/** A loader that boots the way `sharpee test` does and keeps what it booted. */
function recordingLoader(): { booted: Booted[]; loadGame: (request: GameLoadRequest) => Promise<TreeWalkerGame> } {
  const booted: Booted[] = [];
  const loadGame = async (request: GameLoadRequest): Promise<TreeWalkerGame> => {
    const game = assembleGame(createStory(compiled(), { seed: SEED }), {
      seed: SEED,
      freshStory: () => createStory(compiled(), { seed: SEED }),
      ...(request.undo ? {} : { undoSnapshots: 0 }),
    });
    const record: Booted = { request, world: game.world, canUndo: () => game.engine.canUndo(), serializations: 0 };
    const serialize = game.world.toJSON.bind(game.world);
    game.world.toJSON = () => { record.serializations++; return serialize(); };
    booted.push(record);
    return game as unknown as TreeWalkerGame;
  };
  return { booted, loadGame };
}

const skip = (command: string): TreeCard => ({ type: 'turn', command, skip: true });
const doc = (cards: TreeCard[]): TreeDocument => ({
  ...emptyTreeDocument('outside-set-fixture', SEED, 'main'),
  cards: [{ type: 'opening' }, { type: 'boot', skip: true }, ...cards],
});

const roomOfCrate = (world: ClaimsWorld): string | undefined => {
  const crate = world.getAllEntities().find((entity) => irIdOf(entity) === 'crate')!;
  return irIdOf(world.getContainingRoom(crate.id));
};
const holderOfCrate = (world: ClaimsWorld): string | undefined => {
  const crate = world.getAllEntities().find((entity) => irIdOf(entity) === 'crate')!;
  return irIdOf(world.getEntity(world.getLocation(crate.id) ?? ''));
};

describe('the undo command is read off the commands a game will run', () => {
  it('finds the word anywhere in a line, in any case, because the engine splits a line into turns', () => {
    expect(typesUndo(['look', 'undo'])).toBe(true);
    expect(typesUndo(['  UNDO  '])).toBe(true);
    expect(typesUndo(['take crate. undo'])).toBe(true);
    expect(typesUndo(['take crate then undo'])).toBe(true);
    expect(typesUndo(['take crate; undo'])).toBe(true);
    expect(typesUndo(['look', 'undoing', 'redo', undefined])).toBe(false);
    expect(typesUndo([])).toBe(false);
  });
});

describe('REAL-PATH — a tree line and its undo snapshots', () => {
  it('a line that never types undo boots without snapshots and serializes the world zero times', async () => {
    const { booted, loadGame } = recordingLoader();
    const run = await runTreeDocument(doc([skip('north'), skip('north'), skip('take crate')]), loadGame);
    expect(run.lines.map((line) => line.status)).toEqual(['passed']);
    expect(booted).toHaveLength(1);
    expect(booted[0].request).toEqual({ undo: false });
    expect(holderOfCrate(booted[0].world)).toBe('nobody');
    expect(booted[0].serializations).toBe(0);
    expect(booted[0].canUndo()).toBe(false);
  }, 30_000);

  it('the same line with undo typed keeps its snapshots, and the undo puts the crate back', async () => {
    const { booted, loadGame } = recordingLoader();
    const run = await runTreeDocument(doc([skip('north'), skip('north'), skip('take crate'), skip('undo')]), loadGame);
    expect(run.lines.map((line) => line.status)).toEqual(['passed']);
    expect(booted[0].request).toEqual({ undo: true });
    // One snapshot before each of the three undoable turns; the boot look takes one too.
    expect(booted[0].serializations).toBeGreaterThanOrEqual(3);
    expect(holderOfCrate(booted[0].world)).toBe('shed');
    expect(roomOfCrate(booted[0].world)).toBe('shed');
  }, 30_000);

  it('an undo chained onto another command on one card keeps its snapshots too', async () => {
    const { booted, loadGame } = recordingLoader();
    const run = await runTreeDocument(doc([skip('north'), skip('north'), skip('take crate. undo')]), loadGame);
    expect(run.lines.map((line) => line.status)).toEqual(['passed']);
    expect(booted[0].request).toEqual({ undo: true });
    expect(holderOfCrate(booted[0].world)).toBe('shed');
  }, 30_000);
});
