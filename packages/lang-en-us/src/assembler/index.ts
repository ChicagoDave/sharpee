/**
 * @file Assembler barrel (ADR-192).
 *
 * Owner context: `@sharpee/lang-en-us` — the English realization of the phrase
 * algebra. Re-exports the Assembler, its default block key, the case-authority
 * helper, and the not-implemented error.
 */

export { EnglishAssembler, ASSEMBLER_DEFAULT_BLOCK_KEY, capitalizeSentenceStart, registerPronounSet } from './english-assembler.js';
export type { PronounSetForms } from './english-assembler.js';
export { PhraseNotImplementedError } from './errors.js';
