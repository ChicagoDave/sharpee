/**
 * prose.ts — every passage the author wrote, and where each one sits.
 *
 * Purpose: the Incomplete view reads prose (ADR-321 D5), and until Amendment 1 it read
 * two keys per entity — a description and its first-visit text. That left NPC replies,
 * action responses, refusal messages, and event text unread, which on Fernhill is
 * **60 of 124 passages**: precisely where an author writes *"the brass key is on the
 * mantel"* about a mantel that does not exist (D10).
 *
 * This module owns one question — *what did the author write, and what fired it?* — so
 * the extractor can stop knowing about entity shapes and read a flat list of passages.
 *
 * **Attribution is by phrase key, not by owner.** Both attribution fields are
 * independently optional and the corpus is why: a response usually does have an owner
 * (`folly-jammed` hangs off `folly-door`'s `on opening`), while 22 of Fernhill's
 * passages are story-level and hang off nothing. The locale-table key is the only
 * identity every passage is guaranteed to have.
 *
 * Public interface: ProseKind, ProseSite, collectProse.
 *
 * Owner context: @sharpee/world-index — the derivation package.
 *
 * @packageDocumentation
 * @see ADR-321 Amendment 1, D10 and D11a
 */

import type { IREntity, Span, StoryIR } from '@sharpee/chord';

/**
 * What kind of passage a phrase was read from.
 *
 * `response` is deliberately broad — on-clause text, conversation topics, action
 * responses, and any other authored passage that is not a description. The specificity
 * lives in `ProseSite.firedBy`, not in a longer list of kinds, because the split that
 * matters to the surface is description prose against everything else (D10).
 */
export type ProseKind = 'description' | 'first-visit' | 'response';

/** Where a passage sits, and what fired it. */
export interface ProseSite {
  /** The locale-table key — always present, and the attribution of record. */
  key: string;
  /** What kind of passage it is. */
  kind: ProseKind;
  /** The entity it hangs off, when one does. */
  owner: string | null;
  /** That entity's display name, when there is one. */
  ownerName: string | null;
  /** The clause or action that fires it, e.g. `on opening`. */
  firedBy: string | null;
  /**
   * Where the passage sits in the source — the WHOLE region, not its first line.
   *
   * A description is usually several lines and a finding names a phrase inside
   * one of them: *the tiring-house door* is on line 37 of a passage that starts
   * at 34. A consumer given only the start can do nothing but select the wrong
   * line, so the span it needs to search is what crosses the wire.
   */
  span: Span | null;
  /** The whole passage — every variant joined, and the part-of-speech pass's input. */
  text: string;
}

/** One phrase-key reference found while walking a statement tree. */
interface Reference {
  key: string;
  owner: string | null;
  ownerName: string | null;
  firedBy: string | null;
}

/** A node of unknown shape somewhere in a statement tree. */
type IRNode = Record<string, unknown>;

/**
 * Collect every authored passage in the story's default locale.
 *
 * Order is stable and meaningful: descriptions first in entity order, then first-visit
 * text, then everything else, so a reader of the raw list sees the story's own shape
 * rather than the locale table's hash order.
 *
 * @param ir the story IR
 * @returns one site per passage, each appearing exactly once
 */
export function collectProse(ir: StoryIR): ProseSite[] {
  const locale = ir.phrases.locales[ir.phrases.defaultLocale] ?? {};
  const references = collectReferences(ir);
  const sites: ProseSite[] = [];
  const taken = new Set<string>();

  const add = (key: string, kind: ProseKind, from: Omit<Reference, 'key'>): void => {
    if (taken.has(key)) return;
    const phrase = locale[key];
    if (phrase === undefined) return;
    taken.add(key);
    sites.push({
      key,
      kind,
      owner: from.owner,
      ownerName: from.ownerName,
      firedBy: from.firedBy,
      span: phrase.span ?? null,
      text: phrase.variants.map((variant) => variant.text).join(' '),
    });
  };

  for (const entity of ir.entities) {
    const from = { owner: entity.id, ownerName: entity.name, firedBy: null };
    if (typeof entity.descriptionKey === 'string') add(entity.descriptionKey, 'description', from);
  }
  for (const entity of ir.entities) {
    const from = { owner: entity.id, ownerName: entity.name, firedBy: null };
    if (typeof entity.initialDescriptionKey === 'string') {
      add(entity.initialDescriptionKey, 'first-visit', from);
    }
  }
  for (const reference of references) {
    add(reference.key, 'response', reference);
  }
  // Passages nothing referenced — read anyway. An unreferenced passage is prose the
  // author wrote and the player may still see (some are reached through machinery this
  // walk does not model), and dropping it would put the recall gap back that D10 exists
  // to close. Its owner is recovered from a `<entity>.<slot>` key where the prefix names
  // a real entity, which is the compiler's own convention for entity-scoped prose.
  const byId = new Map(ir.entities.map((entity) => [entity.id, entity]));
  for (const key of Object.keys(locale)) {
    const prefix = key.includes('.') ? key.slice(0, key.indexOf('.')) : '';
    const owner = byId.get(prefix);
    add(key, 'response', {
      owner: owner?.id ?? null,
      ownerName: owner?.name ?? null,
      firedBy: null,
    });
  }

  return sites;
}

/**
 * Walk every statement tree in the story for `phraseKey` references, carrying the
 * entity and clause that enclose each one.
 *
 * Shape-agnostic by design, the way `statements.ts` walks for `change` targets: the IR's
 * statement nodes are a moving target, and a walk keyed to today's node names silently
 * stops finding prose the day a new statement kind lands.
 *
 * @param ir the story IR
 * @returns one reference per phrase key found, first occurrence winning
 */
function collectReferences(ir: StoryIR): Reference[] {
  const references: Reference[] = [];
  const seen = new Set<string>();

  const walk = (node: unknown, context: Omit<Reference, 'key'>): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child, context);
      return;
    }
    if (typeof node !== 'object' || node === null) return;
    const record = node as IRNode;
    const key = record.phraseKey;
    if (typeof key === 'string' && !seen.has(key)) {
      seen.add(key);
      references.push({ key, ...context });
    }
    for (const value of Object.values(record)) walk(value, context);
  };

  for (const entity of ir.entities) {
    for (const clause of clausesOf(entity)) {
      walk(clause.body, {
        owner: entity.id,
        ownerName: entity.name,
        firedBy: clause.firedBy,
      });
    }
  }
  for (const action of ir.actions) {
    walk(action, { owner: null, ownerName: null, firedBy: `action ${action.name}` });
  }
  return references;
}

/** An entity's response clauses, each with the phrase that names what fires it. */
function clausesOf(entity: IREntity): Array<{ body: unknown; firedBy: string }> {
  const clauses: Array<{ body: unknown; firedBy: string }> = [];
  for (const clause of entity.onClauses) {
    clauses.push({ body: clause.body, firedBy: `${clause.clauseKind} ${clause.action}` });
  }
  for (const topic of entity.topics) {
    clauses.push({ body: topic, firedBy: 'topic' });
  }
  return clauses;
}
