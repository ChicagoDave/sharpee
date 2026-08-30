/**
 * @sharpee/ext-chapters
 *
 * The `use chapters` extension (ADR-330): declared story chapters. The plugin
 * begins them on their moments and the `story.chapter` channel tells the
 * client. The chapter rows themselves are lowered by `@sharpee/story-loader`
 * from `ir.chapters` at `onEngineReady` (the registry map cannot carry them —
 * the `scoring`/`hunger` shape); the registry entry carries the channel.
 */

export {
  CHAPTERS_PLUGIN_ID,
  CHAPTER_BEGAN_EVENT,
  CHAPTER_STALE_EVENT,
  CHAPTER_CURRENT_KEY,
  CHAPTER_FIRED_PREFIX,
  CHAPTER_ANNOUNCED_KEY,
  createChaptersPlugin,
} from './chapters-plugin.js';
export type { ChapterRow, ChapterRuntimeTrigger, ChapterBeganData } from './chapters-plugin.js';
export { CHAPTER_CHANNEL_ID, chapterChannel, registerChaptersChannels } from './chapter-channel.js';
