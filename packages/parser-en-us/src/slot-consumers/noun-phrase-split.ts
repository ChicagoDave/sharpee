/**
 * @file Noun phrase split
 * @description The one place a noun phrase's leading articles and determiners
 *   are split off its content words, and the one place a span is split at its
 *   list separators. Slot consumers call it on every item they consume; the
 *   parser copies the result onto the noun phrase; nothing downstream strips
 *   again.
 *
 *   The words come from the language. The tokens carry the parts of speech
 *   the parser registered from the language's articles, determiners, all
 *   words and except words, which is what the split reads; the list
 *   separators and the possessive determiners that mark the actor's own
 *   things arrive as `PhraseWords`, derived from the provider for the parse.
 *   This module holds no word of any language.
 *
 * Public interface: `splitLeadingWords`, `isAllWord`, `isExceptWord`,
 * `startsNounPhrase`, `isListSeparator`, `splitAtSeparators`, `spanText`,
 * `NounPhraseSplit`.
 * Owner context: parser-en-us slot consumers.
 *
 * References: ADR-385 D2 (one split), ADR-386 D6 (separators as readings),
 * ADR-387 D6 (the words come from the table).
 */

import { PartOfSpeech, type Token } from '@sharpee/if-domain';
import type { PhraseWords } from './slot-consumer.js';

/** The split of a consumed span: the leading words by kind, and the content that remains. */
export interface NounPhraseSplit {
  /** Leading articles, normalized, in order. */
  articles: string[];
  /** Leading determiners, normalized, in order. */
  determiners: string[];
  /** True when a determiner was one of the actor's possessives. */
  ownedByActor: boolean;
  /** Indices (into the token array) of the content words, in order. */
  content: number[];
}

const hasPart = (token: Token, part: PartOfSpeech): boolean =>
  token.candidates.some((c) => c.partOfSpeech === part);

const mapsToSpecial = (token: Token, id: string): boolean =>
  token.candidates.some((c) => c.partOfSpeech === PartOfSpeech.SPECIAL && c.mapsTo === id);

/** Whether a word is punctuation: no letter or digit in it (a comma, a semicolon). */
const isPunctuation = (word: string): boolean => !/[\p{L}\p{N}]/u.test(word);

/** Whether the token is one of the language's all words ("all", "everything", "every"). */
export function isAllWord(token: Token | undefined): boolean {
  return token !== undefined && mapsToSpecial(token, 'ALL');
}

/** Whether the token is one of the language's except words ("but", "except"). */
export function isExceptWord(token: Token | undefined): boolean {
  return token !== undefined && mapsToSpecial(token, 'EXCEPT');
}

/**
 * Whether a token can begin a noun phrase that continues past a pronoun: an
 * article, a determiner or an all word. A pronoun followed by one of these is
 * still the whole item (`give her the key`); followed by any other word it is
 * a determiner (`her key`).
 * @param token The token after the pronoun
 * @returns True when the token opens a new noun phrase
 */
export function startsNounPhrase(token: Token | undefined): boolean {
  return (
    token !== undefined &&
    (hasPart(token, PartOfSpeech.ARTICLE) || hasPart(token, PartOfSpeech.DETERMINER) || isAllWord(token))
  );
}

/**
 * Split the leading articles and determiners off a consumed span.
 *
 * Reads left to right while the token is tagged ARTICLE or DETERMINER, in any
 * order, and always leaves at least one content word (a span that is nothing
 * but articles keeps its last word, as a name can be "The"). A determiner
 * among the language's actor possessives marks the phrase the actor's own.
 *
 * @param indices The consumed token indices, in input order
 * @param tokens The input tokens
 * @param words The language's words for this parse
 * @returns The articles, the determiners, the actor's-own flag and the content indices
 */
export function splitLeadingWords(indices: readonly number[], tokens: readonly Token[], words: PhraseWords): NounPhraseSplit {
  const articles: string[] = [];
  const determiners: string[] = [];
  let ownedByActor = false;
  let start = 0;
  while (start < indices.length - 1) {
    const token = tokens[indices[start]];
    if (!token) break;
    if (hasPart(token, PartOfSpeech.ARTICLE)) {
      articles.push(token.normalized);
    } else if (hasPart(token, PartOfSpeech.DETERMINER)) {
      determiners.push(token.normalized);
      if (words.actorPossessives.has(token.normalized)) ownedByActor = true;
    } else {
      break;
    }
    start++;
  }
  return { articles, determiners, ownedByActor, content: indices.slice(start) };
}

/**
 * Whether the token separates list items: one of the language's separators
 * (ADR-386 D6). A punctuation separator followed by a word separator (`, and`)
 * is one separator, which `splitAtSeparators` reads.
 * @param token The token to test
 * @param words The language's words for this parse
 * @returns True for a separator
 */
export function isListSeparator(token: Token | undefined, words: PhraseWords): boolean {
  return token !== undefined && words.listSeparators.has(token.normalized);
}

/**
 * Split a span at the list separators into item spans, a punctuation
 * separator followed by a word separator (`, and`) counting as one.
 * @param span The token indices of the span
 * @param tokens The input tokens
 * @param words The language's words for this parse
 * @returns The item spans, or null when a part is empty (a leading, trailing
 *   or doubled separator), which no extent reads
 */
export function splitAtSeparators(span: readonly number[], tokens: readonly Token[], words: PhraseWords): number[][] | null {
  const parts: number[][] = [[]];
  let afterPunctuation = false;
  for (const i of span) {
    const token = tokens[i];
    if (isListSeparator(token, words)) {
      const punctuation = isPunctuation(token.normalized);
      if (!(afterPunctuation && !punctuation)) parts.push([]);
      afterPunctuation = punctuation;
    } else {
      parts[parts.length - 1].push(i);
      afterPunctuation = false;
    }
  }
  return parts.some((part) => part.length === 0) ? null : parts;
}

/**
 * The typed words of a span, as the player wrote them: a space between
 * words and none before punctuation, so `14, 6` reads back as `14, 6`.
 * @param indices The token indices of the span, in order
 * @param tokens The input tokens
 * @returns The span's text
 */
export function spanText(indices: readonly number[], tokens: readonly Token[]): string {
  let text = '';
  for (const i of indices) {
    const word = tokens[i].word;
    text += text.length === 0 || isPunctuation(word) ? word : ` ${word}`;
  }
  return text;
}
