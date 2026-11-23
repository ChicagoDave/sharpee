/**
 * @sharpee/if-domain/nouns — the noun-extractor contract and its lookup (ADR-407 D3, D6, D8).
 *
 * Purpose: say what a language's noun extractor is, and how a reader of prose
 * (a lens, `sharpee world-index`) finds the one for a story's language. Each
 * language implements the contract in its own `nouns` subpath
 * (`@sharpee/lang-en-us/nouns`); this module is the other side of that seam.
 *
 * **Outside the story runtime, like the extractors it describes.** The package
 * root re-exports only this module's types, which compile to nothing, so a
 * published story never carries the lookup: only readers of prose import it,
 * from this subpath (ADR-407 AC-3).
 *
 * Public interface: the types `NounCandidate`, `NounExtractor`, `NounsModule`,
 * `NounsModuleLoader`, `NounExtractorResolution`, `NounExtractorLookup`; the
 * functions `resolveNounExtractor`, `nounExtractorModule`,
 * `noNounExtractorRefusal`, `languageMismatchRefusal`.
 *
 * Owner context: @sharpee/if-domain — shared domain contracts.
 *
 * @see ADR-407 D2, D3, D6, D8
 */

/** One candidate noun phrase found in a passage of prose (ADR-407 D3). */
export interface NounCandidate {
  /** The phrase as it reads in the passage, after cleaning (ADR-407 D4). */
  readonly text: string;
  /** Its words, lowercased, in order. */
  readonly words: readonly string[];
  /** The word a player would type alone to mean it: the last noun of the phrase. */
  readonly head: string;
  /** Character offset of the phrase's first word in the passage. */
  readonly offset: number;
}

/**
 * A language's noun extractor (ADR-407 D3).
 *
 * Each language package exports one, named `nounExtractor`, from a `nouns`
 * subpath its main entry never imports, so a published story never carries it.
 * Readers of prose find it with {@link resolveNounExtractor}; the engine never
 * loads one.
 */
export interface NounExtractor {
  /** The language this extractor reads, in `LanguageProvider.languageCode` form (e.g. 'en-US'). */
  readonly languageCode: string;
  /** Candidate noun phrases in reading order; an empty passage returns []. Never throws on prose. */
  extract(text: string): NounCandidate[];
  /**
   * The passage's words, lowercased, in reading order, split by this language's rules
   * (for English, ADR-321 D16: a hyphen joins, a possessive ends a run).
   * `extract` splits words the same way. An empty passage returns []. Never throws on prose.
   */
  tokenize(text: string): string[];
}

/** What a language's `nouns` module exports, as far as a reader of prose is concerned. */
export interface NounsModule {
  /** The language's extractor; absent means the module is not a nouns module. */
  readonly nounExtractor?: NounExtractor;
}

/**
 * Loads a module by name, the way the caller's runtime does (`require`, usually).
 * Throws when the module cannot be found; {@link resolveNounExtractor} catches that.
 */
export type NounsModuleLoader = (moduleName: string) => NounsModule;

/** The outcome of looking up a language's extractor: the extractor, or the one line a reader prints. */
export type NounExtractorResolution =
  | { readonly found: true; readonly extractor: NounExtractor }
  | { readonly found: false; readonly refusal: string };

/**
 * A function from a language code to that language's extractor or its refusal.
 * Readers that hold only an IR (`analyzeStoryIR`) take one of these and apply it
 * to the IR's `phrases.defaultLocale` (ADR-407 D2, D8).
 */
export type NounExtractorLookup = (languageCode: string) => NounExtractorResolution;

/**
 * The module that holds a language's extractor, by convention (ADR-407 D3).
 *
 * @param languageCode the language, e.g. 'en-US'
 * @returns `@sharpee/lang-<code lowercased>/nouns`, e.g. '@sharpee/lang-en-us/nouns'
 */
export function nounExtractorModule(languageCode: string): string {
  return `@sharpee/lang-${languageCode.toLowerCase()}/nouns`;
}

/**
 * The line every reader of prose prints when a language has no extractor (ADR-407 D6).
 *
 * @param languageCode the language asked for
 * @returns one line naming the code
 */
export function noNounExtractorRefusal(languageCode: string): string {
  return `No noun extractor for language '${languageCode}': ${nounExtractorModule(languageCode)} does not provide one.`;
}

/**
 * The line a lens prints when its engine's language is not the story's (ADR-407 D2, D6).
 *
 * @param engineLanguageCode the running engine's `LanguageProvider.languageCode`
 * @param storyLanguageCode the IR's `phrases.defaultLocale`
 * @returns one line naming both codes
 */
export function languageMismatchRefusal(engineLanguageCode: string, storyLanguageCode: string): string {
  return (
    `The engine's language '${engineLanguageCode}' is not the story's language '${storyLanguageCode}': ` +
    `prose is read only through the story's own language.`
  );
}

/**
 * Find a language's noun extractor by convention (ADR-407 D3, D6).
 *
 * Loads {@link nounExtractorModule}(languageCode) through `load`, and accepts it
 * only when it exports a `nounExtractor` that has `extract` and `tokenize`
 * functions and whose `languageCode` is exactly the code asked for. Every other
 * outcome (the module is missing, it throws while loading, it exports no
 * extractor, or the extractor is for another language) is the refusal line
 * {@link noNounExtractorRefusal}. Never throws.
 *
 * @param languageCode the language to find, e.g. 'en-US'
 * @param load the caller's module loader; if-domain loads nothing itself
 * @returns the extractor, or the refusal line
 */
export function resolveNounExtractor(languageCode: string, load: NounsModuleLoader): NounExtractorResolution {
  const refused: NounExtractorResolution = { found: false, refusal: noNounExtractorRefusal(languageCode) };
  let loaded: NounsModule;
  try {
    loaded = load(nounExtractorModule(languageCode));
  } catch {
    return refused;
  }
  const extractor = loaded?.nounExtractor;
  if (
    extractor === undefined ||
    extractor === null ||
    typeof extractor.extract !== 'function' ||
    typeof extractor.tokenize !== 'function' ||
    extractor.languageCode !== languageCode
  ) {
    return refused;
  }
  return { found: true, extractor };
}
