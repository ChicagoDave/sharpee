/**
 * ADR-349 AC-3 — one projection, two consumers, and no third derivation.
 *
 * STRUCTURAL. The property is not "the two surfaces happened to agree on the
 * turn we sampled" — it is that there is no second code path for them to
 * disagree with (D3/D3a). So this asserts over the call sites themselves: each
 * consumer's heading comes from `LocationHeadingBehavior.resolve`, and neither
 * reaches the place any other way. It fails the moment a second derivation
 * appears, rather than wherever a sampled turn happens to notice.
 *
 * The heading FALLBACK is deliberately out of scope: when `resolve` returns no
 * parts, D16a hands each consumer back to what it rendered before this ADR — the
 * room block to ADR-107's `nameId` chain, the channel to the place's own name.
 * That is not a second derivation of a heading part; it is the absence of one.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  WorldModel,
  EntityType,
  ActorTrait,
  RoomTrait,
  IdentityTrait,
  LocationHeadingBehavior,
  clearLocationNames,
} from '@sharpee/world-model';
import { locationChannel } from '@sharpee/stdlib';
import type { ChannelProduceContext } from '@sharpee/if-domain';
import { handleRoomDescription } from '../../src/prose-pipeline/handlers/room';
import { createRenderContextFactory } from '../../src/prose-pipeline/render-context';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

/** The two files AC-3 is about, by the route each consumer actually takes. */
const CALL_SITES = {
  'the room-name block': 'packages/engine/src/prose-pipeline/handlers/room.ts',
  'the location channel': 'packages/stdlib/src/channels/world-helpers.ts',
} as const;

/**
 * A file's executable source, with comments removed.
 *
 * Comments are stripped because the thing under test is which routes the CODE
 * takes. Both call sites name `getContainingRoom` in prose — saying why they do
 * not use it is the documentation D4a deserves, and a check that counted it
 * would push that explanation out of the files that need it.
 */
function sourceOf(relative: string): string {
  return readFileSync(join(REPO_ROOT, relative), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** A one-room world with a player in it. */
function makeWorld() {
  const world = new WorldModel();
  const room = world.createEntity('Hall', EntityType.ROOM);
  room.add(new RoomTrait({}));
  room.add(new IdentityTrait({ name: 'Hall', description: 'A hall.' }));
  const player = world.createEntity('You', EntityType.ACTOR);
  player.add(new ActorTrait({ isPlayable: true }));
  world.setPlayer(player.id);
  world.moveEntity(player.id, room.id);
  return { world, room, player };
}

function channelContext(world: WorldModel): ChannelProduceContext {
  return { world, events: [], blocks: [], turn: 1, prevValue: undefined };
}

describe('ADR-349 AC-3 — the heading has one derivation', () => {
  beforeEach(() => clearLocationNames());
  afterEach(() => {
    vi.restoreAllMocks();
    clearLocationNames();
  });

  it.each(Object.entries(CALL_SITES))(
    '%s reaches the place through the projection, never getContainingRoom (D4a)',
    (_label, relative) => {
      const source = sourceOf(relative);
      expect(source).toContain('LocationHeadingBehavior.resolve');
      expect(source).not.toContain('getContainingRoom');
    },
  );

  it('both consumers render whatever the projection returns, and nothing else', () => {
    const { world, room } = makeWorld();

    // One stub, deliberately unlike anything either consumer could derive on its
    // own: if a consumer had a second route to the heading, its output would not
    // move when this does.
    const spy = vi
      .spyOn(LocationHeadingBehavior, 'resolve')
      .mockReturnValue([{ ownerId: room.id, text: 'A Place No Entity Is Named', role: 'place' }]);

    const channelValue = locationChannel.produce(channelContext(world)) as { text: string };

    const blocks = handleRoomDescription(
      {
        type: 'if.event.room.description',
        data: { verbose: true, roomId: room.id, room: { id: room.id, name: 'Hall' } },
      } as never,
      {
        world,
        makeRenderContext: createRenderContextFactory(world, undefined as never),
      } as never,
    );
    const nameBlock = blocks.find((b) => b.key === 'room.name');

    expect(spy).toHaveBeenCalledTimes(2);
    expect(channelValue.text).toBe('A Place No Entity Is Named');
    expect(JSON.stringify(nameBlock?.content)).toContain('A Place No Entity Is Named');
    // Neither consumer smuggled the entity name in beside the projection's text.
    expect(channelValue.text).not.toContain('Hall');
    expect(JSON.stringify(nameBlock?.content)).not.toContain('Hall');
  });
});
