/**
 * @sharpee/story-channel-service-test
 *
 * AC-15 fixture story for ADR-163 channel-I/O parity tests
 * (`packages/channel-service/tests/ac-15-story-renderer-parity.test.ts`).
 *
 * Public interface:
 *  - `story` — the playable `Story` instance the CLI bundle loads.
 *  - `config` — story metadata.
 *  - `debugStatsChannel`, `DEBUG_STATS_CHANNEL_ID`, `registerStoryChannels`,
 *    `DebugStatsPayload` — the `debug-stats` channel definition.
 *  - `formatDebugStats`, `createDebugStatsRenderer`,
 *    `createDebugStatsDomRenderer` — the story-supplied
 *    `ChannelRenderer` and its pure projection.
 *
 * The package previously held rule-based test scenarios for the
 * deleted Phase 1/2 ADR-163 tests; that fixture is gone (R1-C). This
 * incarnation is a real playable story — see `./playable-story.ts`.
 */

export { story, config, ChannelServiceTestStory } from './playable-story';
export {
  debugStatsChannel,
  registerStoryChannels,
  DEBUG_STATS_CHANNEL_ID,
} from './channels';
export type { DebugStatsPayload } from './channels';
export {
  formatDebugStats,
  createDebugStatsRenderer,
  createDebugStatsDomRenderer,
} from './renderer';
