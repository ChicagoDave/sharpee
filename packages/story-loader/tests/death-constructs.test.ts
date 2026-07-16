/**
 * death-constructs.test.ts — ADR-227 Phase 4: the three Chord death
 * constructs and their lowering.
 *
 * - `kill the player [<key>] [when <cond>]` → killPlayer sink (canonical
 *   `if.event.player.died`, HealthTrait mutation; NOT triggerEnding).
 * - `<direction> is deadly: <phrase>` → ONE pre-validate command transformer
 *   redirecting to stdlib's generic DEADLY_ROOM_DEATH_ACTION_ID — the same
 *   seam Dungeo's falls transformer uses (AC-1/AC-3 parity by construction).
 * - `deadly: <phrase>` → DeadlyRoomTrait attach (engine auto-registers the
 *   deadly-room transformer; no loader runtime code).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import {
  DeadlyRoomTrait,
  HealthTrait,
  IParsedCommand,
  TraitType,
  WorldModel,
} from '@sharpee/world-model';
import {
  DEADLY_ROOM_DEATH_ACTION_ID,
  DEADLY_ROOM_CAUSE_KEY,
  DEADLY_ROOM_MESSAGE_KEY,
  PLAYER_DIED_EVENT,
} from '@sharpee/stdlib';
import { ChordStory, createStory } from '../src';

const CHORD_FIXTURES = join(__dirname, '..', '..', 'chord', 'tests', 'fixtures');

function compileFixture(name: string): StoryIR {
  const result = compile(readFileSync(join(CHORD_FIXTURES, name), 'utf8'));
  if (!result.ok) throw new Error(result.diagnostics.map((d) => d.message).join('; '));
  return result.ir;
}

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => d.message).join('; '));
  return result.ir;
}

interface DeathWorld {
  story: ChordStory;
  world: WorldModel;
  playerId: string;
}

function loadDeathStory(): DeathWorld {
  const story = createStory(compileFixture('death.story'), { seed: 42 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, playerId: player.id };
}

/** Minimal parsed `going` command for driving the deadly-exit transformer. */
function goCommand(direction: string): IParsedCommand {
  return {
    rawInput: `go ${direction.toLowerCase()}`,
    tokens: [],
    structure: { verb: { tokens: [0], text: 'go', head: 'go' } },
    pattern: 'VERB_NOUN',
    confidence: 1,
    action: 'if.action.going',
    extras: { direction },
  } as unknown as IParsedCommand;
}

type Transformer = (parsed: IParsedCommand, world: WorldModel) => IParsedCommand;

/** Capture the transformer onEngineReady registers via a structural engine stub. */
function captureTransformer(story: ChordStory): Transformer {
  const captured: Transformer[] = [];
  story.onEngineReady({
    getPluginRegistry: () => ({ register: () => {} }),
    registerParsedCommandTransformer: (t: Transformer) => captured.push(t),
  });
  expect(captured).toHaveLength(1);
  return captured[0];
}

function enterRoom({ story, world, playerId }: DeathWorld, irId: string): ISemanticEvent[] {
  const roomId = story.entityId(irId)!;
  world.moveEntity(playerId, roomId);
  return story.runtime.fireEventClauses(world, {
    id: `move-${irId}`,
    type: 'if.event.actor_moved',
    timestamp: 0,
    entities: { actor: playerId },
    data: { toRoom: roomId, fromRoom: story.entityId('meadow'), direction: 'EAST' },
  });
}

describe('`deadly: <phrase>` (no-escape room marker)', () => {
  it('attaches DeadlyRoomTrait with phrase-derived cause/messageId and default safe verbs', () => {
    const { story, world } = loadDeathStory();
    const vault = world.getEntity(story.entityId('vault')!)!;

    const trait = vault.get(TraitType.DEADLY_ROOM) as DeadlyRoomTrait | undefined;
    expect(trait).toBeDefined();
    expect(trait!.cause).toBe('no-escape');
    expect(trait!.messageId).toBe('no-escape');
    expect(trait!.safeVerbs).toEqual(['looking', 'examining']); // AC-3 default
    expect(trait!.chance).toBeUndefined();
  });

  it('non-deadly rooms carry no DeadlyRoomTrait', () => {
    const { story, world } = loadDeathStory();
    const meadow = world.getEntity(story.entityId('meadow')!)!;
    expect(meadow.get(TraitType.DEADLY_ROOM)).toBeFalsy();
  });
});

describe('`<direction> is deadly: <phrase>` (deadly exit)', () => {
  it('redirects going the deadly direction to the generic deadly-death action', () => {
    const env = loadDeathStory();
    const transformer = captureTransformer(env.story);
    env.world.moveEntity(env.playerId, env.story.entityId('cliff-top')!);

    const result = transformer(goCommand('SOUTH'), env.world);

    expect(result.action).toBe(DEADLY_ROOM_DEATH_ACTION_ID);
    expect(result.extras?.[DEADLY_ROOM_CAUSE_KEY]).toBe('over-the-falls');
    expect(result.extras?.[DEADLY_ROOM_MESSAGE_KEY]).toBe('over-the-falls');
    expect(result.extras?.originalAction).toBe('if.action.going');
  });

  it('resolves single-letter direction abbreviations', () => {
    const env = loadDeathStory();
    const transformer = captureTransformer(env.story);
    env.world.moveEntity(env.playerId, env.story.entityId('cliff-top')!);

    const result = transformer(goCommand('S'), env.world);
    expect(result.action).toBe(DEADLY_ROOM_DEATH_ACTION_ID);
  });

  it('passes through safe directions, other rooms, and non-going actions', () => {
    const env = loadDeathStory();
    const transformer = captureTransformer(env.story);

    // Safe direction from the deadly-exit room (the retreat).
    env.world.moveEntity(env.playerId, env.story.entityId('cliff-top')!);
    expect(transformer(goCommand('NORTH'), env.world).action).toBe('if.action.going');

    // Non-going action in the deadly-exit room.
    const wait = { ...goCommand('SOUTH'), action: 'if.action.waiting' } as IParsedCommand;
    expect(transformer(wait, env.world).action).toBe('if.action.waiting');

    // Same direction from a room with no deadly exits.
    env.world.moveEntity(env.playerId, env.story.entityId('meadow')!);
    expect(transformer(goCommand('SOUTH'), env.world).action).toBe('if.action.going');
  });

  it('registers no transformer when the story declares no deadly exits', () => {
    const story = createStory(compileFixture('cloak.story'), {
      hatchModules: { './extras.ts': { garbled: () => ({ kind: 'literal', text: 'x' }) } },
      seed: 42,
    });
    const world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    world.setPlayer(player.id);

    const captured: Transformer[] = [];
    story.onEngineReady({
      getPluginRegistry: () => ({ register: () => {} }),
      registerParsedCommandTransformer: (t: Transformer) => captured.push(t),
    });
    expect(captured).toHaveLength(0);
  });
});

describe('`kill the player` statement', () => {
  it('applies terminal death via the killPlayer sink with the phrase-derived cause', () => {
    const env = loadDeathStory();

    const events = enterRoom(env, 'tomb');

    // Canonical event, from killPlayer — not a triggerEnding game.ending.
    const died = events.find((e) => e.type === PLAYER_DIED_EVENT);
    expect(died).toBeDefined();
    expect(died!.data).toMatchObject({ cause: 'tomb-curse', terminal: true });
    expect(events.some((e) => e.type === 'game.ending')).toBe(false);

    // The phrase carries the death text.
    expect(events.some((e) => (e.data as any)?.messageId === 'tomb-curse')).toBe(true);

    // THE state mutation: terminally dead.
    const player = env.world.getEntity(env.playerId)!;
    const health = player.get(TraitType.HEALTH) as HealthTrait | undefined;
    expect(health?.dead).toBe(true);
    expect(health?.causeOfDeath).toBe('tomb-curse');
  });

  it('`when <condition>` gates the kill (no death while the condition is false)', () => {
    const ir = compileSource(`story "Kill When" by "Fixture"
  id: kill-when
  version: 1.0.0

create the amulet
  in the Crypt

create the Crypt
  a room

  A cold crypt.

  after entering it
    kill the player crypt-curse when the player has the amulet
  end after

define phrases en-US
  crypt-curse:
    The amulet flares, and the crypt claims you.
`);
    const story = createStory(ir, { seed: 42 });
    const world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    world.setPlayer(player.id);
    const cryptId = story.entityId('crypt')!;

    // Without the amulet: entering is survivable.
    world.moveEntity(player.id, cryptId);
    const safeEvents = story.runtime.fireEventClauses(world, {
      id: 'enter-1',
      type: 'if.event.actor_moved',
      timestamp: 0,
      entities: { actor: player.id },
      data: { toRoom: cryptId, fromRoom: null, direction: 'NORTH' },
    });
    expect(safeEvents.some((e) => e.type === PLAYER_DIED_EVENT)).toBe(false);
    expect((player.get(TraitType.HEALTH) as HealthTrait | undefined)?.dead ?? false).toBe(false);

    // Holding the amulet: the condition holds and the kill fires.
    world.moveEntity(story.entityId('amulet')!, player.id);
    const fatalEvents = story.runtime.fireEventClauses(world, {
      id: 'enter-2',
      type: 'if.event.actor_moved',
      timestamp: 0,
      entities: { actor: player.id },
      data: { toRoom: cryptId, fromRoom: null, direction: 'NORTH' },
    });
    const died = fatalEvents.find((e) => e.type === PLAYER_DIED_EVENT);
    expect(died).toBeDefined();
    expect(died!.data).toMatchObject({ cause: 'crypt-curse' });
    expect((player.get(TraitType.HEALTH) as HealthTrait).dead).toBe(true);
  });
});
