/**
 * world-index.ts — `sharpee world-index <story>.ir.json` (ADR-321 D8).
 *
 * Owner context: @sharpee/devkit. The author-CLI face of `@sharpee/world-index`:
 * a compiled story in, one JSON document on stdout, an exit code saying which
 * kind of document it is.
 *
 * WHY THE CLI OWNS THIS. Chord Writer's World tab is the caller, and every other
 * subprocess it spawns — build, compose, test, play — is resolved through the
 * same three tiers (the workspace shim, a global install, the toolchain sealed
 * inside the app). Reaching the analyzer any other way would mean a second
 * resolution scheme in the IDE and a second thing to vendor, for a package the
 * author CLI can carry for the cost of one dependency.
 *
 * The analysis itself is not here. `analyzeStoryIR` is, so this command and the
 * package's own `cli.js` cannot disagree about what a failure is called.
 *
 * WHY THE CLI SUPPLIES THE LANGUAGE (ADR-407 D8). The analyzer names no
 * language; this command hands it the lookup that loads the story language's
 * `@sharpee/lang-<code>/nouns` by convention, through Node's own `require`, so
 * the IDE's Incomplete view reads prose through the same extractor every lens
 * does. A language with no nouns module is a failure document whose message is
 * the one refusal line (D6), with exit 1.
 *
 * Public interface: runWorldIndex(args), nounExtractorLookup.
 */
import { resolveNounExtractor, type NounExtractorLookup, type NounsModule } from '@sharpee/if-domain/nouns';
import { analyzeStoryIR } from '@sharpee/world-index';
import { platformVersion } from '../standalone/init.js';

/** Exit status when the document on stdout is a failure, not an analysis. */
const EXIT_FAILURE = 1;

/**
 * Find a story language's noun extractor, loading its nouns module through `require`.
 *
 * @param languageCode the IR's `phrases.defaultLocale`, e.g. 'en-US'
 * @returns the extractor, or the refusal line naming the code (never throws)
 */
export const nounExtractorLookup: NounExtractorLookup = (languageCode) =>
  resolveNounExtractor(languageCode, (moduleName) => require(moduleName) as NounsModule);

/**
 * Analyze a compiled story and write one JSON document to stdout.
 *
 * Failure is a document, never a throw (ADR-321 AC-9): a missing path, an
 * unreadable file, JSON that is not a Story IR, and a defect in the analysis
 * itself each answer with a failure naming the cause, so the caller always has
 * something to render.
 *
 * The version stamped on the document is the toolchain's. It is diagnostics
 * only — the field callers branch on is `schema` — and devkit ships in lockstep
 * with the analyzer, so the two numbers are the same number.
 *
 * @param args the command line after `world-index`
 * @returns 0 when the document is an analysis, 1 when it is a failure
 */
export function runWorldIndex(args: string[]): number {
  const irPath = args.find((arg) => !arg.startsWith('-'));
  const response = analyzeStoryIR(irPath, platformVersion(), nounExtractorLookup);
  process.stdout.write(`${JSON.stringify(response)}\n`);
  return response.ok ? 0 : EXIT_FAILURE;
}
