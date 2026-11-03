/**
 * adr-390-player-role.test.ts — the session's player role (ADR-390 D2, D3, D4).
 *
 * AC-2: `GameContext.player` is computed from the role — after `switchPlayer`
 * it is the new character with no sync call. AC-4: the execution entry
 * refuses a meta action for a non-player actor and names both; the player's
 * own request proceeds. The install reaches `assign-player-role` only after
 * `validate-role-holder`, so a TypeScript story whose `createPlayer` hands
 * back an unflagged actor still ends with that actor holding the role.
 */
import { describe, expect, it } from 'vitest';
import { ActorTrait, EntityType, IdentityTrait, type WorldModel } from '@sharpee/world-model';
import { setupTestEngine } from '../test-helpers/setup-test-engine';
import type { Story } from '../../src/install/story';
import { STORY_INSTALL_STEPS } from '../../src/install/steps';
import { setupTestEngineWithStory } from '../test-helpers/setup-test-engine';

describe('the session player role (ADR-390)', () => {
  it('AC-2: context.player is the new character right after switchPlayer, with no sync', () => {
    const { engine, world, player } = setupTestEngineWithStory();
    const other = world.createEntity('Ada', EntityType.ACTOR);
    other.add(new IdentityTrait({ name: 'Ada' }));
    other.add(new ActorTrait({ isPlayable: true }));
    world.moveEntity(other.id, world.getLocation(player.id)!);

    engine.switchPlayer(other.id);

    expect(engine.getContext().player.id).toBe(other.id);
    expect(engine.player.character.id).toBe(other.id);
    expect(engine.player.is(other.id)).toBe(true);
    expect(engine.player.is(player.id)).toBe(false);
    expect(world.playerCharacter.id).toBe(other.id);
  });

  it('AC-4: a non-player actor asking for a meta action is refused, naming the action and the actor', () => {
    const { engine, world, player } = setupTestEngineWithStory();
    const npc = world.createEntity('Bystander', EntityType.ACTOR);
    npc.add(new ActorTrait({ isPlayable: false }));
    world.moveEntity(npc.id, world.getLocation(player.id)!);

    const refused = engine.executeAsActor(npc.id, 'if.action.saving');

    expect(refused.success).toBe(false);
    expect(refused.events).toHaveLength(1);
    expect(refused.events[0].type).toBe('action.refused_meta');
    expect(refused.events[0].data).toMatchObject({ actionId: 'if.action.saving', actorId: npc.id });
    expect(refused.events[0].entities?.actor).toBe(npc.id);
    expect(engine.player.permits(npc.id, 'if.action.saving')).toBe(false);
    expect(engine.player.permits(npc.id, 'if.action.looking')).toBe(true);
    expect(engine.player.permits(player.id, 'if.action.saving')).toBe(true);
  });

  it('AC-4: the player\'s own meta request is not refused by the role gate', () => {
    const { engine, player } = setupTestEngineWithStory();

    const result = engine.executeAsActor(player.id, 'if.action.saving');

    expect(result.events.some((e) => e.type === 'action.refused_meta')).toBe(false);
  });

  it('the install assigns the role after the holder is validated, so an unflagged actor from createPlayer ends up holding it', () => {
    const names = STORY_INSTALL_STEPS.map((step) => step.name);
    expect(names.indexOf('validate-role-holder')).toBeLessThan(names.indexOf('assign-player-role'));
    expect(names.indexOf('assign-player-role')).toBeLessThan(names.indexOf('stamp-player-self-words'));
    // The minimal test story's createPlayer hands back an actor the install flags, not the story.
    const { world, player } = setupTestEngineWithStory();
    expect(world.hasPlayerCharacter).toBe(true);
    expect(world.playerCharacter.id).toBe(player.id);
  });

  it('AC-4: a refused meta request runs no phase — the world is byte-identical before and after', () => {
    const { engine, world, player } = setupTestEngineWithStory();
    const npc = world.createEntity('Bystander', EntityType.ACTOR);
    npc.add(new ActorTrait({ isPlayable: false }));
    world.moveEntity(npc.id, world.getLocation(player.id)!);
    const before = world.toJSON();

    engine.executeAsActor(npc.id, 'if.action.quitting');

    expect(world.toJSON()).toBe(before);
    expect(world.getEnding()).toBeUndefined();
  });

  it('AC-4: the player\'s own ordinary act proceeds through the entry (the gate passes everything but meta to anyone)', () => {
    const { engine, world, player } = setupTestEngineWithStory();
    const npc = world.createEntity('Bystander', EntityType.ACTOR);
    npc.add(new ActorTrait({ isPlayable: false }));
    world.moveEntity(npc.id, world.getLocation(player.id)!);

    const theirs = engine.executeAsActor(npc.id, 'if.action.looking');
    const mine = engine.executeAsActor(player.id, 'if.action.looking');

    expect(theirs.events.some((e) => e.type === 'action.refused_meta')).toBe(false);
    expect(mine.success).toBe(true);
  });

  it('install: a holder the story already assigned is left as it is — setPlayer on the same actor is a no-op', () => {
    const { engine, world } = setupTestEngine();
    let holderId = '';
    const story: Story = {
      config: { id: 'pre-assigned', title: 'Pre-assigned', authors: ['Test'], version: '1.0.0' },
      initializeWorld: (w: WorldModel) => {
        const room = w.createEntity('Room', EntityType.ROOM);
        const alex = w.createEntity('Alex', EntityType.ACTOR);
        alex.add(new IdentityTrait({ name: 'Alex' }));
        alex.add(new ActorTrait({ isPlayable: true }));
        w.moveEntity(alex.id, room.id);
        // The Chord shape: the start block assigned the role before the install reached the player step.
        w.setPlayer(alex.id);
        holderId = alex.id;
      },
      createPlayer: (w: WorldModel) => w.playerCharacter,
    };

    engine.installStory(story);

    expect(world.playerCharacter.id).toBe(holderId);
    expect((world.playerCharacter.get('actor') as ActorTrait).isPlayer).toBe(true);
    expect(engine.getContext().player.id).toBe(holderId);
  });
});
