#!/usr/bin/env node

/**
 * cli.ts — the analyzer as a subprocess.
 *
 * Purpose: the IDE spawns this after a successful build, hands it a compiled
 * story, and parses one JSON document from stdout (ADR-321 D2, the IDE↔analyzer
 * boundary). Running outside the IDE is a free consequence — `repokit` or an
 * author's own script invokes it exactly the same way.
 *
 *   node packages/world-index/dist/cli.js <story>.ir.json
 *
 * **It never writes anything but one JSON document to stdout, and it never
 * throws its way out.** A missing path, an unreadable file, JSON that is not a
 * Story IR, and a defect in the analysis itself each produce a failure document
 * naming the cause, so the World tab has something to render (AC-9). Exit status
 * is 0 for an analysis and 1 for a failure document; anything else means the
 * process died before it could speak, which is the IDE's own empty state.
 *
 * Public interface: none — this is an entry point, not a module. The document
 * shape callers parse lives in `document.ts`.
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

/** Exit status when the document on stdout is a failure. */
const EXIT_FAILURE = 1;

/**
 * This package's version, for the document's diagnostics field.
 *
 * Resolved from the running script rather than `__dirname` so the same source
 * works from either build target.
 *
 * @param scriptPath the path this process was started with
 * @returns the version, or `unknown` when the manifest cannot be read
 */
function analyzerVersion(scriptPath: string | undefined): string {
  if (scriptPath === undefined) return 'unknown';
  try {
    const manifest = readFileSync(join(dirname(scriptPath), '..', 'package.json'), 'utf8');
    const version = (JSON.parse(manifest) as { version?: unknown }).version;
    return typeof version === 'string' ? version : 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Analyze one story, or say why not.
 *
 * @param args the command line after the node binary and this script
 * @param version this package's version
 * @returns the document to write to stdout
 */
function respond(args: readonly string[], version: string): WorldIndexResponse {
  const path = args[0];
  if (path === undefined || path.length === 0) {
    return buildFailure(
      'usage',
      'No story was given. Pass the path of a compiled `<story>.ir.json`.',
      version,
    );
  }

  let ir;
  try {
    ir = readStoryIR(path);
  } catch (error) {
    if (error instanceof StoryIRReadError) {
      return error.failure === 'unreadable'
        ? buildFailure('unreadable-ir', `No compiled story could be read at ${path}.`, version, path)
        : buildFailure('malformed-ir', `${path} is not a compiled Chord story.`, version, path);
    }
    throw error;
  }

  try {
    return buildDocument(ir, version);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return buildFailure('internal', `The World Index analysis failed: ${detail}`, version, path);
  }
}

const version = analyzerVersion(process.argv[1]);
const response = respond(process.argv.slice(2), version);
process.stdout.write(`${JSON.stringify(response)}\n`);
if (!response.ok) process.exitCode = EXIT_FAILURE;
