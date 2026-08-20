/**
 * roles.ts — what a mention is worth: tool, progression-info, or atmosphere.
 *
 * Purpose: the Incomplete view resolves prose to things (ADR-321 D6) and, until
 * now, threw the resolution away. Amendment 1 keeps it as a `MentionEdge` and
 * asks the question the author actually has: is this a thing I use, a thing that
 * tells me how to get on, or a thing that is simply there? (D12.)
 *
 * The three roles are derived, never authored. **progression-info** comes from
 * the Reach fixed point's own record of what gated what (D14) — never from a
 * static scan, which puts `stopcock` in atmosphere because the boiler gate lifts
 * through a machine rather than a `change` a scan can follow. **tool** comes from
 * affordances the entity really carries. **atmosphere-info** is the residual, and
 * being a residual is a limit rather than a defect: nothing in the IR says "this
 * is atmosphere".
 *
 * **Both sides read one derivation rather than running one rule twice.** The
 * analyzer roles the edges it resolved; Chord Writer roles the edges it chunks
 * for itself under D11, which include entities the analyzer's article-gated
 * extractor never reached — The Alderman's six `accusable` suspects are all
 * proper-named, so not one of them appears in an analyzer edge today. A rule
 * re-implemented in Swift would drift; `roleTable` is published whole instead, so
 * the IDE applies it and never derives it — the same posture D11 takes with the
 * vocabulary surface.
 *
 * Public interface: MentionRole, ResolvedMention, MentionEdge, roleTable,
 * deriveRoles.
 *
 * Owner context: @sharpee/world-index — the derivation package. No platform
 * contract; the wire shape it feeds is `document.ts`'s.
 *
 * @packageDocumentation
 * @see ADR-321 D12: the three roles and why the split is three-way
 * @see ADR-321 D11a: MentionRole, MentionEdge, and deriveRoles' signature
 */

import type { IREntity, IROnClause, StoryIR } from '@sharpee/chord';
import { isPortableByDefault } from './loader-semantics.js';
import type { ProseSite } from './prose.js';
import type { ReachResult } from './reach.js';
import { isDoor, isRegion, isRoom } from './story.js';

/** Where a mention sits on the story's spine (D12). */
export type MentionRole = 'tool' | 'progression-info' | 'atmosphere-info';

/**
 * A phrase that resolved to exactly one thing, before it is roled.
 *
 * This is the edge `classify` computes and used to discard: a phrase resolving
 * cleanly is not a finding, but it IS the prose-points-at-thing fact the whole
 * decision rests on. Nothing new is derived to get these; what exists is kept.
 */
export interface ResolvedMention {
  /** The phrase as written, lowercased. */
  phrase: string;
  /** The one thing it names. */
  entity: string;
  /** Where the phrase sits, and what fired it (D10). */
  site: ProseSite;
}

/** A resolved mention with its role — the edge the World tab ranks by. */
export interface MentionEdge extends ResolvedMention {
  /** What this mention is worth to a player reading it. */
  role: MentionRole;
}

/**
 * Compositions that make a thing something the player acts on.
 *
 * Both `kinds` and `traits` are searched, because the two arrays carry the same
 * shape and the distinction between them is authorial rather than semantic:
 * `container` and `supporter` arrive as kinds, `openable` and `readable` as
 * traits, and a reading that consults only one of the two arrays misses half the
 * affordances in the corpus.
 *
 * `light-source` is deliberately absent. A carryable lamp is already a tool by
 * portability, and a fixed glowing thing — a brazier, a lit window — is scenery
 * the player never acts on. Including it would have promoted the second case on
 * the strength of the first.
 */
const AFFORDANCE_COMPOSITIONS: ReadonlySet<string> = new Set([
  'openable',
  'lockable',
  'switchable',
  'readable',
  'wearable',
  'edible',
  'cuttable',
  'pushable',
  'pullable',
  'climbable',
  'container',
  'supporter',
]);

/**
 * Whether an on-clause is one a player fires.
 *
 * Keyed on `binding`, not on the action word: `every-turn` is a daemon the world
 * fires on its own, and it is the only non-player binding the language has. A
 * reading that filtered by action name would have to enumerate them.
 *
 * @param clause the clause to test
 * @returns true when a player command is what fires it
 */
function isPlayerFired(clause: IROnClause): boolean {
  return clause.binding !== 'every-turn';
}

/**
 * Every composition name an entity carries, kinds and traits together.
 *
 * @param entity the entity to read
 * @returns the names, in declaration order, kinds first
 */
function compositionsOf(entity: IREntity): string[] {
  return [...(entity.kinds ?? []), ...(entity.traits ?? [])].map((composed) => composed.name);
}

/**
 * The story-declared traits whose own declaration answers a player action.
 *
 * The affordance does not have to sit on the entity. `case-clock` declares no
 * clause at all — the only thing you can do to it is wind it, and `on winding`
 * lives on the `windable` trait it composes. Reading entities alone files it
 * under atmosphere, which is the same class of miss D14 fixed for the
 * progression chain: the mechanism is one indirection away from where the
 * obvious reading looks.
 *
 * @param ir the story IR
 * @returns the names of traits that carry a player-fired clause
 */
function affordanceTraits(ir: StoryIR): ReadonlySet<string> {
  const named = new Set<string>();
  for (const trait of ir.traits ?? []) {
    if ((trait.onClauses ?? []).some(isPlayerFired)) named.add(trait.name);
  }
  return named;
}

/**
 * Whether an entity is something a tool could never be.
 *
 * Rooms, regions, and the player. Measured before this guard existed, Fernhill
 * called `grounds`, `house` and `iron-gates` tools — a region and a room answer
 * `on entering`, which is player-fired by every test above, and the player is
 * portable by the loader's own default because nothing withdraws it. All three
 * are places or people you inhabit rather than things you use, and the residual
 * is where D12 puts what is neither an affordance nor a gate.
 *
 * @param entity the entity to test
 * @returns true when no affordance can make this a tool
 */
function isNeverATool(entity: IREntity): boolean {
  return isRoom(entity) || isRegion(entity) || entity.isPlayer;
}

/**
 * Whether the player can act on this thing at all.
 *
 * Four sources, any one of which is enough: a clause of its own, a trait whose
 * declaration carries one, a composition that is itself an affordance, or plain
 * portability — the last being the one with no row in the IR to read, since
 * `world-model` grants it by default and `scenery` is what withdraws it.
 *
 * @param entity the entity to test
 * @param traitsWithClauses trait names whose declarations answer a player action
 * @returns true when the entity affords the player something
 */
function affordsAction(entity: IREntity, traitsWithClauses: ReadonlySet<string>): boolean {
  if (isNeverATool(entity)) return false;
  if ((entity.onClauses ?? []).some(isPlayerFired)) return true;

  const compositions = compositionsOf(entity);
  if (compositions.some((name) => traitsWithClauses.has(name))) return true;
  if (compositions.some((name) => AFFORDANCE_COMPOSITIONS.has(name))) return true;

  return isPortableByDefault(entity, isDoor(entity));
}

/**
 * The role every entity's mentions carry — the whole table, published.
 *
 * Rooms and regions are roled too, and land in atmosphere-info unless the walk
 * put them on the chain: a room named in prose is a place, not a thing, and the
 * residual is where the three-way split puts everything that is neither an
 * affordance nor a gate. The alternative — a fourth role for places — is not
 * D12's, and inventing one here would put the analyzer and the ADR in
 * disagreement about what the wire means. It is the honest limit to raise if the
 * World tab reads oddly: nine of Fernhill's twenty-two atmosphere entities are
 * rooms.
 *
 * @param ir the story IR
 * @param reach the reach result, for its `progression` chain
 * @returns entity id to role, one entry per declared entity
 */
export function roleTable(ir: StoryIR, reach: ReachResult): Map<string, MentionRole> {
  const onChain = new Set(reach.progression);
  const traitsWithClauses = affordanceTraits(ir);

  const roles = new Map<string, MentionRole>();
  for (const entity of ir.entities) {
    if (onChain.has(entity.id)) {
      roles.set(entity.id, 'progression-info');
    } else if (affordsAction(entity, traitsWithClauses)) {
      roles.set(entity.id, 'tool');
    } else {
      roles.set(entity.id, 'atmosphere-info');
    }
  }
  return roles;
}

/**
 * Stamp each resolved mention with its role.
 *
 * @param ir the story IR
 * @param reach the reach result, for its `progression` chain
 * @param edges the mentions that resolved to exactly one thing
 * @returns the same edges, each carrying a role, in the order given
 */
export function deriveRoles(
  ir: StoryIR,
  reach: ReachResult,
  edges: readonly ResolvedMention[],
): MentionEdge[] {
  const roles = roleTable(ir, reach);
  return edges.map((edge) => ({
    ...edge,
    role: roles.get(edge.entity) ?? 'atmosphere-info',
  }));
}
