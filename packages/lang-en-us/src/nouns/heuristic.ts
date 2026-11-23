/**
 * heuristic.ts — ADR-321 D6b's article-anchored noun-phrase reader, and the one
 * English tokenizer every reader of prose shares.
 *
 * Purpose: one half of the English noun extractor (ADR-407 D4). It moved here
 * from `packages/world-index/src/incomplete.ts` (ADR-407 D8) and its rules are
 * unchanged; what it adds is the character offset of each phrase, which the
 * `NounCandidate` contract asks for. It reads its articles from the one word
 * table (`data/words.ts`, ADR-387 D1); the boundary and head-stopword lists are
 * extraction-only, not words a player types, so they live here and never in
 * the table (the main entry imports the table, and the story runtime would
 * carry them).
 *
 * **The lists below are the specification** (ADR-321 D6b). The extractor is
 * tuned for recall: a missed gap is worse than a junk entry. Changing a word in
 * `BOUNDARY_WORDS` or `HEAD_STOPWORDS` changes what every reader reports, and
 * the corpus pins in `@sharpee/world-index` show it as a diff.
 *
 * Public interface (within the `nouns` subpath): `tokenize`, `tokenizeWithOffsets`,
 * `extractHeuristicPhrases`, `isReportableHead`, `ENGLISH_NOUN_FILTERS`, and the
 * `HeuristicPhrase` and `Token` shapes.
 *
 * Owner context: @sharpee/lang-en-us, `nouns` subpath — English prose reading
 * for lenses and static readers, outside the story runtime.
 *
 * @see ADR-321 D6b, D16; ADR-407 D4, D8
 */

import type { NounFilters } from '@sharpee/if-domain';
import { englishWords } from '../data/words.js';

/** Words that open a noun phrase: a phrase is read forward from an article. */
const ARTICLES: ReadonlySet<string> = new Set(englishWords.articles);

/**
 * Words that end a noun phrase before it reaches its head.
 *
 * Prepositions, conjunctions, relatives, auxiliaries, the locatives `here` and
 * `there`, and the verbs prose most often puts straight after a noun phrase. A
 * word here means the run stops: everything after it belongs to the next clause,
 * not to this noun.
 *
 * **Known limit**: a verb this list does not name swallows the phrase it follows
 * (*the hurricane lamp burns* reads as a three-word phrase headed by `burns`).
 * The tagger half of the English extractor (`tagger.ts`) is what covers it.
 */
const BOUNDARY_WORDS: ReadonlySet<string> = new Set(
  (
    'of in on at to from with by for into onto over under across through toward towards and or but ' +
    'that which who where when while as if than then so is are was were be been being has have had runs run stands stand ' +
    'sits sit rises rise looms loom lies lie hangs hang glimmers glimmer curves curve opens open closes close leads lead ' +
    'goes go comes come takes take gives give holds hold keeps keep smells smell tastes taste feels feel looks look seems ' +
    'seem climbs climb glitter glitters before after against beneath behind beside between within without above below ' +
    'along around past near always never often once again still yet just only even more most less least much many few ' +
    'might must could would should will shall can may shut standing sitting lying hanging pretending shows show hunches ' +
    'hunch waits wait left right turns turn here there'
  ).split(/\s+/),
);

/**
 * Head nouns that are never a thing the author forgot to implement.
 *
 * Directions, abstractions, body parts, units of time and space, and the
 * architectural nouns every room description uses without meaning an object.
 */
const HEAD_STOPWORDS: ReadonlySet<string> = new Set(
  (
    'north south east west up down here there way air light dark darkness night day morning evening ' +
    'hand hands eye eyes face voice sound smell cold heat time moment place side end edge back front top bottom middle ' +
    'nothing something anything everything one two three other others rest half world year years hour hours minute ' +
    'minutes floor ceiling corner room home ground sky sun moon star stars water fire earth wind rain snow dust dirt ' +
    'thing things kind sort size shape colour color part parts piece pieces bit bits lot lots deal last first next best ' +
    'worst same very quite rather four five six seven eight nine ten dozen score cast long wide tall short deep high low'
  ).split(/\s+/),
);

/** The most words a noun phrase may carry before it stops being one. */
export const MAX_PHRASE_WORDS = 3;

/**
 * The shortest a head noun may be.
 *
 * Three, not four: interactive fiction is full of three-letter objects (key,
 * box, lid, tin, pot, rug, axe, urn), and a four-letter floor drops every one.
 */
const MIN_HEAD_LENGTH = 3;

/**
 * The head filters above, as the data the contract publishes (ADR-407 Amendment 3).
 *
 * Built from the same constants `isReportableHead` and the run limit read, so
 * what a reader is told and what `extract` does cannot differ.
 */
export const ENGLISH_NOUN_FILTERS: NounFilters = Object.freeze({
  headStopwords: Object.freeze([...HEAD_STOPWORDS]),
  minHeadLength: MIN_HEAD_LENGTH,
  maxPhraseWords: MAX_PHRASE_WORDS,
});

/** The sentinel a non-word character becomes: it ends a run. */
const BREAK = '|';

/** One token of a passage and where it starts. */
export interface Token {
  /** The word, lowercased, or the `|` sentinel for punctuation and any non-letter. */
  readonly word: string;
  /** Character offset of the token in the passage. */
  readonly offset: number;
  /** Character offset just past the token. */
  readonly end: number;
}

/** A phrase the heuristic read, with where it starts and ends in the passage. */
export interface HeuristicPhrase {
  /** Its words, lowercased, in order; the last is the head. */
  readonly words: readonly string[];
  /** Character offset of the first word. */
  readonly offset: number;
  /** Character offset just past the last word. */
  readonly end: number;
}

/**
 * Split a passage into tokens, with offsets.
 *
 * Letters (ASCII), apostrophes and hyphens make words; every other character
 * that is not whitespace becomes the `|` sentinel that ends a run; a lone
 * hyphen is dropped. A hyphen joins, it does not break: the author writes *the
 * tiring-house door* and the thing's own name is `tiring-house door` (ADR-321 D16).
 *
 * @param text the passage, any casing
 * @returns its tokens in reading order; [] for an empty passage
 */
export function tokenizeWithOffsets(text: string): Token[] {
  const tokens: Token[] = [];
  for (const match of text.matchAll(/[A-Za-z'\-]+|[^A-Za-z'\-\s]/g)) {
    const raw = match[0];
    const offset = match.index ?? 0;
    if (raw === '-') continue;
    const isWord = /[A-Za-z'\-]/.test(raw[0]);
    tokens.push({ word: isWord ? raw.toLowerCase() : BREAK, offset, end: offset + raw.length });
  }
  return tokens;
}

/**
 * Split a passage into the words English readers treat as words.
 *
 * One reading, shared: the phrase extractors run over these tokens, and
 * ADR-321 D13's unnamed-tool check asks whether a thing's own vocabulary
 * appears among them. Two tokenizers would let a thing be named for one
 * question and unnamed for the other (ADR-321 D16).
 *
 * The `|` sentinel that `tokenizeWithOffsets` puts where punctuation ends a run
 * is not a word, so it is left out here; the phrase readers use the tokens.
 *
 * @param text the passage, any casing
 * @returns its words, lowercased, hyphenated compounds kept whole; [] for an
 *   empty passage
 */
export function tokenize(text: string): string[] {
  return tokenizeWithOffsets(text)
    .filter((token) => token.word !== BREAK)
    .map((token) => token.word);
}

/**
 * Whether a word ends in a verb or participle suffix.
 *
 * @param word the word to test
 * @returns true for `-ed` and `-ing` endings, which head no noun phrase here
 */
function looksInflected(word: string): boolean {
  return /(?:ed|ing)$/.test(word);
}

/**
 * Whether a token is a possessive form.
 *
 * @param word the token to test
 * @returns true for `house's` and `players'`: owners, never names
 */
export function isPossessive(word: string): boolean {
  return /'s$|s'$/.test(word);
}

/**
 * Whether a head noun is one either half of the extractor may report.
 *
 * The filter both halves share (ADR-321 D11: two readings must agree on what
 * counts as a head worth reporting). The heuristic also refuses inflected
 * heads, which the tagger does not need because it reads part of speech.
 *
 * @param head the candidate head, lowercased
 * @returns false for heads shorter than three letters and for the stopwords
 */
export function isReportableHead(head: string): boolean {
  return head.length >= MIN_HEAD_LENGTH && !HEAD_STOPWORDS.has(head);
}

/**
 * Pull the noun phrases out of a passage of authored prose, by article.
 *
 * Each run starts at an article and stops at the first boundary word, adverb,
 * further article, possessive, or punctuation. A run of one to three words
 * whose last word can plausibly head a noun phrase is a candidate.
 *
 * @param text the passage, any casing
 * @returns each distinct phrase (by its words), in order of appearance
 */
export function extractHeuristicPhrases(text: string): HeuristicPhrase[] {
  const tokens = tokenizeWithOffsets(text);

  const found: HeuristicPhrase[] = [];
  const seen = new Set<string>();

  for (let start = 0; start < tokens.length; start += 1) {
    if (!ARTICLES.has(tokens[start].word)) continue;

    const run: Token[] = [];
    for (let at = start + 1; at < Math.min(start + 2 + MAX_PHRASE_WORDS, tokens.length); at += 1) {
      const token = tokens[at].word;
      if (token === BREAK || BOUNDARY_WORDS.has(token) || ARTICLES.has(token) || /ly$/.test(token)) break;
      // A possessive names its owner, not the head: *the house's first play* is a
      // phrase about the play, and the owner is never what a player types.
      if (isPossessive(token)) break;
      run.push(tokens[at]);
    }
    if (run.length === 0 || run.length > MAX_PHRASE_WORDS) continue;

    const head = run[run.length - 1].word;
    if (looksInflected(head) || !isReportableHead(head)) continue;

    const words = run.map((token) => token.word);
    const key = words.join(' ');
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ words, offset: run[0].offset, end: run[run.length - 1].end });
  }
  return found;
}
