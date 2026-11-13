/**
 * tree-fork-restore.test.ts — a branch line starts from the save captured at
 * its fork card, restored on the game its parent ran on (ADR-307 D5, amended
 * 2026-11-12; engine-test-performance plan, Phase 4).
 *
 * Against a REAL game: compiled by `@sharpee/chord`, loaded by
 * `@sharpee/story-loader`, assembled by `@sharpee/bootstrap`, saved and
 * restored by the real engine. Nothing here stands in for the engine's save.
 *
 * The first case is its own fixture known to fail: the main line walks away
 * from the Shed after the fork, so a save captured late, or a restore that
 * did nothing, leaves the player in the Lane and the branch's `take crate`
 * cannot succeed.
 *
 * Public interface: none (a test file).
 * Owner context: branch-tester test suite (tooling).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import type { ISaveData } from '@sharpee/core';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import type { GameLoadRequest } from '../src/game-load-request.js';
import { emptyTreeDocument, type TreeCard, type TreeDocument } from '../src/tree-document.js';
import { formatTreeDocumentRun, runTreeDocument, type TreeLineObserver, type TreeWalkerGame } from '../src/tree-walker.js';
import { irIdOf, type ClaimsWorld } from '../src/claims/claims-game.js';

const SEED = 7;
const source = readFileSync(resolve(__dirname, 'fixtures/claims/outside-set-fixture.story'), 'utf8');

function compiled() {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}

type RealGame = ReturnType<typeof assembleGame>;

/** A loader that boots the way `sharpee test` does and keeps each game it booted. */
function recordingLoader(prepare?: (game: RealGame) => void): {
  games: RealGame[];
  requests: GameLoadRequest[];
  loadGame: (request: GameLoadRequest) => Promise<TreeWalkerGame>;
} {
  const games: RealGame[] = [];
  const requests: GameLoadRequest[] = [];
  const loadGame = async (request: GameLoadRequest): Promise<TreeWalkerGame> => {
    const game = assembleGame(createStory(compiled(), { seed: SEED }), {
      seed: SEED,
      freshStory: () => createStory(compiled(), { seed: SEED }),
      ...(request.undo ? {} : { undoSnapshots: 0 }),
    });
    prepare?.(game);
    games.push(game);
    requests.push(request);
    return game as unknown as TreeWalkerGame;
  };
  return { games, requests, loadGame };
}

const skip = (command: string, more: Partial<TreeCard> = {}): TreeCard => ({ type: 'turn', command, skip: true, ...more });
const taken: TreeCard = { type: 'turn', command: 'take crate', assertions: { events: ['if.event.taken'] } };

/** Lane → Yard → Shed, a fork in the Shed, then the main line walks back to the Lane. */
const doc = (branchCards: TreeCard[]): TreeDocument => ({
  ...emptyTreeDocument('outside-set-fixture', SEED, 'main'),
  cards: [
    { type: 'opening' },
    { type: 'boot', skip: true },
    skip('north'),
    skip('north', { branches: [{ id: 'branch', cards: branchCards }], continuation: 'main-after' }),
    skip('south'),
    skip('south'),
  ],
});

const world = (game: RealGame): ClaimsWorld => game.world as unknown as ClaimsWorld;
const holderOfCrate = (game: RealGame): string | undefined => {
  const crate = world(game).getAllEntities().find((entity) => irIdOf(entity) === 'crate')!;
  return irIdOf(world(game).getEntity(world(game).getLocation(crate.id) ?? ''));
};
const roomOfPlayer = (game: RealGame): string | undefined =>
  irIdOf(world(game).getContainingRoom(game.world.playerCharacter.id));

describe('REAL-PATH — a branch line starts from its fork\'s save', () => {
  it('restores the fork state on the one booted game: the player is back in the Shed and takes the crate', async () => {
    const { games, requests, loadGame } = recordingLoader();
    const starts: Array<{ id: string; replayedCommands: number; restored: boolean }> = [];
    /** The harness's record of the last turn, read as the branch line starts. */
    let lastTurnAtBranchStart: Pick<RealGame, 'lastOutput' | 'lastEvents' | 'lastTurnResult' | 'lastChannels' | 'lastChannelValues' | 'lastError'> | undefined;
    const lineObserver: TreeLineObserver = {
      onLineStart: ({ line, replayedCommands, restored }) => {
        starts.push({ id: line.id, replayedCommands, restored });
        if (line.id !== 'branch') return;
        const { lastOutput, lastEvents, lastTurnResult, lastChannels, lastChannelValues, lastError } = games[0];
        lastTurnAtBranchStart = { lastOutput, lastEvents, lastTurnResult, lastChannels, lastChannelValues, lastError };
      },
    };

    const run = await runTreeDocument(doc([taken]), loadGame, { lineObserver });

    // The restore emptied the record of the last turn: without that it would
    // still describe the main line's final `south`, a turn of another line.
    expect(lastTurnAtBranchStart).toEqual({
      lastOutput: '',
      lastEvents: [],
      lastTurnResult: null,
      lastChannels: {},
      lastChannelValues: {},
      lastError: undefined,
    });

    expect(run.lines.map((line) => line.status)).toEqual(['passed', 'passed']);
    // One boot serves the whole tree, and it was asked for no undo snapshots.
    expect(games).toHaveLength(1);
    expect(requests).toEqual([{ undo: false }]);
    // The branch ran on the fork's state, not on where the main line ended.
    expect(roomOfPlayer(games[0])).toBe('shed');
    expect(holderOfCrate(games[0])).toBe('nobody');
    // Nothing was replayed: every command ran once.
    expect(run.forkRestores).toBe(1);
    expect(run.executedCommands).toBe(run.authoredCommands);
    expect(starts).toEqual([
      { id: 'main', replayedCommands: 0, restored: false },
      { id: 'branch', replayedCommands: 0, restored: true },
    ]);
    expect(formatTreeDocumentRun(run).at(-1)).toBe('6 commands (6 authored + 0 replayed), 1 restored at a fork');
  }, 30_000);

  it('a branch line that types undo boots fresh and replays its prefix, and its undo reaches back across the fork', async () => {
    const { games, requests, loadGame } = recordingLoader();
    // `undo` as the line's FIRST card undoes the fork card itself (the second
    // `north`): only a replayed prefix has that turn to give back.
    const run = await runTreeDocument(doc([skip('undo')]), loadGame);

    expect(run.lines.map((line) => line.status)).toEqual(['passed', 'passed']);
    expect(games).toHaveLength(2);
    expect(requests).toEqual([{ undo: false }, { undo: true }]);
    expect(run.forkRestores).toBe(0);
    // look, north, north replayed on the second boot.
    expect(run.executedCommands - run.authoredCommands).toBe(3);
    expect(roomOfPlayer(games[1])).toBe('yard');
    expect(formatTreeDocumentRun(run).at(-1)).toBe('9 commands (6 authored + 3 replayed), 0 restored at a fork');
  }, 30_000);

  it('a branch of a restored line restores too, on the same game', async () => {
    const { games, loadGame } = recordingLoader();
    const nested: TreeCard[] = [
      skip('south', { branches: [{ id: 'leaf', cards: [skip('north'), taken] }], continuation: 'branch-after' }),
      skip('south'),
    ];
    const run = await runTreeDocument(doc(nested), loadGame);

    expect(run.lines.map((line) => line.id)).toEqual(['main', 'branch', 'leaf']);
    expect(run.lines.map((line) => line.status)).toEqual(['passed', 'passed', 'passed']);
    expect(games).toHaveLength(1);
    expect(run.forkRestores).toBe(2);
    // `leaf` forked in the Yard, walked north and took the crate.
    expect(roomOfPlayer(games[0])).toBe('shed');
    expect(holderOfCrate(games[0])).toBe('nobody');
  }, 30_000);

  it('a restore the engine refuses is an error on the line, naming the fork, and nothing runs on it', async () => {
    const { games, loadGame } = recordingLoader((game) => {
      game.engine.restore = async () => false;
    });
    const run = await runTreeDocument(doc([taken]), loadGame);

    expect(run.lines.map((line) => line.status)).toEqual(['passed', 'error']);
    expect(run.lines[1].error).toContain('the engine refused the save taken after "north"');
    expect(run.forkRestores).toBe(0);
    // Only the main line's five commands ran: look, north, north, south, south.
    expect(run.executedCommands).toBe(5);
    // Nothing was restored, so the game is where the main line left it.
    expect(roomOfPlayer(games[0])).toBe('lane');
    // The line never ran: the crate is where the story put it.
    expect(holderOfCrate(games[0])).toBe('shed');
  }, 30_000);

  it('a fork before any command boots fresh: there is no turn to have saved after', async () => {
    const { games, requests, loadGame } = recordingLoader();
    const document: TreeDocument = {
      ...emptyTreeDocument('outside-set-fixture', SEED, 'main'),
      cards: [
        { type: 'opening', branches: [{ id: 'early', cards: [skip('north'), skip('north'), taken] }], continuation: 'main-after' },
        { type: 'boot', skip: true },
        skip('north'),
      ],
    };
    const run = await runTreeDocument(document, loadGame);

    expect(run.lines.map((line) => line.id)).toEqual(['main', 'early']);
    expect(run.lines.map((line) => line.status)).toEqual(['passed', 'passed']);
    expect(games).toHaveLength(2);
    expect(requests).toEqual([{ undo: false }, { undo: false }]);
    expect(run.forkRestores).toBe(0);
    // The branch played on its own boot; the main line's game never saw it.
    expect(holderOfCrate(games[1])).toBe('nobody');
    expect(roomOfPlayer(games[0])).toBe('yard');
  }, 30_000);
});

describe('REAL-PATH — the walker\'s fork hooks do not outlive a capture or a restore', () => {
  it('leaves no save or restore hook on an engine that had none', async () => {
    const { games, loadGame } = recordingLoader();
    const run = await runTreeDocument(doc([taken]), loadGame);

    expect(run.forkRestores).toBe(1);
    const hooks = games[0].engine.getSaveRestoreHooks();
    expect(hooks?.onSaveRequested).toBeUndefined();
    expect(hooks?.onRestoreRequested).toBeUndefined();
    // Bootstrap's restart hook was registered before the run and survives it.
    expect(hooks?.onRestartRequested).toBeTypeOf('function');
  }, 30_000);

  it('an author\'s own save card on a restored line reaches the host\'s save hook, once', async () => {
    const hostSaves: ISaveData[] = [];
    const { games, loadGame } = recordingLoader((game) => {
      game.engine.registerSaveRestoreHooks({ onSaveRequested: async (data) => { hostSaves.push(data); } });
    });
    const run = await runTreeDocument(doc([taken, skip('save')]), loadGame);

    expect(run.lines.map((line) => line.status)).toEqual(['passed', 'passed']);
    expect(run.forkRestores).toBe(1);
    // The walker's capture at the fork did not go through the host's hook;
    // the author's `save`, typed after the crate was taken, did.
    expect(hostSaves).toHaveLength(1);
    expect(games[0].engine.getSaveRestoreHooks()?.onSaveRequested).toBeTypeOf('function');
  }, 30_000);

  it('puts back a host\'s restore hook, and a save card directly after a fork card reaches the host', async () => {
    const hostSaves: ISaveData[] = [];
    const hostRestore = async (): Promise<ISaveData | null> => null;
    const { games, loadGame } = recordingLoader((game) => {
      game.engine.registerSaveRestoreHooks({
        onSaveRequested: async (data) => { hostSaves.push(data); },
        onRestoreRequested: hostRestore,
      });
    });
    // The main line types `save` on the card right after the fork card: the
    // walker's capture hooks are gone before that command runs.
    const document: TreeDocument = {
      ...emptyTreeDocument('outside-set-fixture', SEED, 'main'),
      cards: [
        { type: 'opening' },
        { type: 'boot', skip: true },
        skip('north'),
        skip('north', { branches: [{ id: 'branch', cards: [taken] }], continuation: 'main-after' }),
        skip('save'),
      ],
    };
    const run = await runTreeDocument(document, loadGame);

    expect(run.lines.map((line) => line.status)).toEqual(['passed', 'passed']);
    expect(run.forkRestores).toBe(1);
    expect(hostSaves).toHaveLength(1);
    expect(games[0].engine.getSaveRestoreHooks()?.onRestoreRequested).toBe(hostRestore);
  }, 30_000);
});
