/**
 * End-to-end trap scenario (ADR-296 D7 / ADR-094's founding example,
 * demonstrated for the first time): a chain registered off
 * `if.event.actor_moved` returns a phrase with the default slot, and the
 * rendered turn shows it AFTER the room description AND its contents
 * listing — "walk in, read the room, THEN the trap bangs shut."
 *
 * Exercises the full real path: chain dispatch (world-model slot stamp),
 * D4 phrase promotion (event-processor), funnel transaction stamp
 * (engine), slot insertion (prose sort), and text rendering (prose
 * pipeline → blocks). No stubs of owned dependencies.
 */

import { setupTestEngine } from '../test-helpers/setup-test-engine';
import { RoomTrait, RoomBehavior, IdentityTrait, EntityType, Direction } from '@sharpee/world-model';
import type { ITextBlock } from '@sharpee/text-blocks';

/** Flatten a block's content to plain text for order assertions. */
function blockText(block: ITextBlock): string {
  return block.content
    .map(c => (typeof c === 'string' ? c : JSON.stringify(c)))
    .join(' ');
}

describe('ADR-296 end-to-end trap scenario', () => {
  it('renders the chained trap phrase after the room description and contents listing', async () => {
    const { engine, world, player } = setupTestEngine();

    // Wire a second room north of the start room, with visible contents
    // so the description is a full anchor CLUSTER (description + list).
    const startRoomId = world.getLocation(player.id)!;
    const startRoom = world.getEntity(startRoomId)!;
    startRoom.add(new RoomTrait({}));

    const trapRoom = world.createEntity('Trap Chamber', EntityType.ROOM);
    trapRoom.add(new RoomTrait({}));
    trapRoom.add(new IdentityTrait({
      name: 'Trap Chamber',
      description: 'A dim chamber with suspicious grooves in the floor.',
      article: 'the'
    }));
    const hook = world.createEntity('brass hook', EntityType.OBJECT);
    hook.add(new IdentityTrait({
      name: 'brass hook',
      description: 'A sturdy brass hook.',
      article: 'a'
    }));
    world.moveEntity(hook.id, trapRoom.id);

    RoomBehavior.setExit(startRoom, Direction.NORTH, trapRoom.id);
    RoomBehavior.setExit(trapRoom, Direction.SOUTH, startRoomId);

    // The trap: chained off the movement bookkeeping event, default slot.
    world.chainEvent('if.event.actor_moved', () => ({
      type: 'game.message',
      data: {
        messageId: 'test.trap.bang',
        text: 'A trap bangs shut behind you!'
      }
    }), { key: 'test.trap' });

    engine.start();
    try {
      const result = await engine.executeTurn('north');
      expect(result.success).toBe(true);

      const texts = (result.blocks ?? []).map(blockText);
      const descriptionIndex = texts.findIndex(t => t.includes('suspicious grooves'));
      const contentsIndex = texts.findIndex(t => t.includes('brass hook'));
      const trapIndex = texts.findIndex(t => t.includes('A trap bangs shut behind you!'));

      // All three render...
      expect(descriptionIndex).toBeGreaterThanOrEqual(0);
      expect(contentsIndex).toBeGreaterThanOrEqual(0);
      expect(trapIndex).toBeGreaterThanOrEqual(0);
      // ...and in the promised order: read the room, list included,
      // THEN the trap bangs shut.
      expect(descriptionIndex).toBeLessThan(contentsIndex);
      expect(contentsIndex).toBeLessThan(trapIndex);
    } finally {
      engine.stop();
    }
  });
});
