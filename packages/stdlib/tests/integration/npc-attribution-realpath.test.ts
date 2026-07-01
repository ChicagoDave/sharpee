/**
 * @file npc-attribution-realpath.test.ts
 * @description ADR-203 — REAL-PATH integration for NPC attribution speaker
 *   agreement across the stdlib→lang seam. AC-1 drives the actual `NpcService`
 *   movement emitter (which calls `nounPhraseFor(npc)` at emit time) against a
 *   *plural* NPC and renders the emitted `npc.leaves` event through a real
 *   `EnglishLanguageProvider` — proving the verb agrees ("leave", not "leaves").
 *   AC-2/3/4/6 exercise the same real seam (entity → `nounPhraseFor` → catalog
 *   `{verb:… speaker}` → agreement) with no stubs on either side.
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
import { createSeededRandom } from '@sharpee/core';
import type { NarrativeAgreement, RenderContext } from '@sharpee/if-domain';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { NpcService } from '../../src/npc/npc-service';
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
  test('AC-1: a plural NPC leaving renders a plural verb end-to-end (real NpcService emitter)', () => {
    const world = new WorldModel();
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add({ type: TraitType.ACTOR, isPlayer: true } as never);
    world.setPlayer(player.id);

    const roomA = world.createEntity('Room A', EntityType.ROOM);
    const roomB = world.createEntity('Room B', EntityType.ROOM);
    roomA.add(new RoomTrait({ exits: { [Direction.EAST]: { destination: roomB.id } } }));
    roomB.add(new RoomTrait({ exits: { [Direction.WEST]: { destination: roomA.id } } }));

    const twins = world.createEntity('twins', EntityType.ACTOR);
    twins.add(new IdentityTrait({ name: 'twins', nounType: 'plural' }));
    twins.add(new NpcTrait({ behaviorId: 'mover', canMove: true, announcesMovement: true }));
    world.moveEntity(twins.id, roomA.id);

    const service = new NpcService();
    service.registerBehavior({ id: 'mover', onTurn: () => [{ type: 'move', direction: Direction.EAST } as never] });
    const events = service.tick({
      world,
      turn: 1,
      random: createSeededRandom(1),
      playerLocation: roomA.id,
      playerId: player.id,
    });

    const witnessed = events.find((e) => e.type === 'npc.moved.witnessed');
    expect(witnessed).toBeDefined();
    const sight = (witnessed!.data as { renderings: { sight: { messageId: string; params: Record<string, any> } } })
      .renderings.sight;
    expect(sight.messageId).toBe('npc.leaves');
    // The real emitter resolved the speaker to a plural NounPhrase at emit time.
    expect(sight.params.speaker.number).toBe('plural');

    const rendered = render(sight.messageId, sight.params);
    expect(rendered).toContain('The twins leave to the'); // plural verb agrees
    expect(rendered).not.toContain('leaves');
  });

  test('AC-2: a proper-named NPC renders name-only + singular verb (unchanged from pre-migration)', () => {
    const sam = npcEntity('Sam', { nounType: 'proper' });
    // Old output was "Sam leaves to the east." — must be byte-identical.
    expect(render('npc.leaves', { speaker: nounPhraseFor(sam), direction: 'east' }))
      .toBe('Sam leaves to the east.');
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
    const rendered = render('npc.speaks', { speaker: nounPhraseFor(sam), text: utter });
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
