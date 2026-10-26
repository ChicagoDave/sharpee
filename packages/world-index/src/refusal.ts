/**
 * refusal.ts — why the engine refused a command, in the author's terms.
 *
 * Purpose: a failed test card shows what the story printed ("You can't see
 * any such thing.") and nothing more, while the Reach view one tab over
 * already knows the cause (a thing placed nowhere). This module joins the
 * two: given the story, its Reach findings and one refused turn — the
 * command typed and the events the engine raised for it — it names the
 * entity behind the refusal, says what is wrong with it, and says the fix.
 * The words are composed here so the CLI reporter and the Testing tab say
 * exactly the same thing.
 *
 * Two rules, one per seeded authoring mistake it was built against:
 *   - the parser found no such thing, and a word of the command names a
 *     thing the Reach view lists as stranded with no placement;
 *   - the wearing action refused because the thing is not wearable, and the
 *     story declares that thing without the `wearable` trait.
 * A refusal neither rule explains gets no cause — never a guess. A command
 * naming nothing the story declares (a typo, a removed alias) is such a case.
 *
 * Public interface: explainRefusal, RefusalCause, RefusedTurn, TurnEvent.
 *
 * Owner context: @sharpee/world-index — the derivation package. Pure over
 * the IR and the Reach result; no engine, no I/O.
 *
 * References:
 *   - UPPS finding F-15 (docs/work/author-narrative-testing/upps-findings.md)
 *   - ADR-321 D4 (the Reach view this reads)
 *
 * @packageDocumentation
 */

import { STDLIB_MANIFEST, type IREntity, type StoryIR } from '@sharpee/chord';
import type { ReachResult, StrandedThing } from './reach.js';
import { thingsOf } from './story.js';

/** One event the engine raised during the refused turn. */
export interface TurnEvent {
  type: string;
  data?: Record<string, unknown>;
}

/** The refused turn: what was typed, what the engine raised, where the player stood. */
export interface RefusedTurn {
  /** The command as typed. */
  input: string;
  /** The turn's events, as the test runner captured them. */
  events: readonly TurnEvent[];
  /** IR id of the room the player stood in, when the caller knows it. */
  room?: string;
}

/** The cause behind a refusal, with the sentence and the fix the author reads. */
export interface RefusalCause {
  /** Which rule explained it. */
  kind: 'placed-nowhere' | 'not-wearable';
  /** IR id of the entity behind the refusal. */
  entity: string;
  /** Its display name, without article. */
  name: string;
  /** The word of the command that named it. */
  word: string;
  /** The sentence that says what is wrong. */
  says: string;
  /** The sentence that says what to do. */
  fix: string;
}

/**
 * The articles of the story's locale, from the stdlib manifest (ADR-387 D1);
 * a command word that is one names nothing.
 *
 * @throws Error when the manifest holds no facts for the story's locale
 */
function articlesOf(ir: StoryIR): ReadonlySet<string> {
  const facts = STDLIB_MANIFEST.locales[ir.phrases.defaultLocale];
  if (facts === undefined) {
    throw new Error(`No stdlib manifest facts for locale ${ir.phrases.defaultLocale}: the articles are unknown`);
  }
  return new Set(facts.articles);
}

/**
 * Explain why the engine refused a turn, when one of the two rules can.
 *
 * @param ir the story IR
 * @param reach the story's Reach result (`deriveReach(ir)`)
 * @param turn the refused turn
 * @returns the cause, or `undefined` when neither rule applies — the caller
 *   then shows the refusal as it stands
 */
export function explainRefusal(ir: StoryIR, reach: ReachResult, turn: RefusedTurn): RefusalCause | undefined {
  return explainNotFound(ir, reach, turn) ?? explainNotWearable(ir, turn);
}

/**
 * Rule 1: the parser found no such thing, and the command names a thing the
 * Reach view lists as placed nowhere.
 */
function explainNotFound(ir: StoryIR, reach: ReachResult, turn: RefusedTurn): RefusalCause | undefined {
  const notFound = turn.events.some(
    (event) => event.type === 'command.failed' && typeof event.data?.reason === 'string' && event.data.reason.includes('ENTITY_NOT_FOUND'),
  );
  if (!notFound) return undefined;
  const unplaced = reach.stranded.filter((thing) => thing.room === undefined);
  const hit = firstNamed(turn.input, unplaced.map((thing) => thing.id), ir);
  if (hit === undefined) return undefined;
  const room = turn.room !== undefined ? nameOf(ir, turn.room) : undefined;
  const placement = room !== undefined ? `in the ${room}` : 'in a room';
  return {
    kind: 'placed-nowhere',
    entity: hit.entity.id,
    name: hit.entity.name,
    word: hit.word,
    says: `"${hit.word}" is ${withArticle(hit.entity)}, which is ${strandedReason(reach, hit.entity.id)}.`,
    fix: `Give it a place (${placement}) or move it into play.`,
  };
}

/**
 * Rule 2: the wearing action refused the thing as not wearable, and the story
 * declares it without the trait.
 */
function explainNotWearable(ir: StoryIR, turn: RefusedTurn): RefusalCause | undefined {
  const refusal = turn.events.find(
    (event) => event.data?.reason === 'not_wearable' && String(event.data?.messageId ?? '').startsWith('if.action.wearing.'),
  );
  if (refusal === undefined) return undefined;
  const itemName = typeof refusal.data?.itemName === 'string' ? refusal.data.itemName.toLowerCase() : undefined;
  const candidates = thingsOf(ir)
    .filter((thing) => !thing.traits.some((trait) => trait.name === 'wearable'))
    .filter((thing) => itemName === undefined || thing.name.toLowerCase() === itemName)
    .map((thing) => thing.id);
  const hit = firstNamed(turn.input, candidates, ir);
  if (hit === undefined) return undefined;
  return {
    kind: 'not-wearable',
    entity: hit.entity.id,
    name: hit.entity.name,
    word: hit.word,
    says: `"${hit.word}" is ${withArticle(hit.entity)}, which is not declared wearable.`,
    fix: `Add wearable to ${withArticle(hit.entity)}.`,
  };
}

/**
 * The first candidate entity a word of the command names — by its full name,
 * an alias, or any one word of its name, which is how the parser resolves a
 * noun. Articles never name anything.
 */
function firstNamed(input: string, candidateIds: readonly string[], ir: StoryIR): { entity: IREntity; word: string } | undefined {
  const articles = articlesOf(ir);
  const words = input.toLowerCase().split(/\s+/).filter((word) => word.length > 0 && !articles.has(word));
  const text = words.join(' ');
  for (const id of candidateIds) {
    const entity = ir.entities.find((candidate) => candidate.id === id);
    if (entity === undefined) continue;
    const forms = [entity.name, ...entity.aka].map((form) => form.toLowerCase());
    const phrase = forms.find((form) => form.length > 0 && ` ${text} `.includes(` ${form} `));
    if (phrase !== undefined) return { entity, word: phrase };
    const nameWords = entity.name.toLowerCase().split(/\s+/);
    const word = words.find((candidate) => nameWords.includes(candidate));
    if (word !== undefined) return { entity, word };
  }
  return undefined;
}

/** The Reach view's own words for a stranded thing. */
function strandedReason(reach: ReachResult, id: string): string {
  const thing: StrandedThing | undefined = reach.stranded.find((candidate) => candidate.id === id);
  return thing?.reason ?? 'placed nowhere';
}

/** An entity's name behind its declared article, `the` when it declared none. */
function withArticle(entity: IREntity): string {
  return `${entity.article ?? 'the'} ${entity.name}`;
}

/** An entity's display name by IR id. */
function nameOf(ir: StoryIR, id: string): string | undefined {
  return ir.entities.find((entity) => entity.id === id)?.name;
}
