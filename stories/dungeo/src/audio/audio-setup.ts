/**
 * Audio setup for Dungeo — registers ambient atmospheres, provides an
 * event handler that triggers atmosphere changes on room entry, and
 * registers the story's dynamic ambient channels with the channel
 * registry.
 *
 * Public interface:
 *  - `initializeAudio()` — called from `DungeoStory.initializeWorld()`.
 *  - `registerAudioHandler()` — called from `onEngineReady()`. Emits
 *    `media.*` events on `if.event.actor_moved`.
 *  - `registerStoryAmbientChannels(registry)` — called from
 *    `DungeoStory.registerChannels()`. Adds `ambient:<id>` channels.
 *  - `DUNGEO_AMBIENT_CHANNEL_IDS` — exhaustive list of ambient channel
 *    ids the story uses; consumed by both the registry hook and the
 *    actor-moved handler (the latter for per-channel stops in lieu of
 *    a `stop_all` event).
 *
 * ADR-163 Phase 3 (channel-io-event-retirement): the handler used to
 * emit `audio.ambient.play`/`audio.music.play`/`audio.ambient.stop_all`,
 * which were forwarded to `BrowserClient`'s legacy `engine.on('event')`
 * listener. After Phase 3 the handler emits the canonical `media.*`
 * vocabulary; stdlib's `createAmbientChannel(id)` and `musicChannel`
 * project those events onto the channel surface, where browser-side
 * renderers consume them.
 *
 * The legacy `audio.effect` event was never handled by `AudioManager`
 * (silently dropped). Phase 3 preserves that behaviour by no longer
 * emitting it. Future audio-effect support is a separate design
 * question (ADR-B candidate in
 * `docs/work/channel-io-event-retirement/plan-20260504-event-listener-retirement.md`).
 *
 * Owner context: stories/dungeo (ADR-138)
 */

import { AudioRegistry } from '@sharpee/media';
import type { EventProcessor } from '@sharpee/event-processor';
import type { ISemanticEvent } from '@sharpee/core';
import type { Effect } from '@sharpee/event-processor';
import type { IChannelRegistry } from '@sharpee/if-domain';
import { createAmbientChannel } from '@sharpee/stdlib';

/**
 * Construct a `media.*` `ISemanticEvent`. The canonical `media.*`
 * vocabulary lives in stdlib's channel definitions (ADR-163 §7) and
 * is not registered in `@sharpee/core`'s `EventDataRegistry` (the
 * audio-domain types in `@sharpee/media` register `audio.*` only).
 * We construct the event directly rather than route through
 * `createTypedEvent` so we don't need to extend the core registry
 * from a story package.
 */
let mediaEventCounter = 0;
function createMediaEvent(
  type: string,
  data: Record<string, unknown>,
): ISemanticEvent {
  return {
    id: `media-${Date.now()}-${++mediaEventCounter}`,
    type,
    timestamp: Date.now(),
    data,
    entities: {},
  };
}

/** The shared audio registry for the Dungeo story */
export const audioRegistry = new AudioRegistry();

/**
 * The exhaustive set of ambient channel ids the Dungeo story uses.
 * Drives both `registerStoryAmbientChannels` (channel definitions)
 * and the actor-moved handler's "stop everything" path (one
 * `media.ambient.stop` per id, since `media.*` has no `stop_all`).
 *
 * If a future room atmosphere uses a new channel id, add it here.
 */
export const DUNGEO_AMBIENT_CHANNEL_IDS = ['environment'] as const;

/**
 * Register ambient atmospheres for Dungeo rooms.
 * Called during initializeWorld() after all regions are created.
 *
 * @param undergroundRoomIds - Room IDs for the underground region
 * @param additionalUndergroundIds - Room IDs from other regions that are underground
 */
export function initializeAudio(
  undergroundRoomIds: Record<string, string>,
  additionalUndergroundIds: string[] = [],
): void {
  // Register the dungeon ambience for all underground rooms
  for (const roomId of Object.values(undergroundRoomIds)) {
    audioRegistry
      .atmosphere(roomId)
      .ambient('audio/dungeon_ambient_1.ogg', 'environment', 0.3)
      .build();
  }

  // Additional underground rooms from other regions (coal mine, temple, etc.)
  for (const roomId of additionalUndergroundIds) {
    audioRegistry
      .atmosphere(roomId)
      .ambient('audio/dungeon_ambient_1.ogg', 'environment', 0.3)
      .build();
  }
}

/**
 * Register the dynamic ambient channels the story uses on the shared
 * channel registry. Called from `DungeoStory.registerChannels` during
 * engine bootstrap, before the `ChannelService` is constructed.
 */
export function registerStoryAmbientChannels(registry: IChannelRegistry): void {
  for (const ambientId of DUNGEO_AMBIENT_CHANNEL_IDS) {
    registry.add(createAmbientChannel(ambientId));
  }
}

/**
 * Register the event handler that emits audio events on room entry.
 * Listens for 'if.event.actor_moved' and returns EmitEffects for the
 * atmosphere of the destination room. Emits canonical `media.*` events
 * (ADR-163 §7); stdlib channel closures and browser renderers handle
 * the rest.
 *
 * @param eventProcessor - The event processor for handler registration
 */
export function registerAudioHandler(eventProcessor: EventProcessor): void {
  eventProcessor.registerHandler('if.event.actor_moved', (event: ISemanticEvent): Effect[] => {
    const data = event.data as { actor?: { id: string }; toRoom?: string } | undefined;
    if (!data?.toRoom) return [];

    const atmosphere = audioRegistry.getAtmosphere(data.toRoom);
    const fades = audioRegistry.getFadeDefaults();

    if (!atmosphere) {
      // No atmosphere for this room — stop every registered ambient
      // channel. The `media.*` vocabulary has no `stop_all`, so we
      // emit one `media.ambient.stop` per channel id the story uses.
      return DUNGEO_AMBIENT_CHANNEL_IDS.map((channel) => ({
        type: 'emit',
        event: createMediaEvent('media.ambient.stop', {
          channel,
          fadeOut: 2000,
        }),
      }));
    }

    const effects: Effect[] = [];

    // Emit ambient play events for each channel in the atmosphere.
    for (const ambient of atmosphere.ambient) {
      effects.push({
        type: 'emit',
        event: createMediaEvent('media.ambient.play', {
          src: ambient.src,
          channel: ambient.channel,
          volume: ambient.volume,
          fadeIn: fades.ambientIn,
          loop: true,
        }),
      });
    }

    // Emit music event if the atmosphere has a music track.
    if (atmosphere.music) {
      effects.push({
        type: 'emit',
        event: createMediaEvent('media.music.play', {
          src: atmosphere.music.src,
          volume: atmosphere.music.volume,
          fadeIn: fades.musicIn,
          loop: true,
        }),
      });
    }

    // `atmosphere.effect` exists in the AudioRegistry data model but
    // has no `media.*` equivalent today (legacy `audio.effect` was
    // never handled by `AudioManager`). Preserve the silent-drop
    // behaviour rather than introduce a new media event type here;
    // see ADR-B candidate in the channel-io-event-retirement plan.

    return effects;
  });
}
