/**
 * The villain's blow through the real attacking action (ADR-328 D5).
 *
 * A villain attacks the hero by running the real `attacking` action as
 * itself; the MeleeInterceptor on the hero's CombatantTrait resolves the
 * blow on the canonical tables. Pinned here: the blow narrates, a fatal
 * blow routes the hero's death through `killPlayer` (ADR-227 AC-5), and
 * GDT ND (immortality) suppresses that death while the blow still lands.
 */

import { describe, it, expect } from 'vitest';
import {
  WorldModel,
  EntityType,
  ActorTrait,
  ContainerTrait,
  CombatantTrait,
  HealthTrait,
  RoomTrait,
  TraitType,
  WeaponTrait,
} from '@sharpee/world-model';
import { createFixtureRandomService } from '../test-support/fixture-random-service';
import {
  attackingAction,
  createActionContext,
  IFActions,
  PLAYER_DIED_EVENT,
  type ValidatedCommand,
} from '@sharpee/stdlib';
import { MeleeInterceptor } from '../interceptors/melee-interceptor';
import { MeleeMessages } from './melee-messages';
import { MELEE_STATE } from './melee-state';
import { setGDTFlags, getGDTFlags } from '../actions/gdt/gdt-context';

const SWEEPS = 150;

function buildArena(immortal: boolean) {
  const world = new WorldModel();
  const room = world.createEntity('Troll Room', EntityType.ROOM);
  room.add(new RoomTrait());
  room.add(new ContainerTrait());
  world.registerActionInterceptor(TraitType.COMBATANT, IFActions.ATTACKING, MeleeInterceptor);

  const player = world.createEntity('yourself', EntityType.ACTOR);
  player.add(new ActorTrait({ isPlayer: true }));
  player.add(new ContainerTrait());
  player.add(new CombatantTrait({}));
  player.add(new HealthTrait({}));
  world.setPlayer(player.id);
  world.moveEntity(player.id, room.id);

  const troll = world.createEntity('troll', EntityType.ACTOR);
  troll.add(new ActorTrait());
  troll.add(new ContainerTrait());
  troll.add(new CombatantTrait({ hostile: true }));
  troll.add(new HealthTrait({}));
  world.moveEntity(troll.id, room.id);
  const axe = world.createEntity('bloody axe', EntityType.OBJECT);
  axe.add(new WeaponTrait({}));
  world.moveEntity(axe.id, troll.id);

  if (immortal) {
    setGDTFlags(world, { ...getGDTFlags(world), immortal: true });
  }
  return { world, player, troll };
}

/** One villain blow: the real attacking action's four phases as the troll. */
function trollSwings(world: WorldModel, player: ReturnType<typeof buildArena>['player'], troll: ReturnType<typeof buildArena>['troll'], seed: number) {
  const command: ValidatedCommand = {
    parsed: {
      rawInput: 'attack yourself',
      action: IFActions.ATTACKING,
      tokens: [],
      structure: { verb: { tokens: [0], text: 'attack', head: 'attack' } },
      pattern: 'PROGRAMMATIC',
      confidence: 1.0,
    },
    actionId: IFActions.ATTACKING,
    directObject: { entity: player, parsed: { text: 'yourself', candidates: ['yourself'] } },
  };
  const context = createActionContext(world, player, attackingAction, command, createFixtureRandomService(seed), undefined, troll);
  const validation = attackingAction.validate(context);
  if (!validation.valid) return { valid: false as const, events: attackingAction.blocked!(context, validation) };
  context.validationResult = validation;
  attackingAction.execute(context);
  return { valid: true as const, events: attackingAction.report!(context) };
}

describe('a villain blow through the real attacking action (ADR-328 D5)', () => {
  it('narrates the canonical villain attack as the troll', () => {
    const { world, player, troll } = buildArena(false);
    const { valid, events } = trollSwings(world, player, troll, 1);
    expect(valid).toBe(true);
    const attacked = events.find((e) => e.type === 'if.event.attacked')!;
    expect(attacked.entities.actor).toBe(troll.id);
    expect((attacked.data as { messageId?: string }).messageId).toBe(MeleeMessages.VILLAIN_ATTACK);
    expect(typeof (attacked.data as { text?: string }).text).toBe('string');
  });

  it('never emits the canonical player-death event while immortal', () => {
    // Sequential blows on the same player: wounds accumulate, so the blow
    // table's fatal outcomes (which need a weakened defender) are reached
    // many times over — every one of them must be suppressed.
    const { world, player, troll } = buildArena(true);
    for (let i = 0; i < SWEEPS; i++) {
      const { events } = trollSwings(world, player, troll, i);
      expect(events.filter((e) => e.type === PLAYER_DIED_EVENT)).toEqual([]);
    }
    expect((player.get(TraitType.HEALTH) as HealthTrait).dead).toBe(false);
  });

  it('control: without immortality a fatal blow kills the hero through killPlayer', () => {
    const { world, player, troll } = buildArena(false);
    let sawDeath = false;
    for (let i = 0; i < SWEEPS && !sawDeath; i++) {
      const { events } = trollSwings(world, player, troll, i);
      const died = events.find((e) => e.type === PLAYER_DIED_EVENT);
      if (died) {
        sawDeath = true;
        expect(died.data).toMatchObject({ cause: 'combat', terminal: true });
        // The attacking action's own death line is not added on top.
        expect(events.map((e) => e.type)).not.toContain('if.event.death');
      }
    }
    expect(sawDeath).toBe(true);
    const health = player.get(TraitType.HEALTH) as HealthTrait;
    expect(health.dead).toBe(true);
    expect(health.causeOfDeath).toBe('combat');
  });

  it('a staggered villain recovers instead of swinging — a refused act with its own line', () => {
    const { world, player, troll } = buildArena(false);
    troll.attributes[MELEE_STATE.VILLAIN_STAGGERED] = true;
    const first = trollSwings(world, player, troll, 3);
    expect(first.valid).toBe(false);
    const blocked = first.events[0];
    expect((blocked.data as { messageId?: string }).messageId).toBe(MeleeMessages.VILLAIN_RECOVERS);
    expect(troll.attributes[MELEE_STATE.VILLAIN_STAGGERED]).toBe(false);
    // The next swing lands.
    expect(trollSwings(world, player, troll, 4).valid).toBe(true);
  });
});
