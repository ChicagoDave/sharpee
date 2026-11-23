/**
 * tagger.ts — the part-of-speech half of the English noun extractor (ADR-407 D4).
 *
 * Purpose: read noun phrases out of prose with `compromise` (pinned to 14.20.0),
 * cleaned so each piece is a phrase a player could type. The heuristic half
 * (`heuristic.ts`) anchors on articles; this half finds the nouns it cannot see,
 * such as *stubs of tallow in iron prickets*, which has no article at all.
 *
 * Cleaning, per ADR-407 D4: each noun chunk is split wherever compromise tags a
 * preposition, conjunction, determiner or pronoun, or a possessive (an owner is
 * never a head, as in the heuristic), so `its row of candles` gives `row` and
 * `candles` and `stable a horse` gives `horse`. Leading numbers are stripped
 * (`three long tables` gives `long tables`). Indefinite pronouns compromise tags
 * as nouns (`someone`) are dropped. A piece must end in a noun. Its words are then
 * read through the shared tokenizer, so a hyphenated compound is one word here as
 * it is everywhere else (ADR-321 D16), and its head must pass the filter the
 * heuristic uses (ADR-321 D11).
 *
 * The tagger is reached only through `extractTaggedPhrases`, so `wink-nlp` or a
 * successor can replace it without touching a reader.
 *
 * Public interface (within the `nouns` subpath): `extractTaggedPhrases`.
 *
 * Owner context: @sharpee/lang-en-us, `nouns` subpath — outside the story runtime.
 *
 * @see ADR-407 D3, D4
 */

import nlp from 'compromise';
import {
  MAX_PHRASE_WORDS,
  isReportableHead,
  tokenizeWithOffsets,
  type HeuristicPhrase,
} from './heuristic.js';

/** The fields of one compromise term this module reads. */
interface TaggedTerm {
  /** The term as written. */
  readonly text: string;
  /** Its part-of-speech tags. */
  readonly tags: readonly string[];
  /** Where it sits in the passage, in UTF-16 code units. */
  readonly offset: { readonly start: number; readonly length: number };
}

/** The fields of one compromise noun chunk this module reads. */
interface TaggedChunk {
  /** Its terms, in order. */
  readonly terms: readonly TaggedTerm[];
}

/** Tags that end a piece of a noun chunk; the term itself belongs to neither side. */
const SEPARATOR_TAGS: readonly string[] = ['Preposition', 'Conjunction', 'Determiner', 'Pronoun', 'Possessive'];

/** Tags stripped from the front of a piece: numbers (`three long tables`). */
const LEADING_STRIP_TAGS: readonly string[] = ['Value', 'Cardinal', 'Ordinal'];

/**
 * Indefinite pronouns compromise tags as nouns. Never a thing a player types to
 * mean an object, and a separator wherever they sit.
 */
const INDEFINITE_PRONOUNS: ReadonlySet<string> = new Set(
  'someone somebody anyone anybody everyone everybody nobody no-one noone something anything everything nothing'.split(' '),
);

/**
 * Whether a term carries any of the given tags.
 *
 * @param term the term
 * @param tags the tags to look for
 * @returns true when at least one is present
 */
function hasAnyTag(term: TaggedTerm, tags: readonly string[]): boolean {
  return tags.some((tag) => term.tags.includes(tag));
}

/**
 * Split one chunk at its separators.
 *
 * @param chunk a compromise noun chunk
 * @returns the runs of terms between separators, possibly empty runs
 */
function splitChunk(chunk: TaggedChunk): TaggedTerm[][] {
  const pieces: TaggedTerm[][] = [[]];
  for (const term of chunk.terms) {
    const isSeparator =
      hasAnyTag(term, SEPARATOR_TAGS) || INDEFINITE_PRONOUNS.has(term.text.toLowerCase());
    if (isSeparator) {
      pieces.push([]);
    } else {
      pieces[pieces.length - 1].push(term);
    }
  }
  return pieces;
}

/**
 * Clean one piece into a phrase, or nothing.
 *
 * @param piece the terms between two separators
 * @param text the passage the terms point into
 * @returns the phrase, or undefined when the piece names no reportable noun
 */
function cleanPiece(piece: readonly TaggedTerm[], text: string): HeuristicPhrase | undefined {
  let first = 0;
  while (first < piece.length && hasAnyTag(piece[first], LEADING_STRIP_TAGS)) first += 1;
  let last = piece.length - 1;
  while (last >= first && !piece[last].tags.includes('Noun')) last -= 1;
  if (last < first) return undefined;

  const start = piece[first].offset.start;
  const end = piece[last].offset.start + piece[last].offset.length;
  // The words are the shared tokenizer's, so `tiring-house door` reads as two
  // words here exactly as it does for the heuristic and the unnamed-tool check.
  // Anything the tokenizer breaks on inside the span ends the phrase there,
  // keeping the run that holds the head.
  const tokens = tokenizeWithOffsets(text.slice(start, end));
  let runStart = tokens.length;
  while (runStart > 0 && tokens[runStart - 1].word !== '|') runStart -= 1;
  const run = tokens.slice(runStart).slice(-MAX_PHRASE_WORDS);
  if (run.length === 0) return undefined;

  const head = run[run.length - 1].word;
  if (!isReportableHead(head)) return undefined;
  return {
    words: run.map((token) => token.word),
    offset: start + run[0].offset,
    end: start + run[run.length - 1].end,
  };
}

/**
 * Pull the noun phrases out of a passage by part of speech, cleaned.
 *
 * @param text the passage, any casing
 * @returns each distinct phrase (by its words), in reading order; [] for an
 *   empty passage
 */
export function extractTaggedPhrases(text: string): HeuristicPhrase[] {
  if (text.trim().length === 0) return [];
  const chunks = nlp(text).nouns().json({ offset: true }) as TaggedChunk[];

  const found: HeuristicPhrase[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    for (const piece of splitChunk(chunk)) {
      const phrase = cleanPiece(piece, text);
      if (phrase === undefined) continue;
      const key = phrase.words.join(' ');
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(phrase);
    }
  }
  return found.sort((left, right) => left.offset - right.offset);
}
