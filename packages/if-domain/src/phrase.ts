/**
 * @file Phrase algebra — language-neutral phrase contracts (ADR-192).
 *
 * Purpose: declare the closed `Phrase` discriminated union, its producer and
 * render-context contracts, and the per-locale `Assembler` interface. These are
 * the language-neutral surface of the phrase algebra that replaces the
 * `messageId → formatter-chain → string` pipeline with
 * `messageId → phrase tree → Assembler → ITextBlock[]`.
 *
 * Public interface: the `Phrase` union (12 members), `PhraseProducer`,
 * `RenderContext` (with the `reference` / `textState` / `contribute` seams),
 * `Assembler`, and the `isX` kind type guards.
 *
 * Owner context: `@sharpee/if-domain` — language-neutral domain contracts,
 * beside `language-provider.ts` and `contracts.ts`. INVARIANT (ADR-192 AC-10):
 * this file contains NO locale logic and NO article surface strings
 * (a / an / the / some). Article realization belongs to the English Assembler in
 * `@sharpee/lang-en-us`; `articleType` here is a language-neutral selector only.
 *
 * Extensibility (ADR-192 §1): `Phrase` is a CLOSED discriminated union keyed by
 * `kind`. The five foundational kinds are implemented by the Assembler in
 * ADR-192; the seven stub kinds are reserved discriminants whose fields and
 * realization land additively in their follow-on ADRs (193–198 + Verbatim).
 * Extension is additive only — a new member plus a new Assembler case, never a
 * rewrite of the base.
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
  /** Suppresses the article when true. */
  properName?: boolean;
  articleType: 'indefinite' | 'definite' | 'some' | 'none';
  /** Author override for irregular plurals. */
  pluralForm?: string;
  /** Last-mentioned tracking → `Pronoun` resolution (ADR-197). */
  referableId?: EntityId;
  /** Pronoun set for later gendered / neopronoun reference (ADR-197). */
  pronounSet?: string;
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

// ---------------------------------------------------------------------------
// Stub kinds (reserved discriminants; fields + realization land in follow-on ADRs)
// ---------------------------------------------------------------------------
//
// Each stub reserves only its `kind` discriminant so the closed algebra is
// complete now (ADR-192 §2). The owning ADR defines each kind's fields and adds
// its Assembler case; until then the Assembler throws PhraseNotImplementedError.

/** Atom — pronoun reference. Fields + realization: ADR-197. */
export interface Pronoun extends PhraseBase {
  kind: 'pronoun';
}

/** Atom — spelled or numeric quantity. Fields + realization: ADR-198. */
export interface Numeral extends PhraseBase {
  kind: 'number';
}

/** Atom — text passed through untouched. Fields + realization: Verbatim ADR. */
export interface Verbatim extends PhraseBase {
  kind: 'verbatim';
}

/** Combinator — an entity's contents / relational placement. Fields + realization: ADR-194. */
export interface Contents extends PhraseBase {
  kind: 'contents';
}

/** Combinator — a named contribution channel. Fields + realization: ADR-195. */
export interface Slot extends PhraseBase {
  kind: 'slot';
}

/** Modifier — conditionally present phrase. Fields + realization: ADR-196. */
export interface Optional extends PhraseBase {
  kind: 'optional';
}

/** Modifier — one of several variants. Fields + realization: ADR-196. */
export interface Choice extends PhraseBase {
  kind: 'choice';
}

// ---------------------------------------------------------------------------
// The closed union
// ---------------------------------------------------------------------------

/**
 * The closed phrase algebra. Five foundational members are realized in ADR-192;
 * the seven stubs are reserved for their follow-on ADRs. Extension is additive.
 */
export type Phrase =
  | Literal
  | NounPhrase
  | PhraseList
  | Sequence
  | Empty
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
 * Last-mentioned reference context — the seam a later `Pronoun` consumes.
 * SEAM (ADR-197): the implementation and final shape are owned by ADR-197; this
 * declaration only reserves the contract so the core is stable.
 */
export interface ReferenceContext {
  /** The entity most recently realized this turn, if any. */
  lastMentioned(): EntityId | undefined;
  /** Record an entity as last-mentioned. */
  note(referableId: EntityId): void;
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
  /** Last-mentioned context (consumed by `Pronoun`, ADR-197). */
  readonly reference: ReferenceContext;
  /** Per-`(entityId, messageKey)` store (consumed by `Choice`/`Optional`, ADR-196). */
  readonly textState: TextStateStore;
  /** Slot contribution channel (ADR-195). */
  contribute(slotKey: string, phrase: Phrase, opts?: SlotContributionOptions): void;
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
