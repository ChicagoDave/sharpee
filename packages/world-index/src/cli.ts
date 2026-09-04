#!/usr/bin/env node

/**
 * cli.ts — the analyzer as a standalone subprocess.
 *
 * Purpose: run the analysis without the author CLI in the way — `repokit`, a
 * script, or a checkout-local IDE build invokes it directly:
 *
 *   node packages/world-index/dist/cli.js <story>.ir.json
 *
 * The shipped path is `sharpee world-index <story>.ir.json` (@sharpee/devkit),
 * which the IDE resolves through its own toolchain tiers. Both are thin shells
 * over `analyzeStoryIR` — this file owns argv, stdout, and the exit code, and
 * nothing else, so the two entry points cannot disagree about what a failure is.
 *
 * **It never writes anything but one JSON document to stdout, and it never
 * throws its way out.** Exit status is 0 for an analysis and 1 for a failure
 * document; anything else means the process died before it could speak, which is
 * the IDE's own empty state.
 *
 * Public interface: none — this is an entry point, not a module. The document
 * shape callers parse lives in `document.ts`.
 *
 * Owner context: @sharpee/world-index — the derivation package.
 *
 * @packageDocumentation
 * @see ADR-321 AC-9: failure states render
 */

import { analyzeStoryIR, analyzerVersionFromScript } from './analyze.js';

/** Exit status when the document on stdout is a failure. */
const EXIT_FAILURE = 1;

const response = analyzeStoryIR(
  process.argv[2],
  analyzerVersionFromScript(process.argv[1]),
);
process.stdout.write(`${JSON.stringify(response)}\n`);
if (!response.ok) process.exitCode = EXIT_FAILURE;
