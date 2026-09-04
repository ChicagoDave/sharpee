/**
 * adr-329-d10-perform-step.test.ts — ADR-329 D10 (GH #321), Acceptance item 7,
 * REAL-PATH: a Chord goal line in an action's own words performs that action
 * as the character through `GameEngine.executeAsActor`, from the engine's own
 * character-model tick inside a real turn. A story verb (`conjure the key
 * into the Vault`) runs the story action and its `after` clause; `take the
 * key` is the `acquire` fold and waits, silently, until the key is in reach;
 * a refused `perform` leaves the world unchanged, does not advance, and
 * narrates its refusal to a present player every turn it is retried (D6's
 * ruling, reused); `go east` performs one `going`. Assertions are on world
 * state, the goal's step counter (the trait), and the turn's event stream.
 * No doubles: the engine's `executeTurn`, its plugins, the stdlib actions,
 * the loader's world. The character package's own harness
 * (`goal-world-mutations.test.ts`) is scaffolding backed by this suite.
 */
import { describe, expect, it } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { GameEngine } from '@sharpee/engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { CharacterModelTrait, EntityType, OpenableTrait, TraitType, WorldModel, type IFEntity } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';
import { compileSource } from './helpers/boot-engine';

interface Slots { steps: string; key?: string; chest?: string; player?: string; playerStart?: string; must?: string }

const SOURCE = (s: Slots) => `story
  title: Conjuring
  authors:
    T
  id: conjuring
  story-version: 0.0.1

define phrase conjure-what
  Conjure what?
end phrase

define phrase not-now
  Not now.
end phrase

define phrase wizard-gloats
  The wizard gloats.
end phrase

define action conjuring
  grammar
    conjure the item into the place
  the item must be reachable
${s.must ?? ''}
  otherwise refuse conjure-what

define trait conjurable
  on the wizard conjuring
    move it to the Vault
  end on
end trait

create the Tower
  a room
  east to the Vault

  A tower.

create the Vault
  a room
  west to the Tower

  A vault.

create the key
  conjurable
${s.key ?? '  in the Tower'}

  A key.

create the chest
  a container, openable
  in the Tower
${s.chest ?? ''}
  A chest.

create the wizard
  a person
  in the Tower

  goal errand, high
${s.steps}
  end goal

  A wizard.

create Alex
  a person
  playable
  starts in ${s.playerStart ?? 'the Tower'}
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
  /** The wizard's live goal counter for `errand`. */
  step: () => number | undefined;
  /** Whether `errand` is still active on the wizard. */
  active: () => boolean | undefined;
  /** One real turn, `wait` by default, after which the character-model tick has run. */
  turn: (command?: string) => Promise<void>;
}

/** The boot-engine helper's shape, plus an in-order capture of the turn stream (the ADR-329 item-3 suite's harness). */
async function boot(source: string, seed = 11): Promise<Booted> {
  const story = createStory(compileSource(source), { seed });
  const world = new WorldModel();
  const language = new EnglishLanguageProvider();
  const parser = new EnglishParser(language, { world });
  const stream: ISemanticEvent[] = [];
  const placeholder = world.createEntity('placeholder', EntityType.ACTOR);
  world.setPlayer(placeholder.id);
  const engine = new GameEngine({ world, player: placeholder, parser, language, perceptionService: new PerceptionService(), config: { seed, onEvent: (e) => stream.push(e) } });
  engine.setStory(story);
  world.removeEntity(placeholder.id);
  await engine.start();
  const id = (irId: string) => story.entityId(irId)!;
  const errand = () => (world.getEntity(id('wizard'))?.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined)?.goalState['errand'];
  return {
    engine, story, world, player: world.getPlayer()!, stream, id,
    step: () => errand()?.currentStep,
    active: () => errand()?.active,
    at: (irId) => world.getLocation(id(irId)),
    turn: async (command = 'wait') => { expect((await engine.executeTurn(command)).success).toBe(true); },
  };
}

const byWizard = (b: Booted, type: string) =>
  b.stream.filter((e) => e.type === type && e.entities.actor === b.id('wizard'));

describe('a goal step in an action\'s own words — ADR-329 Acceptance item 7, through real turns', () => {
  it('`conjure the key into the Vault` performs the story action as the wizard: the key\'s `on the wizard conjuring` clause moves it, and the step advances', async () => {
    const b = await boot(SOURCE({ steps: '    conjure the key into the Vault\n    act wizard-gloats\n' }));
    expect(b.at('key')).toBe(b.id('tower'));

    await b.turn();

    expect(b.at('key')).toBe(b.id('vault'));
    expect(b.step()).toBe(1);
  });

  it("a story action's `the actor must …` binds the actor to the character performing it, not to the player", async () => {
    // The wizard is in the Tower; the player is in the Vault. A requirement
    // on the actor's whereabouts passes for the wizard and would fail for
    // the player — so the key moving proves who `the actor` was.
    const b = await boot(SOURCE({
      steps: '    conjure the key into the Vault\n    act wizard-gloats\n',
      must: '  the actor must be in the Tower: not-now\n',
      playerStart: 'the Vault',
    }));

    await b.turn();

    expect(b.at('key')).toBe(b.id('vault'));
    expect(b.step()).toBe(1);
    expect(b.stream.filter((e) => e.type === 'chord.phrase' && (e.data as { messageId?: string }).messageId === 'not-now')).toHaveLength(0);
  });

  it('`take the key` is the `acquire` fold: it waits silently while the key is out of reach, then takes it', async () => {
    const b = await boot(SOURCE({ steps: '    take the key\n    act wizard-gloats\n', key: '', player: '  carries the key\n' }));
    expect(b.at('key')).toBe(b.player.id);

    // Held by the player: not in the room, so the planner waits — no attempt, no refusal.
    await b.turn();
    expect(b.at('key')).toBe(b.player.id);
    expect(b.step()).toBe(0);
    expect(byWizard(b, 'if.event.take_blocked')).toHaveLength(0);
    expect(byWizard(b, 'if.event.taken')).toHaveLength(0);

    // The player drops it; the tick that follows the command takes it.
    await b.turn('drop key');
    expect(b.at('key')).toBe(b.id('wizard'));
    expect(byWizard(b, 'if.event.taken')).toHaveLength(1);
    expect(b.step()).toBe(1);
  });

  it('a refused `perform` leaves the world unchanged, does not advance, and narrates its refusal to the present player each turn', async () => {
    const b = await boot(SOURCE({
      steps: '    open the chest\n    act wizard-gloats\n',
      chest: '  on the wizard opening\n    refuse not-now\n  end on\n',
    }));
    const isOpen = () => (b.world.getEntity(b.id('chest'))!.get(TraitType.OPENABLE) as OpenableTrait).isOpen;
    expect(isOpen()).toBe(false);

    await b.turn();
    expect(isOpen()).toBe(false);
    expect(b.step()).toBe(0);
    const blocked = byWizard(b, 'if.event.open_blocked');
    expect(blocked, 'the refused step narrates as any witnessed refusal would (D5)').toHaveLength(1);
    expect(blocked[0].presence).toBe('present');

    await b.turn();
    expect(isOpen()).toBe(false);
    expect(b.step()).toBe(0);
    expect(byWizard(b, 'if.event.open_blocked')).toHaveLength(2);
  });

  it('the same `open the chest`, unrefused, opens it as the wizard and advances', async () => {
    const b = await boot(SOURCE({ steps: '    open the chest\n    act wizard-gloats\n' }));

    await b.turn();

    expect((b.world.getEntity(b.id('chest'))!.get(TraitType.OPENABLE) as OpenableTrait).isOpen).toBe(true);
    expect(byWizard(b, 'if.event.opened')).toHaveLength(1);
    expect(b.step()).toBe(1);
  });

  it('`go east` performs one `going` as the wizard through the room\'s real exit', async () => {
    const b = await boot(SOURCE({ steps: '    go east\n    act wizard-gloats\n' }));
    expect(b.at('wizard')).toBe(b.id('tower'));

    await b.turn();

    expect(b.at('wizard')).toBe(b.id('vault'));
    const moved = byWizard(b, 'if.event.actor_moved');
    expect(moved).toHaveLength(1);
    expect((moved[0].data as { toRoom?: string }).toRoom).toBe(b.id('vault'));
    expect(b.step()).toBe(1);
  });
});
