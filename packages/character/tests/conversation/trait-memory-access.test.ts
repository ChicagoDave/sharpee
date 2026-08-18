/**
 * Phase 7 seam tests (ADR-320) — the trait-backed conversation-memory
 * access and the scene thread stamp. Every assertion lands on real
 * trait/store state read back from the world, not on return values.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CharacterModelTrait, TraitType, WorldModel } from '@sharpee/world-model';
import {
  createTraitMemoryAccess,
  noteTopicMove,
  openScene,
  recordSceneClosed,
  sceneOf,
} from '../../src/conversation';
import { CHARACTER_TURN_KEY } from '../../src/character-clock';

function modeledNpc(world: WorldModel): string {
  const npc = world.createEntity('kemp', 'actor');
  npc.add(new CharacterModelTrait({ mood: 'calm' }));
  return npc.id;
}

describe('createTraitMemoryAccess', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  it('set persists the pair record onto the holder trait (rides the model, D17)', () => {
    const npcId = modeledNpc(world);
    const access = createTraitMemoryAccess(world);

    recordSceneClosed(access, npcId, 'pc', 9);

    const trait = world.getEntity(npcId)!.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(trait.conversationMemory['pc']).toEqual({
      visits: 1,
      lastSceneClosedTurn: 9,
      discussedTopics: [],
      askedCounts: {},
    });
    expect(access.get(npcId, 'pc')).toBe(trait.conversationMemory['pc']);
  });

  it('creates the field on a pre-v2 rehydrated trait (restore path has no constructor)', () => {
    const npcId = modeledNpc(world);
    const trait = world.getEntity(npcId)!.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    // Simulate a v1 restore: the property does not exist at all.
    delete (trait as Partial<CharacterModelTrait>).conversationMemory;
    const access = createTraitMemoryAccess(world);

    expect(access.get(npcId, 'pc')).toBeUndefined();
    access.set(npcId, 'pc', { visits: 1, discussedTopics: [], askedCounts: {} });
    expect(trait.conversationMemory['pc'].visits).toBe(1);
  });

  it('ignores writes for an unmodeled holder (no model, no change — D7)', () => {
    const bare = world.createEntity('stagehand', 'actor');
    const access = createTraitMemoryAccess(world);

    access.set(bare.id, 'pc', { visits: 3, discussedTopics: ['x'], askedCounts: {} });

    expect(access.get(bare.id, 'pc')).toBeUndefined();
    expect(world.getEntity(bare.id)!.get(TraitType.CHARACTER_MODEL)).toBeUndefined();
  });
});

describe('noteTopicMove', () => {
  let world: WorldModel;
  let sceneId: string;

  beforeEach(() => {
    world = new WorldModel();
    world.setStateValue(CHARACTER_TURN_KEY, 4); // dialogueTurn = 5
    sceneId = openScene(world, {
      participantIds: ['npc-kemp', 'pc'],
      openedBy: { kind: 'address', openerId: 'pc' },
    }).scene.id;
  });

  it('seeds the thread without a subject-change stamp on the first topic', () => {
    noteTopicMove(world, sceneId, 'tour');

    const scene = sceneOf(world, sceneId)!;
    expect(scene.currentTopic).toBe('tour');
    expect(scene.subjectChangedTurn).toBeUndefined();
  });

  it('stamps the abandoning turn and replaces the thread on a differing topic', () => {
    noteTopicMove(world, sceneId, 'tour');
    world.setStateValue(CHARACTER_TURN_KEY, 6); // dialogueTurn = 7
    noteTopicMove(world, sceneId, 'weather');

    const scene = sceneOf(world, sceneId)!;
    expect(scene.currentTopic).toBe('weather');
    expect(scene.subjectChangedTurn).toBe(7);
  });

  it('leaves the store untouched on the same topic or a dead scene id', () => {
    noteTopicMove(world, sceneId, 'tour');
    world.setStateValue(CHARACTER_TURN_KEY, 6);
    noteTopicMove(world, sceneId, 'tour');
    expect(sceneOf(world, sceneId)!.subjectChangedTurn).toBeUndefined();

    noteTopicMove(world, 'scene-99', 'weather');
    expect(sceneOf(world, 'scene-99')).toBeUndefined();
  });
});
