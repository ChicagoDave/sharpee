/**
 * adr-327-ac2-execution-entry.test.ts — ADR-327 Acceptance item 2, the
 * non-player half, REAL-PATH: a non-player actor acting through ADR-328's
 * execution entry (`CommandExecutor.executeAsActor`) fires its own head and
 * not the player's. The story is compiled Chord; the world is the loader's;
 * the four phases are the real stdlib `taking` under the real lifecycle
 * engine, which consults the sword's loader-bound interceptor with the
 * acting entity's id. Assertions are on world state (where the sword is,
 * occurrence keys) and on the specific refusal.
 *
 * This is the first test in which Chord's actor heads and the platform's
 * actor threading meet on one path (ADR-328 Phase 4).
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { CommandExecutor, EngineRandomService, type GameContext } from '@sharpee/engine';
import { EventProcessor } from '@sharpee/event-processor';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { IFActions, StandardActionRegistry, standardActions } from '@sharpee/stdlib';
import { WorldModel } from '@sharpee/world-model';
import type { IFEntity } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';
import { CHORD_OCCURRENCE_PREFIX } from '../src/state-keys';

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
  executor: CommandExecutor;
  gameContext: GameContext;
  id: (irId: string) => string;
  entity: (irId: string) => IFEntity;
  /** Run one action as `actorId` through the real execution entry. */
  act: (actorId: string, actionId: string, directObject: IFEntity) => ReturnType<CommandExecutor['executeAsActor']>;
}

/** World first, then the player (bind runs before the player exists); then a real executor over that world. */
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
    executor,
    gameContext,
    id,
    entity: (irId) => world.getEntity(id(irId))!,
    act: (actorId, actionId, directObject) => executor.executeAsActor({ actionId, actorId, directObject }, world, gameContext),
  };
}

const SOURCE = (sword: string) => `story
  title: Entry
  authors:
    N
  id: entry
  story-version: 0.0.1

define phrase not-yours
  Not yours.
end phrase

define phrase not-theirs
  Not theirs.
end phrase

define phrase you-take
  You take it.
end phrase

define phrase they-take
  They take it.
end phrase

create the Yard
  a room

  A yard.

create the guards
  a person, plural
  in the Yard

  Guards.

create the sword
  in the Yard
${sword}
  A sword.

create Alex
  a person
  playable
  starts in the Yard

  You.

before the game starts
  change the player to Alex
end before

`;

const REFUSING = `  on the player taking
    refuse not-yours
  end on

  on the guards taking
    refuse not-theirs
  end on
`;

const NARRATING = `  after the player taking
    phrase you-take
  end after

  after the guards taking
    phrase they-take
  end after
`;

const occurrence = (b: Booted, ns: string) => b.world.getStateValue(`${CHORD_OCCURRENCE_PREFIX}on.${ns}`);
const messageIdsOf = (events: ISemanticEvent[]) =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter(Boolean);
const blockedReason = (events: ISemanticEvent[]) =>
  (events.find((e) => e.type === 'if.event.take_blocked')?.data as { reason?: string } | undefined)?.reason;

describe('ADR-327 AC-2 through the execution entry — the head names who acts', () => {
  it("the guards taking through `executeAsActor` fire `on the guards taking`, not `on the player taking`", () => {
    const b = boot(SOURCE(REFUSING));
    const sword = b.entity('sword');
    expect(b.world.getLocation(sword.id)).toBe(b.id('yard'));

    const result = b.act(b.id('guards'), IFActions.TAKING, sword);

    expect(blockedReason(result.events)).toBe('not-theirs');
    expect(result.events.some((e) => e.type === 'if.event.taken')).toBe(false);
    expect(b.world.getLocation(sword.id)).toBe(b.id('yard'));
  });

  it("the player taking through the same entry fires `on the player taking`, not `on the guards taking`", () => {
    const b = boot(SOURCE(REFUSING));
    const sword = b.entity('sword');

    const result = b.act(b.player.id, IFActions.TAKING, sword);

    expect(blockedReason(result.events)).toBe('not-yours');
    expect(b.world.getLocation(sword.id)).toBe(b.id('yard'));
  });

  it("the guards' completed take narrates `after the guards taking` only and moves the sword into the guards", () => {
    const b = boot(SOURCE(NARRATING));
    const sword = b.entity('sword');

    const result = b.act(b.id('guards'), IFActions.TAKING, sword);

    expect(result.success).toBe(true);
    expect(b.world.getLocation(sword.id)).toBe(b.id('guards'));
    expect(b.world.getContents(b.player.id)).toHaveLength(0);
    const ids = messageIdsOf(result.events);
    expect(ids).toContain('they-take');
    expect(ids).not.toContain('you-take');
    expect(occurrence(b, 'sword.taking.after.1')).toBe(1);
    expect(occurrence(b, 'sword.taking.after.0')).toBeUndefined();
    const taken = result.events.find((e) => e.type === 'if.event.taken')!;
    expect(taken.entities.actor).toBe(b.id('guards'));
  });

  it("the player's completed take narrates `after the player taking` only", () => {
    const b = boot(SOURCE(NARRATING));
    const sword = b.entity('sword');

    const result = b.act(b.player.id, IFActions.TAKING, sword);

    expect(result.success).toBe(true);
    expect(b.world.getLocation(sword.id)).toBe(b.player.id);
    const ids = messageIdsOf(result.events);
    expect(ids).toContain('you-take');
    expect(ids).not.toContain('they-take');
    expect(occurrence(b, 'sword.taking.after.0')).toBe(1);
    expect(occurrence(b, 'sword.taking.after.1')).toBeUndefined();
  });
});
