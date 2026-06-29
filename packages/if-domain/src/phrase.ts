/**
 * @file Phrase algebra — language-neutral phrase contracts (ADR-192).
 *
 * Purpose: declare the closed `Phrase` discriminated union, its producer and
 * render-context contracts, and the per-locale `Assembler` interface. These are
 * the language-neutral surface of the phrase algebra that replaces the
 * `messageId → formatter-chain → string` pipeline with
 * `messageId → phrase tree → Assembler → ITextBlock[]`.
 *
 * Public interface: the `Phrase` union (13 members), `PhraseProducer`,
 * `RenderContext` (with the `reference` / `textState` / `contribute` write +
 * `slotContributions` read seams), `Assembler`, and the `isX` kind type guards.
 *
 * Owner context: `@sharpee/if-domain` — language-neutral domain contracts,
 * beside `language-provider.ts` and `contracts.ts`. INVARIANT (ADR-192 AC-10):
 * this file contains NO locale logic and NO article surface strings
 * (a / an / the / some). Article realization belongs to the English Assembler in
 * `@sharpee/lang-en-us`; `articleType` here is a language-neutral selector only.
 *
 * Extensibility (ADR-192 §1): `Phrase` is a CLOSED discriminated union keyed by
 * `kind`. The five foundational kinds are implemented by the Assembler in
 * ADR-192; `Verb` (199), `Verbatim` (200), `Numeral` (198), `Pronoun` (197), and
 * `Contents` (194) are realized follow-on atoms; the remaining three stub kinds are
 * reserved discriminants whose fields and realization land additively in their
 * follow-on ADRs (193 adjectives, 195 Slot, 196 Optional/Choice). Extension is
 * additive only — a new member plus a new Assembler case, never a rewrite.
 */

import { EntityId, IEntity } from '@sharpee/core';
import { IDecoration, ITextBlock } from '@sharpee/text-blocks';

// ---------------------------------------------------------------------------
// Agreement surface
// ---------------------------------------------------------------------------

/**
 * Base carried by every composable phrase: decorations (emphasis / code) that
 * survive composition and are realized by the Assembler. The literal article
 * string is deliberately absent — see the file invariant.
 */
export interface PhraseBase {
  /** Emphasis / code decorations carried through composition. */
  decorations?: IDecoration[];
}

// ---------------------------------------------------------------------------
// Foundational kinds (implemented by the Assembler in ADR-192)
// ---------------------------------------------------------------------------

/** Raw author text. The whitespace authority collapses `normal`, exempts `verbatim`. */
export interface Literal extends PhraseBase {
  kind: 'literal';
  text: string;
  /** `verbatim` exempts the text from whitespace collapse. Default `normal`. */
  whitespace?: 'normal' | 'verbatim';
}

/**
 * Article + adjectives + noun, agreed as a whole. The `name` is the base noun
 * (computed names → ADR-193); `adjectives` are static in ADR-192 (state-derived
 * contributors → ADR-193). `articleType` selects the article language-neutrally;
 * the a/an/the/some surface is computed by the Assembler over the rendered head.
 */
export interface NounPhrase extends PhraseBase {
  kind: 'noun';
  /** Base noun. */
  name: string;
  /** Static adjectives (ADR-192 AC-4); state-derived adjectives land in ADR-193. */
  adjectives?: string[];
  number: 'singular' | 'plural' | 'mass';
  /**
   * Grammatical person, the verb-agreement surface a referencing `Verb` reads
   * (ADR-199 §4). Unset is treated as third person; the player in 2nd-person
   * narrative is stamped `'second'` so `{verb:is actor}` takes the plural form
   * ("you are"). Language-neutral selector — no verb surface lives here.
   */
  person?: 'first' | 'second' | 'third';
  /** Suppresses the article when true. */
  properName?: boolean;
  articleType: 'indefinite' | 'definite' | 'some' | 'none';
  /** Author override for irregular plurals. */
  pluralForm?: string;
  /** Last-mentioned tracking → `Pronoun` resolution (ADR-197). */
  referableId?: EntityId;
  /** Pronoun set for later gendered / neopronoun reference (ADR-197). */
  pronounSet?: string;
  /**
   * Sentence-start capitalization requested by the `{capitalize …}` template
   * hint (ADR-192 §5). The Assembler's Case authority upper-cases the rendered
   * head's first letter when set. Language-neutral request, not a surface string.
   */
  capitalize?: boolean;
}

/** Combinator: group / pluralize / serial-comma over its items (ports ADR-190). */
export interface PhraseList extends PhraseBase {
  kind: 'list';
  items: Phrase[];
  conj: 'and' | 'or';
}

/** Combinator: ordered join under one punctuation authority. */
export interface Sequence extends PhraseBase {
  kind: 'seq';
  parts: Phrase[];
}

/** Atom: realizes to "" and is absorbed by combinators (no dangling comma). */
export interface Empty {
  kind: 'empty';
}

/**
 * Verb atom (ADR-199): defers a verb's surface and agrees its number/person
 * with a referenced subject phrase at realize time. Replaces the legacy
 * `{is:}` / `{was:}` / `{has:}` formatters. A follow-on atom of ADR-192 —
 * additive (new union member + one Assembler case), no core rewrite.
 *
 * `lemma` is the 3rd-person-singular surface the author types ('is','was',
 * 'has','opens'); the agreed (plural / person-marked) form is the Assembler's
 * Agreement authority to compute — NO conjugation strings live here, exactly as
 * `NounPhrase` carries `articleType` and never the a/an surface.
 */
export interface Verb extends PhraseBase {
  kind: 'verb';
  /** 3rd-person-singular surface the author types: 'is', 'was', 'has', 'opens'. */
  lemma: string;
  /** Param/producer name of the subject phrase to agree number/person with. */
  subjectRef: string;
  /** Default 'third'; the subject's own `person` takes precedence when present. */
  person?: 'first' | 'second' | 'third';
}

// ---------------------------------------------------------------------------
// Stub kinds (reserved discriminants; fields + realization land in follow-on ADRs)
// ---------------------------------------------------------------------------
//
// Each stub reserves only its `kind` discriminant so the closed algebra is
// complete now (ADR-192 §2). The owning ADR defines each kind's fields and adds
// its Assembler case; until then the Assembler throws PhraseNotImplementedError.

/**
 * Atom — a pronoun ("it"/"them"/"his"/…) agreeing in case, number, and gender
 * with the last-mentioned referent (ADR-197). Language-neutral: the he/she/it/they
 * surface tables live in the locale Assembler; only the grammatical `case` is here.
 */
export interface Pronoun extends PhraseBase {
  kind: 'pronoun';
  case: 'subject' | 'object' | 'possessive' | 'possessive-pronoun' | 'reflexive';
}

/**
 * Atom — a numeric value rendered as digits, spelled-out words, or an ordinal
 * (ADR-198). Language-neutral: `value` is the number; the spelled surface
 * ("seven", "3rd") is the Assembler's to compute (no number words here).
 */
export interface Numeral extends PhraseBase {
  kind: 'number';
  /** The numeric value to render. */
  value: number;
  /** How to render it. Default `digits`. */
  format: 'digits' | 'words' | 'ordinal';
}

/**
 * Atom — opaque text passed through untouched and exempt from whitespace
 * collapse (ADR-200). The phrase home for non-entity scalars (names, directions,
 * free text, banners) the old chain substituted with a bare `String(value)`.
 */
export interface Verbatim extends PhraseBase {
  kind: 'verbatim';
  /** The opaque value, rendered verbatim. */
  text: string;
}

/**
 * Combinator — an entity's direct contents, read from the live world at realize
 * time and grouped as a list (ADR-194). `containerRef` names the container param.
 */
export interface Contents extends PhraseBase {
  kind: 'contents';
  /** Param naming the container (a `NounPhrase` carrying `referableId`, or an id). */
  containerRef: string;
  /** List conjunction. Default `and`. */
  conj?: 'and' | 'or';
}

/**
 * Combinator — an open, named append target (ADR-195). Several independent
 * sources `contribute` bare clause/sentence content to `slotKey` during the
 * turn; at realize time the Assembler collects them, orders them
 * deterministically, and joins them under ONE punctuation authority — the slot
 * owns every comma, "and", and sentence break, the contribution is bare content.
 *
 * `mode` selects the join grammar (default `sentence`): `sentence` joins
 * contributions as independent sentences after the stem's terminator; `clause`
 * joins them as clauses through the punctuation authority (serial comma + final
 * `conj`) before the terminator. `conj` is that final connective for `clause`
 * mode (default `and`). Language-neutral: no connective surface lives here.
 */
export interface Slot extends PhraseBase {
  kind: 'slot';
  /** The contribution channel name (`{slot:here}` → `slotKey: 'here'`). */
  slotKey: string;
  /** Join grammar. Default `sentence`. */
  mode?: 'sentence' | 'clause';
  /** Final connective for `clause` mode. Default `and`. */
  conj?: 'and' | 'or';
}

/**
 * Modifier — a phrase that renders its `child` **or `Empty`**, gated by a boolean
 * the PRODUCER resolves from world state (ADR-196 §1). Realization is stateless:
 * `present ? realize(child) : Empty`. The conditional-clause mechanism (scenarios
 * S9–S10). `present: false` yields `Empty`, absorbed by the enclosing combinator
 * (ADR-192 AC-6) so no dangling comma/whitespace survives. The boolean is resolved
 * at tree-build time — there is NO realize-time world read.
 */
export interface Optional extends PhraseBase {
  kind: 'optional';
  /** The phrase realized when `present` is true. */
  child: Phrase;
  /** Resolved by the producer from world state; NOT read at realize time. */
  present: boolean;
}

/**
 * Modifier — a phrase that renders **one of** `alternatives`, selected by a
 * deterministic, persistent selector keyed to `(entityId, messageKey)` in the
 * text-state store (ADR-196 §2). The ONLY kind that reads/writes `ctx.textState`;
 * the selector advances a per-`(entityId, messageKey)` counter at realize time.
 * Variation / cycling / first-time text (scenarios S12–S14).
 */
export interface Choice extends PhraseBase {
  kind: 'choice';
  /** The variants; length ≥ 1. An alternative MAY be `Empty` (once-only text). */
  alternatives: Phrase[];
  /**
   * Selection strategy (ADR-196 §2):
   * - `cycling` — advance through variants, wrapping (`i = n % len`).
   * - `stopping` — advance to the last variant, then stick (`i = min(n, len-1)`).
   * - `sticky` — pick once (seeded), then replay that variant.
   * - `random` — seeded pick each trigger; deterministic from the counter.
   * - `firstTime` — `alt[0]` first, `alt[1]` after (`alt[1]` may be `Empty`).
   */
  selector: 'cycling' | 'stopping' | 'sticky' | 'random' | 'firstTime';
  /** The entity the variation is keyed to (text-state primary key). */
  entityId: EntityId;
  /** Stable per-choice-site key (text-state secondary key). */
  messageKey: string;
}

// ---------------------------------------------------------------------------
// The closed union
// ---------------------------------------------------------------------------

/**
 * The closed phrase algebra. Five foundational members are realized in ADR-192
 * and `Verb` in ADR-199; the seven stubs are reserved for their follow-on ADRs.
 * Extension is additive.
 */
export type Phrase =
  | Literal
  | NounPhrase
  | PhraseList
  | Sequence
  | Empty
  | Verb
  | Pronoun
  | Numeral
  | Verbatim
  | Contents
  | Slot
  | Optional
  | Choice;

// ---------------------------------------------------------------------------
// Producer + render context
// ---------------------------------------------------------------------------

/**
 * Read-only world access for realization. Language-neutral subset of the world
 * model exposed to the Assembler — no mutation, no parser or command surface.
 */
export interface RenderWorld {
  /** Resolve an entity by id, or undefined if absent. */
  getEntity(entityId: EntityId): IEntity | undefined;
  /** Direct contents of an entity. */
  getEntityContents(entityId: EntityId): IEntity[];
  /** The room transitively containing an entity, if any. */
  getContainingRoom(entityId: EntityId): IEntity | undefined;
  /**
   * Produce the `NounPhrase` for an entity id (ADR-194) — the entity→phrase bridge
   * `Contents`/`Slot` realize through. Optional: present when the engine wired it to
   * the producer (`nounPhraseFor`); absent in bare/world-less render stubs.
   */
  nounPhraseFor?(entityId: EntityId): NounPhrase | undefined;
}

/**
 * Locale-tunable realization settings. Language-neutral knobs only; the English
 * Assembler reads what it needs and ignores the rest.
 */
export interface LocaleSettings {
  /** Serial (Oxford) comma in lists. Default on. */
  serialComma?: boolean;
}

/**
 * Narrative agreement context for verb-person resolution (ADR-199 §4 B).
 *
 * The player is the only subject that takes 1st/2nd-person agreement, and which
 * grammatical person it takes depends on the story's narration. Carrying the
 * player's id plus the narrative person here lets the Assembler's Agreement
 * authority give the player subject the right verb form ("you **are**") without
 * any producer needing the perspective at build time.
 */
export interface NarrativeAgreement {
  /** Grammatical person of the player subject under the current narration. */
  person: 'first' | 'second' | 'third';
  /** The player entity's id, matched against a subject's `referableId`. */
  playerId?: EntityId;
}

/**
 * The agreement surface of a last-mentioned referent — enough for a `Pronoun` to
 * choose its surface (case × number × gender) without re-reading the world (ADR-197).
 */
export interface Mentioned {
  /** The referent entity's id. */
  referableId: EntityId;
  /** Its grammatical number. */
  number: 'singular' | 'plural' | 'mass';
  /** Its pronoun set ('he' | 'she' | 'it' | 'they', or a named set); optional. */
  pronounSet?: string;
}

/**
 * Last-mentioned reference context — the seam a later `Pronoun` consumes (ADR-197).
 * The Assembler `note`s each realized `NounPhrase`'s surface; `lastMentioned`
 * returns the most recent.
 */
export interface ReferenceContext {
  /** The referent most recently realized this turn, if any. */
  lastMentioned(): Mentioned | undefined;
  /** Record a referent as last-mentioned. */
  note(mentioned: Mentioned): void;
}

/**
 * Per-`(entityId, messageKey)` persistent store backing deterministic
 * `Choice` / `Optional`. SEAM (ADR-196): implementation and final shape owned by
 * ADR-196; declared here so the seeded-selection contract is named now.
 */
export interface TextStateStore {
  get(entityId: EntityId, messageKey: string): number | undefined;
  set(entityId: EntityId, messageKey: string, value: number): void;
}

/** Options for a slot contribution. SEAM (ADR-195). */
export interface SlotContributionOptions {
  /** Ordering hint among contributions to the same slot. */
  order?: number;
}

/**
 * The context a producer realizes against: a read-only world, the bound params,
 * locale settings, and the three declared seams. The seam METHODS are part of
 * the contract now; their behavior is filled in by ADR-195–197.
 */
export interface RenderContext {
  /** Read-only world access. */
  readonly world: RenderWorld;
  /** Params bound for this message (producer references resolve against these). */
  readonly params: Record<string, unknown>;
  /** Locale realization settings. */
  readonly settings: LocaleSettings;
  /** Narrative agreement context — player id + person for verb agreement (ADR-199 §4 B). */
  readonly narrative: NarrativeAgreement;
  /** Last-mentioned context (consumed by `Pronoun`, ADR-197). */
  readonly reference: ReferenceContext;
  /** Per-`(entityId, messageKey)` store (consumed by `Choice`/`Optional`, ADR-196). */
  readonly textState: TextStateStore;
  /** Slot contribution channel — write side (ADR-192/195). */
  contribute(slotKey: string, phrase: Phrase, opts?: SlotContributionOptions): void;
  /**
   * Slot contribution channel — read side (ADR-195). Returns the contributions
   * staged for `slotKey` this turn, ordered by `(order asc, insertion asc)`.
   * A PEEK, not a drain: it never consumes the store, so two `{slot:key}` nodes
   * sharing a key see the same contributions and repeated reads are stable.
   *
   * OPTIONAL — matching `RenderWorld.nounPhraseFor?`'s optional-seam precedent
   * (ADR-194): a context that never wired the store (world-less render stubs)
   * omits it, and the Assembler reads `ctx.slotContributions?.(key) ?? []`, so an
   * absent accessor yields no contributions and the slot realizes `Empty`.
   */
  slotContributions?(slotKey: string): Phrase[];
}

/** Code that emits a phrase from world state. May return `Empty`. */
export type PhraseProducer = (ctx: RenderContext) => Phrase;

// ---------------------------------------------------------------------------
// Assembler
// ---------------------------------------------------------------------------

/**
 * The single per-locale component that realizes a phrase tree to text and owns
 * every cross-cutting correctness concern (article, agreement, punctuation,
 * whitespace, reference, case). The English implementation lives in
 * `@sharpee/lang-en-us`; it emits the unchanged `ITextBlock[]` contract.
 */
export interface Assembler {
  /**
   * Realize a phrase tree to text blocks. Pure function of `(tree, world, ctx)`
   * (ADR-192 §7): identical inputs yield identical output.
   *
   * @param tree the phrase tree to realize
   * @param ctx the render context (world, params, settings, seams)
   * @returns the realized text blocks
   */
  realize(tree: Phrase, ctx: RenderContext): ITextBlock[];
}

// ---------------------------------------------------------------------------
// Kind type guards
// ---------------------------------------------------------------------------

/** @returns true if the phrase is a `Literal`. */
export function isLiteral(p: Phrase): p is Literal {
  return p.kind === 'literal';
}

/** @returns true if the phrase is a `NounPhrase`. */
export function isNounPhrase(p: Phrase): p is NounPhrase {
  return p.kind === 'noun';
}

/** @returns true if the phrase is a `PhraseList`. */
export function isPhraseList(p: Phrase): p is PhraseList {
  return p.kind === 'list';
}

/** @returns true if the phrase is a `Sequence`. */
export function isSequence(p: Phrase): p is Sequence {
  return p.kind === 'seq';
}

/** @returns true if the phrase is `Empty`. */
export function isEmpty(p: Phrase): p is Empty {
  return p.kind === 'empty';
}

/** @returns true if the phrase is a `Verb` (ADR-199). */
export function isVerb(p: Phrase): p is Verb {
  return p.kind === 'verb';
}

/** @returns true if the phrase is a `Pronoun` (ADR-197). */
export function isPronoun(p: Phrase): p is Pronoun {
  return p.kind === 'pronoun';
}

/** @returns true if the phrase is a `Numeral` (ADR-198). */
export function isNumeral(p: Phrase): p is Numeral {
  return p.kind === 'number';
}

/** @returns true if the phrase is `Verbatim`. */
export function isVerbatim(p: Phrase): p is Verbatim {
  return p.kind === 'verbatim';
}

/** @returns true if the phrase is `Contents` (ADR-194). */
export function isContents(p: Phrase): p is Contents {
  return p.kind === 'contents';
}

/** @returns true if the phrase is a `Slot` (ADR-195). */
export function isSlot(p: Phrase): p is Slot {
  return p.kind === 'slot';
}

/** @returns true if the phrase is `Optional` (ADR-196). */
export function isOptional(p: Phrase): p is Optional {
  return p.kind === 'optional';
}

/** @returns true if the phrase is a `Choice` (ADR-196). */
export function isChoice(p: Phrase): p is Choice {
  return p.kind === 'choice';
}
