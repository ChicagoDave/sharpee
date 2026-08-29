/**
 * adr-329-goal-steps.test.ts — ADR-329 Acceptance item 3 (D6), REAL-PATH: a
 * Chord character's goal steps — `give`, `drop`, `acquire`, `move to` —
 * perform the real stdlib actions as that character through
 * `GameEngine.executeAsActor`, from the engine's own character-model tick
 * inside a real turn. Assertions are on world state (where the item is,
 * where the NPC is), on the goal's step counter (the trait), and on the
 * turn's event stream (actor, presence tag, refusal events). No doubles:
 * the engine's `executeTurn`, its plugins, the stdlib actions, the loader's
 * world. The character package's own harness (`goal-world-mutations.test.ts`)
 * is scaffolding backed by this suite.
 */
import { describe, expect, it } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { GameEngine } from '@sharpee/engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { CharacterModelTrait, EntityType, TraitType, WorldModel, type IFEntity } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';
import { compileSource } from './helpers/boot-engine';

interface Slots { steps: string; maid?: string; player?: string; letter?: string; playerStart?: string }

const SOURCE = (s: Slots) => `story
  title: Errands
  authors:
    T
  id: errands
  story-version: 0.0.1

define phrase not-yours
  Not yours.
end phrase

create the Parlor
  a room
  east to the Hall

  A parlor.

create the Hall
  a room
  west to the Parlor

  A hall.

create the letter
${s.letter ?? ''}
  A letter.

create the tray

  A tray.

create the coin
  in the Parlor

  A coin.

create the vase
  scenery
  in the Parlor

  A vase.

create the Maid
  a person
  in the Parlor
  carries the letter
  carries the tray
  mood calm
${s.maid ?? ''}
  goal errand, high
${s.steps}
  end goal

  Her.

create Alex
  a person
  playable
  starts in ${s.playerStart ?? 'the Parlor'}
${s.player ?? ''}
  You.

before the game starts
  change the player to Alex
end before

`;

interface Booted {
  engine: GameEngine;
  story: ChordStory;
  world: WorldModel;
  player: IFEntity;
  /** Every event the engine emitted, action and plugin alike, in stream order. */
  stream: ISemanticEvent[];
  id: (irId: string) => string;
  at: (irId: string) => string | undefined;
  /** The Maid's live goal counter for `errand`. */
  step: () => number | undefined;
  /** Whether `errand` is still active on the Maid. */
  active: () => boolean | undefined;
  /** One real turn — `wait` — after which the character-model tick has run. */
  turn: () => Promise<void>;
}

/** The boot-engine helper's shape, plus an in-order capture of the turn stream (the ADR-329 item-2 suite's harness). */
async function boot(source: string, seed = 11): Promise<Booted> {
  const story = createStory(compileSource(source), { seed });
  const world = new WorldModel();
  const language = new EnglishLanguageProvider();
  const parser = new EnglishParser(language, { world });
  const stream: ISemanticEvent[] = [];
  const placeholder = world.createEntity('placeholder', EntityType.ACTOR);
  world.setPlayer(placeholder.id);
  // A real PerceptionService: it is what tags presence (ADR-328 D3) on every event.
  const engine = new GameEngine({ world, player: placeholder, parser, language, perceptionService: new PerceptionService(), config: { seed, onEvent: (e) => stream.push(e) } });
  engine.setStory(story);
  world.removeEntity(placeholder.id);
  await engine.start();
  const id = (irId: string) => story.entityId(irId)!;
  const errand = () => (world.getEntity(id('maid'))?.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined)?.goalState['errand'];
  const step = () => errand()?.currentStep;
  const active = () => errand()?.active;
  return {
    engine, story, world, player: world.getPlayer()!, stream, id, step, active,
    at: (irId) => world.getLocation(id(irId)),
    turn: async () => { expect((await engine.executeTurn('wait')).success).toBe(true); },
  };
}

const byMaid = (b: Booted, type: string) =>
  b.stream.filter((e) => e.type === type && e.entities.actor === b.id('maid'));

describe('goal steps run through the execution entry — ADR-329 Acceptance item 3, through real turns', () => {
  it('`give` performs `giving` as the Maid: the letter lands on the player, the step advances, the give is witnessed', async () => {
    const b = await boot(SOURCE({ steps: '    give the letter to the player\n' }));
    expect(b.at('letter')).toBe(b.id('maid'));

    await b.turn();

    expect(b.at('letter')).toBe(b.player.id);
    const given = byMaid(b, 'if.event.given');
    expect(given).toHaveLength(1);
    expect(given[0].presence).toBe('present');
    // The goal's last step completed, so the goal deactivated (the manager resets its counter).
    expect(b.active()).toBe(false);
  });

  it('a refusal on the recipient blocks the `give`: the letter stays, the step does not advance, and the refusal narrates each turn it is retried', async () => {
    const b = await boot(SOURCE({
      steps: '    give the letter to the player\n',
      player: '  on the Maid giving\n    refuse not-yours\n  end on\n',
    }));

    await b.turn();
    expect(b.at('letter')).toBe(b.id('maid'));
    expect(b.step()).toBe(0);
    expect(byMaid(b, 'if.event.given')).toHaveLength(0);
    const blocked = byMaid(b, 'if.event.give_blocked');
    expect(blocked, 'the refused step narrates as any witnessed refusal would (D5)').toHaveLength(1);
    expect(blocked[0].presence).toBe('present');

    // Retried next tick — the refusal is loud again, the world unchanged.
    await b.turn();
    expect(b.at('letter')).toBe(b.id('maid'));
    expect(b.step()).toBe(0);
    expect(byMaid(b, 'if.event.give_blocked')).toHaveLength(2);
  });

  it('a witnessed `drop` performs `dropping` as the Maid and narrates in her voice; from another room it is tagged absent', async () => {
    const here = await boot(SOURCE({ steps: '    drop the tray\n' }));
    await here.turn();
    expect(here.at('tray')).toBe(here.id('parlor'));
    const dropped = byMaid(here, 'if.event.dropped');
    expect(dropped).toHaveLength(1);
    expect(dropped[0].presence).toBe('present');

    const away = await boot(SOURCE({ steps: '    drop the tray\n', playerStart: 'the Hall' }));
    await away.turn();
    expect(away.at('tray')).toBe(away.id('parlor'));
    const unseen = byMaid(away, 'if.event.dropped');
    expect(unseen).toHaveLength(1);
    expect(unseen[0].presence).toBe('absent');
  });

  it('`acquire` performs `taking` once the thing is in reach, and is refused like any other take when it cannot be taken', async () => {
    const coin = await boot(SOURCE({ steps: '    acquire the coin\n    drop the tray\n' }));
    await coin.turn();
    expect(coin.at('coin')).toBe(coin.id('maid'));
    expect(byMaid(coin, 'if.event.taken')).toHaveLength(1);
    expect(coin.step()).toBe(1);

    // Scenery: the take is refused by the action, not by the planner.
    const vase = await boot(SOURCE({ steps: '    acquire the vase\n    drop the tray\n' }));
    await vase.turn();
    expect(vase.at('vase')).toBe(vase.id('parlor'));
    expect(byMaid(vase, 'if.event.taken')).toHaveLength(0);
    expect(byMaid(vase, 'if.event.take_blocked')).toHaveLength(1);
    expect(vase.step()).toBe(0);
    // The tray was never dropped: the goal is stuck at the refused step.
    expect(vase.at('tray')).toBe(vase.id('maid'));
  });

  it('`move to` performs one `going` per turn as the Maid, through the room\'s real exit', async () => {
    const b = await boot(SOURCE({ steps: '    move to the Hall\n    drop the tray\n' }));
    expect(b.at('maid')).toBe(b.id('parlor'));

    await b.turn();
    expect(b.at('maid')).toBe(b.id('hall'));
    const moved = byMaid(b, 'if.event.actor_moved');
    expect(moved).toHaveLength(1);
    expect((moved[0].data as { toRoom?: string }).toRoom).toBe(b.id('hall'));

    // Arrival completes the step; the drop follows in the Hall.
    await b.turn();
    await b.turn();
    expect(b.at('tray')).toBe(b.id('hall'));
  });
});
