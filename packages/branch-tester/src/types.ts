/**
 * types.ts — this package's view of the shared testing types.
 *
 * The tree runner and the text-transcript runner build and read one type set
 * (ADR-340 D1), owned by `@sharpee/transcript-tester`; this module re-exports
 * it so `./types.js` keeps meaning what it always meant here, for this
 * package's own modules and for the IDE surface's `@sharpee/branch-tester/types`
 * import (D5). Type-only on purpose: the browser bundle erases it, so the
 * package whose barrel imports `fs` is never resolved from a browser.
 *
 * Public interface: every type `assertion-core` re-exports. Owner context:
 * branch-tester (testing tooling).
 */

export type * from '@sharpee/transcript-tester/assertion-core';
