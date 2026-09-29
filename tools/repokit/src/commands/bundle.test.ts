/**
 * bundle.test.ts — the CLI bundle's package-resolution invariant.
 *
 * The bundle resolves `@sharpee/*` through the workspace links and each
 * package's `exports` map rather than a hand-kept alias list. These tests pin
 * the check that stands in for the list: every workspace module enters the
 * bundle from its CJS dist/, once.
 */
import { describe, expect, it } from 'vitest';
import { findResolutionViolations } from './bundle';

function bundleWith(...modulePaths: string[]): string {
  return ['"use strict";', ...modulePaths.flatMap((p) => [`// ${p}`, 'var x = 1;'])].join('\n');
}

describe('findResolutionViolations', () => {
  it('accepts workspace modules from dist/, third-party modules, and the entry', () => {
    const text = bundleWith(
      'packages/core/dist/index.js',
      'packages/extensions/chapters/dist/index.js',
      'packages/story-loader/dist/pin-grammar.js',
      'node_modules/.pnpm/chalk@4.1.2/node_modules/chalk/source/index.js',
      'scripts/bundle-entry.js',
    );

    expect(findResolutionViolations(text)).toEqual([]);
  });

  it('flags a second copy of a package from dist-esm/', () => {
    const text = bundleWith('packages/core/dist/index.js', 'packages/core/dist-esm/index.js');

    expect(findResolutionViolations(text)).toEqual(['packages/core/dist-esm/index.js']);
  });

  it('flags a workspace module bundled from src/', () => {
    const text = bundleWith('packages/engine/src/game-engine.ts');

    expect(findResolutionViolations(text)).toEqual(['packages/engine/src/game-engine.ts']);
  });

  it('flags a published @sharpee copy resolved from node_modules', () => {
    const path = 'node_modules/.pnpm/@sharpee+core@5.4.1/node_modules/@sharpee/core/dist/index.js';

    expect(findResolutionViolations(bundleWith(path))).toEqual([path]);
  });

  it('ignores `// packages/...` text that is not a module header', () => {
    const text = '  // packages/core/dist-esm/index.js is mentioned in a comment\nvar y = 2;';

    expect(findResolutionViolations(text)).toEqual([]);
  });
});
