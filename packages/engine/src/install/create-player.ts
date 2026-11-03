/**
 * The player step: the story names its player in the built world, and
 * the world is told which entity that is.
 *
 * the role write moved to `assign-player-role` (ADR-390); the entity
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
    // ADR-390 D1: the role itself is written by `assign-player-role`, after
    // `validate-role-holder` has had its say — the validator's typed refusal
    // comes before the world's.
  }
};
