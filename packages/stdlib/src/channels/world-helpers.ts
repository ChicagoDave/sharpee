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
 *  - `playerLocationHeading(ctx)` — the composed location heading
 *    (ADR-349 D3) the `location` channel carries.
 */

import type { ChannelProduceContext, LocationHeadingValue } from '@sharpee/if-domain';
import type { IWorldModel, ICapabilityData, WorldModel } from '@sharpee/world-model';
import { LocationHeadingBehavior, VisibilityBehavior } from '@sharpee/world-model';
import { realizeLocationHeading } from '@sharpee/lang-en-us';

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
 * The player's location heading for this turn — the `location` channel's whole
 * payload (ADR-349 D3, D12).
 *
 * Every *part* comes from `LocationHeadingBehavior.resolve` and from no other
 * route, which is the property that makes the status line and the inline
 * heading incapable of disagreeing (D3a). When no contributor spoke, D16a's
 * fallback is the place's own entity name — resolved through
 * `getDescribableLocation`, never through `getContainingRoom`, which walks past
 * an opaque vehicle to the room around it and is the divergence this projection
 * exists to end (D4a, GH #468).
 *
 * @param ctx the channel produce context for the turn just executed
 * @returns the heading, or `undefined` when the world has no player (the channel
 *   then re-emits its previous value)
 */
export function playerLocationHeading(
  ctx: ChannelProduceContext,
): LocationHeadingValue | undefined {
  const world = asWorld(ctx);
  if (!world) return undefined;
  const player = world.getPlayer?.();
  if (!player) return undefined;

  // The channel context types its world `unknown` to keep if-domain free of a
  // world-model dependency; in production it IS the live `WorldModel`, which is
  // what both projections below require.
  const model = world as unknown as WorldModel;

  let parts;
  try {
    parts = LocationHeadingBehavior.resolve(player, model);
  } catch {
    // A partial world (test stub, mid-teardown) resolves to nothing rather than
    // throwing through the channel service — the channel degrades to silence.
    return undefined;
  }

  if (parts.length > 0) {
    return { text: realizeLocationHeading(parts), parts };
  }

  const place = VisibilityBehavior.getDescribableLocation(player, model).location;
  const name = place?.name;
  if (typeof name !== 'string' || name.length === 0) return undefined;
  return { text: name, parts: [] };
}
