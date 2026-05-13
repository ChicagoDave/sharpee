/**
 * EngineCommandRouter — real engine integration replacing the Phase-3
 * echo router.
 *
 * Public interface: {@link createEngineCommandRouter},
 * {@link encodeSaveData}, {@link decodeSaveData}.
 * Owner: zifmia server, engine domain.
 *
 * Per ADR-177 §1: each turn loads the room's blob into a fresh world,
 * runs `engine.executeTurn(command)`, captures the channel packet,
 * persists the new blob, and returns the `TurnPacket` for WS
 * broadcast. The story object is cached by slug; the engine /
 * WorldModel are fresh per turn.
 *
 * Save data is encoded as gzip(JSON.stringify(ISaveData)) — same
 * compression idea as `@sharpee/engine`'s SaveRestoreService, but
 * stored opaquely in `room_state.blob` (we don't need cross-version
 * envelope handling per the greenfield no-backcompat policy).
 */

import { gzipSync, gunzipSync, strToU8, strFromU8 } from 'fflate';
import type { ISaveData } from '@sharpee/core';
import type { Story } from '@sharpee/engine';
import type { CommandRouter, CommandSubmission, CommandResult } from '../turns/command-router.js';
import type { StoryScanner } from '../stories/scanner.js';
import type { RoomsRepository } from '../rooms/repository.js';
import type { RoomStateRepository } from './room-state-repo.js';
import { executeTurnAgainstStory } from './turn-executor.js';
import { loadStoryFromFile } from './bundle-loader.js';

export function encodeSaveData(saveData: ISaveData): Uint8Array {
  const json = JSON.stringify(saveData);
  return gzipSync(strToU8(json));
}

export function decodeSaveData(blob: Uint8Array): ISaveData {
  const json = strFromU8(gunzipSync(blob));
  return JSON.parse(json) as ISaveData;
}

export interface CreateEngineCommandRouterOptions {
  rooms: RoomsRepository;
  scanner: StoryScanner;
  roomState: RoomStateRepository;
}

export type EngineCommandRouter = CommandRouter & {
  execute(input: CommandSubmission): Promise<CommandResult>;
};

class EngineRouterError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'EngineRouterError';
  }
}

export function createEngineCommandRouter(
  options: CreateEngineCommandRouterOptions
): EngineCommandRouter {
  const storyCache = new Map<string, Promise<Story>>();

  function loadStory(slug: string): Promise<Story> {
    const cached = storyCache.get(slug);
    if (cached) return cached;
    const entry = options.scanner.get(slug);
    if (!entry) {
      throw new EngineRouterError('unknown_story', `engine-router: unknown story slug ${slug}`);
    }
    const promise = loadStoryFromFile({ storyId: slug, filePath: entry.path });
    storyCache.set(slug, promise);
    return promise;
  }

  return {
    async execute(input) {
      const room = options.rooms.getRoom(input.roomId);
      if (!room || room.deleted_at !== null) {
        throw new EngineRouterError('room_not_found', `engine-router: room ${input.roomId} not found`);
      }
      const story = await loadStory(room.story_slug);

      const priorBlob = options.roomState.get(input.roomId);
      const priorSaveData: ISaveData | null = priorBlob ? decodeSaveData(priorBlob) : null;

      const result = await executeTurnAgainstStory({
        story,
        priorSaveData,
        command: input.text
      });

      // Persist the new blob.
      const newBlob = encodeSaveData(result.newSaveData);
      options.roomState.put(input.roomId, newBlob);

      return { turnId: result.turnId, packet: result.turnPacket };
    }
  };
}
