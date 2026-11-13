/**
 * author-game-undo.test.ts — `loadAuthorGame` carries the undo depth to the
 * real engine (engine-test-performance plan, Phase 3).
 *
 * `sharpee test` boots every game through this loader and asks for no undo
 * snapshots when none of the game's commands can ask for undo. This pins the
 * loader's half on a REAL game: with `undoSnapshots: 0` the engine keeps no
 * snapshot after an undoable turn and never serializes the world for one;
 * without the option it keeps one, as play does.
 *
 * Owner context: devkit test suite (author tool).
 */
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadAuthorGame } from '../src/standalone/author-game.js';

const FERRY = path.resolve(__dirname, '../../../test-stories/ferry');
const describeFerry = existsSync(path.join(FERRY, 'ferry.story')) ? describe : describe.skip;

/** Boot the ferry, count world serializations, and take one undoable turn. */
async function afterOneTurn(undoSnapshots?: number): Promise<{ canUndo: boolean; serializations: number; undid: boolean }> {
  const game = await loadAuthorGame(FERRY, { seed: 42, ...(undoSnapshots !== undefined ? { undoSnapshots } : {}) });
  let serializations = 0;
  const serialize = game.world.toJSON.bind(game.world);
  game.world.toJSON = () => { serializations++; return serialize(); };
  await game.engine.executeTurn('north');
  const canUndo = game.engine.canUndo();
  return { canUndo, serializations, undid: game.engine.undo() };
}

describeFerry('loadAuthorGame and the engine\'s undo depth', () => {
  it('with undoSnapshots 0 the engine takes no snapshot: nothing to undo, and the world is never serialized', async () => {
    expect(await afterOneTurn(0)).toEqual({ canUndo: false, serializations: 0, undid: false });
  });

  it('without the option the engine keeps its snapshot, as play does', async () => {
    const play = await afterOneTurn();
    expect(play.canUndo).toBe(true);
    expect(play.serializations).toBeGreaterThanOrEqual(1);
    expect(play.undid).toBe(true);
  });
});
