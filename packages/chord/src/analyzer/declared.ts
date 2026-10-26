/**
 * declared.ts — what a `create` block says about itself in its own words,
 * read once: the entity id its name derives, the kind noun it composes with
 * an article, and the bare adjectives it composes.
 *
 * Every pass that needs one of these before the entity builders have run
 * (the collection pass, the vehicle and expanse collectors, room groups, a
 * check that reads another block's kind) reads it here. A builder reading
 * its own block reads the compositions pass's `entity.kinds` and
 * `entity.traits` instead.
 *
 * Public interface: entityIdOf, factIdOf, isKindDecl, hasAdjectiveDecl.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - docs/work/chord-4-0/alignment-ledger.md F18 (one id derivation) and F21
 *   (kinds read from raw syntax).
 */
import type { CreateDecl } from '../ast.js';

/**
 * The entity id a block's name derives: its words joined with `-`,
 * lowercased. `Hall` and `hall` are one entity.
 * @param words the name's words
 * @returns the entity id
 */
export function entityIdOf(words: readonly string[]): string {
  return words.join('-').toLowerCase();
}

/**
 * The id a `define fact` name derives: the entity id's spelling, in the
 * facts' own namespace, so a fact and an entity of one name never collide.
 * @param words the fact name's words
 * @returns the fact id
 */
export function factIdOf(words: readonly string[]): string {
  return words.join('-').toLowerCase();
}

/**
 * True when the block composes `kind` with an article (`a room`, `an expanse`).
 * @param decl the block
 * @param kind the kind noun, lowercase
 */
export function isKindDecl(decl: CreateDecl, kind: string): boolean {
  return decl.compositions.some((c) => c.article !== null && c.words.join(' ').toLowerCase() === kind);
}

/**
 * True when the block composes the bare adjective `word` (`floats`, `wearable`).
 * @param decl the block
 * @param word the adjective, lowercase
 */
export function hasAdjectiveDecl(decl: CreateDecl, word: string): boolean {
  return decl.compositions.some((c) => c.article === null && c.words.join(' ').toLowerCase() === word);
}
