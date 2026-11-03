/**
 * start.ts — the `start-block` step: the world is built, the start block runs, the role settles.
 *
 * The last step of the build. The engine builds the world FIRST, so the
 * `before the game starts` block runs here — against a world where every
 * character already exists — and its `change the player to` assignment is
 * what `createPlayer` then returns. Nothing is read statically: the
 * assignment may carry a `when` tail and pick a different opening PC.
 * Once the block has run, the role is settled: the character blocks whose
 * refs name the role are applied, and each `use`d extension seeds the
 * state its rows need before the first turn.
 *
 * Public interface: startBlock (the `start-block` step), finalizeRoleHolder.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the world build as a named step list.
 * - ADR-327 D10 (design C, ruled 2026-08-26) — the start block runs
 *   against the built world; `createPlayer` is a lookup.
 * - ADR-390 D3 — the role is assigned through the world's one writer.
 * - ADR-344 D5 (amending ADR-289 D4) — no role-specific placement fallback.
 * - ADR-310, ADR-318 Phase 5 — character blocks apply after the role is settled.
 * - ADR-240 — derived state is live evaluators; nothing is pre-evaluated.
 */
import type { WorldModel } from '@sharpee/world-model';
import { EXTENSION_REGISTRY } from '../extension-registry.js';
import { applyCharacterBlocks } from './characters.js';
import type { BuildContext } from './context.js';

/**
 * The `start-block` step: mark the world built, run the start block,
 * settle the player role.
 * @param story the build context
 * @param world the built world
 */
export function startBlock(story: BuildContext, world: WorldModel): void {
  story.worldBuilt = true;

  // ADR-327 D10 (design C, ruled 2026-08-26): the engine now builds the
  // world FIRST, so the start block runs here — against a world where every
  // character already exists — and its `change the player to` assignment is
  // what `createPlayer` then returns. Nothing is read statically: the
  // assignment may carry a `when` tail and pick a different opening PC.
  story.runtime.runStartBlock(world);
  finalizeRoleHolder(story, world);
}

/**
 * Settle the player role once the world is built and the start block has run
 * (ADR-327 D10).
 *
 * Placement, state seeding, trait composition and character blocks are no
 * longer this method's business — the role-holder is an ordinary entity, so
 * passes 0-2 already did all of that. What remains is what only the ROLE
 * needs: the character blocks whose refs name the role, and the extension
 * state the story's rows seed before the first turn.
 *
 * Runs exactly once. A story whose start block assigned nothing has no
 * role holder and is reported by `createPlayer`, not here — the world is
 * still perfectly well-formed; it just has no protagonist.
 * @param story the build context (its `playerFinalized` is the once-guard)
 * @param world the built world
 */
export function finalizeRoleHolder(story: BuildContext, world: WorldModel): void {
  if (story.playerFinalized) return;
  story.playerFinalized = true;
  // ADR-390 D3: the start block assigned the role through the world's one
  // writer; a block that assigned nothing is reported by `createPlayer`.
  if (!world.hasPlayerCharacter) return;

  // The role-holder is placed by pass 2, from the placement line the author
  // wrote, exactly like every other entity. There is no role-specific
  // fallback: a protagonist with no placement line is refused at the install
  // seam rather than quietly started in whichever room happened to be
  // declared first (ADR-344 D5, amending ADR-289 D4).
  //
  // Carried and worn items were placed in pass 2 with every other
  // entity's — the role-holder's inventory is not a role fact.

  // ADR-310/318 Phase 5: apply compiled character blocks. Runs here, after
  // the role is settled, because a block's refs (`feels … toward the
  // player`) resolve through the `player` sentinel, which `worldIdOf` reads
  // from the world now that the role is assigned (ADR-390 D3).
  applyCharacterBlocks(story, world);

  // Extension state the story's rows seed before the first turn (the
  // opening chapter is current while turn 1 renders). Each `use`d
  // extension seeds its own keys from the IR, in the registry's order;
  // a restored world already carries them and is never re-seeded (this
  // method runs once per boot, before any restore).
  for (const [name, registration] of EXTENSION_REGISTRY) {
    if ((story.ir.uses ?? []).includes(name)) registration.seedWorldFromIR?.(story.ir, world);
  }

  // ADR-240: no initial derived-property evaluation — derived state is
  // registered evaluators, consulted live at every read.
}
