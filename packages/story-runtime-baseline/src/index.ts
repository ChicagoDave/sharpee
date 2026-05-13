/**
 * @sharpee/story-runtime-baseline — Story Runtime Baseline manifest (ADR-178).
 *
 * Single source of truth for the set of packages a `.sharpee` story bundle
 * may import. Zifmia depends on this package so every baseline entry is
 * installed transitively. The story build pipeline imports
 * `STORY_RUNTIME_BASELINE` to validate that bundles only reference packages
 * in the list.
 *
 * Bumping the baseline is an amendment to ADR-178. Increment
 * `BASELINE_VERSION` and update both the constant below and the
 * `dependencies` block in this package's `package.json` in the same commit.
 *
 * Public interface: STORY_RUNTIME_BASELINE, BASELINE_VERSION
 * Owner context: @sharpee/story-runtime-baseline
 */

export const STORY_RUNTIME_BASELINE: ReadonlyArray<string> = Object.freeze([
  '@sharpee/core',
  '@sharpee/engine',
  '@sharpee/event-processor',
  '@sharpee/if-domain',
  '@sharpee/if-services',
  '@sharpee/lang-en-us',
  '@sharpee/media',
  '@sharpee/parser-en-us',
  '@sharpee/platform-browser',
  '@sharpee/plugin-npc',
  '@sharpee/plugin-scheduler',
  '@sharpee/plugin-state-machine',
  '@sharpee/queries',
  '@sharpee/stdlib',
  '@sharpee/text-blocks',
  '@sharpee/world-model',
  'lz-string',
]);

export const BASELINE_VERSION = 1;
