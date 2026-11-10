/**
 * bundle-inputs.test.ts — the bundle's source-only invariant, pinned on the
 * defect it exists to catch: a workspace package entering from build output.
 *
 * Owner context: tools/ide — the testing play surface's web bundle.
 */
import { describe, expect, it } from 'vitest';
import { findNonSourceInputs } from '../bundle-inputs.mjs';

function metafileOf(...paths: string[]): { inputs: Record<string, object> } {
  return { inputs: Object.fromEntries(paths.map((path) => [path, { bytes: 1 }])) };
}

describe('findNonSourceInputs', () => {
  it('accepts the surface sources and workspace package sources', () => {
    const metafile = metafileOf(
      'tools/ide/web/testing-surface/src/main.ts',
      'packages/transcript-tester/src/assertion-core.ts',
      'packages/chord/src/clause-ids.ts',
      'packages/extensions/chapters/src/index.ts',
    );

    expect(findNonSourceInputs(metafile)).toEqual([]);
  });

  it('reports a package that entered from dist-esm/ (GH #659)', () => {
    const metafile = metafileOf(
      'tools/ide/web/testing-surface/src/main.ts',
      'packages/chord/dist-esm/index.js',
      'packages/chord/dist-esm/analyzer.js',
    );

    expect(findNonSourceInputs(metafile)).toEqual([
      'packages/chord/dist-esm/analyzer.js',
      'packages/chord/dist-esm/index.js',
    ]);
  });

  it('reports a package that entered from dist/ and a module from node_modules', () => {
    const metafile = metafileOf(
      'packages/core/dist/index.js',
      'node_modules/.pnpm/lz-string@1.5.0/node_modules/lz-string/libs/lz-string.js',
    );

    expect(findNonSourceInputs(metafile)).toEqual([
      'node_modules/.pnpm/lz-string@1.5.0/node_modules/lz-string/libs/lz-string.js',
      'packages/core/dist/index.js',
    ]);
  });

  it('does not take a src/ directory outside a package root for source', () => {
    const metafile = metafileOf('packages/chord/dist-esm/src/index.js', 'tools/ide/web/other/src/x.ts');

    expect(findNonSourceInputs(metafile)).toEqual([
      'packages/chord/dist-esm/src/index.js',
      'tools/ide/web/other/src/x.ts',
    ]);
  });
});
