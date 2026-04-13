/**
 * Audio setup for Dungeo — registers ambient atmospheres and provides
 * an event handler that triggers atmosphere changes on room entry.
 *
 * Public interface: initializeAudio() called from DungeoStory.initializeWorld(),
 * registerAudioHandler() called from onEngineReady().
 *
 * Owner context: stories/dungeo (ADR-138)
 */

import { AudioRegistry } from '@sharpee/media';
import type { EventProcessor } from '@sharpee/event-processor';
import type { ISemanticEvent } from '@sharpee/core';
import { createTypedEvent } from '@sharpee/core';
import type { Effect } from '@sharpee/event-processor';

/** The shared audio registry for the Dungeo story */
export const audioRegistry = new AudioRegistry();

/**
 * Register ambient atmospheres for Dungeo rooms.
 * Called during initializeWorld() after all regions are created.
 *
 * @param config.undergroundRoomIds - Room IDs for the underground region
 * @param config.additionalUndergroundIds - Room IDs from other underground regions
 * @param config.forestRoomIds - Room IDs for the forest region
 * @param config.frigidRiverRoomIds - Room IDs for the frigid river region
 */
export function initializeAudio(config: {
  undergroundRoomIds: Record<string, string>;
  additionalUndergroundIds?: string[];
  forestRoomIds: Record<string, string>;
  frigidRiverRoomIds: Record<string, string>;
  riverSoundRoomIds?: string[];
}): void {
  // Dungeon ambience for all underground rooms
  for (const roomId of Object.values(config.undergroundRoomIds)) {
    audioRegistry
      .atmosphere(roomId)
      .ambient('audio/dungeon_ambient_1.ogg', 'environment', 0.3)
      .build();
  }

  for (const roomId of config.additionalUndergroundIds ?? []) {
    audioRegistry
      .atmosphere(roomId)
      .ambient('audio/dungeon_ambient_1.ogg', 'environment', 0.3)
      .build();
  }

  // Forest daytime ambience for all forest rooms
  for (const roomId of Object.values(config.forestRoomIds)) {
    audioRegistry
      .atmosphere(roomId)
      .ambient('audio/forest_daytime.ogg', 'environment', 0.4)
      .build();
  }

  // River flow ambience for all frigid river rooms
  for (const roomId of Object.values(config.frigidRiverRoomIds)) {
    audioRegistry
      .atmosphere(roomId)
      .ambient('audio/river_flow.ogg', 'environment', 0.5)
      .build();
  }

  // Additional rooms near water (dam base, etc.)
  for (const roomId of config.riverSoundRoomIds ?? []) {
    audioRegistry
      .atmosphere(roomId)
      .ambient('audio/river_flow.ogg', 'environment', 0.5)
      .build();
  }
}

/**
 * Register the event handler that emits audio events on room entry.
 * Listens for 'if.event.actor_moved' and returns EmitEffects for
 * the atmosphere of the destination room.
 *
 * @param eventProcessor - The event processor for handler registration
 */
export function registerAudioHandler(eventProcessor: EventProcessor): void {
  eventProcessor.registerHandler('if.event.actor_moved', (event: ISemanticEvent): Effect[] => {
    const data = event.data as { actor?: { id: string }; toRoom?: string } | undefined;
    if (!data?.toRoom) return [];

    const atmosphere = audioRegistry.getAtmosphere(data.toRoom);
    if (!atmosphere) {
      // No atmosphere for this room — stop ambient audio
      return [{
        type: 'emit',
        event: createTypedEvent('audio.ambient.stop_all', { fadeOut: 2000 }),
      }];
    }

    const effects: Effect[] = [];

    // Emit ambient play events for each channel in the atmosphere
    for (const ambient of atmosphere.ambient) {
      effects.push({
        type: 'emit',
        event: createTypedEvent('audio.ambient.play', {
          src: ambient.src,
          channel: ambient.channel,
          volume: ambient.volume,
          fadeIn: audioRegistry.getFadeDefaults().ambientIn,
          loop: true,
        }),
      });
    }

    // Emit music event if the atmosphere has a music track
    if (atmosphere.music) {
      effects.push({
        type: 'emit',
        event: createTypedEvent('audio.music.play', {
          src: atmosphere.music.src,
          volume: atmosphere.music.volume,
          fadeIn: audioRegistry.getFadeDefaults().musicIn,
          loop: true,
        }),
      });
    }

    // Emit effect event if the atmosphere has an audio effect
    if (atmosphere.effect) {
      effects.push({
        type: 'emit',
        event: createTypedEvent('audio.effect', {
          target: atmosphere.effect.target,
          effect: atmosphere.effect.effect,
          params: atmosphere.effect.params,
          transition: audioRegistry.getFadeDefaults().effectTransition,
        }),
      });
    }

    return effects;
  });
}
