/**
 * bundle-inputs.d.mts — the declaration for bundle-inputs.mjs, so the test
 * that pins the invariant typechecks without `allowJs`.
 *
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

/**
 * The bundle inputs that are not source files.
 *
 * @param metafile esbuild's metafile for a build rooted at the repository root
 * @returns the offending input paths, sorted; empty when every input is source
 */
export function findNonSourceInputs(metafile: { inputs: Record<string, object> }): string[];
