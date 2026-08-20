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
 * Public interface: analyzeStoryIR, analyzerVersionFromScript.
 *
 * Owner context: @sharpee/world-index — the derivation package.
 *
 * @packageDocumentation
 * @see ADR-321 AC-9: failure states render
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildDocument, buildFailure, type WorldIndexResponse } from './document.js';
import { readStoryIR, StoryIRReadError } from './story.js';

/**
 * Analyze one compiled story, or say why not.
 *
 * @param irPath path to a `<story>.ir.json`, or undefined when none was given
 * @param version the analyzer version to stamp on the document (diagnostics only)
 * @returns the document to hand the caller — an analysis, or a named failure
 */
export function analyzeStoryIR(
  irPath: string | undefined,
  version: string,
): WorldIndexResponse {
  if (irPath === undefined || irPath.length === 0) {
    return buildFailure(
      'usage',
      'No story was given. Pass the path of a compiled `<story>.ir.json`.',
      version,
    );
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

  try {
    return buildDocument(ir, version);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return buildFailure('internal', `The World Index analysis failed: ${detail}`, version, irPath);
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
