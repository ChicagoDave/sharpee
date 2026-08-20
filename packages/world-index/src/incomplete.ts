/**
 * incomplete.ts — what did the author name that isn't there yet?
 *
 * Purpose: the third World Index view (ADR-321 D5/D6). Every noun phrase in
 * every authored description is pulled out and resolved against the story's own
 * naming surface; the phrases that fail are reported in three classes, because
 * they are three different problems. It ships as a **candidate list**, never as
 * errors: the phrases are read out of prose by heuristic, and some of them are
 * scenery the author meant to skip.
 *
 * **The lists below are the specification** (D6b). The extractor is tuned for
 * recall — a missed gap is worse than a junk entry, because the list exists to
 * nag and a reader skips junk in a second. Changing a word in `BOUNDARY_WORDS`
 * or `HEAD_STOPWORDS` changes what this view reports, so the corpus test pins
 * the result and any tuning shows up as a diff in the expected findings.
 *
 * **It reads every authored passage, not only descriptions** (Amendment 1, D10). What
 * counts as a passage and where each one sits is `prose.ts`'s question; this module
 * takes the flat list and asks what the parser would make of the nouns in it.
 *
 * Public interface: deriveIncomplete, extractNounPhrases, publishFilters and
 * their result types.
 *
 * **It keeps what it used to throw away** (Amendment 1, D12). A phrase resolving
 * cleanly is not a finding, but it is the prose-points-at-thing edge the role
 * split rests on, so `classify` now names that case instead of returning nothing.
 *
 * Owner context: @sharpee/world-index — the derivation package. No platform
 * contract.
 *
 * @packageDocumentation
 * @see ADR-321 D5, D6, D6b
 */

import type { StoryIR } from '@sharpee/chord';
import { collectProse, type ProseSite } from './prose.js';
import { deriveRoles, type MentionEdge, type ResolvedMention } from './roles.js';
import { deriveReach, type ReachResult } from './reach.js';
import { buildVocabularyIndex, resolvePhrase, type VocabularyIndex } from './vocabulary.js';

/**
 * Words that open a noun phrase. A phrase is read forward from an article,
 * because that is where an English noun phrase naming a thing reliably starts.
 */
const ARTICLES: ReadonlySet<string> = new Set(['the', 'a', 'an']);

/**
 * Words that end a noun phrase before it reaches its head.
 *
 * Prepositions, conjunctions, relatives, auxiliaries, the locatives `here` and
 * `there`, and the verbs prose most often puts straight after a noun phrase. A
 * word here means the run stops: everything after it belongs to the next clause,
 * not to this noun.
 *
 * **Known limit**: a verb this list does not name swallows the phrase it follows
 * — *the hurricane lamp burns* reads as a three-word phrase headed by `burns`,
 * and the lamp finding is lost. Enumerating English verbs is not the fix; a
 * part-of-speech pass is, and D6b defers it deliberately. The corpus pin is
 * where the cost of that stays visible.
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
const MAX_PHRASE_WORDS = 3;

/**
 * The shortest a head noun may be.
 *
 * Three, not four: interactive fiction is full of three-letter objects — key,
 * box, lid, tin, pot, rug, axe, urn — and a four-letter floor drops every one of
 * them silently. Measured against the corpus, lowering it recovered *small steel
 * box* for the deed box, *flat tin*, and *leather pot*, at the cost of one junk
 * entry. That is the trade D6b asks for.
 */
const MIN_HEAD_LENGTH = 3;

/** A noun phrase pulled out of a description. */
export interface NounPhrase {
  /** The phrase as written, lowercased. */
  phrase: string;
  /** Its words, in order — the last is the head. */
  words: string[];
}

/** The prose names something the object does not answer to. */
export interface MissingWordFinding {
  /** Where the phrase sits, and what fired it (D10). */
  site: ProseSite;
  /** The phrase as written. */
  phrase: string;
  /** The one thing the head noun resolves to. */
  entity: string;
  /** The words that thing does not answer to. */
  missing: string[];
  /** The words it does answer to. */
  knownAs: string[];
}

/** The prose names something two or more objects answer to. */
export interface AmbiguousFinding {
  /** Where the phrase sits, and what fired it (D10). */
  site: ProseSite;
  /** The phrase as written. */
  phrase: string;
  /** Everything it reaches. */
  candidates: string[];
}

/** The prose names something that does not exist. */
export interface NoObjectFinding {
  /** Where the phrase sits, and what fired it (D10). */
  site: ProseSite;
  /** The phrase as written. */
  phrase: string;
}

/** The Incomplete view for one story — a candidate list, never an error list. */
export interface IncompleteResult {
  /** How many of each class, for the surface's honest counts. */
  counts: { missingWord: number; ambiguous: number; noObject: number };
  /** Phrases naming a real thing by a word it does not answer to. */
  missingWord: MissingWordFinding[];
  /** Phrases two or more things answer to. */
  ambiguous: AmbiguousFinding[];
  /** Phrases nothing answers to. */
  noObject: NoObjectFinding[];
  /**
   * Every phrase that DID resolve, roled (D12).
   *
   * Not a finding — the opposite of one. These are the places the prose and the
   * world already agree, and the role on each is what lets a reader tell a thing
   * the puzzle needs from a thing that is merely described.
   */
  edges: MentionEdge[];
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
 * Pull the noun phrases out of a passage of authored prose.
 *
 * Each run starts at an article and stops at the first boundary word, adverb,
 * further article, or punctuation. A run of one to three words whose last word
 * can plausibly head a noun phrase is a candidate; everything else is dropped.
 *
 * @param text the description text, any casing
 * @returns each distinct phrase, in order of appearance
 */
export function extractNounPhrases(text: string): NounPhrase[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z'\s]/g, ' | ')
    .split(/\s+/)
    .filter((token) => token.length > 0);

  const found: NounPhrase[] = [];
  const seen = new Set<string>();

  for (let start = 0; start < tokens.length; start += 1) {
    if (!ARTICLES.has(tokens[start])) continue;

    const run: string[] = [];
    for (let at = start + 1; at < Math.min(start + 2 + MAX_PHRASE_WORDS, tokens.length); at += 1) {
      const token = tokens[at];
      if (token === '|' || BOUNDARY_WORDS.has(token) || ARTICLES.has(token) || /ly$/.test(token)) break;
      run.push(token);
    }
    if (run.length === 0 || run.length > MAX_PHRASE_WORDS) continue;

    const head = run[run.length - 1];
    if (looksInflected(head) || head.length < MIN_HEAD_LENGTH || HEAD_STOPWORDS.has(head)) continue;

    const phrase = run.join(' ');
    if (seen.has(phrase)) continue;
    seen.add(phrase);
    found.push({ phrase, words: run });
  }
  return found;
}


/**
 * Classify one phrase against the story's naming surface.
 *
 * A phrase resolving to exactly one thing is fine. Resolving to several is
 * ambiguous. Resolving to nothing is the interesting case: if the head noun
 * alone resolves to one thing, the author named a real object by a word it does
 * not answer to; if the head reaches several, the prose is ambiguous after all;
 * if the head reaches nothing, there is no object behind the words.
 *
 * @param noun the extracted phrase
 * @param index the story's vocabulary index
 * @returns the finding kind and what it names, or `resolved` and the one thing
 *   it names — a clean resolution is the mention edge D12 roles, not a nothing
 */
function classify(
  noun: NounPhrase,
  index: VocabularyIndex,
):
  | { kind: 'missing-word'; entity: string; missing: string[]; knownAs: string[] }
  | { kind: 'ambiguous'; candidates: string[] }
  | { kind: 'no-object' }
  | { kind: 'resolved'; entity: string } {
  const candidates = resolvePhrase(index, noun.phrase, noun.words);
  if (candidates.length === 1) return { kind: 'resolved', entity: candidates[0] };
  if (candidates.length > 1) return { kind: 'ambiguous', candidates };

  const head = noun.words[noun.words.length - 1];
  const headMatches = resolvePhrase(index, head, [head]);
  if (headMatches.length === 0) return { kind: 'no-object' };
  if (headMatches.length > 1) return { kind: 'ambiguous', candidates: headMatches };

  const only = headMatches[0];
  const vocabulary = index.wordsOf.get(only) ?? new Set<string>();
  const missing = noun.words
    .slice(0, -1)
    .filter((word) => !vocabulary.has(word) && !HEAD_STOPWORDS.has(word));
  if (missing.length === 0) return { kind: 'resolved', entity: only };

  return { kind: 'missing-word', entity: only, missing, knownAs: [...vocabulary] };
}

/**
 * Derive the Incomplete view: the places a player will reach for something that
 * isn't there, and the places prose and world already agree.
 *
 * @param ir the story IR
 * @param reach the story's reach result, whose `progression` chain roles the
 *   edges (D12). Defaults to deriving it, so a caller wanting only the candidate
 *   lists need not know that roles exist; `document.ts` passes the one it has
 *   already computed rather than paying for a second walk.
 * @returns the three candidate lists, their counts, and the roled edges
 */
export function deriveIncomplete(ir: StoryIR, reach: ReachResult = deriveReach(ir)): IncompleteResult {
  const index = buildVocabularyIndex(ir);
  const missingWord: MissingWordFinding[] = [];
  const ambiguous: AmbiguousFinding[] = [];
  const noObject: NoObjectFinding[] = [];
  const resolved: ResolvedMention[] = [];

  // One pass per PASSAGE, not per entity (D10). Deduplication is per passage too: the
  // same phrase in a room's description and in its first-visit text is two places the
  // author has to fix, and collapsing them hides the second.
  for (const site of collectProse(ir)) {
    for (const noun of extractNounPhrases(site.text)) {
      const finding = classify(noun, index);

      const at = { site, phrase: noun.phrase };
      if (finding.kind === 'resolved') {
        resolved.push({ ...at, entity: finding.entity });
      } else if (finding.kind === 'missing-word') {
        missingWord.push({ ...at, entity: finding.entity, missing: finding.missing, knownAs: finding.knownAs });
      } else if (finding.kind === 'ambiguous') {
        ambiguous.push({ ...at, candidates: finding.candidates });
      } else {
        noObject.push(at);
      }
    }
  }

  return {
    counts: { missingWord: missingWord.length, ambiguous: ambiguous.length, noObject: noObject.length },
    missingWord,
    ambiguous,
    noObject,
    edges: deriveRoles(ir, reach, resolved),
  };
}

/**
 * The extractor's shared filters, published for the IDE (D11).
 *
 * Chord Writer chunks by part of speech rather than by article, so it does NOT
 * share `BOUNDARY_WORDS` — that list exists to end a run this side, and the
 * tagger ends runs for the other. What the two MUST agree on is what counts as a
 * head worth reporting, because a candidate list filtered by two different
 * stopword sets is two different readings of the same story rather than one
 * reading seen at two depths.
 */
export interface ExtractorFilters {
  /** Head nouns that are never a thing the author forgot to implement. */
  headStopwords: string[];
  /** The shortest a head noun may be. */
  minHeadLength: number;
  /** The most words a noun phrase may carry. */
  maxPhraseWords: number;
}

/**
 * The filter surface, as pure data.
 *
 * @returns the shared filters the IDE applies and never derives
 */
export function publishFilters(): ExtractorFilters {
  return {
    headStopwords: [...HEAD_STOPWORDS],
    minHeadLength: MIN_HEAD_LENGTH,
    maxPhraseWords: MAX_PHRASE_WORDS,
  };
}
