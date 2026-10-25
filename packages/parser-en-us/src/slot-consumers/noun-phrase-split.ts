/**
 * @file Noun phrase split
 * @description The one place a noun phrase's leading articles and determiners
 *   are split off its content words (ADR-385 D2). Slot consumers call it on
 *   every item they consume; the parser copies the result onto the noun
 *   phrase; nothing downstream strips again.
 *
 *   The words come from the language: the parser registers the language's
 *   articles, determiners, all words and except words into the vocabulary,
 *   and the tokens carry the resulting parts of speech, which is what this
 *   module reads. The one English fact held here is which determiner marks
 *   the actor's own things (`my`), until the language owns its word lists
 *   (parser review step 7).
 *
 * Public interface: `splitLeadingWords`, `isAllWord`, `isExceptWord`,
 * `startsNounPhrase`, `NounPhraseSplit`.
 * Owner context: parser-en-us slot consumers.
 */

import { PartOfSpeech, type Token } from '@sharpee/if-domain';

/** The determiner that marks a phrase as the actor's own. English, until step 7 moves it to the language. */
const ACTOR_POSSESSIVE = 'my';

/** The split of a consumed span: the leading words by kind, and the content that remains. */
export interface NounPhraseSplit {
  /** Leading articles, normalized, in order. */
  articles: string[];
  /** Leading determiners, normalized, in order. */
  determiners: string[];
  /** True when a determiner was the actor's possessive. */
  ownedByActor: boolean;
  /** Indices (into the token array) of the content words, in order. */
  content: number[];
}

const hasPart = (token: Token, part: PartOfSpeech): boolean =>
  token.candidates.some((c) => c.partOfSpeech === part);

const mapsToSpecial = (token: Token, id: string): boolean =>
  token.candidates.some((c) => c.partOfSpeech === PartOfSpeech.SPECIAL && c.mapsTo === id);

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
 * but articles keeps its last word, as a name can be "The").
 *
 * @param indices The consumed token indices, in input order
 * @param tokens The input tokens
 * @returns The articles, the determiners, the actor's-own flag and the content indices
 */
export function splitLeadingWords(indices: readonly number[], tokens: readonly Token[]): NounPhraseSplit {
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
      if (token.normalized === ACTOR_POSSESSIVE) ownedByActor = true;
    } else {
      break;
    }
    start++;
  }
  return { articles, determiners, ownedByActor, content: indices.slice(start) };
}
