/**
 * goal-world-mutations.test.ts — D6 (wiring-audit §3): goal steps act on
 * the WORLD, not just on trait goalState. Every assertion lands on
 * world.getLocation — the mutation the step names — through the real
 * tick phase (evaluator computes intent, phase applies it).
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  WorldModel,
  IFEntity,
  NpcTrait,
  CharacterModelTrait,
  IdentityTrait,
  RoomTrait,
  ContainerTrait,
  ActorTrait,
  TraitType,
} from '@sharpee/world-model';
import type { RandomService } from '@sharpee/core';
import { CharacterPhaseRegistry, createCharacterModelPhase } from '../../src/tick-phases';
import { IFActions } from '@sharpee/stdlib';
import { scaffoldEntry } from './scaffold-entry';
import type { GoalStep } from '../../src/goals';

function room(world: WorldModel, name: string): IFEntity {
  const r = world.createEntity(name, 'room');
  r.add(new IdentityTrait({ name }));
  r.add(new RoomTrait());
  r.add(new ContainerTrait());
  return r;
}

function connect(a: IFEntity, b: IFEntity, dir: string, back: string): void {
  (a.get(TraitType.ROOM) as RoomTrait).exits[dir] = { destination: b.id };
  (b.get(TraitType.ROOM) as RoomTrait).exits[back] = { destination: a.id };
}

function actorIn(world: WorldModel, name: string, at: IFEntity, opts?: { player?: boolean; model?: boolean }): IFEntity {
  const e = world.createEntity(name, 'actor');
  e.add(new IdentityTrait({ name }));
  e.add(new ActorTrait({ isPlayer: opts?.player ?? false }));
  e.add(new ContainerTrait());
  if (!opts?.player) e.add(new NpcTrait({}));
  if (opts?.model) e.add(new CharacterModelTrait());
  world.moveEntity(e.id, at.id);
  return e;
}

describe('D6 — goal steps mutate the world', () => {
  let world: WorldModel;
  let parlor: IFEntity;
  let hall: IFEntity;
  let study: IFEntity;
  let player: IFEntity;
  let npc: IFEntity;
  let registry: CharacterPhaseRegistry;
  let entry: ReturnType<typeof scaffoldEntry>;

  beforeEach(() => {
    world = new WorldModel();
    parlor = room(world, 'Parlor');
    hall = room(world, 'Hall');
    study = room(world, 'Study');
    connect(parlor, hall, 'north', 'south');
    connect(hall, study, 'east', 'west');
    player = actorIn(world, 'Player', parlor, { player: true });
    world.setPlayer(player.id);
    npc = actorIn(world, 'Butler', parlor, { model: true });
    registry = new CharacterPhaseRegistry();
    entry = scaffoldEntry(world, (actorId, actionId) => refused.has(actionId));
    refused.clear();
  });

  // Action ids the scaffolding entry refuses this test (a trait refusal stand-in).
  const refused = new Set<string>();

  function registerGoal(steps: GoalStep[]): void {
    registry.register(npc.id, {
      goalDefs: [{
        id: 'errand',
        activatesWhen: [],
        priority: 'high',
        mode: 'sequential',
        steps,
      }],
    });
  }

  function tick(turn: number): ReturnType<ReturnType<typeof createCharacterModelPhase>> {
    return createCharacterModelPhase(registry)([npc], {
      world,
      turn,
      random: {} as unknown as RandomService,
      playerLocation: world.getLocation(player.id)!,
      playerId: player.id,
      act: entry.act,
    });
  }

  it('seek moves the NPC one room per tick until it reaches a moving target', () => {
    registerGoal([{ type: 'seek', target: player.id }, { type: 'act', messageId: 'butler-bows' }]);
    world.moveEntity(player.id, study.id); // two rooms away

    tick(1);
    expect(world.getLocation(npc.id)).toBe(hall.id);
    tick(2);
    expect(world.getLocation(npc.id)).toBe(study.id);

    // Arrival completes the step; the act then fires where the player is
    tick(3); // seek completes
    const events = tick(4);
    const step = events.find(e => e.type === 'character.goal.step');
    expect(step).toBeDefined();
    expect((step!.data as { messageId?: string }).messageId).toBe('butler-bows');
  });

  it('moveTo walks the NPC to a fixed room', () => {
    registerGoal([{ type: 'moveTo', target: study.id }]);

    tick(1);
    expect(world.getLocation(npc.id)).toBe(hall.id);
    tick(2);
    expect(world.getLocation(npc.id)).toBe(study.id);
  });

  it('acquire takes the co-located item into the NPC inventory', () => {
    const knife = world.createEntity('knife', 'object');
    knife.add(new IdentityTrait({ name: 'knife' }));
    world.moveEntity(knife.id, parlor.id);
    registerGoal([
      { type: 'acquire', target: knife.id },
      { type: 'act', messageId: 'butler-brandishes' },
    ]);

    tick(1);

    expect(world.getLocation(knife.id)).toBe(npc.id);
    const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(trait.goalState['errand']).toMatchObject({ currentStep: 1 });
  });

  it('give transfers the held item to the co-located target', () => {
    const letter = world.createEntity('letter', 'object');
    letter.add(new IdentityTrait({ name: 'letter' }));
    world.moveEntity(letter.id, npc.id); // held
    registerGoal([{ type: 'give', item: letter.id, target: player.id }]);

    tick(1);

    expect(world.getLocation(letter.id)).toBe(player.id);
  });

  it('give of an unheld item blocks loudly and moves nothing', () => {
    const letter = world.createEntity('letter', 'object');
    letter.add(new IdentityTrait({ name: 'letter' }));
    world.moveEntity(letter.id, study.id); // not held
    registerGoal([{ type: 'give', item: letter.id, target: player.id }]);

    tick(1);

    expect(world.getLocation(letter.id)).toBe(study.id);
    const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(trait.goalState['errand']).toMatchObject({ currentStep: 0 });
  });

  it('drop puts the held item in the NPC\'s current room', () => {
    const tray = world.createEntity('tray', 'object');
    tray.add(new IdentityTrait({ name: 'tray' }));
    world.moveEntity(tray.id, npc.id);
    registerGoal([{ type: 'drop', item: tray.id }]);

    tick(1);

    expect(world.getLocation(tray.id)).toBe(parlor.id);
  });

  it('a conversation in progress still suppresses the whole step, movement included (D16)', () => {
    registerGoal([{ type: 'moveTo', target: study.id }]);
    const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    trait.activeConversation = { partnerId: player.id, lastTurn: 1 };

    tick(2);

    expect(world.getLocation(npc.id)).toBe(parlor.id);
  });
  it('moveTo performs `going` as the NPC with the exit direction toward the next room', () => {
    registerGoal([{ type: 'moveTo', target: study.id }]);

    tick(1);

    expect(entry.calls).toEqual([{ actorId: npc.id, actionId: IFActions.GOING, direction: 'north' }]);
    expect(world.getLocation(npc.id)).toBe(hall.id);
  });

  it('acquire performs `taking`, give performs `giving`, drop performs `dropping` — each as the NPC', () => {
    const knife = world.createEntity('knife', 'object');
    knife.add(new IdentityTrait({ name: 'knife' }));
    world.moveEntity(knife.id, parlor.id);
    registerGoal([
      { type: 'acquire', target: knife.id },
      { type: 'give', item: knife.id, target: player.id },
    ]);
    tick(1);
    tick(2);
    expect(entry.calls).toEqual([
      { actorId: npc.id, actionId: IFActions.TAKING, directObject: knife.id },
      { actorId: npc.id, actionId: IFActions.GIVING, directObject: knife.id, indirectObject: player.id },
    ]);
    expect(world.getLocation(knife.id)).toBe(player.id);

    const tray = world.createEntity('tray', 'object');
    tray.add(new IdentityTrait({ name: 'tray' }));
    world.moveEntity(tray.id, npc.id);
    registry.register(npc.id, { goalDefs: [{ id: 'tidy', activatesWhen: [], priority: 'high', mode: 'sequential', steps: [{ type: 'drop', item: tray.id }] }] });
    tick(3);
    expect(entry.calls.at(-1)).toEqual({ actorId: npc.id, actionId: IFActions.DROPPING, directObject: tray.id });
    expect(world.getLocation(tray.id)).toBe(parlor.id);
  });

  it('a refused act neither moves the item nor advances the step, and is retried next tick', () => {
    const letter = world.createEntity('letter', 'object');
    letter.add(new IdentityTrait({ name: 'letter' }));
    world.moveEntity(letter.id, npc.id);
    registerGoal([{ type: 'give', item: letter.id, target: player.id }]);
    refused.add(IFActions.GIVING);

    tick(1);
    expect(world.getLocation(letter.id)).toBe(npc.id);
    const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(trait.goalState['errand']).toMatchObject({ currentStep: 0 });

    tick(2);
    expect(entry.calls.filter(c => c.actionId === IFActions.GIVING)).toHaveLength(2);

    refused.delete(IFActions.GIVING);
    tick(3);
    expect(world.getLocation(letter.id)).toBe(player.id);
  });

  it('a one-way passage walked backwards is no exit: the NPC does not act and stays put', () => {
    // Hall -> Study only; the planner's graph is bidirectional, the room is not.
    delete (study.get(TraitType.ROOM) as RoomTrait).exits['west'];
    world.moveEntity(npc.id, study.id);
    registerGoal([{ type: 'moveTo', target: parlor.id }]);

    tick(1);

    expect(entry.calls).toEqual([]);
    expect(world.getLocation(npc.id)).toBe(study.id);
  });
});
