/**
 * chapter-channel.ts — the `story.chapter` channel (ADR-330 D4).
 *
 * A JSON, replace-mode, sparse channel: on the turn a chapter begins it
 * carries the `story.chapter_began` event's data — name, title, description,
 * ordinal — and is silent otherwise. The wire is data (ADR-163/165): what a
 * title card looks like is the client's business.
 *
 * Public interface: CHAPTER_CHANNEL_ID, chapterChannel, registerChaptersChannels.
 * Owner context: @sharpee/ext-chapters (trusted extension runtime).
 */
import type { IChannelRegistry, IOChannel } from '@sharpee/if-domain';
import { CHAPTER_BEGAN_EVENT, type ChapterBeganData } from './chapters-plugin.js';

/** The channel id, in the dotted convention `info.title` / `info.description` follow. */
export const CHAPTER_CHANNEL_ID = 'story.chapter';

/** The `story.chapter` channel definition. */
export const chapterChannel: IOChannel<ChapterBeganData> = {
  id: CHAPTER_CHANNEL_ID,
  contentType: 'json',
  mode: 'replace',
  emit: 'sparse',
  produce: (ctx) => {
    for (let i = ctx.events.length - 1; i >= 0; i--) {
      const event = ctx.events[i];
      if (event.type !== CHAPTER_BEGAN_EVENT) continue;
      const d = (event.data ?? {}) as Partial<ChapterBeganData>;
      return {
        name: String(d.name ?? ''),
        title: String(d.title ?? ''),
        description: String(d.description ?? ''),
        ordinal: Number(d.ordinal ?? 0),
      };
    }
    return undefined;
  },
};

/**
 * The first prose channel's id (`PROSE_CHANNEL_IDS.ROOM_NAME` in
 * `@sharpee/stdlib`, which this package does not depend on). The chapter
 * card registers before it so a client that dispatches a turn in manifest
 * order shows the title after the banner and before the turn's prose.
 */
const FIRST_PROSE_CHANNEL_ID = 'room-name';

/**
 * Register the `story.chapter` channel — the `registerChannels` slot of the
 * trusted-extension contract (ADR-215's third contribution part; this is
 * that slot's first live use). The channel lands before the prose channels
 * (ADR-330 D4 as amended 2026-09-05: the chapter title is announced before
 * the room, for every trigger kind).
 *
 * @param registry - the channel registry the engine hands the story at start
 */
export function registerChaptersChannels(registry: IChannelRegistry): void {
  registry.add(chapterChannel, { before: FIRST_PROSE_CHANNEL_ID });
}
