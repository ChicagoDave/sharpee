/**
 * entering-on-things.test.ts — GH #341: an `entering` clause on a THING is
 * the entering action's interceptor, not a room-arrival event clause.
 *
 * Before the fix, `on the player entering` on scenery loaded clean, bound
 * to `if.event.actor_moved`, and could never fire (the event's destination
 * is a room, never the thing) — stdlib's generic "You can't enter …" won
 * every time. Room and region owners keep their event bindings unchanged.
 *
 * REAL-PATH: compiled Chord, the loader's world, the real stdlib `entering`
 * under the real lifecycle engine via `CommandExecutor.executeAsActor` (the
 * adr-327-ac2 harness shape). Assertions are on world state (the player's
 * location) and the specific refusal/phrase events.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { CommandExecutor, EngineRandomService, type GameContext } from '@sharpee/engine';
import { EventProcessor } from '@sharpee/event-processor';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { IFActions, StandardActionRegistry, standardActions } from '@sharpee/stdlib';
import { WorldModel } from '@sharpee/world-model';
import type { IFEntity } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';
import { CHORD_STORY_STATE_KEY } from '../src/state-keys';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

interface Booted {
  story: ChordStory;
  world: WorldModel;
  player: IFEntity;
  entity: (irId: string) => IFEntity;
  act: (actionId: string, directObject: IFEntity) => ReturnType<CommandExecutor['executeAsActor']>;
}

function boot(source: string): Booted {
  const story = createStory(compileSource(source), { seed: 5 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  story.runtime.setTurnProvider(() => 3);

  const language = new EnglishLanguageProvider();
  const registry = new StandardActionRegistry();
  for (const action of standardActions) registry.register(action);
  registry.setLanguageProvider(language);
  const executor = new CommandExecutor(
    world,
    registry,
    new EventProcessor(world),
    new EnglishParser(language, { world }),
    undefined,
    new EngineRandomService(7),
  );
  const gameContext: GameContext = {
    currentTurn: 3,
    player,
    history: [],
    metadata: { started: new Date(), lastPlayed: new Date() },
  };
  const id = (irId: string) => story.entityId(irId)!;
  return {
    story,
    world,
    player,
    entity: (irId) => world.getEntity(id(irId))!,
    act: (actionId, directObject) => executor.executeAsActor({ actionId, actorId: player.id, directObject }, world, gameContext),
  };
}

const messageIdsOf = (events: { data?: unknown }[]) =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter(Boolean);
/** The blocked entering event's reason — entering reports a refusal as `if.event.entered { blocked: true, reason }` (a blocked turn still returns success: true; success means the turn ran). */
const blockedReason = (events: { type: string; data?: unknown }[]) => {
  const entered = events.find((e) => e.type === 'if.event.entered') as { data?: { blocked?: boolean; reason?: string } } | undefined;
  return entered?.data?.blocked ? entered.data.reason : undefined;
};

const SOURCE = `story
  title: Gates
  authors:
    T
  id: gates
  story-version: 0.0.1
  states: calm, hunted

create the Yard
  a room

  A yard.

create the gates
  scenery, plural
  in the Yard

  Huge doors.

  on the player entering while hunted
    refuse gates-locked
  end on

create the sedan chair
  a supporter, enterable
  in the Yard

  A chair.

  after the player entering
    phrase chair-creak
  end after

create Alex
  a person
  playable
  starts in the Yard

  You.

define phrase gates-locked
  The gates are locked.
end phrase

define phrase chair-creak
  The chair creaks.
end phrase

before the game starts
  change the player to Alex
end before
`;

describe('entering clauses on things ride the entering interceptor (GH #341, REAL-PATH)', () => {
  it("a scenery thing's `on the player entering` refusal fires ahead of stdlib's enterable gate", () => {
    const booted = boot(SOURCE);
    booted.world.setStateValue(CHORD_STORY_STATE_KEY, 'hunted');
    const result = booted.act(IFActions.ENTERING, booted.entity('gates'));
    expect(blockedReason(result.events)).toBe('gates-locked');
    expect(booted.world.getLocation(booted.player.id)).toBe(booted.entity('yard').id);
  });

  it('the clause gate holds: while calm the same command falls to the stdlib default', () => {
    const booted = boot(SOURCE);
    const result = booted.act(IFActions.ENTERING, booted.entity('gates'));
    const reason = blockedReason(result.events);
    expect(reason).toBeDefined();
    expect(reason).not.toBe('gates-locked');
    expect(booted.world.getLocation(booted.player.id)).toBe(booted.entity('yard').id);
  });

  it("an enterable thing's `after the player entering` narrates on the successful enter", () => {
    const booted = boot(SOURCE);
    const result = booted.act(IFActions.ENTERING, booted.entity('sedan-chair'));
    expect(result.success).toBe(true);
    expect(messageIdsOf(result.events)).toContain('chair-creak');
    expect(booted.world.getLocation(booted.player.id)).toBe(booted.entity('sedan-chair').id);
  });
});
