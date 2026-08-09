/**
 * fs.ts — browser shim for the node `fs` import in branch-tester's parser.
 *
 * Purpose: the parser module reads files only in `parseTranscriptFile`,
 *   which the surface never calls (it parses text it already holds — the
 *   Swift side ships file contents over the boot payload). This shim lets
 *   esbuild bundle the parser from source (ADR-306 D2) without dragging a
 *   node runtime in; any accidental filesystem call fails loudly.
 *
 * Public interface: readFileSync (throws), existsSync (false).
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

export function readFileSync(): never {
  throw new Error('fs is not available inside the testing surface');
}

export function existsSync(): boolean {
  return false;
}
