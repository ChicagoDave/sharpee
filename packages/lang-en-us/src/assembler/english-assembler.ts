/**
 * @file English Assembler — realizes a phrase tree to text blocks (ADR-192 §4).
 *
 * Purpose: the single English-locale component that walks a `Phrase` tree and
 * is the SOLE authority for every cross-cutting correctness concern — article,
 * agreement, punctuation, whitespace, reference, and case. It replaces the
 * left-to-right formatter chain (`applyFormatters`) whose early collapse to a
 * bare string lost the metadata neighbours need to agree against.
 *
 * Public interface: `EnglishAssembler` (implements `Assembler`),
 * `ASSEMBLER_DEFAULT_BLOCK_KEY`, and the standalone `capitalizeSentenceStart`
 * case-authority helper.
 *
 * Owner context: `@sharpee/lang-en-us` — English realization. The ADR-190 list
 * formatter logic is reproduced here in the `PhraseList` case (the old
 * `formatters/list.ts` is retired in Phase 3, not called from here).
 *
 * INVARIANT (ADR-192 §7): `realize` is a pure function of `(tree, ctx)` GIVEN the
 * `textState` snapshot — the same tree, context, and counters yield byte-identical
 * output. No clocks, no `Math.random`. The one declared state transition is a
 * `Choice` advancing its `textState` counter (ADR-196 §3) — seeded, deterministic.
 *
 * All if-domain kinds are realized here: the foundational kinds (Literal,
 * NounPhrase, PhraseList, Sequence, Empty) plus the `Verb` (199), `Verbatim`
 * (200), `Numeral` (198), `Pronoun` (197), `Contents` (194), `Slot` (195), and
 * `Optional` / `Choice` (196) atoms. `PhraseNotImplementedError` is now only a
 * defensive guard against a future unhandled kind.
 */

import {
  Assembler,
  Phrase,
  NounPhrase,
  Verb,
  Pronoun,
  Contents,
  Slot,
  Choice,
  RenderContext,
  isLiteral,
  isNounPhrase,
  isPhraseList,
  isSequence,
  isEmpty,
  isVerb,
  isVerbatim,
  isNumeral,
  isPronoun,
  isContents,
  isSlot,
  isOptional,
  isChoice,
  isSpliced,
  isSentence,
  isQuote,
} from '@sharpee/if-domain';
import { ITextBlock, TextContent, IDecoration, CORE_BLOCK_KEYS } from '@sharpee/text-blocks';
import { pluralize } from '../pluralize.js';
import { countWord, numberToWords, ordinalString } from '../number-words.js';
import { PhraseNotImplementedError } from './errors.js';

/**
 * Default channel key for a realized tree. Phase 2 emits one block; the report
 * layer (ADR-192 §6, Phase 4) assigns real channel keys (room.name, …) as it
 * wires per-event trees.
 */
export const ASSEMBLER_DEFAULT_BLOCK_KEY = CORE_BLOCK_KEYS.ACTION_RESULT;

/**
 * A flattened text run carrying its verbatim flag, decoration stack, and the
 * optional grammatical-edge metadata `Sentence`/`Quote`/`Pronoun` emit while
 * realizing (ADR-201 §3.1). The reconciliation pass (§3.2) is the only consumer;
 * an absent field degrades to today's behavior. Structure flows as metadata —
 * never recovered by scanning prose (ADR-202).
 */
interface Run {
  text: string;
  /** Verbatim text is exempt from whitespace collapse (Whitespace authority). */
  verbatim: boolean;
  /** Outer→inner decoration wrappers inherited through composition. */
  deco: ReadonlyArray<{ className: string; value?: string }>;
  /** This run begins a sentence (with `capEligible` → cap its first glyph). */
  sentenceInitial?: boolean;
  /**
   * First glyph may be capitalized when sentence-initial. `false` is an explicit
   * opt-out (e.g. a `{capitalize pronoun:…}` with `capitalize: false`) that the
   * sentence-start marker must not override.
   */
  capEligible?: boolean;
  /** Run carries an opening quote glyph (structural marker; AC-3). */
  quoteOpen?: boolean;
  /** Run carries a closing quote glyph — terminal punctuation goes INSIDE it. */
  quoteClose?: boolean;
  /** Terminal punctuation this run owns; materialized by the reconciliation pass. */
  ownsTrailingPunct?: '.' | '?' | '!';
}

// ===========================================================================
// Article authority — a/an/the/some/∅ agreed over the realized head
// ===========================================================================

/** Indefinite article for a head phrase, agreed over its leading sound. */
function indefiniteArticle(head: string): 'a' | 'an' {
  if (!head) return 'a';
  const lower = head.toLowerCase();
  // Silent-h and vowel-sound exceptions (ported from formatters/article.ts).
  if (lower.startsWith('hour')) return 'an';
  if (lower.startsWith('honest')) return 'an';
  if (lower.startsWith('heir')) return 'an';
  if (lower.startsWith('uni')) return 'a'; // "a university"
  if (lower.startsWith('one')) return 'a'; // "a one-way street"
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  return vowels.includes(lower[0]) ? 'an' : 'a';
}

/** The article surface for a noun phrase, agreed over its rendered head. */
function articleSurface(np: NounPhrase, head: string): string {
  if (np.properName) return ''; // proper names suppress the article
  switch (np.articleType) {
    case 'none':
      return '';
    case 'definite':
      return 'the';
    case 'some':
      return 'some';
    case 'indefinite':
      if (np.number === 'plural') return ''; // "swords", not "a swords"
      if (np.number === 'mass') return 'some'; // "some sand"
      return indefiniteArticle(head);
  }
}

// ===========================================================================
// Agreement authority — number / pluralization
// ===========================================================================

/**
 * The noun's surface form for its grammatical number (Agreement authority).
 *
 * An intrinsically-plural NounPhrase (`number: 'plural'`) carries its plural
 * surface directly in `name` — the producer maps it from `IdentityTrait.name`,
 * which an author marking an entity `.plural()` writes already-plural ("pygmy
 * goats", "direction signs"). So the name is used as-is; only an explicit
 * `pluralForm` overrides it. Re-running `pluralize` here would double-pluralize
 * ("goats" → "goatses"). The count-group path (N identical *singular* entities →
 * "two goats") pluralizes singular names itself and does not pass through here.
 */
function nounSurface(np: NounPhrase): string {
  if (np.number === 'plural') return np.pluralForm ?? np.name;
  return np.name; // singular and mass use the base name
}

/** The head (adjectives + noun) the article agrees over. */
function headWithAdjectives(np: NounPhrase): string {
  const adjectives = np.adjectives && np.adjectives.length ? `${np.adjectives.join(' ')} ` : '';
  return `${adjectives}${nounSurface(np)}`;
}

/** Realize a single noun phrase: article + adjectives + noun, agreed as a whole. */
function renderNoun(np: NounPhrase): string {
  const head = headWithAdjectives(np);
  const article = articleSurface(np, head);
  const text = article ? `${article} ${head}` : head;
  // Case authority: the {capitalize …} hint upper-cases the rendered head.
  return np.capitalize ? capitalizeSentenceStart(text) : text;
}

// ===========================================================================
// Agreement authority — verb conjugation (ADR-199)
// ===========================================================================

/**
 * Suppletive verbs whose plural / 1st-singular forms are not the regular `-s`
 * strip. Keyed by the 3rd-person-singular `lemma` the author types. This is the
 * table lifted out of the deleted `formatters/verb.ts`, extended with do/go.
 */
const IRREGULAR_VERBS: Record<string, { plural: string; firstSingular?: string }> = {
  is: { plural: 'are', firstSingular: 'am' }, // be (present)
  was: { plural: 'were', firstSingular: 'was' }, // be (past): I was / you were
  has: { plural: 'have' }, // have
  does: { plural: 'do' }, // do
  goes: { plural: 'go' }, // go
  // `-ie` stems (ADR-204): 3sg adds only `-s`, so they surface as `-ies` and would be
  // mis-handled by the `ies`→`y` rule (which is correct for the common `-y` stems). This
  // closed set is the exception; add longer derivatives (unties, belies) on demand.
  dies: { plural: 'die' }, // die
  lies: { plural: 'lie' }, // lie
  ties: { plural: 'tie' }, // tie
  vies: { plural: 'vie' }, // vie
};

/**
 * Regular rule: the 3rd-singular `lemma` ends in `-s`; the plain form strips it (ADR-199,
 * refined ADR-204). The `-es` strip applies only to genuine `-es` inflections — a doubled
 * sibilant (`ss`/`zz`) or `x`/`ch`/`sh` — NOT to a single `-se`/`-ze` stem, which added only
 * `-s` (use→uses, refuse→refuses). Single-`s` stems (focus/bus/gas, a rare closed set) that
 * legitimately take `-es` are the residual ambiguity; add them to `IRREGULAR_VERBS` on demand.
 */
function regularPluralVerb(lemma: string): string {
  if (lemma.endsWith('ies') && lemma.length > 3) return `${lemma.slice(0, -3)}y`; // carries → carry
  if (/(?:ss|zz|x|ch|sh)es$/.test(lemma)) return lemma.slice(0, -2); // kisses → kiss, boxes → box, watches → watch
  if (lemma.endsWith('s')) return lemma.slice(0, -1); // opens → open, uses → use, refuses → refuse
  return lemma; // no -s to strip — leave as authored
}

/**
 * The grammatical person of a subject noun phrase. The player subject (matched
 * by `referableId` against `narrative.playerId`) takes the narrative person
 * ("you are" in 2nd-person narration); otherwise an explicit `person` stamp, or
 * undefined (→ third). ADR-199 §4 B, resolved at realize time where the
 * narrative context is reliably present.
 */
function nounPerson(np: NounPhrase, ctx: RenderContext): 'first' | 'second' | 'third' | undefined {
  if (np.referableId !== undefined && np.referableId === ctx.narrative.playerId) {
    return ctx.narrative.person;
  }
  return np.person;
}

/** Read the agreement surface (number, optional person) off a bound subject value. */
function subjectAgreement(subject: unknown, ctx: RenderContext): {
  number: NounPhrase['number'];
  person?: 'first' | 'second' | 'third';
} {
  if (subject !== null && typeof subject === 'object' && typeof (subject as { kind?: unknown }).kind === 'string') {
    const phrase = subject as Phrase;
    if (isNounPhrase(phrase)) return { number: phrase.number, person: nounPerson(phrase, ctx) };
    if (isPhraseList(phrase)) {
      const present = phrase.items.filter((item) => !isEmpty(item));
      if (present.length > 1) return { number: 'plural' }; // "the troll and the goats" → are
      const only = present[0];
      if (present.length === 1 && only && isNounPhrase(only)) return { number: only.number, person: nounPerson(only, ctx) };
      return { number: 'singular' };
    }
  }
  // No agreement surface (Literal, Empty, scalar, unbound) → unmarked default (§4 C).
  return { number: 'singular' };
}

/** Conjugate a lemma for the resolved subject number/person (Agreement authority). */
function conjugateVerb(
  lemma: string,
  number: NounPhrase['number'],
  person: 'first' | 'second' | 'third',
): string {
  // 3rd-person singular (and mass, which agrees singular) is the authored lemma.
  if (person === 'third' && number !== 'plural') return lemma;
  const irregular = IRREGULAR_VERBS[lemma];
  // 1st-person singular suppletive ("I am", "I was").
  if (number !== 'plural' && person === 'first' && irregular?.firstSingular) return irregular.firstSingular;
  // Everything else (plural, or 1st/2nd person) takes the non-3rd-singular form.
  if (irregular) return irregular.plural;
  return regularPluralVerb(lemma);
}

/** Realize a `Numeral` (ADR-198): digits, spelled words, or numeric ordinal. */
function renderNumeral(value: number, format: 'digits' | 'words' | 'ordinal'): string {
  if (Number.isNaN(value)) return ''; // bound to a non-number — authoring error
  switch (format) {
    case 'words':
      return numberToWords(value);
    case 'ordinal':
      return ordinalString(value);
    default:
      return String(value);
  }
}

/** Realize a `Verb` by agreeing it with its referenced subject's resolved surface. */
function renderVerb(verb: Verb, ctx: RenderContext): string {
  const agreement = subjectAgreement(ctx.params[verb.subjectRef], ctx);
  // The subject's own person wins; else the Verb's declared person; else third.
  const person = agreement.person ?? verb.person ?? 'third';
  return conjugateVerb(verb.lemma, agreement.number, person);
}

// ===========================================================================
// Punctuation authority — serial commas, final and/or, no dangling comma
// ===========================================================================

/** Join already-rendered parts with the conjunction, honouring the serial comma. */
function joinParts(parts: string[], conj: 'and' | 'or', serialComma: boolean): string {
  if (parts.length === 0) return 'nothing';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} ${conj} ${parts[1]}`;
  const head = parts.slice(0, -1).join(', ');
  const last = parts[parts.length - 1];
  return serialComma ? `${head}, ${conj} ${last}` : `${head} ${conj} ${last}`;
}

/** A noun phrase groups with identical siblings only if indefinite, singular, common. */
function isGroupable(np: NounPhrase): boolean {
  return np.articleType === 'indefinite' && np.number === 'singular' && !np.properName;
}

/**
 * Realize a list: group identical indefinite common nouns ("two goats"),
 * pluralize, absorb `Empty`, and join under the punctuation authority. This is
 * the ADR-190 list formatter, ported to operate on phrases (not `EntityInfo`).
 */
function renderList(items: Phrase[], conj: 'and' | 'or', ctx: RenderContext): string {
  const present = items.filter((item) => !isEmpty(item)); // Empty absorbed — no dangling comma
  if (present.length === 0) return 'nothing';

  interface Part {
    count: number;
    np?: NounPhrase;
    phrase: Phrase;
  }
  const parts: Part[] = [];
  const groupIndex = new Map<string, number>();
  for (const item of present) {
    if (isNounPhrase(item) && isGroupable(item)) {
      const key = JSON.stringify([item.name, item.adjectives ?? []]);
      const existing = groupIndex.get(key);
      if (existing !== undefined) {
        parts[existing].count++;
        continue;
      }
      groupIndex.set(key, parts.length);
      parts.push({ count: 1, np: item, phrase: item });
    } else {
      parts.push({ count: 1, phrase: item });
    }
  }

  const serialComma = ctx.settings.serialComma ?? true;
  const rendered = parts
    .map((part) => {
      if (part.count > 1 && part.np) {
        const adjectives = part.np.adjectives?.length ? `${part.np.adjectives.join(' ')} ` : '';
        const plural = part.np.pluralForm ?? pluralize(part.np.name);
        return `${countWord(part.count)} ${adjectives}${plural}`;
      }
      return renderToString(part.phrase, ctx);
    })
    // ADR-196: an Optional-absent / Choice→Empty item realizes to "" — absorb it
    // like Empty so it leaves no dangling comma (extends ADR-192 AC-6 to modifiers).
    .filter((s) => s.length > 0);
  if (rendered.length === 0) return 'nothing';
  return joinParts(rendered, conj, serialComma);
}

/**
 * Realize a `Contents` (ADR-194): read the container's live contents from the
 * world, bridge each entity to a `NounPhrase`, and render as a grouped list.
 * Graceful — an unresolved container or missing bridge renders "nothing".
 */
function renderContents(contents: Contents, ctx: RenderContext): string {
  const ref = ctx.params[contents.containerRef];
  let containerId: string | undefined;
  if (typeof ref === 'string') {
    containerId = ref;
  } else if (ref !== null && typeof ref === 'object' && (ref as { kind?: unknown }).kind === 'noun') {
    containerId = (ref as NounPhrase).referableId;
  }
  const bridge = ctx.world.nounPhraseFor;
  if (containerId === undefined || !bridge) return 'nothing';
  const items = ctx.world
    .getEntityContents(containerId)
    .map((entity) => bridge(entity.id))
    .filter((np): np is NounPhrase => np !== undefined);
  return renderList(items, contents.conj ?? 'and', ctx);
}

/**
 * Realize a `Slot` (ADR-195 §4): peek the turn's contributions for `slotKey`,
 * realize each, absorb any that render empty (AC-4), and join the survivors. The
 * SLOT owns the connective grammar — the contribution is bare content:
 *
 *  - zero survivors → `''` (the slot is `Empty`; the stem + its terminator stay
 *    clean, no dangling space/comma — AC-3);
 *  - `sentence` mode (default) → a leading space then the survivors space-joined,
 *    so they follow the stem's terminator as independent sentences (AC-1);
 *  - `clause` mode → a leading `", "` then the survivors joined through the
 *    punctuation authority (`joinParts`: serial comma + final `conj`), so they
 *    attach as clauses before the stem's terminator (AC-2).
 *
 * The accessor is optional (`?.`): a context that never wired the store yields no
 * contributions, so the slot simply realizes empty (ADR-195 §2).
 */
function renderSlot(slot: Slot, ctx: RenderContext): string {
  const contributions = ctx.slotContributions?.(slot.slotKey) ?? [];
  const surfaces = contributions
    .map((phrase) => renderToString(phrase, ctx))
    .filter((s) => s.length > 0); // absorb Empty / empty-rendering contributions (AC-4)
  if (surfaces.length === 0) return ''; // zero contributions → Empty, clean stem (AC-3)
  if ((slot.mode ?? 'sentence') === 'clause') {
    const serialComma = ctx.settings.serialComma ?? true;
    return `, ${joinParts(surfaces, slot.conj ?? 'and', serialComma)}`;
  }
  return ` ${surfaces.join(' ')}`;
}

// ===========================================================================
// Reference authority — last-mentioned tracking (placeholder; ADR-197)
// ===========================================================================

/**
 * Record a realized noun phrase as last-mentioned so a later `Pronoun` can refer
 * to it. The real resolution lands in ADR-197; here the Assembler only feeds the
 * seam so the contract is exercised end-to-end.
 */
function noteReference(np: NounPhrase, ctx: RenderContext): void {
  if (np.referableId !== undefined) {
    ctx.reference.note({ referableId: np.referableId, number: np.number, pronounSet: np.pronounSet });
  }
}

// ===========================================================================
// Pronoun authority — case × number × gender (ADR-197)
// ===========================================================================

/** he/she/it/they forms keyed by case. */
const PRONOUNS: Record<'he' | 'she' | 'it' | 'they', Record<Pronoun['case'], string>> = {
  he: { subject: 'he', object: 'him', possessive: 'his', 'possessive-pronoun': 'his', reflexive: 'himself' },
  she: { subject: 'she', object: 'her', possessive: 'her', 'possessive-pronoun': 'hers', reflexive: 'herself' },
  it: { subject: 'it', object: 'it', possessive: 'its', 'possessive-pronoun': 'its', reflexive: 'itself' },
  they: { subject: 'they', object: 'them', possessive: 'their', 'possessive-pronoun': 'theirs', reflexive: 'themselves' },
};

/** Pick the gender row for a referent: explicit pronounSet, else by number. */
function genderOf(ref: { number: NounPhrase['number']; pronounSet?: string }): 'he' | 'she' | 'it' | 'they' {
  const set = ref.pronounSet?.toLowerCase();
  if (set === 'he' || set === 'masculine') return 'he';
  if (set === 'she' || set === 'feminine') return 'she';
  if (set === 'they' || set === 'plural' || set === 'nonbinary') return 'they';
  if (set === 'it' || set === 'neuter') return 'it';
  return ref.number === 'plural' ? 'they' : 'it'; // no set → by number (mass agrees singular)
}

/** Realize a `Pronoun` (ADR-197): the last-mentioned referent in the requested case. */
function renderPronoun(pronoun: Pronoun, ctx: RenderContext): string {
  const ref = ctx.reference.lastMentioned();
  // Graceful: no antecedent → neuter singular for the case (no throw).
  const gender = ref ? genderOf(ref) : 'it';
  return PRONOUNS[gender][pronoun.case];
}

// ===========================================================================
// Whitespace authority — collapse, verbatim-exempt
// ===========================================================================

/**
 * Collapse runs of whitespace in non-verbatim runs to a single space, drop
 * whitespace at run boundaries, and trim the block ends. Verbatim runs pass
 * through untouched (ADR-183 whitespace authority, now Assembler-owned).
 */
function collapseWhitespace(runs: Run[]): Run[] {
  const out: Run[] = [];
  let prevEndedWithSpace = true; // seeded true so leading whitespace is trimmed
  for (const run of runs) {
    if (run.verbatim) {
      out.push(run);
      if (run.text.length > 0) prevEndedWithSpace = /\s$/.test(run.text);
      continue;
    }
    let text = run.text.replace(/\s+/g, ' ');
    if (prevEndedWithSpace) text = text.replace(/^ /, '');
    if (text.length === 0) continue;
    out.push({ ...run, text });
    prevEndedWithSpace = / $/.test(text);
  }
  // Trim trailing space on the final non-verbatim run.
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i].verbatim) break;
    out[i] = { ...out[i], text: out[i].text.replace(/ $/, '') };
    if (out[i].text.length > 0) break;
  }
  return out.filter((r) => r.verbatim || r.text.length > 0);
}

// ===========================================================================
// Case authority — sentence-start capitalization
// ===========================================================================

/**
 * Capitalize the first alphabetic character of a sentence. Exposed as the Case
 * authority; the explicit `{capitalize …}` template hint is wired to it by the
 * parser in Phase 3 (ADR-192 §5). Not auto-applied — realization preserves the
 * author's case unless capitalization is requested.
 *
 * @param text the realized text
 * @returns the text with its first letter upper-cased
 */
export function capitalizeSentenceStart(text: string): string {
  const index = text.search(/[a-z]/i);
  if (index < 0) return text;
  return text.slice(0, index) + text[index].toUpperCase() + text.slice(index + 1);
}

// ===========================================================================
// Choice selection (ADR-196 §2/§3) — deterministic, persistent variation
// ===========================================================================

/**
 * FNV-1a 32-bit hash of a seed string. Deterministic; used only to seed the PRNG.
 */
function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * `mulberry32` — a tiny deterministic PRNG. Seeded from `(entityId, messageKey,
 * counter)`, never `Math.random`/`Date.now`, so `random`/`sticky` selection
 * reproduces byte-identically across runs and after save/restore (ADR-196 §3).
 */
function seededUnitFloat(entityId: string, messageKey: string, counter: number): number {
  let a = hashSeed(`${entityId}\0${messageKey}\0${counter}`) >>> 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Same-key pick agreement within one top-level `realize()` pass (ADR-209 AC-8).
 * Two `Choice` nodes sharing an `(entityId, messageKey)` in one realized tree
 * — e.g. a duplicate `{snippet:x}` marker — yield the SAME alternative and
 * advance the persisted counter once. Existing choice sites use unique keys,
 * so their behavior is unchanged. Scoped per top-level pass (set/cleared by
 * `realize`), so successive renders still advance normally; nested
 * `renderToString` calls share the enclosing pass's picks.
 */
let activeChoicePicks: Map<string, Phrase> | null = null;

/**
 * Select a `Choice`'s alternative from its persisted counter and advance the
 * counter (ADR-196 §2). This is the one place the Assembler writes `ctx.textState`
 * — the declared realize-time mutation (ADR-192 §7 / ADR-196 §4).
 *
 * Stored-number encoding: a trigger count for cycling/stopping/firstTime/random;
 * the chosen index + 1 (sentinel 0/undefined = unchosen) for sticky.
 *
 * @returns the selected alternative phrase (caller realizes it; may be Empty).
 */
function selectChoice(choice: Choice, ctx: RenderContext): Phrase {
  const memoKey = `${choice.entityId}\0${choice.messageKey}`;
  const memoized = activeChoicePicks?.get(memoKey);
  if (memoized !== undefined) return memoized;
  const pick = pickChoiceAlternative(choice, ctx);
  activeChoicePicks?.set(memoKey, pick);
  return pick;
}

/** The counter read/advance half of `selectChoice` (memoized per pass above). */
function pickChoiceAlternative(choice: Choice, ctx: RenderContext): Phrase {
  const { alternatives, selector, entityId, messageKey } = choice;
  const len = alternatives.length;
  if (len === 0) return { kind: 'empty' }; // defensive — the contract requires ≥ 1
  const stored = ctx.textState.get(entityId, messageKey);

  switch (selector) {
    case 'cycling': {
      const n = stored ?? 0;
      ctx.textState.set(entityId, messageKey, n + 1);
      return alternatives[n % len];
    }
    case 'stopping': {
      const n = stored ?? 0;
      ctx.textState.set(entityId, messageKey, n + 1);
      return alternatives[Math.min(n, len - 1)];
    }
    case 'firstTime': {
      const n = stored ?? 0;
      ctx.textState.set(entityId, messageKey, Math.min(n + 1, 1));
      return alternatives[n === 0 ? 0 : Math.min(1, len - 1)];
    }
    case 'random': {
      const n = stored ?? 0;
      ctx.textState.set(entityId, messageKey, n + 1);
      return alternatives[Math.floor(seededUnitFloat(entityId, messageKey, n) * len)];
    }
    case 'sticky': {
      // Already chosen — replay the persisted index (stored = index + 1).
      if (stored && stored > 0) return alternatives[Math.min(stored - 1, len - 1)];
      const i = Math.floor(seededUnitFloat(entityId, messageKey, 0) * len);
      ctx.textState.set(entityId, messageKey, i + 1);
      return alternatives[i];
    }
  }
}

// ===========================================================================
// Realization core
// ===========================================================================

/** Push a phrase's own decorations onto the inherited stack. */
function extendDeco(
  base: ReadonlyArray<{ className: string; value?: string }>,
  decorations: IDecoration[] | undefined,
): ReadonlyArray<{ className: string; value?: string }> {
  if (!decorations || decorations.length === 0) return base;
  return [
    ...base,
    ...decorations.map((d) => (d.value !== undefined ? { className: d.className, value: d.value } : { className: d.className })),
  ];
}

// ===========================================================================
// Sentence/Quote edge metadata (ADR-201 §3) — emitted here, resolved by the
// reconciliation pass. All reads below are a NODE'S OWN realized surface
// (its child/utterance runs), never neighbours' or whole-output prose (ADR-202).
// ===========================================================================

/** A node's own last glyph already terminates the clause (so no auto-terminal). */
function endsWithTerminalOrEllipsis(text: string): boolean {
  const t = text.trimEnd();
  // `.` already covers a `...` ellipsis; `…` is the single-glyph form.
  return t.endsWith('.') || t.endsWith('?') || t.endsWith('!') || t.endsWith('…');
}

/** True if the last non-empty run of a realized child ends in terminal punctuation. */
function lastContentRunEndsTerminal(runs: Run[]): boolean {
  for (let i = runs.length - 1; i >= 0; i--) {
    if (runs[i].text.length > 0) return endsWithTerminalOrEllipsis(runs[i].text);
  }
  return false;
}

/**
 * Flag the first non-empty run as sentence-initial + cap-eligible, so the
 * reconciliation pass capitalizes a sentence's / quote's first word. An explicit
 * `capEligible: false` (author opt-out) is preserved, not overridden.
 */
function markFirstSentenceInitial(runs: Run[]): Run[] {
  const i = runs.findIndex((r) => r.text.length > 0);
  if (i < 0) return runs;
  const copy = runs.slice();
  copy[i] = { ...copy[i], sentenceInitial: true, capEligible: copy[i].capEligible === false ? false : true };
  return copy;
}

/** Mark the last non-empty run as owning a trailing terminal mark (Sentence close). */
function markLastTrailingTerminal(runs: Run[], terminal: '.' | '?' | '!'): Run[] {
  for (let i = runs.length - 1; i >= 0; i--) {
    if (runs[i].text.length > 0) {
      const copy = runs.slice();
      copy[i] = { ...copy[i], ownsTrailingPunct: terminal };
      return copy;
    }
  }
  return runs;
}

/** Realize a phrase to flat runs, threading the decoration stack through composition. */
function realizeToRuns(
  phrase: Phrase,
  ctx: RenderContext,
  deco: ReadonlyArray<{ className: string; value?: string }>,
): Run[] {
  if (isEmpty(phrase)) return [];

  if (isLiteral(phrase)) {
    const own = extendDeco(deco, phrase.decorations);
    return [{ text: phrase.text, verbatim: phrase.whitespace === 'verbatim', deco: own }];
  }

  if (isNounPhrase(phrase)) {
    const own = extendDeco(deco, phrase.decorations);
    noteReference(phrase, ctx);
    return [{ text: renderNoun(phrase), verbatim: false, deco: own }];
  }

  if (isPhraseList(phrase)) {
    const own = extendDeco(deco, phrase.decorations);
    return [{ text: renderList(phrase.items, phrase.conj, ctx), verbatim: false, deco: own }];
  }

  if (isVerb(phrase)) {
    const own = extendDeco(deco, phrase.decorations);
    return [{ text: renderVerb(phrase, ctx), verbatim: false, deco: own }];
  }

  if (isVerbatim(phrase)) {
    // Opaque pass-through (ADR-200): exempt from whitespace collapse.
    const own = extendDeco(deco, phrase.decorations);
    return [{ text: phrase.text, verbatim: true, deco: own }];
  }

  if (isNumeral(phrase)) {
    // Numeral (ADR-198): digits / spelled words / ordinal.
    const own = extendDeco(deco, phrase.decorations);
    return [{ text: renderNumeral(phrase.value, phrase.format), verbatim: false, deco: own }];
  }

  if (isPronoun(phrase)) {
    // Pronoun (ADR-197): the last-mentioned referent in the requested case.
    // ADR-201 §2 (Q1) capitalization: `true` ⇒ cap now (own-glyph rule); `false`
    // ⇒ never (opt out of sentence-start cap); absent ⇒ defer to position — if it
    // lands sentence-initial, `markFirstSentenceInitial` flags it for the pass.
    const own = extendDeco(deco, phrase.decorations);
    const text = renderPronoun(phrase, ctx);
    if (phrase.capitalize === true) {
      return [{ text: capitalizeSentenceStart(text), verbatim: false, deco: own }];
    }
    if (phrase.capitalize === false) {
      return [{ text, verbatim: false, deco: own, capEligible: false }];
    }
    return [{ text, verbatim: false, deco: own }];
  }

  if (isContents(phrase)) {
    // Contents (ADR-194): the container's live contents as a grouped list.
    const own = extendDeco(deco, phrase.decorations);
    return [{ text: renderContents(phrase, ctx), verbatim: false, deco: own }];
  }

  if (isSlot(phrase)) {
    // Slot (ADR-195): the turn's contributions for this key, joined under the
    // slot-owned connective grammar. Zero survivors → no run (absorbed as Empty).
    const own = extendDeco(deco, phrase.decorations);
    const text = renderSlot(phrase, ctx);
    return text ? [{ text, verbatim: false, deco: own }] : [];
  }

  if (isSequence(phrase)) {
    const own = extendDeco(deco, phrase.decorations);
    return phrase.parts.flatMap((part) => realizeToRuns(part, ctx, own));
  }

  if (isOptional(phrase)) {
    // Optional (ADR-196 §1): the producer resolved `present`; realize the child or
    // nothing. Absent → no runs, absorbed by the enclosing combinator like Empty.
    const own = extendDeco(deco, phrase.decorations);
    return phrase.present ? realizeToRuns(phrase.child, ctx, own) : [];
  }

  if (isChoice(phrase)) {
    // Choice (ADR-196 §2): select one alternative from the persisted counter,
    // advance the counter, and realize the winner. A winner that realizes to
    // Empty leaves no runs (once-only text).
    const own = extendDeco(deco, phrase.decorations);
    return realizeToRuns(selectChoice(phrase, ctx), ctx, own);
  }

  if (isSpliced(phrase)) {
    // Spliced (ADR-211 §2): a description-marker fragment annotated with its
    // marker-site join mode. A fragment that absorbs to nothing (the `nothing`
    // variant, a gated-out fragment) renders the host prose as if the marker
    // were absent — no separator either. Otherwise the platform supplies the
    // separator the author never writes: `, ` at a clause site, ` ` at a
    // sentence site. The separator CHARACTERS live here (locale realization);
    // the mode was computed producer-side from the authored prose, and
    // boundary sites never wrap in Spliced at all (resolver contract).
    const own = extendDeco(deco, phrase.decorations);
    const runs = realizeToRuns(phrase.content, ctx, own);
    if (!runs.some((r) => r.text.length > 0)) return [];
    return [{ text: phrase.mode === 'clause' ? ', ' : ' ', verbatim: false, deco: own }, ...runs];
  }

  if (isSentence(phrase)) {
    // Sentence (ADR-201 §2): realize the child as a sentence — cap its first word
    // and emit a terminal mark at its close, suppressed if the child already ends
    // in terminal punctuation or an ellipsis (no double-punctuation).
    const own = extendDeco(deco, phrase.decorations);
    let runs = markFirstSentenceInitial(realizeToRuns(phrase.child, ctx, own));
    if (!lastContentRunEndsTerminal(runs)) {
      runs = markLastTrailingTerminal(runs, phrase.terminal ?? '.');
    }
    return runs;
  }

  if (isQuote(phrase)) {
    // Quote (ADR-201 §2): wrap the utterance in locale glyphs, cap its first word,
    // and place terminal punctuation INSIDE the closing glyph (suppressed if the
    // utterance already ends terminal/ellipsis). The attributive comma is the
    // template's in v1 (explicit composition, ADR §5) — the Quote does not own it.
    // An utterance that absorbs to nothing absorbs the whole quote (no stray `""`).
    const own = extendDeco(deco, phrase.decorations);
    const utterance = markFirstSentenceInitial(realizeToRuns(phrase.utterance, ctx, own));
    if (!utterance.some((r) => r.text.length > 0)) return [];
    const open: Run = { text: ctx.settings.openQuote ?? '"', verbatim: false, deco: own, quoteOpen: true };
    const close: Run = { text: ctx.settings.closeQuote ?? '"', verbatim: false, deco: own, quoteClose: true };
    if (!lastContentRunEndsTerminal(utterance)) {
      close.ownsTrailingPunct = phrase.terminal ?? '.';
    }
    return [open, ...utterance, close];
  }

  // Defensive: every if-domain kind is realized above, so `phrase` narrows to
  // `never` here — TypeScript proves exhaustiveness. The cast keeps the guard
  // live at runtime: a future kind added without a case is refused loudly,
  // naming it, rather than silently dropping text.
  throw new PhraseNotImplementedError((phrase as Phrase).kind);
}

/**
 * The single structural reconciliation pass (ADR-201 §3.2). Walks the realized
 * runs once and resolves, using run metadata only (never prose scanning, ADR-202):
 *  1. Capitalization — upper-case the first glyph of each `sentenceInitial`
 *     `capEligible` run (the case authority's glyph helper does the upper-casing).
 *  2. Terminal punctuation — materialize each `ownsTrailingPunct`: a closing-quote
 *     run places it INSIDE the glyph (`."`); any other run appends it.
 * Whitespace collapse (§3.2 step 4) stays the final per-segment step in `realize`.
 */
function reconciliationPass(runs: Run[]): Run[] {
  return runs.map((run) => {
    let out = run;
    if (out.sentenceInitial && out.capEligible === true && out.text.length > 0) {
      out = { ...out, text: capitalizeSentenceStart(out.text) };
    }
    if (out.ownsTrailingPunct) {
      out = out.quoteClose
        ? { ...out, text: out.ownsTrailingPunct + out.text } // terminal inside the closing glyph
        : { ...out, text: out.text + out.ownsTrailingPunct }; // sentence terminal appended
    }
    return out;
  });
}

/** Realize a phrase to a plain string (used for list items and nested phrases). */
function renderToString(phrase: Phrase, ctx: RenderContext): string {
  return collapseWhitespace(reconciliationPass(realizeToRuns(phrase, ctx, [])))
    .map((r) => r.text)
    .join('');
}

/** Build text content from collapsed runs, nesting decorations where present. */
function runsToContent(runs: Run[]): TextContent[] {
  const content: TextContent[] = [];
  let buffer = '';
  for (const run of runs) {
    if (run.deco.length === 0) {
      buffer += run.text;
      continue;
    }
    if (buffer) {
      content.push(buffer);
      buffer = '';
    }
    content.push(wrapDecorations(run.text, run.deco));
  }
  if (buffer) content.push(buffer);
  if (content.length === 0) content.push('');
  return content;
}

/** Wrap text in nested decorations, outermost first. */
function wrapDecorations(
  text: string,
  stack: ReadonlyArray<{ className: string; value?: string }>,
): IDecoration {
  let node: TextContent = text;
  for (let i = stack.length - 1; i >= 0; i--) {
    const layer = stack[i];
    node =
      layer.value !== undefined
        ? { className: layer.className, content: [node], value: layer.value }
        : { className: layer.className, content: [node] };
  }
  return node as IDecoration;
}

/** One emitted block's runs plus whether it is a tight continuation. */
interface Segment {
  runs: Run[];
  tight: boolean;
}

/**
 * Split a run stream into per-block segments at newline boundaries (Whitespace
 * authority — the block-structure half ADR-183/`createBlocks` owned). A single
 * `\n` makes the next block a `tight` continuation; a blank line (`\n\n+`) starts
 * a fresh paragraph. Newlines split every run — verbatim runs keep their
 * *horizontal* whitespace but still break into blocks, matching the legacy
 * `createBlocks` behaviour. No block's content carries a `\n`.
 */
function splitRunsOnNewlines(runs: Run[]): Segment[] {
  const segments: Segment[] = [];
  let current: Run[] = [];
  let tight = false; // the first segment is never a tight continuation
  for (const run of runs) {
    const pieces = run.text.split(/(\n+)/); // keep the newline groups as separators
    for (const piece of pieces) {
      if (piece === '') continue;
      if (/^\n+$/.test(piece)) {
        segments.push({ runs: current, tight });
        current = [];
        tight = piece.length === 1; // single \n → tight; blank line → paragraph
      } else {
        current.push({ ...run, text: piece });
      }
    }
  }
  segments.push({ runs: current, tight });
  return segments;
}

/**
 * The English Assembler. Realizes a phrase tree to text blocks under the default
 * channel key; the report layer re-keys per channel.
 */
export class EnglishAssembler implements Assembler {
  /**
   * Realize a phrase tree to text blocks.
   *
   * Newlines in the realized text are lifted to block boundaries (no block's
   * content carries `\n`); horizontal whitespace is collapsed per block, except
   * in verbatim runs. A single-line tree yields one block.
   *
   * @param tree the phrase tree to realize
   * @param ctx the render context (world, params, settings, seams)
   * @returns the realized text blocks
   * @throws PhraseNotImplementedError when a reserved stub kind is encountered
   */
  realize(tree: Phrase, ctx: RenderContext): ITextBlock[] {
    // Open a same-key Choice pick scope for this pass (ADR-209 AC-8) — only at
    // the top level, so nested realizes (list items) share the enclosing scope.
    const rootPass = activeChoicePicks === null;
    if (rootPass) activeChoicePicks = new Map();
    try {
      return this.realizePass(tree, ctx);
    } finally {
      if (rootPass) activeChoicePicks = null;
    }
  }

  /** The realize body, run inside the per-pass Choice pick scope. */
  private realizePass(tree: Phrase, ctx: RenderContext): ITextBlock[] {
    let runs = realizeToRuns(tree, ctx, []);
    // Honor the optional position seam (ADR-201 §4): a context that declares it
    // starts sentence-initial flags the first word for capitalization. Absent →
    // not sentence-initial (today's behavior), so existing render paths are unaffected.
    if (ctx.position?.sentenceInitial) runs = markFirstSentenceInitial(runs);
    const segments = splitRunsOnNewlines(reconciliationPass(runs));
    const blocks: ITextBlock[] = [];
    for (const seg of segments) {
      const content = runsToContent(collapseWhitespace(seg.runs));
      // Drop blank lines — they leave no block (paragraph spacing comes from
      // the `tight` flag on the following block).
      if (content.length === 1 && content[0] === '') continue;
      blocks.push({
        key: ASSEMBLER_DEFAULT_BLOCK_KEY,
        content,
        ...(seg.tight ? { tight: true } : {}),
      });
    }
    if (blocks.length === 0) {
      blocks.push({ key: ASSEMBLER_DEFAULT_BLOCK_KEY, content: [''] });
    }
    return blocks;
  }
}
