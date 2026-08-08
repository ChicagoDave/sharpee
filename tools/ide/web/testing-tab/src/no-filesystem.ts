/**
 * no-filesystem.ts — what `fs` and `path` become inside the Testing tab.
 *
 * Purpose: the tab bundles `@sharpee/branch-tester`'s parser and serializer from
 *   SOURCE, so it reads and writes transcripts through the same grammar the test
 *   run uses (Phase 5 §1). That module imports `fs` and `path` for exactly one
 *   function — `parseTranscriptFile`, which reads a path off disk — and a page in
 *   a `WKWebView` has no disk. esbuild must resolve the imports anyway.
 *
 *   Stubbing them to `{}` would make `parseTranscriptFile` fail as
 *   `readFileSync is not a function`, which reads like a bundler bug. These throw
 *   with the reason instead, and point at the call the page is supposed to make:
 *   the host reads the file, the page parses the text.
 *
 * Public interface: `readFileSync` and the handful of `path` helpers, all of
 *   which throw. Nothing here is meant to be called.
 * Owner context: tools/ide — the Testing tab's web bundle.
 */

/** The message every stub carries, so the cause is never in doubt. */
function unavailable(name: string): never {
  throw new Error(
    `${name} is not available in the Testing tab — the page has no filesystem. ` +
      'Ask the host for the file (requestSource) and parse the text with parseTranscript.',
  );
}

export function readFileSync(): never {
  return unavailable('fs.readFileSync');
}

export function writeFileSync(): never {
  return unavailable('fs.writeFileSync');
}

export function existsSync(): never {
  return unavailable('fs.existsSync');
}

export function resolve(): never {
  return unavailable('path.resolve');
}

export function join(): never {
  return unavailable('path.join');
}

export function dirname(): never {
  return unavailable('path.dirname');
}

export function basename(): never {
  return unavailable('path.basename');
}

// The parser imports these as namespaces (`import * as fs from 'fs'`), so the
// module's default export has to behave like the namespace too.
export default {
  readFileSync,
  writeFileSync,
  existsSync,
  resolve,
  join,
  dirname,
  basename,
};
