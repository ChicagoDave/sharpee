/**
 * Family Zoo — Presentation (NEW IN V18: Sights & Sounds)
 *
 * The presentation layer: a custom ambience text channel, room
 * soundscapes (ambient loops + a background image per area), after-hours
 * music, and sound effects. Everything here rides the channel surface —
 * the story emits canonical `media.*` events and stdlib's pre-registered
 * channels project them; browser renderers paint sound, music, and
 * images. Nothing here is special-cased by the engine.
 *
 * Public interface:
 *   - `zooAmbienceChannel` / `ZOO_AMBIENCE_CHANNEL_ID` — a story-defined
 *     `replace` text channel carrying a per-area mood line.
 *   - `registerZooPresentationChannels(registry)` — called from
 *     `Story.registerChannels`. Adds the ambience channel and the
 *     ambient soundscape channel.
 *   - `initializeZooAudio()` — called from `initializeWorld`. Registers
 *     room atmospheres on the shared `AudioRegistry`.
 *   - `registerZooAudioHandler(eventProcessor)` — called from
 *     `onEngineReady`. Emits `media.*` events on room entry.
 *   - `crunchSfx()` / `shutterSfx()` — `media.sound.play` event helpers
 *     for the feed and photograph actions.
 *   - `afterHoursMusic()` — `media.music.play` helper for the closing act.
 *
 * Owner: familyzoo tutorial, v18
 */

import { WorldModel } from '@sharpee/world-model';
import { AudioRegistry } from '@sharpee/media';
import { createAmbientChannel } from '@sharpee/stdlib';
import type { EventProcessor, Effect } from '@sharpee/event-processor';
import type { ISemanticEvent } from '@sharpee/core';
import type {
  IOChannel,
  IChannelRegistry,
  ChannelProduceContext,
} from '@sharpee/if-domain';


// ============================================================================
// MEDIA EVENT HELPER
// ============================================================================
//
// The canonical media vocabulary (`media.sound.play`, `media.music.play`,
// `media.ambient.play`, `media.image.show`) lives in stdlib's channel
// definitions, not in @sharpee/core's EventDataRegistry, so we build the
// events directly rather than through createTypedEvent.

let mediaEventCounter = 0;
function mediaEvent(type: string, data: Record<string, unknown>): ISemanticEvent {
  return {
    id: `zoo-media-${Date.now()}-${++mediaEventCounter}`,
    type,
    timestamp: Date.now(),
    data,
    entities: {},
  };
}


// ============================================================================
// AMBIENCE CHANNEL — a custom story-defined text channel
// ============================================================================
//
// A `replace`-mode text channel that carries a one-line mood description
// for the player's current area. The browser entry registers a renderer
// that paints it (e.g. into a sidebar); the CLI ignores it. This is the
// canonical "story invents its own UI signal" pattern.

export const ZOO_AMBIENCE_CHANNEL_ID = 'zoo.ambience' as const;

/** Mood line per room name. Returned by the channel's `produce` closure. */
const AMBIENCE_BY_ROOM: Record<string, string> = {
  'Zoo Entrance': 'Children laugh somewhere beyond the gates.',
  'Main Path': 'Gravel crunches underfoot; a distant peacock cries.',
  'Petting Zoo': 'Goats bleat hopefully and hay rustles in the breeze.',
  'Aviary': 'The dome rings with the whistle and chatter of tropical birds.',
  'Supply Room': 'A fluorescent tube hums overhead.',
  'Nocturnal Animals Exhibit': 'It is hushed and cool; unseen creatures stir in the dark.',
  'Gift Shop': 'A tinny pop song loops over the shop speakers.',
};

export const zooAmbienceChannel: IOChannel<string> = {
  id: ZOO_AMBIENCE_CHANNEL_ID,
  contentType: 'text',
  mode: 'replace',
  emit: 'sparse', // only re-emit when the line changes
  produce: (ctx: ChannelProduceContext): string | undefined => {
    const world = ctx.world as WorldModel;
    const player = world.getPlayer();
    if (!player) return undefined;

    // After hours, the whole zoo shares one quiet mood.
    if (world.getStateValue('zoo.after_hours') === true) {
      return 'The zoo is closed. In the stillness, the animals seem to watch you back.';
    }

    const roomId = world.getLocation(player.id);
    if (!roomId) return undefined;
    const room = world.getEntity(roomId);
    if (!room) return undefined;
    // A room with no mood line emits '' to CLEAR the channel — not `undefined`.
    // On a `sparse` `replace` channel, `undefined` means "no change", so the
    // previous room's mood would linger; emitting '' is a value transition that
    // the renderer paints as blank, then stays silent until the mood changes.
    return AMBIENCE_BY_ROOM[room.name] ?? '';
  },
};


// ============================================================================
// SOUNDSCAPE — ambient loops, background images, music
// ============================================================================
//
// One shared ambient channel id ('environment') whose source swaps as the
// player moves from area to area. Background images use the
// standard `image:background` channel (no registration needed — emitting
// `media.image.show { layer: 'background' }` is enough).

const ZOO_AMBIENT_CHANNEL_ID = 'environment';

/** The shared audio registry — the atmosphere *data store* for the zoo. */
export const zooAudioRegistry = new AudioRegistry();

/**
 * Per-room background image, keyed by room *id* (populated in
 * `initializeZooAudio`). Keyed by id, not name, because the room-entry
 * handler sees only the destination id, never the world. Placeholder
 * asset paths under assets/images/ — supply your own art; the wiring is
 * the lesson.
 */
const backgroundByRoomId: Record<string, string> = {};

/**
 * Register room atmospheres and background images. Called from
 * `initializeWorld` once the rooms exist (everything here is keyed by
 * room id). Placeholder asset paths under assets/.
 */
export function initializeZooAudio(rooms: {
  entrance: string;
  pettingZoo: string;
  aviary: string;
  nocturnalExhibit: string;
  giftShop: string;
}): void {
  zooAudioRegistry.atmosphere(rooms.pettingZoo)
    .ambient('audio/farmyard.mp3', ZOO_AMBIENT_CHANNEL_ID, 0.3)
    .build();
  zooAudioRegistry.atmosphere(rooms.aviary)
    .ambient('audio/aviary-birdsong.mp3', ZOO_AMBIENT_CHANNEL_ID, 0.4)
    .build();
  zooAudioRegistry.atmosphere(rooms.nocturnalExhibit)
    .ambient('audio/night-crickets.mp3', ZOO_AMBIENT_CHANNEL_ID, 0.3)
    .build();

  backgroundByRoomId[rooms.entrance] = 'images/bg-entrance.jpg';
  backgroundByRoomId[rooms.pettingZoo] = 'images/bg-petting-zoo.jpg';
  backgroundByRoomId[rooms.aviary] = 'images/bg-aviary.jpg';
  backgroundByRoomId[rooms.nocturnalExhibit] = 'images/bg-nocturnal.jpg';
  backgroundByRoomId[rooms.giftShop] = 'images/bg-gift-shop.jpg';
}

/**
 * Register the story's presentation channels on the shared registry.
 * Called from `Story.registerChannels` during engine bootstrap.
 */
export function registerZooPresentationChannels(registry: IChannelRegistry): void {
  registry.add(zooAmbienceChannel);
  registry.add(createAmbientChannel(ZOO_AMBIENT_CHANNEL_ID));
}

/**
 * Register the room-entry handler that drives the soundscape and the
 * background image. On `if.event.actor_moved` it emits:
 *   - `media.ambient.play` / `media.ambient.stop` for the area's loop
 *   - `media.image.show` for the area's background (or hides it)
 * All gated by the client's capabilities — a text client receives none.
 */
export function registerZooAudioHandler(eventProcessor: EventProcessor): void {
  eventProcessor.registerHandler(
    'if.event.actor_moved',
    (event: ISemanticEvent): Effect[] => {
      const data = event.data as { toRoom?: string; destination?: string } | undefined;
      const toRoom = data?.toRoom ?? data?.destination;
      if (!toRoom) return [];

      const effects: Effect[] = [];
      const atmosphere = zooAudioRegistry.getAtmosphere(toRoom);
      const fades = zooAudioRegistry.getFadeDefaults();

      // --- Ambient loop: play this area's, or stop if it has none ---
      if (atmosphere) {
        for (const ambient of atmosphere.ambient) {
          effects.push({
            type: 'emit',
            event: mediaEvent('media.ambient.play', {
              src: ambient.src,
              channel: ambient.channel,
              volume: ambient.volume,
              fadeIn: fades.ambientIn,
              loop: true,
            }),
          });
        }
      } else {
        effects.push({
          type: 'emit',
          event: mediaEvent('media.ambient.stop', {
            channel: ZOO_AMBIENT_CHANNEL_ID,
            fadeOut: 2000,
          }),
        });
      }

      // --- Background image: show this area's, or hide it ---
      const bg = backgroundByRoomId[toRoom];
      if (bg) {
        effects.push({
          type: 'emit',
          event: mediaEvent('media.image.show', { layer: 'background', src: bg }),
        });
      } else {
        effects.push({
          type: 'emit',
          event: mediaEvent('media.image.hide', { layer: 'background' }),
        });
      }

      return effects;
    },
  );
}


// ============================================================================
// SOUND EFFECTS & MUSIC — event helpers for actions and the closing act
// ============================================================================

/** Feed-dispenser crunch — emitted from the feed action's report phase. */
export function crunchSfx(): ISemanticEvent {
  return mediaEvent('media.sound.play', { src: 'audio/feed-crunch.mp3', volume: 0.7 });
}

/** Camera shutter — emitted from the photograph action's report phase. */
export function shutterSfx(): ISemanticEvent {
  return mediaEvent('media.sound.play', { src: 'audio/camera-shutter.mp3', volume: 0.8 });
}

/** After-hours theme — emitted once when the zoo closes. */
export function afterHoursMusic(): ISemanticEvent {
  return mediaEvent('media.music.play', {
    src: 'audio/after-hours-theme.mp3',
    volume: 0.4,
    fadeIn: 3000,
    loop: true,
  });
}
