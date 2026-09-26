/**
 * pin-grammar.ts — the one parser of the `states:` pin grammar.
 *
 * Purpose: turn a pin expression — the text a tree-document card, a
 * `[STATE:]` line, or a derived rule test writes — into a structured form,
 * so that the assertion core can READ it as a claim and `arrange()` can
 * WRITE it as a command from one recognition step. Two consumers, one
 * grammar, one parser: the read direction lives in
 * `@sharpee/transcript-tester`'s assertion core, the write direction in
 * `./arrange.ts`, and neither carries a regex of its own.
 *
 * This module is pure and dependency-free: no world, no IR, no platform
 * import. It is published on its own subpath (`@sharpee/story-loader/
 * pin-grammar`) so the browser-bundled assertion core can import it without
 * pulling the loader's runtime in behind it.
 *
 * The forms, tried in this order (a timer is its one-token qualified key,
 * `player.bell`; a topic is a name):
 *   story.state = <phase> / story.state != <phase>         → story-state
 *   <key> occurrence = <n>                                 → occurrence
 *   <topic> asked once|again|many times                    → topic-history
 *   <topic> was discussed                                  → topic-history
 *   <timer> has started / <timer> has expired              → timer-phase
 *   <timer> at <named-turn>                                → timer-position
 *   <entity>.location = <place> (or !=)                    → location
 *   <entity>.<property> = <value> (or !=)                  → property
 *   <entity>.<collection> contains <item> (or not-contains) → contains
 *   emitted <message-id>                                   → emitted
 *   [the] <name> is gone / is not gone                     → gone
 *   [the] <name> is <state> / [the] <name> is not <state>  → declared-state
 *   anything else                                          → unrecognized
 *
 * An entity head in the dotted forms is one token of word characters and
 * hyphens — a display name (`player`, `lamp`) or a compiled IR id
 * (`brass-lamp`); a head with spaces does not parse, and the Chord-spelled
 * `[the] <name> is <state>` form is where a multi-word name goes. The four
 * non-floor shapes (occurrence, topic-history, timer-phase, timer-position)
 * are recognized so that a consumer can NAME them; no consumer writes them
 * yet, and the assertion core does not read them. `emitted` and `gone` are
 * the two claim kinds ADR-356 D3 adds: read by the assertion core (`gone`
 * off the world, `emitted` off the turn's events), written by nothing —
 * `arrange` names them as it names the non-floor shapes.
 *
 * Public interface: parsePin(), ParsedPin, PinOperator, PinShape.
 * Owner context: @sharpee/story-loader — the loader owns the state this
 * grammar addresses, so it owns the grammar.
 *
 * References: ADR-356 D2 (the arrange grammar is the pin grammar the
 * assertion core evaluates, and exactly those forms); ADR-340 D1 (one
 * evaluator); GH #355 (the Chord-spelled state claim); recurrence #425
 * (hand-duplicated parsers of one grammar — the reason this file exists).
 */

/** The equality operators the dotted forms take. */
export type PinOperator = '=' | '!=';

/** Every shape the grammar recognizes, plus the one it does not. */
export type PinShape = ParsedPin['kind'];

/** A pin expression, recognized. */
export type ParsedPin =
  /** `story.state = <phase>` — the story's own phase. */
  | { kind: 'story-state'; operator: PinOperator; state: string }
  /** `<entity>.location = <place>` — where the entity is. */
  | { kind: 'location'; entity: string; operator: PinOperator; place: string }
  /** `<entity>.<property> = <value>` — any other property, the flags included. */
  | { kind: 'property'; entity: string; property: string; operator: PinOperator; value: string }
  /** `<entity>.<collection> contains <item>` — inventory or contents. */
  | { kind: 'contains'; entity: string; collection: string; operator: 'contains' | 'not-contains'; item: string }
  /** `[the] <name> is [not] <state>` — a Chord entity's declared state, or `the story is <state>`. */
  | { kind: 'declared-state'; name: string; negated: boolean; state: string }
  /** `emitted <message-id>` — the turn emitted this phrase, refusal or event (ADR-356 D3). Read, not written. */
  | { kind: 'emitted'; messageId: string }
  /** `[the] <name> is [not] gone` — a Chord `remove` has taken the entity out of play (ADR-356 D3). Read, not written. */
  | { kind: 'gone'; name: string; negated: boolean }
  /** `<key> occurrence = <n>` — an ordinal (`once`, `first-time`). Named, not written. */
  | { kind: 'occurrence'; key: string; count: number }
  /** `<topic> asked once|again|many times` / `<topic> was discussed`. Named, not written. */
  | { kind: 'topic-history'; topic: string; history: 'once' | 'again' | 'many-times' | 'discussed' }
  /** `<timer> has started|expired`. Named, not written. */
  | { kind: 'timer-phase'; timer: string; what: 'started' | 'expired' }
  /** `<timer> at <named-turn>` — a timer-driven position. Named, not written. */
  | { kind: 'timer-position'; timer: string; turn: string }
  /** No form matched. */
  | { kind: 'unrecognized' };

const STORY_STATE = /^story\.state\s*(=|!=)\s*(\S+)$/;
const OCCURRENCE = /^(\S+)\s+occurrence\s*=\s*(\d+)$/;
const ASKED = /^(.+?)\s+asked\s+(once|again|many times)$/;
const DISCUSSED = /^(.+?)\s+was\s+discussed$/;
const TIMER_PHASE = /^([\w.-]+)\s+has\s+(started|expired)$/;
const TIMER_POSITION = /^([\w.-]+)\s+at\s+([\w-]+)$/;
const EMITTED = /^emitted\s+(\S+)$/;
const GONE = /^(?:the\s+)?(.+?)\s+is\s+(not\s+)?gone$/;
const DOTTED_EQUALITY = /^([\w-]+)\.([\w-]+)\s*(=|!=)\s*(.+)$/;
const DOTTED_CONTAINS = /^([\w-]+)\.([\w-]+)\s+(contains|not-contains)\s+(.+)$/;
const DECLARED_STATE = /^(?:the\s+)?(.+?)\s+is\s+(not\s+)?(\S+)$/;

/**
 * Parse one pin expression.
 *
 * Pure: the same text always yields the same structure, and nothing about
 * the world is consulted — whether the entity exists, whether the state is
 * declared, is the consumer's question. Never throws.
 *
 * @param expression the pin text, as written
 * @returns the recognized form, or `{ kind: 'unrecognized' }`
 */
export function parsePin(expression: string): ParsedPin {
  const storyState = expression.match(STORY_STATE);
  if (storyState) {
    return { kind: 'story-state', operator: storyState[1] as PinOperator, state: storyState[2] };
  }

  const occurrence = expression.match(OCCURRENCE);
  if (occurrence) {
    return { kind: 'occurrence', key: occurrence[1], count: Number(occurrence[2]) };
  }
  const asked = expression.match(ASKED);
  if (asked) {
    const word = asked[2] === 'many times' ? 'many-times' : (asked[2] as 'once' | 'again');
    return { kind: 'topic-history', topic: asked[1].trim(), history: word };
  }
  const discussed = expression.match(DISCUSSED);
  if (discussed) {
    return { kind: 'topic-history', topic: discussed[1].trim(), history: 'discussed' };
  }
  const timerPhase = expression.match(TIMER_PHASE);
  if (timerPhase) {
    return { kind: 'timer-phase', timer: timerPhase[1].trim(), what: timerPhase[2] as 'started' | 'expired' };
  }

  const emitted = expression.match(EMITTED);
  if (emitted) {
    return { kind: 'emitted', messageId: emitted[1] };
  }

  const equality = expression.match(DOTTED_EQUALITY);
  if (equality) {
    const [, entity, property, operator, value] = equality;
    if (property === 'location') {
      return { kind: 'location', entity, operator: operator as PinOperator, place: value.trim() };
    }
    return { kind: 'property', entity, property, operator: operator as PinOperator, value: value.trim() };
  }

  const contains = expression.match(DOTTED_CONTAINS);
  if (contains) {
    const [, entity, collection, operator, item] = contains;
    return { kind: 'contains', entity, collection, operator: operator as 'contains' | 'not-contains', item: item.trim() };
  }

  // `gone` is a reserved state word: `is gone` is the removal claim, never a
  // declared state spelled "gone".
  const gone = expression.match(GONE);
  if (gone) {
    return { kind: 'gone', name: gone[1].trim(), negated: gone[2] !== undefined };
  }

  // Tried after the dotted forms so those keep their exact behaviour; the
  // name may carry spaces (`first partner`).
  const declared = expression.match(DECLARED_STATE);
  if (declared) {
    const [, name, negation, state] = declared;
    return { kind: 'declared-state', name: name.trim(), negated: negation !== undefined, state };
  }

  // Last, so a declared-state pin whose name contains "at" is never read
  // as a timer; a timer's key is one dotted token (`player.bell`), never a
  // phrase.
  const timerPosition = expression.match(TIMER_POSITION);
  if (timerPosition) {
    return { kind: 'timer-position', timer: timerPosition[1].trim(), turn: timerPosition[2] };
  }

  return { kind: 'unrecognized' };
}
