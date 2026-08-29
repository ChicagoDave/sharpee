/**
 * @file npc-attribution-realpath.test.ts
 * @description ADR-203 — REAL-PATH integration for NPC attribution speaker
 *   agreement across the stdlib→lang seam. AC-1 drives the real `going` action
 *   as a *plural* NPC (ADR-328 D5: an NPC's move IS the going action) and
 *   renders the witnessed `if.action.going.departs` message it emits through a
 *   real `EnglishLanguageProvider` with the actor bound as the engine binds it
 *   (ADR-328 D4) — proving the verb agrees ("leave", not "leaves").
 *   AC-2/3/4/6 exercise the same real seam (entity → `nounPhraseFor` → catalog
 *   `{verb:… speaker}` / actor-voice → agreement) with no stubs on either side.
 *
 * AC map (ADR-203): AC-1 plural agreement, AC-2 proper-name unchanged,
 * AC-3 article orthogonal to agreement, AC-4 verbatim payload byte-identical,
 * AC-6 graceful degradation (missing IdentityTrait).
 */

import { describe, test, expect } from 'vitest';
import {
  WorldModel,
  EntityType,
  IdentityTrait,
  RoomTrait,
  NpcTrait,
  TraitType,
  Direction,
  IFEntity,
} from '@sharpee/world-model';
import type { NarrativeAgreement, RenderContext } from '@sharpee/if-domain';
import { ACTOR_PARAM_KEY } from '@sharpee/if-domain';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { goingAction } from '../../src/actions/standard/going';
import { IFActions } from '../../src/actions/constants';
import { createActionContext } from '../../src/actions/enhanced-context';
import { createCommand } from '../test-utils';
import { createFixtureRandomService } from '../test-utils/fixture-random-service';
import { nounPhraseFor } from '../../src/utils';

/** A render context mirroring the engine's `makeRenderContext(params)`. */
function makeCtx(params: Record<string, unknown>, narrative: NarrativeAgreement = { person: 'third' }): RenderContext {
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params,
    settings: { serialComma: true },
    narrative,
    reference: { lastMentioned: () => undefined, note: () => undefined },
    textState: { get: () => undefined, set: () => undefined },
    contribute: () => undefined,
  };
}

function text(blocks: ReturnType<EnglishLanguageProvider['renderMessage']>): string {
  return blocks.flatMap((b) => b.content).map((c) => (typeof c === 'string' ? c : '⟦deco⟧')).join('');
}

const provider = new EnglishLanguageProvider();
const render = (messageId: string, params: Record<string, unknown>): string =>
  text(provider.renderMessage(messageId, params, makeCtx(params)));

/** A standalone entity carrying just an IdentityTrait, for the `nounPhraseFor` seam. */
function npcEntity(name: string, identity: Record<string, unknown> = {}): IFEntity {
  const world = new WorldModel();
  const e = world.createEntity(name, EntityType.ACTOR);
  e.add(new IdentityTrait({ name, ...identity } as ConstructorParameters<typeof IdentityTrait>[0]));
  return e;
}

describe('ADR-203 NPC attribution — real path', () => {
  /** Run the real going action as `mover` and return the witnessed departure's message + params. */
  function departureOf(world: WorldModel, player: IFEntity, mover: IFEntity): { messageId: string; params: Record<string, unknown> } {
    const command = createCommand(IFActions.GOING);
    command.parsed.extras = { direction: Direction.EAST };
    const context = createActionContext(world, player, goingAction, command, createFixtureRandomService(1), undefined, mover);
    expect(goingAction.validate(context).valid).toBe(true);
    goingAction.execute(context);
    const exited = goingAction.report(context).find((e) => e.type === 'if.event.actor_exited')!;
    const { messageId, params } = exited.data as { messageId: string; params: Record<string, unknown> };
    // The engine binds the acting entity under ACTOR_PARAM_KEY at render (ADR-328 D4).
    return { messageId, params: { ...params, [ACTOR_PARAM_KEY]: nounPhraseFor(mover) } };
  }

  function twoRooms(): { world: WorldModel; player: IFEntity; roomA: IFEntity } {
    const world = new WorldModel();
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add({ type: TraitType.ACTOR, isPlayer: true } as never);
    world.setPlayer(player.id);

    const roomA = world.createEntity('Room A', EntityType.ROOM);
    const roomB = world.createEntity('Room B', EntityType.ROOM);
    roomA.add(new RoomTrait({ exits: { [Direction.EAST]: { destination: roomB.id } } }));
    roomB.add(new RoomTrait({ exits: { [Direction.WEST]: { destination: roomA.id } } }));
    world.moveEntity(player.id, roomA.id);
    return { world, player, roomA };
  }

  test('AC-1: a plural NPC leaving renders a plural verb end-to-end (real going action as the NPC)', () => {
    const { world, player, roomA } = twoRooms();
    const twins = world.createEntity('twins', EntityType.ACTOR);
    twins.add(new IdentityTrait({ name: 'twins', nounType: 'plural' }));
    twins.add(new NpcTrait({ behaviorId: 'mover', canMove: true }));
    world.moveEntity(twins.id, roomA.id);

    const { messageId, params } = departureOf(world, player, twins);
    expect(messageId).toBe('if.action.going.departs');
    // The real emitter resolved the mover to a plural NounPhrase.
    expect((params[ACTOR_PARAM_KEY] as { number: string }).number).toBe('plural');

    const rendered = render(messageId, params);
    expect(rendered).toBe('The twins leave to the east.'); // plural verb agrees
    expect(rendered).not.toContain('leaves');
  });

  test('AC-2: a proper-named NPC renders name-only + singular verb (unchanged from pre-migration)', () => {
    const { world, player, roomA } = twoRooms();
    const sam = world.createEntity('Sam', EntityType.ACTOR);
    sam.add(new IdentityTrait({ name: 'Sam', nounType: 'proper' }));
    sam.add(new NpcTrait({ behaviorId: 'mover', canMove: true }));
    world.moveEntity(sam.id, roomA.id);

    const { messageId, params } = departureOf(world, player, sam);
    // Old output was "Sam leaves to the east." — must be byte-identical.
    expect(render(messageId, params)).toBe('Sam leaves to the east.');
  });

  test('AC-3: article follows the template hint; agreement is orthogonal', () => {
    const guard = npcEntity('guard'); // common noun, singular
    const guards = npcEntity('guards', { nounType: 'plural' });

    // {the speaker} (the catalog default): definite article for both numbers; verb agrees.
    expect(render('npc.notices_player', { speaker: nounPhraseFor(guard) })).toBe('The guard notices you.');
    expect(render('npc.notices_player', { speaker: nounPhraseFor(guards) })).toBe('The guards notice you.');

    // {a speaker}: indefinite article; agreement unaffected.
    provider.addMessage('test.adr203.a', '{capitalize a speaker} {verb:notices speaker} you.');
    expect(render('test.adr203.a', { speaker: nounPhraseFor(guard) })).toBe('A guard notices you.');
  });

  test('AC-4: the {verbatim:text} utterance payload is byte-identical', () => {
    const sam = npcEntity('Sam', { nounType: 'proper' });
    const utter = 'Well... "trouble", eh?';
    // A story's own attributed-speech template over the same seam (the
    // platform's NPC speech dialect is gone — ADR-328 D4/D5).
    provider.addMessage('test.adr203.says', '{capitalize the speaker} {verb:says speaker}, "{verbatim:text}"');
    const rendered = render('test.adr203.says', { speaker: nounPhraseFor(sam), text: utter });
    expect(rendered).toBe(`Sam says, "${utter}"`);
    expect(rendered).toContain(utter); // exact — no escaping, no modification
  });

  test('AC-6: an NPC with no IdentityTrait degrades gracefully (name + singular, no throw)', () => {
    const world = new WorldModel();
    const bare = world.createEntity('gizmo', EntityType.ACTOR); // no IdentityTrait

    expect(() => nounPhraseFor(bare)).not.toThrow();
    const np = nounPhraseFor(bare);
    expect(np.name).toBe('gizmo');
    expect(np.number).toBe('singular');

    const rendered = render('npc.notices_player', { speaker: np });
    expect(rendered).toBe('The gizmo notices you.'); // singular verb, no throw
  });
});
