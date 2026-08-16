/**
 * The compiled-story oracle (ADR-310/318 Phase 5)
 *
 * The character runtime's ONE injected seam for asking the loaded story a
 * question trait state cannot answer: evaluating a compiled Chord
 * condition (goal `active when`, `wait for`), and — a reserved slot for
 * the Phase 6 arbitration seam — kind membership for classifier scopes
 * (`a merchant`), which only the story's IR knows.
 *
 * The story-loader binds an implementation at load and the registry
 * carries it (authored wiring, never serialized — ADR-310 D17).
 * Builder-authored stories carry no compiled conditions and need no
 * oracle. The signature is platform-internal (contracts.md §7).
 *
 * Public interface: CompiledStoryOracle.
 * Owner context: @sharpee/character
 */

import type { IRCondition } from '@sharpee/chord';
import type { WorldModel } from '@sharpee/world-model';

/** The loaded story's answer surface for the character runtime. */
export interface CompiledStoryOracle {
  /**
   * Evaluate a compiled Chord condition for an NPC.
   *
   * @param cond - The compiled condition (refs in IR terms — the oracle
   *   owns the translation, mirroring the loader's evaluator)
   * @param opts - self: the asking NPC's WORLD entity id (bound to `it`);
   *   world: the live world model
   * @returns Whether the condition holds this turn
   */
  evalCondition(cond: IRCondition, opts: { self: string; world: WorldModel }): boolean;

  /**
   * Reserved for the Phase 6 arbitration seam: does the entity belong to
   * the story kind named by a classifier scope (`a <kind>`)?
   *
   * @param entityId - WORLD entity id
   * @param kind - The classifier's kind noun as written in Chord
   * @returns Whether the entity is one of the story's `<kind>`s
   */
  isKindMember(entityId: string, kind: string): boolean;
}
