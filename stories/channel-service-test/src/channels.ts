/**
 * @sharpee/story-channel-service-test/channels — `debug-stats` channel.
 *
 * Owner context: AC-15 fixture story. Defines a story-supplied
 * `IOChannel` that emits a `{ inventoryCount, turn }` payload each
 * turn, sparse-emit semantics so re-issuing a query with unchanged
 * inventory suppresses the emission.
 *
 * The closure reads the player's inventory via the world model; any
 * action that adds or removes an item from the player toggles a new
 * emission. Walkthrough exercises:
 *   - look (turn 1) → inventoryCount=0 emits (prev was undefined)
 *   - look (turn 2) → inventoryCount=0 unchanged → no emission
 *   - take beacon (turn 3) → inventoryCount=1 emits
 *   - look (turn 4) → unchanged → no emission
 *   - drop beacon (turn 5) → inventoryCount=0 emits
 */

import type {
  IOChannel,
  IChannelRegistry,
  ChannelProduceContext,
} from '@sharpee/if-domain';

/**
 * Wire shape for the `debug-stats` channel. Purely state-driven (no
 * `turn` field) so sparse-emit semantics can suppress repeat turns
 * with unchanged inventory. Both CLI and browser renderers project
 * this same shape into their respective sinks.
 */
export interface DebugStatsPayload {
  readonly inventoryCount: number;
}

/**
 * Read the player's inventory size from the world.
 *
 * `world` arrives typed `unknown` per `ChannelProduceContext`
 * (if-domain → world-model cycle break); the closure narrows to the
 * minimal shape it needs.
 */
function readInventoryCount(ctx: ChannelProduceContext): number {
  const world = ctx.world as
    | {
        getPlayer?: () => { id: string } | undefined;
        getContents?: (id: string) => readonly unknown[];
      }
    | undefined;
  if (!world?.getPlayer || !world?.getContents) return 0;
  const player = world.getPlayer();
  if (!player) return 0;
  const contents = world.getContents(player.id);
  return Array.isArray(contents) ? contents.length : 0;
}

export const DEBUG_STATS_CHANNEL_ID = 'debug-stats' as const;

/**
 * The `debug-stats` `IOChannel`. Replace mode + sparse emit so the
 * channel only appears in turn packets when the projected payload
 * differs from the prior turn's emission.
 */
export const debugStatsChannel: IOChannel<DebugStatsPayload> = {
  id: DEBUG_STATS_CHANNEL_ID,
  contentType: 'json',
  mode: 'replace',
  emit: 'sparse',
  produce: (ctx) => ({
    inventoryCount: readInventoryCount(ctx),
  }),
};

/**
 * `Story.registerChannels` hook — adds the story's channel to the
 * shared registry. Called by the engine during bootstrap before the
 * `ChannelService` is constructed.
 */
export function registerStoryChannels(registry: IChannelRegistry): void {
  registry.add(debugStatsChannel);
}
