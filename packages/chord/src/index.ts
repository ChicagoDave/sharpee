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
export { CHORD_LANGUAGE_VERSION } from './version.js';
export { analyze, normalizeTopic } from './analyzer.js';
export { KIND_NOUNS, TRAIT_ADJECTIVES, STATE_ADJECTIVES, PLATFORM_STATE_PAIRS, STARTS_STATE_PAIRINGS, EVENT_VERBS, CLIENT_CAPABILITY_FLAGS, capabilityKeyOf, PRONOUN_WORDS, PRONOUN_CASES, MESSAGE_OVERRIDE_ALIASES, STDLIB_CHAIN_NAMES, SCOPE_REQUIREMENT_PREDICATES } from './catalog.js';
export type { ScopeRequirementWord } from './catalog.js';
export { STDLIB_MANIFEST } from './stdlib-manifest.js';
export type { StdlibManifest, StdlibLocaleFacts } from './stdlib-manifest.js';
export { conditionRequiresSelfBreaking } from './condition-discharge.js';
export { CHARACTER_MANIFEST } from './character-manifest.js';
export type { CharacterManifest } from './character-manifest.js';
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

/** Host hooks for compile() (ADR-251, generalizing ADR-250 D2). */
export interface CompileOptions {
  /**
   * Resolves an `import "<file>"` target to the fragment's source text, or
   * null when unresolvable. The compiler appends `.chord` before calling
   * this, so `path` always arrives as `"<name>.chord"` (e.g.
   * `"regions/harbor.chord"`) — the resolver just maps that name to text.
   * The HOST owns the base directory (relative to the importing story
   * file). The chord package stays filesystem-free: devkit/repokit supply
   * an fs-backed resolver, the browser client a bundle-map resolver.
   */
  importResolver?: (path: string) => string | null;
}

/**
 * Compile `.story` source text: parse + resolve imports + analyze + build IR.
 * @param source full text of a `.story` file
 * @param options host hooks (importResolver for `import "<file>"`)
 * @returns AST, IR, and all diagnostics; `ok` gates use of the IR
 */
export function compile(source: string, options?: CompileOptions): CompileResult {
  const bag = new DiagnosticBag();
  const ast = parseStory(source, bag);
  resolveImports(ast, options, bag);
  const ir = analyze(ast, bag);
  return { ast, ir, diagnostics: bag.all(), ok: !bag.hasErrors() };
}

/**
 * Splice each `import "<file>"` declaration with the imported fragment's
 * complete declarations, in place (import site = arbitration position —
 * ADR-251 D4: "an import is a paste"). The compiler appends `.chord` to
 * the target before resolving (D2), so the host `importResolver` always
 * receives `"<name>.chord"`. Imports nest (D5 as amended 2026-08-22): a
 * fragment's own `import` lines are spliced at their own position inside
 * it, so the assembled order is depth-first at each import line. Import
 * paths are story-rooted everywhere — the same string from a fragment as
 * from the main file — so the host resolver needs no notion of depth.
 * A fragment may contain any complete declaration EXCEPT a `story` header
 * (D3 → `analysis.import-fragment-story`); a fragment that fails to parse
 * cleanly (partial/non-declaration content) additionally raises
 * `analysis.import-fragment-content` at the first parse error, beside the
 * granular fragment parse errors. An import whose target is already being
 * resolved on the current chain raises `analysis.import-cycle` at that
 * import line and is dropped; the rest of the splice continues. A fragment
 * reached by two paths is pasted twice and collides post-splice as the
 * ordinary duplicate-declaration error — no import-once rule. Processed
 * imports are removed from the AST either way, so the analyzer never
 * double-reports. Fragment diagnostics are re-reported with the fragment
 * name prefixed, and every span in the fragment — its diagnostics and every
 * node of its AST — is stamped with the fragment's file (D6 as amended
 * 2026-08-22), so analyzer diagnostics raised later on spliced declarations
 * name the fragment instead of an innocent main-file line.
 */
function resolveImports(ast: StoryFile, options: CompileOptions | undefined, bag: DiagnosticBag): void {
  if (!ast.declarations.some((d) => d.kind === 'import')) return;
  ast.declarations = spliceImports(ast.declarations, options, bag, []);
}

/**
 * Replace every `import` in `declarations` with its fragment's declarations,
 * recursing into each fragment before splicing it. `chain` is the ordered
 * list of fragment names currently being resolved (the main file is the
 * implicit root and is never on it); a target already on it is a cycle.
 */
function spliceImports(
  declarations: readonly Declaration[],
  options: CompileOptions | undefined,
  bag: DiagnosticBag,
  chain: readonly string[],
): Declaration[] {
  const resolved: Declaration[] = [];
  for (const decl of declarations) {
    if (decl.kind !== 'import') {
      resolved.push(decl);
      continue;
    }
    // D2: the extension is a language fact, appended here — the resolver stays dumb.
    const fragmentName = `${decl.path}.chord`;
    if (chain.includes(fragmentName)) {
      // D5 (amended): the chain has returned to a fragment still being spliced.
      const cycle = [...chain.slice(chain.indexOf(fragmentName)), fragmentName].join(' → ');
      bag.error('analysis.import-cycle', `\`import "${decl.path}"\` completes an import cycle: ${cycle}.`, decl.span);
      continue;
    }
    const text = options?.importResolver ? options.importResolver(fragmentName) : null;
    if (text === null || text === undefined) {
      bag.error(
        'analysis.import-unresolved',
        options?.importResolver
          ? `Cannot resolve \`import "${decl.path}"\` — \`${fragmentName}\` was not found.`
          : `\`import "${decl.path}"\` needs an import resolver — this compile host provides none.`,
        decl.span,
      );
      continue;
    }
    const fragBag = new DiagnosticBag();
    const fragAst = parseStory(text, fragBag);
    // Stamp the fragment's file onto every span — the AST's and its parse
    // diagnostics' (the latter in place, so the content diagnostic below,
    // anchored on the first of them, carries the file too). Spans that
    // already carry a file are left alone, which is what keeps a nested
    // fragment's own attribution once its imports are spliced below.
    stampSpanFile(fragAst, fragmentName);
    stampSpanFile(fragBag.all(), fragmentName);
    for (const d of fragBag.all()) {
      // Fragment spans are relative to the fragment file — prefix the name.
      bag[d.severity === 'error' ? 'error' : 'warning'](d.code, `[${fragmentName}] ${d.message}`, d.span);
    }
    // D6 span contract: fragment diagnostics carry the fragment's OWN span
    // (with the `[<name>.chord]` prefix identifying the file); only the
    // unresolved-import and cycle diagnostics above point at the import line.
    if (fragBag.hasErrors()) {
      // Partial / non-declaration content — the granular parse errors above
      // carry the detail; anchor the category diagnostic at the first of them.
      const firstError = fragBag.all().find((d) => d.severity === 'error');
      bag.error('analysis.import-fragment-content', `[${fragmentName}] This import's fragment did not parse into complete declarations.`, firstError ? firstError.span : decl.span);
    }
    if (fragAst.header) {
      bag.error('analysis.import-fragment-story', `[${fragmentName}] An imported fragment carries no story header — the \`story\` block lives only in the main \`.story\` file.`, fragAst.header.span);
    }
    // Depth-first: the fragment's own imports are pasted at their own lines
    // before the fragment is pasted at this one.
    resolved.push(...spliceImports(fragAst.declarations, options, bag, [...chain, fragmentName]));
  }
  return resolved;
}

/**
 * Stamp `file` onto every span reachable from `node` that does not already
 * carry one. Spans are recognized structurally (`line`/`column`/`endLine`/
 * `endColumn` numbers), so every AST node kind is covered without
 * enumerating them. Leaving an existing `file` untouched is what lets an
 * inner splice keep its own attribution if imports ever nest.
 */
function stampSpanFile(node: unknown, file: string, seen = new Set<object>()): void {
  if (node === null || typeof node !== 'object' || seen.has(node)) return;
  seen.add(node);
  if (Array.isArray(node)) {
    for (const item of node) stampSpanFile(item, file, seen);
    return;
  }
  const record = node as Record<string, unknown>;
  if (isSpanLike(record)) {
    if (record.file === undefined) record.file = file;
    return;
  }
  for (const value of Object.values(record)) stampSpanFile(value, file, seen);
}

function isSpanLike(record: Record<string, unknown>): boolean {
  return (
    typeof record.line === 'number' &&
    typeof record.column === 'number' &&
    typeof record.endLine === 'number' &&
    typeof record.endColumn === 'number'
  );
}
