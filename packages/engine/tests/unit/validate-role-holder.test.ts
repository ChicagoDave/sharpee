/**
 * The install seam validates the player role holder (ADR-344 D1, D2, D4).
 *
 * Three rejections and one acceptance, driven through a real `installStory`
 * rather than the pure function alone: the point of the step is that the
 * *seam* refuses, so a test that only called `validateRoleHolder` directly
 * would still pass with the step removed from `STORY_INSTALL_STEPS`.
 *
 * The step's position is pinned here too. It must run after `create-player`
 * (it reads what that step drafts) and before `listener-trait` (which mutates
 * a holder this step may be about to refuse).
 */

import { describe, it, expect } from 'vitest';
import { WorldModel, EntityType, TraitType, ActorTrait, type IFEntity } from '@sharpee/world-model';
import { STORY_INSTALL_STEPS } from '../../src/install/steps';
import { RoleHolderValidationError, validateRoleHolder } from '../../src/install/validate-role-holder';
import type { Story } from '../../src/install/story';
import { setupTestEngine } from '../test-helpers/setup-test-engine';

/**
 * A story whose role holder is built to order.
 *
 * @param shape how the holder should be broken, or `'compliant'`
 * @returns a story whose `createPlayer` returns exactly that holder
 */
function storyWithHolder(
  shape: 'compliant' | 'unplaced' | 'no-actor-trait' | 'not-playable'
): Story {
  let playerId: string | undefined;
  return {
    config: { id: 'role-holder-test', title: 'Role Holder Test', authors: ['Test'], version: '1.0.0' },
    initializeWorld: (world: WorldModel) => {
      const room = world.createEntity('Test Room', EntityType.ROOM);
      const player = world.createEntity('You', EntityType.ACTOR);

      if (shape !== 'no-actor-trait') {
        player.add(new ActorTrait(shape === 'not-playable' ? { isPlayable: false } : {}));
      }
      if (shape !== 'unplaced') {
        world.moveEntity(player.id, room.id);
      }
      playerId = player.id;
    },
    createPlayer: (world: WorldModel) => world.getEntity(playerId!)!,
  };
}

/** Install the given story and return whatever `installStory` threw, if anything. */
function installAndCatch(story: Story): unknown {
  const { engine } = setupTestEngine();
  try {
    engine.installStory(story);
    return undefined;
  } catch (error) {
    return error;
  }
}

describe('the install seam refuses a non-compliant role holder', () => {
  it('an unplaced holder fails the install, and is not placed for the story', () => {
    const { engine, world } = setupTestEngine();
    const story = storyWithHolder('unplaced');

    expect(() => engine.installStory(story)).toThrow(RoleHolderValidationError);

    // No fallback placement: the loader's habit of dropping an unplaced
    // holder into the first declared room is exactly what this step refuses
    // to do. The holder is still nowhere.
    const holder = world.getEntity(world.getPlayer()!.id)!;
    expect(world.getLocation(holder.id)).toBeUndefined();
    // Nothing adopted, so the engine kept no story.
    expect(engine.getStory()).toBeUndefined();
  });

  it('a holder with no ActorTrait fails the install', () => {
    const error = installAndCatch(storyWithHolder('no-actor-trait'));
    expect(error).toBeInstanceOf(RoleHolderValidationError);
    expect((error as RoleHolderValidationError).reason).toBe('no-actor-trait');
    expect((error as RoleHolderValidationError).entityName).toBe('You');
  });

  it('a holder whose ActorTrait is not playable fails the install', () => {
    const error = installAndCatch(storyWithHolder('not-playable'));
    expect(error).toBeInstanceOf(RoleHolderValidationError);
    expect((error as RoleHolderValidationError).reason).toBe('not-playable');
  });

  it('the failure names the entity and the condition', () => {
    const error = installAndCatch(storyWithHolder('unplaced')) as RoleHolderValidationError;
    expect(error.reason).toBe('unplaced');
    expect(error.message).toContain('You');
    expect(error.message).toContain(error.entityId);
    expect(error.message).toContain('nowhere to play');
  });
});

describe('the install seam accepts a compliant role holder', () => {
  it('a placed, actor-trait\'d, playable holder installs and is the world player', () => {
    const { engine, world } = setupTestEngine();

    expect(() => engine.installStory(storyWithHolder('compliant'))).not.toThrow();

    const player = world.getPlayer()!;
    expect(player).toBeDefined();
    expect(world.getLocation(player.id)).toBeDefined();
    const actor = player.get<ActorTrait>(TraitType.ACTOR);
    expect(actor?.isPlayable).toBe(true);
    // The engine adopted it: the context's player is the story's holder.
    expect(engine.getContext().player.id).toBe(player.id);
  });
});

describe('the step is in the list, in position', () => {
  it('validate-role-holder runs after create-player and before listener-trait', () => {
    const names = STORY_INSTALL_STEPS.map((s) => s.name);
    const player = names.indexOf('create-player');
    const validate = names.indexOf('validate-role-holder');
    const listener = names.indexOf('listener-trait');

    expect(validate).toBeGreaterThan(-1);
    expect(player).toBeLessThan(validate);
    expect(validate).toBeLessThan(listener);
  });

  it('the step declares create-player as its requirement', () => {
    const step = STORY_INSTALL_STEPS.find((s) => s.name === 'validate-role-holder')!;
    expect(step.requires).toContain('create-player');
  });
});

describe('validateRoleHolder checks its conditions in order', () => {
  it('reports the placement failure first, even when the trait is missing too', () => {
    // A holder broken two ways: order decides which condition is reported,
    // and placement is the one an author must fix first.
    const world = new WorldModel();
    world.createEntity('Test Room', EntityType.ROOM);
    const holder: IFEntity = world.createEntity('You', EntityType.ACTOR);

    try {
      validateRoleHolder(holder, world);
      throw new Error('expected validateRoleHolder to throw');
    } catch (error) {
      expect((error as RoleHolderValidationError).reason).toBe('unplaced');
    }
  });
});
