/**
 * analyze.ts — one story in, one document out.
 *
 * Purpose: the whole analysis behind a single call, so every caller reaches it
 * the same way. There are two entry points to this package — its own `cli.ts`
 * and `sharpee world-index` in `@sharpee/devkit`, which is the one the IDE
 * spawns through its resolved toolchain — and they must agree about what a
 * failure is called and what a document looks like. A second copy of this
 * function is how `unreadable-ir` starts meaning something slightly different
 * depending on who ran the analyzer.
 *
 * **It never throws.** Every path returns a document: an analysis, or a failure
 * naming its cause (ADR-321 AC-9). A caller writes it to stdout and sets an exit
 * code; it never has to decide what went wrong.
 *
 * **Two inputs, one analysis.** A `.ir.json` is read as built. A `.story` is
 * compiled in memory by a function the caller supplies (this package owns no
 * compile path, as it owns no language: ADR-407 D8), and its source files are
 * read here, so every finding and edge carries `at`, the phrase's own span.
 * Past the read, both inputs take the same language guard and the same
 * `buildDocument`; only what they are read from differs.
 *
 * Public interface: analyzeStoryIR, analyzerVersionFromScript, StoryCompiler.
 *
 * Owner context: @sharpee/world-index — the derivation package.
 *
 * @packageDocumentation
 * @see ADR-321 AC-9: failure states render
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { StoryIR } from '@sharpee/chord';
import type { NounExtractorLookup } from '@sharpee/if-domain';
import { buildDocument, buildFailure, type WorldIndexResponse } from './document.js';
import type { SourceReader } from './locate.js';
import { readStoryIR, StoryIRReadError } from './story.js';

/**
 * Compile a `.story` file to its IR — the caller's compile path.
 *
 * `compileChordStory`'s shape (`@sharpee/devkit`): imports resolve against the
 * story's directory, and a story the load-time gates refuse throws.
 *
 * @param storyPath the `.story` file
 * @returns the compiled Story IR
 * @throws when the story does not compile; the error's message is the gates'
 *   diagnostics
 */
export type StoryCompiler = (storyPath: string) => StoryIR;

/** The extension that marks a path as Chord source rather than a built IR. */
const STORY_EXTENSION = '.story';

/**
 * Analyze one compiled story, or say why not.
 *
 * The story's language is the IR's `phrases.defaultLocale` (ADR-407 D2). It is
 * looked up once the IR is read and before any prose is: a language with no
 * noun extractor is refused by name (D6), never read with another language's rules.
 *
 * @param irPath path to a `<story>.ir.json`, or to a `<story>.story` when
 *   `compile` is given; undefined when none was given
 * @param version the analyzer version to stamp on the document (diagnostics only)
 * @param lookup the caller's map from a language code to its noun extractor or
 *   the refusal line (ADR-407 D8); this package names no language itself
 * @param compile the caller's compile path, which lets a `.story` be read; a
 *   `.story` without one is `usage`
 * @returns the document to hand the caller — an analysis, or a named failure
 *   (`no-noun-extractor` carries the refusal line as its message; a `.story` the
 *   gates refuse is `uncompilable-story`, carrying the gates' diagnostics)
 */
export function analyzeStoryIR(
  irPath: string | undefined,
  version: string,
  lookup: NounExtractorLookup,
  compile?: StoryCompiler,
): WorldIndexResponse {
  if (irPath === undefined || irPath.length === 0) {
    return buildFailure(
      'usage',
      compile === undefined
        ? 'No story was given. Pass the path of a compiled `<story>.ir.json`.'
        : 'No story was given. Pass the path of a `<story>.story` or a compiled `<story>.ir.json`.',
      version,
    );
  }

  if (irPath.endsWith(STORY_EXTENSION)) {
    if (compile === undefined) {
      return buildFailure(
        'usage',
        `${irPath} is Chord source, and this entry reads only a compiled \`<story>.ir.json\`. ` +
          `Run \`sharpee world-index ${irPath}\` to analyze the source.`,
        version,
        irPath,
      );
    }
    return analyzeStorySource(irPath, version, lookup, compile);
  }

  let ir;
  try {
    ir = readStoryIR(irPath);
  } catch (error) {
    if (error instanceof StoryIRReadError) {
      return error.failure === 'unreadable'
        ? buildFailure(
            'unreadable-ir',
            `No compiled story could be read at ${irPath}.`,
            version,
            irPath,
          )
        : buildFailure('malformed-ir', `${irPath} is not a compiled Chord story.`, version, irPath);
    }
    throw error;
  }

  return analyzeCompiled(ir, irPath, version, lookup);
}

/**
 * Read a `.story` and its source, compile it, and analyze it.
 *
 * The main file is read first, so a path that names nothing is `unreadable-ir`
 * (whose meaning is "the path names no file, or the file cannot be read")
 * rather than a compiler error about a missing file.
 *
 * @param storyPath the `.story` file
 * @param version the analyzer version to stamp on the document
 * @param lookup the caller's noun-extractor lookup
 * @param compile the caller's compile path
 * @returns an analysis whose located records carry `at`, or a named failure
 */
function analyzeStorySource(
  storyPath: string,
  version: string,
  lookup: NounExtractorLookup,
  compile: StoryCompiler,
): WorldIndexResponse {
  let main: string;
  try {
    main = readFileSync(storyPath, 'utf8');
  } catch {
    return buildFailure('unreadable-ir', `No story could be read at ${storyPath}.`, version, storyPath);
  }

  let ir: StoryIR;
  try {
    ir = compile(storyPath);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return buildFailure('uncompilable-story', detail, version, storyPath);
  }

  return analyzeCompiled(ir, storyPath, version, lookup, sourceReaderFor(storyPath, main));
}

/**
 * A reader over a story's source files, keyed the way a `Span` names its file.
 *
 * @param storyPath the main `.story` file
 * @param main its text, already read
 * @returns a reader that answers the main file from `main` and any other file
 *   from disk, relative to the main file's directory, or null when it cannot
 */
function sourceReaderFor(storyPath: string, main: string): SourceReader {
  const directory = dirname(resolve(storyPath));
  return (file) => {
    if (file === undefined) return main;
    try {
      return readFileSync(resolve(directory, file), 'utf8');
    } catch {
      return null;
    }
  };
}

/**
 * The part both inputs share: the language guard, then the document.
 *
 * @param ir the compiled story
 * @param path the path it came from, for the failure documents
 * @param version the analyzer version to stamp on the document
 * @param lookup the caller's noun-extractor lookup
 * @param source the story's source, when it was read
 * @returns the document, or a named failure
 */
function analyzeCompiled(
  ir: StoryIR,
  path: string,
  version: string,
  lookup: NounExtractorLookup,
  source?: SourceReader,
): WorldIndexResponse {
  const languageCode = ir.phrases?.defaultLocale;
  if (typeof languageCode !== 'string' || languageCode.length === 0) {
    return buildFailure(
      'malformed-ir',
      `${path} names no language: a compiled Chord story carries phrases.defaultLocale.`,
      version,
      path,
    );
  }
  const resolution = lookup(languageCode);
  if (!resolution.found) {
    return buildFailure('no-noun-extractor', resolution.refusal, version, path);
  }

  try {
    return buildDocument(ir, version, resolution.extractor, source);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return buildFailure('internal', `The World Index analysis failed: ${detail}`, version, path);
  }
}

/**
 * This package's version, read from the manifest beside a running script.
 *
 * Resolved from the script path rather than `__dirname` or `import.meta.url` so
 * the same source works from either build target (this package emits CommonJS
 * to `dist` and ES modules to `dist-esm`, and neither of those two is available
 * in both).
 *
 * @param scriptPath the path the process was started with (`process.argv[1]`)
 * @returns the version, or `unknown` when the manifest cannot be read
 */
export function analyzerVersionFromScript(scriptPath: string | undefined): string {
  if (scriptPath === undefined) return 'unknown';
  try {
    const manifest = readFileSync(join(dirname(scriptPath), '..', 'package.json'), 'utf8');
    const version = (JSON.parse(manifest) as { version?: unknown }).version;
    return typeof version === 'string' ? version : 'unknown';
  } catch {
    return 'unknown';
  }
}
