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
 * over `analyzeStoryIR` — this file owns argv, stdout, the exit code and the
 * noun-extractor lookup, and nothing else, so the two entry points cannot
 * disagree about what a failure is.
 *
 * **It never writes anything but one JSON document to stdout, and it never
 * throws its way out.** Exit status is 0 for an analysis and 1 for a failure
 * document; anything else means the process died before it could speak, which is
 * the IDE's own empty state.
 *
 * **A repo-only entry, and the one place this package loads a language.** It has
 * no `bin` and nothing publishes it as a command; it runs in this checkout, by
 * `tests/cli.test.ts` and `tests/scale-timing.ts`. The lookup it hands
 * `analyzeStoryIR` loads `@sharpee/lang-<code>/nouns` by convention (ADR-407 D3,
 * D8), resolved from this script's own location, and for English that rests on
 * `@sharpee/lang-en-us` being a test-only devDependency of this package. Nothing
 * under `src/` imports a language package (GH #622, ADR-210's direction rule);
 * the published command that does depend on one is devkit's `world-index`.
 *
 * Public interface: none — this is an entry point, not a module. The document
 * shape callers parse lives in `document.ts`.
 *
 * Owner context: @sharpee/world-index — the derivation package.
 *
 * @packageDocumentation
 * @see ADR-321 AC-9: failure states render
 * @see ADR-407 D6, D8: the story's language supplies the extractor, or is refused
 */

import { createRequire } from 'node:module';
import { join } from 'node:path';
import { resolveNounExtractor, type NounsModule } from '@sharpee/if-domain/nouns';
import { analyzeStoryIR, analyzerVersionFromScript } from './analyze.js';

/** Exit status when the document on stdout is a failure. */
const EXIT_FAILURE = 1;

// Resolved from the script path, as the version is: this source builds to both
// CommonJS and ES modules, and only a `createRequire` anchored on a real path
// loads a package the same way from either.
const load = createRequire(process.argv[1] ?? join(process.cwd(), 'cli.js'));

const response = analyzeStoryIR(
  process.argv[2],
  analyzerVersionFromScript(process.argv[1]),
  (languageCode) => resolveNounExtractor(languageCode, (moduleName) => load(moduleName) as NounsModule),
);
process.stdout.write(`${JSON.stringify(response)}\n`);
if (!response.ok) process.exitCode = EXIT_FAILURE;
