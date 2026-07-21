/**
 * Talking action — ADR-118 interceptor hooks (ADR-228 Phase 5 wiring).
 *
 * talking.ts was never wired for interceptors, which made Dungeo's
 * `TrollTalkingInterceptor` registration (`if.action.talking`, preValidate
 * veto: MDL-canon "Unfortunately, the troll can't hear you" when the troll
 * is incapacitated) a LIVE dead registration — it sat in the registry and
 * silently never fired. These tests pin the full hook contract (preValidate
 * veto, postExecute mutation, postReport emit/override, no-interceptor
 * passthrough) AND the real Dungeo shape: a conditional preValidate veto on
 * an actor entity, keyed by HealthBehavior life-state, returning a
 * fully-qualified story messageId that must render unprefixed on the
 * blocked event.
 */

import { describe, test, expect } from 'vitest';
import { talkingAction } from '../../../src/actions/standard/talking';
import { IFActions } from '../../../src/actions/constants';
import {
  TraitType,
  WorldModel,
  IFEntity,
  HealthTrait,
  HealthBehavior,
} from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  createCommand,
} from '../../test-utils';

const setup = () => {
  const { world, player, room } = setupBasicWorld();
  const npc = world.createEntity('gruff troll', 'actor');
  npc.add({ type: TraitType.ACTOR });
  world.moveEntity(npc.id, room.id);
  return { world, player, room, npc };
};

const drive = (world: WorldModel, target: IFEntity) => {
  const context = createRealTestContext(
    talkingAction,
    world,
    createCommand(IFActions.TALKING, { entity: target, text: 'troll' })
  );
  const validation = talkingAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: talkingAction.blocked(context, validation) };
  }
  talkingAction.execute(context);
  return { context, validation, events: talkingAction.report(context) };
};

describe('Talking interceptor hooks (ADR-118)', () => {
  test('preValidate veto blocks the talk', () => {
    const { world, npc } = setup();
    world.registerActionInterceptor(TraitType.ACTOR, IFActions.TALKING, {
      preValidate() {
        return { valid: false, error: 'test.refuses_conversation' };
      },
    });

    const { validation, events } = drive(world, npc);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.refuses_conversation');
    expect(events.some(e => (e.data as any)?.blocked)).toBe(true);
  });

  test('postExecute runs after the standard conversation analysis and its mutation persists', () => {
    const { world, npc } = setup();
    const calls: string[] = [];
    world.registerActionInterceptor(TraitType.ACTOR, IFActions.TALKING, {
      postExecute(target, w) {
        calls.push('postExecute');
        expect(target.id).toBe(npc.id);
        w.setStateValue('troll.greeted', true);
      },
      postReport() {
        calls.push('postReport');
        return {};
      },
    });

    drive(world, npc);

    // THE critical assertion: actual state, not just events.
    expect(world.getStateValue('troll.greeted')).toBe(true);
    expect(calls).toEqual(['postExecute', 'postReport']);
  });

  test('postReport emit appends events and override rewrites the talked messageId', () => {
    const { world, npc } = setup();
    world.registerActionInterceptor(TraitType.ACTOR, IFActions.TALKING, {
      postReport() {
        return {
          override: { messageId: 'troll.custom_greeting' },
          emit: [{ type: 'troll.grunt', payload: { messageId: 'troll.grunts' } }],
        };
      },
    });

    const { events } = drive(world, npc);

    const talked = events.find(e => e.type === 'if.event.talked')!;
    expect((talked.data as any).messageId).toBe('troll.custom_greeting');
    const grunt = events.find(e => e.type === 'troll.grunt');
    expect(grunt).toBeDefined();
  });

  test('no interceptor: behavior unchanged, standard talked event', () => {
    const { world, npc } = setup();

    const { validation, events } = drive(world, npc);

    expect(validation.valid).toBe(true);
    const talked = events.find(e => e.type === 'if.event.talked')!;
    // NPC without a conversation system gets the standard no_response message.
    expect((talked.data as any).messageId).toBe('if.action.talking.no_response');
  });
});

describe('Dungeo TrollTalkingInterceptor shape (live dead-registration fix)', () => {
  /**
   * Mirror of stories/dungeo/src/traits/troll-capability-behaviors.ts
   * `TrollTalkingInterceptor`: preValidate-only, vetoes with the
   * fully-qualified MDL-canon messageId iff the troll is incapacitated
   * (HealthBehavior.canAct === false), otherwise returns null so stdlib
   * talking proceeds.
   */
  const trollShapedInterceptor = {
    preValidate(entity: IFEntity) {
      const health = entity.get(HealthTrait);
      if (!health) return null;
      if (!HealthBehavior.canAct(health)) {
        return { valid: false, error: 'dungeo.troll.cant_hear_you' };
      }
      return null;
    },
  };

  test('incapacitated troll: preValidate veto fires through the action, qualified messageId renders unprefixed', () => {
    const { world, npc } = setup();
    // health 1 of maxHealth 10 is at/below the 20% unconscious threshold.
    npc.add(new HealthTrait({ health: 1, maxHealth: 10 }));
    expect(HealthBehavior.canAct(npc.get(HealthTrait)!)).toBe(false);
    world.registerActionInterceptor(TraitType.ACTOR, IFActions.TALKING, trollShapedInterceptor);

    const { validation, events } = drive(world, npc);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('dungeo.troll.cant_hear_you');
    const blocked = events.find(e => e.type === 'if.event.talk_blocked')!;
    // Fully-qualified story ids must pass through UNPREFIXED — the canon
    // message would not render as if.action.talking.dungeo.troll.cant_hear_you.
    expect((blocked.data as any).messageId).toBe('dungeo.troll.cant_hear_you');
    expect((blocked.data as any).reason).toBe('dungeo.troll.cant_hear_you');
  });

  test('conscious troll: interceptor returns null, standard talking proceeds', () => {
    const { world, npc } = setup();
    npc.add(new HealthTrait({ health: 10, maxHealth: 10 }));
    world.registerActionInterceptor(TraitType.ACTOR, IFActions.TALKING, trollShapedInterceptor);

    const { validation, events } = drive(world, npc);

    expect(validation.valid).toBe(true);
    const talked = events.find(e => e.type === 'if.event.talked')!;
    expect((talked.data as any).messageId).toBe('if.action.talking.no_response');
  });
});
