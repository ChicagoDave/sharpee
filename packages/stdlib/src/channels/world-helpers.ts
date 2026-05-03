/**
 * @sharpee/stdlib/channels — world-narrowing helpers for closures.
 *
 * Owner context: stdlib channel module. Centralizes the cast from
 * `ChannelProduceContext.world` (typed `unknown` in if-domain to avoid
 * a world-model dependency cycle — see ADR-163 §6 commentary) into the
 * concrete `IWorldModel` shape that stdlib closures use.
 *
 * Each helper is null-safe: if the world is missing the expected
 * accessor (e.g., a stub world used in tests, or a partial mock), the
 * helper returns `undefined` rather than throwing. Closures using
 * these helpers thus degrade gracefully — they emit `undefined`,
 * which the `ChannelService` interprets as "no value this turn."
 *
 * Public interface (internal to stdlib):
 *  - `asWorld(ctx)` — narrow `ctx.world` to `IWorldModel` or
 *    `undefined`.
 *  - `readCapability<T>(ctx, name)` — typed capability lookup.
 *  - `playerLocationName(ctx)` — current room display name.
 */

import type { ChannelProduceContext } from '@sharpee/if-domain';
import type { IWorldModel, ICapabilityData } from '@sharpee/world-model';

/**
 * Return the context's world cast as an `IWorldModel`, or `undefined`
 * if the context's world value is null/undefined or lacks the expected
 * shape (no `getCapability` method).
 */
export function asWorld(ctx: ChannelProduceContext): IWorldModel | undefined {
  const candidate = ctx.world as Partial<IWorldModel> | undefined | null;
  if (!candidate) return undefined;
  if (typeof candidate.getCapability !== 'function') return undefined;
  return candidate as IWorldModel;
}

/**
 * Read a named capability from the world, narrowed to a caller-typed
 * shape. Returns `undefined` if the world is missing or the capability
 * is not registered. The caller is responsible for asserting the
 * returned shape — capability data is loosely typed in the world model.
 */
export function readCapability<T extends ICapabilityData = ICapabilityData>(
  ctx: ChannelProduceContext,
  name: string,
): T | undefined {
  const world = asWorld(ctx);
  if (!world) return undefined;
  return world.getCapability(name) as T | undefined;
}

/**
 * Resolve the player's current room display name, or `undefined` if
 * the world has no player, no containing room, or the room lacks a
 * display name. Used by `locationChannel` to populate the status-line
 * location field.
 */
export function playerLocationName(ctx: ChannelProduceContext): string | undefined {
  const world = asWorld(ctx);
  if (!world) return undefined;
  const player = world.getPlayer?.();
  if (!player) return undefined;
  const room = world.getContainingRoom?.(player.id);
  if (!room) return undefined;
  const name = (room as { name?: string }).name;
  if (typeof name !== 'string' || name.length === 0) return undefined;
  return name;
}
