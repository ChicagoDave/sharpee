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
