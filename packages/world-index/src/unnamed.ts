/**
 * unnamed.ts — things the mechanics require that the player has no way to hear about.
 *
 * Purpose: ADR-321 D13. A thing the player must open, wind, cut, wear or carry to
 * get on, which nothing ever tells them exists, is a puzzle with no way in. Its
 * sharpest form is the intersection with the progression chain (D14): a thing on
 * the chain that nothing announces is not a nag, it is a story that cannot be
 * finished by reading.
 *
 * **This is the one finding in the package that had to be gated on recall.** The
 * claim is a negative — *nothing names this* — so an extractor that misses a phrase
 * reports the author's work as a hole. D13 held it behind D10, D11 and D14 for that
 * reason, and AC-13 adds the guard that survives all three: the thing must be absent
 * from a DIRECT search of the prose, not merely unreached by the phrase extractor.
 * Anything less makes a recall gap look like an authoring gap, which is the false
 * finding class D4's polarity guard exists to prevent.
 *
 * **Two things announce a thing, and both had to be searched.** Measured across the
 * three corpus stories while implementing this, each reading on its own is useless in
 * a different direction:
 *
 * - The extractor's own edges alone report 16 things in Fernhill, every one of which
 *   the prose plainly names. That is the reading AC-13 forbids.
 * - A direct search of ALL prose reports zero in all three stories — because a thing's
 *   OWN description names it, and almost every thing has one. But a description the
 *   player can only read once they can already refer to the thing announces nothing.
 *   The search therefore skips the passages the entity itself owns.
 * - That leaves four in Fernhill, three of which sit loose in a room, where the
 *   standard `looking` action lists them whether the author wrote about them or not.
 *   Reporting those would be reporting the platform's own behaviour as a hole.
 *
 * What survives both guards is Fernhill's `doormat`: scenery, so the room listing
 * passes over it, and named by no passage but its own. Nothing in the story tells the
 * player it is there — which is exactly the finding D13 asked for.
 *
 * Public interface: UnnamedTool, deriveUnnamedTools.
 *
 * Owner context: @sharpee/world-index — the derivation package. No platform
 * contract; the wire shape it feeds is `document.ts`'s.
 *
 * @packageDocumentation
 * @see ADR-321 D13: a tool no prose ever names
 * @see ADR-321 AC-13: confirmed absent by direct search, not by the extractor's
 *   own reading
 */

import type { IREntity, StoryIR } from '@sharpee/chord';
import { holderIndex, roomOf, type ContainmentIndex } from './containment.js';
import { tokenizeProse } from './incomplete.js';
import { isPortableByDefault } from './loader-semantics.js';
import type { ProseSite } from './prose.js';
import type { MentionRole } from './roles.js';
import { isDoor, isRegion, isRoom } from './story.js';
import { entityVocabulary } from './vocabulary.js';

/** A thing the mechanics require, that nothing in the story announces. */
export interface UnnamedTool {
  /** Entity id. */
  id: string;
  /** The author's own name for it. */
  name: string;
  /**
   * Which side of the split it sits on.
   *
   * `progression-info` is the sharp case — the walk itself had to lift an obstacle
   * with this thing, so a player who never hears of it cannot finish.
   */
  role: 'tool' | 'progression-info';
  /** The room it sits in, when it sits in one. */
  room: string | null;
  /**
   * Every word a player could have typed for it, none of which any other passage
   * uses.
   *
   * Published because the claim is otherwise uncheckable: an author looking at
   * *doormat* wants to know that `doormat` and `mat` were both searched for across
   * every other passage in the story before the row appeared.
   */
  vocabulary: string[];
}

/**
 * Whether a role is one a thing can be unannounced IN.
 *
 * Atmosphere-info is the residual, and a residual nobody mentions is scenery the
 * author left as words. The whole point of D12's split is that this finding does not
 * fire on it.
 *
 * @param role the entity's role, or undefined when it has none
 * @returns true for the two roles that mean the mechanics need this thing
 */
function isMechanical(role: MentionRole | undefined): role is 'tool' | 'progression-info' {
  return role === 'tool' || role === 'progression-info';
}

/**
 * Whether an entity is a place or a person rather than a thing to use.
 *
 * Rooms and regions can land on the progression chain — the walk records what it had
 * to reach, and what it had to reach includes where it had to be — and the player is
 * nobody's tool. D13 excludes all three by name.
 *
 * @param entity the entity to test
 * @returns true when no reading of "unnamed tool" could apply
 */
function isNotAThingToUse(entity: IREntity): boolean {
  return isRoom(entity) || isRegion(entity) || entity.isPlayable === true;
}

/**
 * Whether the standard room listing announces this thing without being asked.
 *
 * `looking` lists what sits directly in the room and is not scenery — so a crowbar
 * lying in the cellar is announced on the first LOOK whether or not a word of prose
 * mentions it, and reporting it here would report the platform's own behaviour as an
 * authoring hole. Scenery is passed over by that listing, and anything held by a
 * container, a supporter or a person is not directly in the room at all: those are
 * the placements that need prose to do the announcing.
 *
 * Doors read as unannounced deliberately. A door is not room contents — it is reached
 * through the exit that names it — so a door no passage mentions is a real finding.
 *
 * @param entity the entity to test
 * @param index the containment index for this story
 * @returns true when the room's own contents listing names it
 */
function isAnnouncedByTheRoomListing(entity: IREntity, index: ContainmentIndex): boolean {
  const place = entity.placement?.place;
  if (place === undefined) return false;

  const holder = index.byId.get(place);
  if (holder === undefined || !isRoom(holder)) return false;

  return isPortableByDefault(entity, isDoor(entity));
}

/**
 * Every word spoken by a passage the entity does not own.
 *
 * A thing's own description, first-visit text and responses are excluded on purpose:
 * all three are read by a player who can ALREADY refer to the thing, so none of them
 * is how anybody learns it is there.
 *
 * @param prose every authored passage
 * @param entityId the entity whose own passages to skip
 * @returns the words the rest of the story says
 */
function wordsSpokenElsewhere(prose: readonly ProseSite[], entityId: string): Set<string> {
  const spoken = new Set<string>();
  for (const site of prose) {
    if (site.owner === entityId) continue;
    for (const word of tokenizeProse(site.text)) spoken.add(word);
  }
  return spoken;
}

/**
 * Every mechanically-required thing the story never announces.
 *
 * @param ir the story IR
 * @param roles the role table, exactly as published on the wire
 * @param prose every authored passage, exactly as the Incomplete view reads them
 * @returns the findings, in declaration order — empty is the answer a story that
 *   introduces everything it needs gives
 */
export function deriveUnnamedTools(
  ir: StoryIR,
  roles: ReadonlyMap<string, MentionRole>,
  prose: readonly ProseSite[],
): UnnamedTool[] {
  const index = holderIndex(ir);

  const found: UnnamedTool[] = [];
  for (const entity of ir.entities) {
    const role = roles.get(entity.id);
    if (!isMechanical(role) || isNotAThingToUse(entity)) continue;
    if (isAnnouncedByTheRoomListing(entity, index)) continue;

    const vocabulary = [...entityVocabulary(entity)];
    // A thing with no naming surface at all cannot be reported unannounced: there is
    // nothing to have searched for, so the row would assert an absence it never
    // looked for.
    if (vocabulary.length === 0) continue;

    const spoken = wordsSpokenElsewhere(prose, entity.id);
    if (vocabulary.some((word) => spoken.has(word))) continue;

    found.push({
      id: entity.id,
      name: entity.name ?? entity.id,
      role,
      room: roomOf(index, entity.id) ?? null,
      vocabulary,
    });
  }
  return found;
}
