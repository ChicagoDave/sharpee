/**
 * bundle-inputs.mjs — the testing surface bundle's source-only invariant.
 *
 * Purpose: every file the bundle reads is a source file — the surface's own
 *   `src/`, or a workspace package's `src/`. A package's build output
 *   (`dist/`, `dist-esm/`) or anything under `node_modules/` means an import
 *   reached a package through its `exports` map instead of an alias in
 *   build.mjs, which makes the committed bundle depend on what happened to be
 *   built and can pull a whole package in behind one function.
 *
 * Public interface: {@link findNonSourceInputs}.
 * Owner context: tools/ide — the testing play surface's web bundle; build.mjs
 *   is the one caller.
 *
 * References: GH #659 (the Chord compiler entered the bundle from dist-esm),
 *   GH #662 item 4 (nothing noticed the growth).
 */

/** The surface's own sources, relative to the repository root. */
const OWN_SOURCE = 'tools/ide/web/testing-surface/src/';

/** A workspace package's sources, relative to the repository root. */
const PACKAGE_SOURCE = /^packages\/(?:extensions\/)?[^/]+\/src\//;

/**
 * The bundle inputs that are not source files.
 *
 * @param {{ inputs: Record<string, unknown> }} metafile esbuild's metafile for
 *   a build whose `absWorkingDir` is the repository root, so every input path
 *   is repo-relative
 * @returns {string[]} the offending input paths, sorted; empty when every
 *   input is the surface's own source or a workspace package's source
 */
export function findNonSourceInputs(metafile) {
  return Object.keys(metafile.inputs)
    .filter((path) => !path.startsWith(OWN_SOURCE) && !PACKAGE_SOURCE.test(path))
    .sort();
}
