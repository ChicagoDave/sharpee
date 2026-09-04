/**
 * actor-target-collision.test.ts — GH #340: a bare-head actor clause and the
 * target's own clause on one action resolve by consultation order — the
 * target's override wins, the actor's is dropped — never the hard error the
 * executor used to surface as "I don't understand that." (command.failed).
 *
 * Slots consult before the actor (lifecycle-engine resolves the actor
 * consultation last), so "first override wins" IS target-first; it also
 * mirrors the runtime's own per-owner merge rule (the first `on` override
 * wins). An actor bare-head still answers when the target has no clause.
 *
 * REAL-PATH: compiled Chord, the loader's world, the real stdlib smelling
 * under the real lifecycle engine via CommandExecutor.executeAsActor.
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
  const executor = new CommandExecutor(world, registry, new EventProcessor(world), new EnglishParser(language, { world }), undefined, new EngineRandomService(7));
  const gameContext: GameContext = { currentTurn: 3, player, history: [], metadata: { started: new Date(), lastPlayed: new Date() } };
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

const SOURCE = `story
  title: Collide
  authors:
    T
  id: collide
  story-version: 0.0.1

create the Yard
  a room

  A yard.

create the loaf
  in the Yard

  Bread.

  on the player smelling
    phrase tasty
  end on

create the stone
  in the Yard

  A stone.

create Alex
  a person
  playable
  starts in the Yard

  You.

  on smelling
    phrase market-smell
  end on

define phrase tasty
  The food smells tasty!
end phrase

define phrase market-smell
  The market smells.
end phrase

before the game starts
  change the player to Alex
end before
`;

describe('actor/target override collision resolves target-first (GH #340, REAL-PATH)', () => {
  it("the target's own clause wins the override; the actor's bare head is dropped, not an error", () => {
    const booted = boot(SOURCE);
    const turn = booted.act(IFActions.SMELLING, booted.entity('loaf'));
    expect(turn.success).toBe(true);
    expect(turn.events.some((e) => e.type === 'command.failed')).toBe(false);
    const ids = messageIdsOf(turn.events);
    expect(ids).toContain('tasty');
    expect(ids).not.toContain('market-smell');
  });

  it("the actor's bare head still answers when the target has no clause of its own", () => {
    const booted = boot(SOURCE);
    const turn = booted.act(IFActions.SMELLING, booted.entity('stone'));
    expect(turn.success).toBe(true);
    expect(messageIdsOf(turn.events)).toContain('market-smell');
  });
});
