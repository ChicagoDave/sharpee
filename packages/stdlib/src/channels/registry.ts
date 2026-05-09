/**
 * @sharpee/stdlib/channels — channel registry instance.
 *
 * Owner context: stdlib language layer. Hosts the canonical
 * `IChannelRegistry` instance for Sharpee's channel-I/O system.
 * Engine bootstrap imports this instance, lets stories register their
 * channels onto it (`Story.registerChannels?.(registry)`), then hands
 * it to a fresh `ChannelService` (per ADR-163 §13, §14).
 *
 * The instance is populated at module init with the ten standard
 * channels and the eleven static media channels. The `Story.registerChannels`
 * hook may add story-specific channels or override standards by
 * re-registering with the same id (last-write-wins per ADR-163 §6).
 *
 * Lifecycle: a fresh `ChannelService` is created per session
 * (engine restart, RESTART command). The registry itself is reused —
 * stdlib's standard channels stay registered across sessions, and the
 * `ChannelService`'s per-session `prevValues` map provides the
 * isolation. The Story.registerChannels hook is invoked once per
 * engine bootstrap; if a story overrides a standard channel, that
 * override persists for the lifetime of the engine instance.
 *
 * Tests can construct their own `IChannelRegistry` instance for
 * isolation (unit tests should not depend on this singleton's
 * pre-populated state for behavior-specific assertions).
 *
 * @see ADR-163 — Channel-Service Platform — §6, §7, §13, §14
 */

import type { IChannelRegistry, IOChannel } from '@sharpee/if-domain';
import { STANDARD_CHANNELS } from './standard';
import { MEDIA_CHANNELS } from './media';
import { SOUND_CHANNELS } from './sound-events';

/**
 * In-memory `IChannelRegistry` implementation. Last-write-wins on
 * `add(channel)` by `channel.id` — which is how stories override
 * platform standards (ADR-163 §6).
 */
export class StdlibChannelRegistry implements IChannelRegistry {
  private readonly channels = new Map<string, IOChannel>();

  add(channel: IOChannel): void {
    this.channels.set(channel.id, channel);
  }

  get(id: string): IOChannel | undefined {
    return this.channels.get(id);
  }

  all(): readonly IOChannel[] {
    return [...this.channels.values()];
  }

  /**
   * Test-only helper: snapshot the current channel ids. Stable
   * iteration order matches insertion order (Map semantics).
   */
  ids(): readonly string[] {
    return [...this.channels.keys()];
  }
}

/**
 * The canonical channel registry instance for Sharpee. Pre-populated
 * with ten standard channels (`main`, `prompt`, `score`, `turn`,
 * `location`, `info`, `ifid`, `death`, `endgame`, `score_notify`)
 * plus eleven static media channels (`image:preload`,
 * `image:background`, `image:main`, `image:overlay`, `sound`,
 * `music`, `animation`, `animate`, `transition`, `layout`, `clear`).
 *
 * Engine bootstrap consumes this directly; stories extend through
 * the `Story.registerChannels?(registry)` hook.
 */
export const channelRegistry: IChannelRegistry = (() => {
  const registry = new StdlibChannelRegistry();
  for (const channel of STANDARD_CHANNELS) {
    registry.add(channel);
  }
  for (const channel of MEDIA_CHANNELS) {
    registry.add(channel);
  }
  for (const channel of SOUND_CHANNELS) {
    registry.add(channel);
  }
  return registry;
})();
