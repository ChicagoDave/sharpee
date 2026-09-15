/**
 * ADR-349 Phase 4 — the location heading, driven through an assembled engine.
 *
 * REAL-PATH (rule 13a): every assertion here runs a real `GameEngine` turn over a
 * real `WorldModel`, a real stdlib channel registry, and the real prose pipeline.
 * Nothing composes a heading on the test's behalf — the two consumers do it, and
 * the test reads what the turn actually emitted: the `location` channel's packet
 * value for the status surface, and the `room.name` block for the inline one.
 *
 * Covers AC-2 (state-varying), AC-4 (the bucket), AC-7 (the opaque vehicle),
 * AC-8 (the three transitions), and AC-10 (joining).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { TurnPacket, LocationHeadingValue } from '@sharpee/if-domain';
import {
  WorldModel,
  EntityType,
  ActorTrait,
  RoomTrait,
  IdentityTrait,
  VehicleTrait,
  ContainerTrait,
  EnterableTrait,
  registerLocationName,
  clearLocationNames,
} from '@sharpee/world-model';
import type { IFEntity } from '@sharpee/world-model';
import type { ITextBlock } from '@sharpee/text-blocks';
import { BLOCK_KEYS } from '@sharpee/text-blocks';
import { setupTestEngine } from '../test-helpers/setup-test-engine';
import type { GameEngine } from '../../src/game-engine';
import type { Story } from '../../src/install/story';

/** The world the well scenario builds, shared by the cases below. */
interface WellWorld {
  topId: string;
  bottomId: string;
  bucketId: string;
  playerId: string;
}

/**
 * Two rooms and a bucket. NEITHER room's source mentions the bucket — that is
 * half of AC-4's claim, and it is true by construction here.
 *
 * @param opts `transparent` decides whether the bucket takes the enclosure slot
 *   (AC-4) or the place slot (AC-7); the distinction is the vehicle's own
 *   transparency, not its kind (D4a).
 */
function makeWellStory(opts: { transparent: boolean }): { story: Story; ids: WellWorld } {
  const ids: WellWorld = { topId: '', bottomId: '', bucketId: '', playerId: '' };
  const story: Story = {
    config: { id: 'adr-349-well', title: 'Well', authors: ['test'], version: '1.0.0' },
    initializeWorld: (world: WorldModel) => {
      const top = world.createEntity('top-of-well', EntityType.ROOM);
      top.add(new RoomTrait({}));
      top.add(new IdentityTrait({ name: 'top-of-well', description: 'The well head.' }));

      const bottom = world.createEntity('well-bottom', EntityType.ROOM);
      bottom.add(new RoomTrait({}));
      bottom.add(new IdentityTrait({ name: 'well-bottom', description: 'The well floor.' }));

      const bucket = world.createEntity('bucket', EntityType.CONTAINER);
      bucket.add(new ContainerTrait({}));
      bucket.add(new EnterableTrait({}));
      bucket.add(new VehicleTrait({ vehicleType: 'counterweight', transparent: opts.transparent }));
      bucket.add(new IdentityTrait({ name: 'bucket', description: 'A wooden bucket.' }));
      world.moveEntity(bucket.id, top.id);

      const player = world.createEntity('You', EntityType.ACTOR);
      player.add(new ActorTrait({ isPlayable: true }));
      world.moveEntity(player.id, top.id);

      ids.topId = top.id;
      ids.bottomId = bottom.id;
      ids.bucketId = bucket.id;
      ids.playerId = player.id;
    },
    createPlayer: (world: WorldModel) => world.getEntity(ids.playerId)!,
  };
  return { story, ids };
}

/** Collect every turn packet the engine emits, newest last. */
function capturePackets(engine: GameEngine): TurnPacket[] {
  const packets: TurnPacket[] = [];
  engine.on('channel:packet', (packet) => packets.push(packet));
  return packets;
}

/** The `location` channel's value on the most recent packet that carried one. */
function lastHeading(packets: TurnPacket[]): LocationHeadingValue | undefined {
  for (let i = packets.length - 1; i >= 0; i--) {
    const value = packets[i].payload?.location;
    if (value !== undefined) return value as LocationHeadingValue;
  }
  return undefined;
}

/** The inline `room.name` block's text, decorations flattened. */
function roomNameBlock(blocks: readonly ITextBlock[] | undefined): string | undefined {
  const block = (blocks ?? []).find((b) => b.key === BLOCK_KEYS.ROOM_NAME);
  if (!block) return undefined;
  return block.content
    .map((node) => (typeof node === 'string' ? node : flattenDecoration(node)))
    .join('');
}

function flattenDecoration(node: unknown): string {
  const deco = node as { content?: unknown[] };
  return (deco.content ?? [])
    .map((child) => (typeof child === 'string' ? child : flattenDecoration(child)))
    .join('');
}

describe('ADR-349 — the location heading through an assembled engine', () => {
  let engine: GameEngine | undefined;

  beforeEach(() => clearLocationNames());
  afterEach(() => {
    engine?.stop();
    engine = undefined;
    clearLocationNames();
  });

  /** Boot a well world with its arms registered, and return the live pieces. */
  function boot(opts: { transparent: boolean }) {
    const setup = setupTestEngine();
    const { story, ids } = makeWellStory({ transparent: opts.transparent });
    setup.engine.installStory(story);
    engine = setup.engine;
    const packets = capturePackets(setup.engine);
    setup.engine.start();
    return { ...setup, ids, packets, world: setup.world };
  }

  it('AC-4 / AC-10 — the bucket composes with the room, joined by the assembler', async () => {
    const { engine: eng, world, ids, packets } = boot({ transparent: true });
    registerLocationName(ids.topId, [{ text: 'Top of Well' }]);
    registerLocationName(ids.bucketId, [{ text: 'in the bucket' }]);

    await eng.executeTurn('look');
    expect(lastHeading(packets)?.text).toBe('Top of Well');

    world.moveEntity(ids.playerId, ids.bucketId);
    const inBucket = await eng.executeTurn('look');

    const heading = lastHeading(packets)!;
    // AC-10: one separator, a comma and a space, and no conjunction. A
    // `PhraseList` would render "Top of Well and in the bucket" here.
    expect(heading.text).toBe('Top of Well, in the bucket');
    expect(heading.text).not.toContain(' and ');
    // AC-4: the parts name their owners and their roles.
    expect(heading.parts).toEqual([
      { ownerId: ids.topId, text: 'Top of Well', role: 'place' },
      { ownerId: ids.bucketId, text: 'in the bucket', role: 'enclosure' },
    ]);
    // D3a: the inline heading is the same value, not a parallel derivation.
    expect(roomNameBlock(inBucket.blocks)).toBe('Top of Well, in the bucket');
  });

  it('AC-10 — a single part renders with no separator at all', async () => {
    const { engine: eng, ids, packets } = boot({ transparent: true });
    registerLocationName(ids.topId, [{ text: 'Top of Well' }]);

    await eng.executeTurn('look');
    expect(lastHeading(packets)?.text).toBe('Top of Well');
  });

  it("AC-4 — the vehicle's arms answer to its own state, not the room's", async () => {
    const { engine: eng, world, ids, packets } = boot({ transparent: true });
    let full = false;
    registerLocationName(ids.topId, [{ text: 'Top of Well' }]);
    registerLocationName(ids.bucketId, [
      { holds: () => full, text: 'in the bucket, up to your knees in water' },
      { text: 'in the bucket' },
    ]);

    world.moveEntity(ids.playerId, ids.bucketId);
    await eng.executeTurn('look');
    expect(lastHeading(packets)?.text).toBe('Top of Well, in the bucket');

    full = true;
    await eng.executeTurn('look');
    expect(lastHeading(packets)?.text).toBe(
      'Top of Well, in the bucket, up to your knees in water',
    );
  });

  it('AC-2 — a varying heading reaches the status surface with no look in between', async () => {
    const { engine: eng, ids, packets } = boot({ transparent: true });
    let night = false;
    registerLocationName(ids.topId, [
      { holds: () => night, text: 'Top of Well, under the stars' },
      { text: 'Top of Well' },
    ]);

    await eng.executeTurn('look');
    expect(lastHeading(packets)?.text).toBe('Top of Well');

    // The condition flips and the next turn is NOT a look. The `location`
    // channel emits every turn, so the new heading reaches the status line on
    // the turn it changed (D3).
    night = true;
    const quiet = await eng.executeTurn('wait');
    expect(roomNameBlock(quiet.blocks)).toBeUndefined();
    expect(lastHeading(packets)?.text).toBe('Top of Well, under the stars');
  });

  it('AC-7 — an opaque vehicle names itself on both surfaces (GH #468)', async () => {
    const { engine: eng, world, ids, packets } = boot({ transparent: false });
    let sealed = false;
    registerLocationName(ids.topId, [{ text: 'Top of Well' }]);
    registerLocationName(ids.bucketId, [
      { holds: () => sealed, text: 'Inside the sealed bucket' },
      { text: 'Inside the bucket' },
    ]);

    world.moveEntity(ids.playerId, ids.bucketId);
    const inside = await eng.executeTurn('look');

    // The surrounding room is NOT named: `getContainingRoom` would have said
    // "Top of Well" here, which is the divergence this projection ends.
    const heading = lastHeading(packets)!;
    expect(heading.text).toBe('Inside the bucket');
    expect(heading.text).not.toContain('Top of Well');
    expect(heading.parts).toEqual([
      { ownerId: ids.bucketId, text: 'Inside the bucket', role: 'place' },
    ]);
    expect(roomNameBlock(inside.blocks)).toBe('Inside the bucket');

    sealed = true;
    await eng.executeTurn('wait');
    expect(lastHeading(packets)?.text).toBe('Inside the sealed bucket');
  });

  it('AC-8 — entering adds the part, leaving removes it, and riding keeps it', async () => {
    const { engine: eng, world, ids, packets } = boot({ transparent: true });
    registerLocationName(ids.topId, [{ text: 'Top of Well' }]);
    registerLocationName(ids.bottomId, [{ text: 'Well Bottom' }]);
    registerLocationName(ids.bucketId, [{ text: 'in the bucket' }]);

    await eng.executeTurn('look');
    expect(lastHeading(packets)?.text).toBe('Top of Well');

    // Entering — the enclosure part appears on that turn.
    world.moveEntity(ids.playerId, ids.bucketId);
    await eng.executeTurn('wait');
    expect(lastHeading(packets)?.text).toBe('Top of Well, in the bucket');

    // Riding — the bucket moves between rooms with the player aboard. The place
    // part changes; the enclosure part survives unchanged. A heading cached per
    // room passes the two cases either side of this one and fails here.
    world.moveEntity(ids.bucketId, ids.bottomId);
    await eng.executeTurn('wait');
    const riding = lastHeading(packets)!;
    expect(riding.text).toBe('Well Bottom, in the bucket');
    expect(riding.parts.map((p) => p.role)).toEqual(['place', 'enclosure']);
    expect(riding.parts[1]).toEqual({
      ownerId: ids.bucketId,
      text: 'in the bucket',
      role: 'enclosure',
    });

    // Leaving — the enclosure part goes on that turn.
    world.moveEntity(ids.playerId, ids.bottomId);
    await eng.executeTurn('wait');
    expect(lastHeading(packets)?.text).toBe('Well Bottom');
    expect(lastHeading(packets)?.parts).toHaveLength(1);
  });

  it('D16a — a world with no arms registered keeps rendering the entity name', async () => {
    const { engine: eng, ids, packets } = boot({ transparent: true });
    const look = await eng.executeTurn('look');
    expect(lastHeading(packets)).toEqual({ text: 'top-of-well', parts: [] });
    expect(roomNameBlock(look.blocks)).toBe('top-of-well');
    void ids;
  });
});
