/**
 * The assign-player-role step: once the story has named its player and the
 * install seam has validated the holder (ADR-344), the world's one writer
 * gives that actor the role (ADR-390 D1). For a Chord story the start block
 * already assigned it, so this is a no-op on the same holder; for a
 * TypeScript story whose `createPlayer` built the actor, this is the first
 * assignment — the start-game moment `setPlayer` is reserved for.
 *
 * Public interface: `assignPlayerRoleStep`.
 * Owner context: `@sharpee/engine` — story installation.
 *
 * References: ADR-390 D1, D3; ADR-344 D6.
 */
import type { InstallStep } from './context.js';

export const assignPlayerRoleStep: InstallStep = {
  name: 'assign-player-role',
  requires: ['validate-role-holder', 'language-words'],
  run(context) {
    context.world.setPlayer(context.draft.player!.id);
  }
};
