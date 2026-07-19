/**
 * @sharpee/chord — the Chord story language compiler (ADR-210).
 *
 * Purpose: turn `.story` source into a versioned, serializable Story IR —
 * lexer, indentation-aware parser, semantic analysis (load-time gates),
 * IR wire types, and diagnostics with source spans.
 *
 * Public interface: parse() (source → AST + diagnostics), the AST node
 * types, Diagnostic/Span shapes. Phase 3 adds the analyzer and Story IR.
 *
 * Owner context: Chord language frontend. Browser-safe — this package must
 * never depend on platform-runtime packages (`if-domain` types at most);
 * the runtime platform never depends on it (ADR-210 Direction rule).
 */
import { analyze } from './analyzer.js';
import type { StoryFile } from './ast.js';
import { Diagnostic, DiagnosticBag } from './diagnostics.js';
import type { StoryIR } from './ir.js';
import { parseStory } from './parser.js';

export * from './ast.js';
export * from './ir.js';
export { analyze, normalizeTopic } from './analyzer.js';
export { KIND_NOUNS, TRAIT_ADJECTIVES, STATE_ADJECTIVES, PLATFORM_STATE_PAIRS, STARTS_STATE_PAIRINGS, EVENT_VERBS, CLIENT_CAPABILITY_FLAGS, capabilityKeyOf, PRONOUN_WORDS, PRONOUN_CASES } from './catalog.js';
export { EXTENSION_MANIFESTS, COMBAT_MANIFEST, NPC_MANIFEST, manifestForAdjective } from './manifests/index.js';
export type { ExtensionManifest, ManifestAdjective, ManifestField } from './manifests/index.js';
export { Diagnostic, DiagnosticSeverity, DiagnosticBag } from './diagnostics.js';
export { Span, spanOf, mergeSpans } from './span.js';
export { lex, Line, Token, TokenKind } from './lexer.js';
export { parseStory } from './parser.js';

/** Result of parsing one `.story` source. */
export interface ParseResult {
  ast: StoryFile;
  diagnostics: readonly Diagnostic[];
  /** True when no error-severity diagnostic was reported. */
  ok: boolean;
}

/**
 * Parse `.story` source text.
 * @param source full text of a `.story` file
 * @returns the AST (possibly partial on errors) plus all diagnostics
 */
export function parse(source: string): ParseResult {
  const bag = new DiagnosticBag();
  const ast = parseStory(source, bag);
  return { ast, diagnostics: bag.all(), ok: !bag.hasErrors() };
}

/** Result of compiling one `.story` source to IR. */
export interface CompileResult {
  ast: StoryFile;
  /** The Story IR — meaningful only when `ok` (atomic load, ADR-210). */
  ir: StoryIR;
  diagnostics: readonly Diagnostic[];
  ok: boolean;
}

/**
 * Compile `.story` source text: parse + analyze + build IR.
 * @param source full text of a `.story` file
 * @returns AST, IR, and all diagnostics; `ok` gates use of the IR
 */
export function compile(source: string): CompileResult {
  const bag = new DiagnosticBag();
  const ast = parseStory(source, bag);
  const ir = analyze(ast, bag);
  return { ast, ir, diagnostics: bag.all(), ok: !bag.hasErrors() };
}
