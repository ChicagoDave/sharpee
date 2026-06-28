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
 * INVARIANT (ADR-192 §7): `realize` is a pure function of `(tree, ctx)` — the
 * same tree and context yield byte-identical output. No clocks, no randomness.
 *
 * Foundational kinds (Literal, NounPhrase, PhraseList, Sequence, Empty) plus the
 * `Verb` (199), `Verbatim` (200), `Numeral` (198), and `Pronoun` (197) atoms are
 * realized here; the four remaining stub kinds throw `PhraseNotImplementedError`.
 */

import {
  Assembler,
  Phrase,
  NounPhrase,
  Verb,
  Pronoun,
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

/** A flattened text run carrying its verbatim flag and decoration stack. */
interface Run {
  text: string;
  /** Verbatim text is exempt from whitespace collapse (Whitespace authority). */
  verbatim: boolean;
  /** Outer→inner decoration wrappers inherited through composition. */
  deco: ReadonlyArray<{ className: string; value?: string }>;
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

/** The noun's surface form for its grammatical number (Agreement authority). */
function nounSurface(np: NounPhrase): string {
  if (np.number === 'plural') return np.pluralForm ?? pluralize(np.name);
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
};

/** Regular rule: the 3rd-singular `lemma` ends in `-s`; the plain form strips it. */
function regularPluralVerb(lemma: string): string {
  if (lemma.endsWith('ies') && lemma.length > 3) return `${lemma.slice(0, -3)}y`; // carries → carry
  if (/(?:s|x|z|ch|sh)es$/.test(lemma)) return lemma.slice(0, -2); // pushes → push, boxes → box
  if (lemma.endsWith('s')) return lemma.slice(0, -1); // opens → open
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
  const rendered = parts.map((part) => {
    if (part.count > 1 && part.np) {
      const adjectives = part.np.adjectives?.length ? `${part.np.adjectives.join(' ')} ` : '';
      const plural = part.np.pluralForm ?? pluralize(part.np.name);
      return `${countWord(part.count)} ${adjectives}${plural}`;
    }
    return renderToString(part.phrase, ctx);
  });
  return joinParts(rendered, conj, serialComma);
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
    const own = extendDeco(deco, phrase.decorations);
    return [{ text: renderPronoun(phrase, ctx), verbatim: false, deco: own }];
  }

  if (isSequence(phrase)) {
    const own = extendDeco(deco, phrase.decorations);
    return phrase.parts.flatMap((part) => realizeToRuns(part, ctx, own));
  }

  // The seven stub kinds: refuse loudly until their follow-on ADR lands.
  throw new PhraseNotImplementedError(phrase.kind);
}

/** Realize a phrase to a plain string (used for list items and nested phrases). */
function renderToString(phrase: Phrase, ctx: RenderContext): string {
  return collapseWhitespace(realizeToRuns(phrase, ctx, []))
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
    const segments = splitRunsOnNewlines(realizeToRuns(tree, ctx, []));
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
