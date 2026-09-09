/**
 * The player step: the story names its player in the built world, and
 * the world is told which entity that is.
 *
 * `world.setPlayer` is a world mutation and stays here; the entity
 * itself goes into the draft for the engine's context to adopt.
 *
 * Public interface: `createPlayerStep`.
 * Owner context: `@sharpee/engine` — story installation.
 *
 * References: ADR-327 D10 (`createPlayer` is a lookup of a character the
 * world build made).
 */

import type { InstallStep } from './context.js';

export const createPlayerStep: InstallStep = {
  name: 'create-player',
  requires: ['initialize-world'],
  run(context) {
    const player = context.story.createPlayer(context.world);
    context.draft.player = player;
    context.world.setPlayer(player.id);
  }
};
