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
import type { Declaration, StoryFile } from './ast.js';
import { Diagnostic, DiagnosticBag } from './diagnostics.js';
import type { StoryIR } from './ir.js';
import { parseStory } from './parser.js';

export * from './ast.js';
export * from './ir.js';
export { analyze, normalizeTopic } from './analyzer.js';
export { KIND_NOUNS, TRAIT_ADJECTIVES, STATE_ADJECTIVES, PLATFORM_STATE_PAIRS, STARTS_STATE_PAIRINGS, EVENT_VERBS, CLIENT_CAPABILITY_FLAGS, capabilityKeyOf, PRONOUN_WORDS, PRONOUN_CASES } from './catalog.js';
export { EXTENSION_MANIFESTS, COMBAT_MANIFEST, NPC_MANIFEST, manifestForAdjective } from './manifests/index.js';
export type { ExtensionManifest, ManifestAdjective, ManifestField } from './manifests/index.js';
export { PHRASEBOOK_REGISTRY } from './phrasebooks.js';
export type { PhrasebookManifest } from './phrasebooks.js';
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

/** Host hooks for compile() (ADR-250 D2). */
export interface CompileOptions {
  /**
   * Resolves an `import phrasebook "<file>"` path (relative to the story
   * file — the HOST owns the base directory) to the fragment's source
   * text, or null when unresolvable. The chord package stays
   * filesystem-free: devkit/repokit supply an fs-backed resolver, the
   * browser client a bundle-map resolver.
   */
  importResolver?: (path: string) => string | null;
}

/**
 * Compile `.story` source text: parse + resolve imports + analyze + build IR.
 * @param source full text of a `.story` file
 * @param options host hooks (importResolver for `import phrasebook`)
 * @returns AST, IR, and all diagnostics; `ok` gates use of the IR
 */
export function compile(source: string, options?: CompileOptions): CompileResult {
  const bag = new DiagnosticBag();
  const ast = parseStory(source, bag);
  resolvePhrasebookImports(ast, options, bag);
  const ir = analyze(ast, bag);
  return { ast, ir, diagnostics: bag.all(), ok: !bag.hasErrors() };
}

/**
 * Splice each `import phrasebook "<file>"` declaration with the imported
 * fragment's `define phrasebook` blocks, in place (import site =
 * arbitration position — ADR-250 D2). Processed imports are removed from
 * the AST either way, so the analyzer never double-reports; a fragment may
 * contain only `define phrasebook` blocks (plus blank lines / `##`
 * comments, which the lexer/parser already discharge). Fragment
 * diagnostics are re-reported with the fragment path prefixed, since
 * spans are file-relative.
 */
function resolvePhrasebookImports(ast: StoryFile, options: CompileOptions | undefined, bag: DiagnosticBag): void {
  if (!ast.declarations.some((d) => d.kind === 'import-phrasebook')) return;
  const resolved: Declaration[] = [];
  for (const decl of ast.declarations) {
    if (decl.kind !== 'import-phrasebook') {
      resolved.push(decl);
      continue;
    }
    const text = options?.importResolver ? options.importResolver(decl.path) : null;
    if (text === null || text === undefined) {
      bag.error(
        'analysis.import-unresolved',
        options?.importResolver
          ? `Cannot resolve \`import phrasebook "${decl.path}"\` — the file was not found.`
          : `\`import phrasebook "${decl.path}"\` needs an import resolver — this compile host provides none.`,
        decl.span,
      );
      continue;
    }
    const fragBag = new DiagnosticBag();
    const fragAst = parseStory(text, fragBag);
    for (const d of fragBag.all()) {
      // Fragment spans are relative to the fragment file — prefix the path.
      bag[d.severity === 'error' ? 'error' : 'warning'](d.code, `[${decl.path}] ${d.message}`, d.span);
    }
    if (fragAst.header) {
      bag.error('analysis.import-fragment-content', `[${decl.path}] An imported phrasebook file carries no story header — only \`define phrasebook\` blocks.`, decl.span);
    }
    for (const d of fragAst.declarations) {
      if (d.kind === 'define-phrasebook') {
        resolved.push(d);
      } else {
        bag.error(
          'analysis.import-fragment-content',
          `[${decl.path}] An imported phrasebook file may contain only \`define phrasebook\` blocks — found \`${d.kind}\`.`,
          decl.span,
        );
      }
    }
  }
  ast.declarations = resolved;
}
