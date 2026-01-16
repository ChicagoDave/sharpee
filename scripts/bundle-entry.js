/**
 * Bundle entry point - re-exports everything from all Sharpee packages.
 * Used by bundle-sharpee.sh to create a complete bundle.
 *
 * NOTE: Uses direct paths to dist folders to avoid esbuild resolution issues
 * with pnpm symlinks and directory imports (e.g., ./actions, ./grammar).
 */

// Core types and utilities - use literal paths for esbuild static analysis
module.exports = {
  ...require('../packages/core/dist/index.js'),
  ...require('../packages/if-domain/dist/index.js'),
  ...require('../packages/world-model/dist/index.js'),
  ...require('../packages/stdlib/dist/index.js'),
  ...require('../packages/engine/dist/index.js'),
  ...require('../packages/parser-en-us/dist/index.js'),
  ...require('../packages/lang-en-us/dist/index.js'),
  ...require('../packages/event-processor/dist/index.js'),
  ...require('../packages/text-blocks/dist/index.js'),
  ...require('../packages/text-service/dist/index.js'),
  ...require('../packages/if-services/dist/index.js')
};
