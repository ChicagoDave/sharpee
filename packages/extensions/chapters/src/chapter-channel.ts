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
 * Register the `story.chapter` channel — the `registerChannels` slot of the
 * trusted-extension contract (ADR-215's third contribution part; this is
 * that slot's first live use).
 *
 * @param registry - the channel registry the engine hands the story at start
 */
export function registerChaptersChannels(registry: IChannelRegistry): void {
  registry.add(chapterChannel);
}
