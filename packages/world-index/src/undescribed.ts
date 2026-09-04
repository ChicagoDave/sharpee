/**
 * undescribed.ts — things the story declares and never describes.
 *
 * Purpose: the fourth Incomplete class (ADR-321 Amendment 3). A thing with no
 * description answers *"You see nothing special about the bankside sign"* — which
 * is a fine answer for a thing that exists to be mentioned, and a hole for
 * everything else. It ships as a candidate like its three siblings, never as an
 * error: whether a plain object is deliberate is the author's call, and Chord
 * compiles and plays perfectly well without a word of it.
 *
 * **It exists because the surface can now create things** (Amendment 3). Accepting
 * *Define as scenery* writes a declaration and stops at the description, so the tab
 * that made the hole is the tab that should remember it — and deriving the class
 * from the IR rather than from the session means it also catches the objects an
 * author declared by hand last month.
 *
 * **Two kinds are excluded and neither is a judgement call.** A region is a
 * grouping the player never examines, and the player's own description is the
 * story's business rather than an omission. Everything a player can look at is in.
 *
 * Public interface: deriveUndescribed.
 *
 * Owner context: @sharpee/world-index — the derivation package.
 *
 * @packageDocumentation
 * @see ADR-321 Amendment 3
 */

import type { StoryIR } from '@sharpee/chord';
import { isRegion } from './story.js';

/**
 * Every entity a player could examine that says nothing back.
 *
 * Ids only: the document already publishes each entity's name, declaration span and
 * room in `declarations`, and its role in `roles`. A second copy of those facts on
 * the wire is a second thing to keep true.
 *
 * @param ir the story IR
 * @returns the ids, in declaration order
 */
export function deriveUndescribed(ir: StoryIR): string[] {
  return ir.entities
    .filter((entity) => {
      if (entity.descriptionKey !== null && entity.descriptionKey !== undefined) return false;
      if (entity.initialDescriptionKey !== null && entity.initialDescriptionKey !== undefined) return false;
      if (entity.isPlayable) return false;
      return !isRegion(entity);
    })
    .map((entity) => entity.id);
}
