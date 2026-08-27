/**
 * character-transitions.test.ts — ADR-310 D3 transition statements through
 * the real load-and-dispatch path: `change mood to <word>` and `change
 * feeling toward <target> to <word>` in an entity on-clause mutate the
 * owner's CharacterModelTrait (axes and disposition — asserted on trait
 * state, not events alone) and replay the from→to record as
 * `npc.character.*` author-channel transition events. A transition on a
 * person without the model is a loud LoadError, never a silent no-op.
 * (The statements compiled and silently dropped until 2026-08-15 — found
 * by the character-acceptance fixture story.)
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { EngineRandomService } from '@sharpee/engine';
import { attackingAction } from '@sharpee/stdlib';
import { CharacterModelTrait, IFEntity, MOOD_AXES, TraitType, WorldModel } from '@sharpee/world-model';
import { createStory, LoadError } from '../src';

const STORY =
  'story\n  title: T\n  authors:\n    N\n  id: t\n\n' +
  'create the Cell\n  a room\n\n  A cell.\n\n' +
  'create Alex\n  a person\n  playable\n  starts in the Cell\n\n  You.\n\nbefore the game starts\n  change the player to Alex\nend before\n\n' +
  'create the Guard\n' +
  '  a person\n' +
  '  in the Cell\n' +
  '  knows the-routine, witnessed, certain\n' +
  '\n' +
  '  on the player attacking\n' +
  '    change mood to panicked\n' +
  '    change feeling toward the player to wary of\n' +
  '  end on\n' +
  '\n' +
  '  A guard.\n';

const PLAIN_STORY = STORY.replace('  knows the-routine, witnessed, certain\n', '');

function load(source: string) {
  const { ir, diagnostics } = compile(source);
  expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const story = createStory(ir!);
  const world = new WorldModel();
  // ADR-327 D10: world first, role second.
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  const guard = world.getAllEntities().find((e: IFEntity) => e.name?.toLowerCase().includes('guard'))!;
  return { world, player, guard };
}

function attack(world: WorldModel, player: IFEntity, target: IFEntity): ISemanticEvent[] {
  const context: any = {
    world,
    player,
    random: new EngineRandomService(7),
    action: attackingAction,
    currentLocation: world.getContainingRoom(player.id),
    command: {
      parsed: { action: 'attack', extras: {}, structure: {} },
      directObject: { entity: target },
    },
    sharedData: {},
    requireScope: () => ({ ok: true }),
    canSee: () => true,
    canReach: () => true,
    requireCarriedOrImplicitTake: () => ({ ok: true }),
    event: (type: string, data: Record<string, unknown>): ISemanticEvent =>
      ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }) as ISemanticEvent,
  };
  const validation = attackingAction.validate(context);
  expect(validation.valid, JSON.stringify(validation)).toBe(true);
  context.validationResult = validation;
  attackingAction.execute(context);
  return attackingAction.report(context);
}

describe('D3 transitions through the real attack dispatch', () => {
  it('change mood / change feeling mutate the owner trait and replay author transition rows', () => {
    const { world, player, guard } = load(STORY);
    const trait = guard.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(trait.getMood()).toBe('calm');

    const events = attack(world, player, guard);

    // The mutation, on the trait: exactly the panicked axes and the
    // authored disposition word.
    expect(trait.moodValence).toBe(MOOD_AXES.panicked.valence);
    expect(trait.moodArousal).toBe(MOOD_AXES.panicked.arousal);
    expect(trait.getDispositionWord(player.id)).toBe('wary of');

    // The reports pass replays the recorded from→to as author rows.
    const mood = events.find((e) => e.type === 'npc.character.mood_changed')!;
    expect(mood).toBeDefined();
    // The interceptor effect envelope re-mints events from {type, payload},
    // so attribution rides the payload, not event.entities, on this path.
    expect(mood.data).toMatchObject({ from: 'calm', to: 'panicked' });
    const feeling = events.find((e) => e.type === 'npc.character.disposition_changed')!;
    expect(feeling).toBeDefined();
    expect(feeling.data).toMatchObject({ to: 'wary of', target: player.id });
  });

  it('a transition on a person without the character model throws loudly', () => {
    const { world, player, guard } = load(PLAIN_STORY);
    expect(guard.get(TraitType.CHARACTER_MODEL)).toBeUndefined();

    expect(() => attack(world, player, guard)).toThrow(LoadError);
  });
});
