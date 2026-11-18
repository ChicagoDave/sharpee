/**
 * opening-run.test.ts — the runner opens a new game before its first command
 * (ADR-404 decision 4: no head types an opening `look`).
 *
 * Derived from the Behavior Statement: `runTranscript` runs a pending game's
 * opening once, before any command; a chain's later members and a game that
 * is not pending are left alone; an opening that throws is a transcript
 * error and nothing executes; and the `(opening)` row asserts against the
 * opening's own captures (the game's boot captures), reported ahead of the
 * first command.
 *
 * The story layer is a stub in the suite's convention for the call-order
 * cases; the last block runs the runner on a real `assembleGame` handle.
 *
 * Owner context: transcript-tester test suite (tooling).
 */
import { createRequire } from 'module';
import { describe, expect, it } from 'vitest';
import type { Story } from '@sharpee/engine';
import type { WorldModel } from '@sharpee/world-model';
import { parseTranscript } from '../src/parser.js';
import { runTranscript } from '../src/runner.js';

/** A stub game whose opening says the banner, and whose commands never do. */
function stubGame(options: { pending?: boolean; openingThrows?: boolean } = {}) {
  const game = {
    /** Everything run on the game, in order. */
    log: [] as string[],
    openingPending: options.pending ?? true,
    bootChannelValues: {} as Record<string, unknown[]>,
    lastChannelValues: {} as Record<string, unknown[]>,
    async runOpening(): Promise<string> {
      if (options.openingThrows) throw new Error('the lamp would not light');
      game.log.push('(opening)');
      game.openingPending = false;
      game.bootChannelValues = { banner: [{ title: 'DUNGEON' }], prologue: ['The house is quiet.'] };
      return 'West of House';
    },
    executeCommand(input: string): string {
      game.log.push(input);
      game.openingPending = false;
      // A command's own capture: no banner, and a decoy the opening row must not read.
      game.lastChannelValues = { prologue: ['a decoy the opening never said'] };
      return 'West of House';
    }
  };
  return game;
}

const WITH_OPENING_ROW =
  'title: T\n---\n[CHANNEL: banner, contains "DUNGEON"]\n\n> look\n[OK: contains "West of House"]\n';
const PLAIN = 'title: T\n---\n> look\n[OK: contains "West of House"]\n\n> wait\n[OK: contains "West"]\n';

describe('the runner opens a new game', () => {
  it('runs the opening once, before the first command', async () => {
    const game = stubGame();

    const result = await runTranscript(parseTranscript(PLAIN, '/tmp/plain.transcript'), game as never);

    expect(result.status).toBe('passed');
    expect(game.log).toEqual(['(opening)', 'look', 'wait']);
  });

  it('does not open a chain member after the first', async () => {
    const game = stubGame();

    await runTranscript(parseTranscript(PLAIN, '/tmp/one.transcript'), game as never, { chain: true });
    await runTranscript(parseTranscript(PLAIN, '/tmp/two.transcript'), game as never, { chain: true });

    expect(game.log).toEqual(['(opening)', 'look', 'wait', 'look', 'wait']);
  });

  it('does not open a game that is not pending', async () => {
    const game = stubGame({ pending: false });

    await runTranscript(parseTranscript(PLAIN, '/tmp/plain.transcript'), game as never);

    expect(game.log).toEqual(['look', 'wait']);
  });

  it('reports an opening that throws as a transcript error and executes nothing', async () => {
    const game = stubGame({ openingThrows: true });

    const result = await runTranscript(parseTranscript(PLAIN, '/tmp/plain.transcript'), game as never);

    expect(result.status).toBe('error');
    expect(result.errorMessage).toBe("the story's opening failed: the lamp would not light");
    expect(game.log).toEqual([]);
  });
});

describe('the (opening) row', () => {
  it("passes against the opening's captures and is reported ahead of the first command", async () => {
    const game = stubGame();

    const result = await runTranscript(
      parseTranscript(WITH_OPENING_ROW, '/tmp/opening.transcript'), game as never);

    expect(result.commands.map((c) => c.command.input)).toEqual(['(opening)', 'look']);
    expect(result.commands[0].passed).toBe(true);
    expect(result.status).toBe('passed');
  });

  it('is checked before the first command runs', async () => {
    const game = stubGame();
    // A first command that spoils the boot captures: a row checked after it
    // would read the decoy and fail.
    const execute = game.executeCommand;
    game.executeCommand = (input: string): string => {
      const out = execute(input);
      game.bootChannelValues = { banner: [{ title: 'spoiled by the first command' }] };
      return out;
    };

    const result = await runTranscript(
      parseTranscript(WITH_OPENING_ROW, '/tmp/opening.transcript'), game as never);

    expect(result.commands[0].command.input).toBe('(opening)');
    expect(result.commands[0].passed).toBe(true);
  });

  it("reads the opening's captures, never the first command's", async () => {
    const game = stubGame();
    const source =
      'title: T\n---\n[CHANNEL: prologue, contains "a decoy"]\n\n> look\n[OK: contains "West of House"]\n';

    const result = await runTranscript(parseTranscript(source, '/tmp/decoy.transcript'), game as never);

    expect(result.commands[0].command.input).toBe('(opening)');
    expect(result.commands[0].passed).toBe(false);
    expect(result.status).toBe('failed');
  });

  it('fails when the game was never opened and so said nothing', async () => {
    const game = stubGame({ pending: false });

    const result = await runTranscript(
      parseTranscript(WITH_OPENING_ROW, '/tmp/opening.transcript'), game as never);

    expect(result.commands[0].command.input).toBe('(opening)');
    expect(result.commands[0].passed).toBe(false);
  });
});

describe('the runner on a real game handle', () => {
  // Loaded through Node's resolver from the built packages, as bootstrap's
  // own real-path suites load them: the stubs above define `openingPending`
  // and `runOpening` themselves, so only a real `assembleGame` handle shows
  // that the runner's seam and bootstrap's handle still name the same members.
  const nodeRequire = createRequire(__filename);
  const { assembleGame } = nodeRequire('@sharpee/bootstrap') as typeof import('@sharpee/bootstrap');
  const { EntityType, ActorTrait, IdentityTrait, RoomTrait } =
    nodeRequire('@sharpee/world-model') as typeof import('@sharpee/world-model');

  /** A one-room story with a prologue. */
  function makeStory(): Story {
    let startRoomId: string | undefined;
    return {
      config: {
        id: 'runner-opening',
        title: 'The Lamp',
        authors: ['tester'],
        version: '1.0.0',
        description: 'The runner opens a real game',
        prologue: 'The tide was out, and the lamp was cold.',
      },
      createPlayer(world: WorldModel) {
        const player = world.createEntity('you', EntityType.ACTOR);
        player.add(new ActorTrait({ isPlayable: true }));
        player.add(new IdentityTrait({ name: 'you', description: 'A keeper.' }));
        if (startRoomId) world.moveEntity(player.id, startRoomId);
        return player;
      },
      initializeWorld(world: WorldModel) {
        const room = world.createEntity('Lamp Room', EntityType.ROOM);
        room.add(new IdentityTrait({ name: 'Lamp Room', description: 'A round room around a cold lamp.' }));
        room.add(new RoomTrait({ exits: {} }));
        startRoomId = room.id;
      },
    } as Story;
  }

  it('opens the game, passes an (opening) row on its prologue, and runs the first command as turn 1', async () => {
    const game = assembleGame(makeStory());
    expect(game.openingPending).toBe(true);
    const source =
      'title: T\n---\n[CHANNEL: prologue, contains "the lamp was cold"]\n\n' +
      '> look\n[OK: contains "A round room around a cold lamp."]\n';

    const result = await runTranscript(parseTranscript(source, '/tmp/real.transcript'), game as never);

    expect(result.commands.map((c) => c.command.input)).toEqual(['(opening)', 'look']);
    expect(result.commands[0].passed).toBe(true);
    expect(result.status).toBe('passed');
    expect(game.openingPending).toBe(false);
    expect(game.openingPackets).toHaveLength(3);
    // The opening cost no turn: the one command was turn 1.
    expect(game.lastTurnResult?.turn).toBe(1);
  });
});
