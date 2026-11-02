/**
 * removal-observer.ts — the `removal-observer` step: the one `disappeared` observer.
 *
 * When any entity authors a `disappeared` block, one pre-removal observer
 * registers on the world and serves every such block: on a successful
 * removal it skips the player, requires an authored block, requires the
 * removal to be witnessed (the player's containing room equals the
 * entity's last containing room), then ENQUEUES the phrase through the
 * runtime's phrase-event path — never rendered inline from the observer.
 * Unwitnessed removals enqueue nothing and consume nothing. Orphaning
 * never reaches here (the seam fires only in `removeEntity`).
 *
 * Public interface: registerRemovalObserver (the `removal-observer` step).
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the world build as a named step list.
 * - ADR-213 §2, D11 — the `disappeared` channel, witnessed-only.
 */
import type { WorldModel } from '@sharpee/world-model';
import type { BuildContext } from './context.js';

/**
 * The `removal-observer` step: register the one `disappeared` observer,
 * when any entity authors the channel.
 * @param story the build context
 * @param world the world being built (the observer closes over it)
 */
export function registerRemovalObserver(story: BuildContext, world: WorldModel): void {
  const table = story.ir.phrases.locales[story.ir.phrases.defaultLocale] ?? {};
  if (!story.ir.entities.some((e) => table[`${e.id}.disappeared`])) return;
  world.onEntityRemoved((entity, lastRoomId) => {
    const playerId = world.hasPlayerCharacter ? world.playerCharacter.id : undefined;
    if (!playerId || entity.id === playerId) return;
    const irId = entity.id;
    if (!table[`${irId}.disappeared`]) return;
    if (lastRoomId === null) return; // nowhere = nothing witnessable
    const playerRoom = world.getContainingRoom(playerId)?.id ?? world.getLocation(playerId);
    if (playerRoom !== lastRoomId) return; // unwitnessed: nothing enqueued, nothing consumed
    const event = story.runtime.channelEvent(irId, 'disappeared', world);
    if (event) story.runtime.enqueueChannelEvent(event);
  });
}
