/**
 * The world-build step: the story builds its world.
 *
 * The world is built first and the player found second. Under ADR-327
 * D10 the protagonist is a named character the story picks out — an
 * ordinary world entity — so it cannot exist before the world does;
 * `create-player` follows this step as a lookup, not a build.
 *
 * Public interface: `initializeWorldStep`.
 * Owner context: `@sharpee/engine` — story installation.
 *
 * References: ADR-327 D10 (world first, player second; design C, ruled
 * 2026-08-26).
 */

import type { InstallStep } from './context.js';

export const initializeWorldStep: InstallStep = {
  name: 'initialize-world',
  requires: ['emit-story-loading', 'concealed-visibility'],
  run(context) {
    context.story.initializeWorld(context.world);
  }
};
