/**
 * Bundle entry point - re-exports everything from all Sharpee packages.
 * Used by bundle-sharpee.sh to create a complete bundle.
 */

// Core types and utilities
module.exports = {
  ...require('@sharpee/core'),
  ...require('@sharpee/if-domain'),
  ...require('@sharpee/world-model'),
  ...require('@sharpee/stdlib'),
  ...require('@sharpee/engine'),
  ...require('@sharpee/parser-en-us'),
  ...require('@sharpee/lang-en-us'),
  ...require('@sharpee/event-processor'),
  ...require('@sharpee/text-services'),
  ...require('@sharpee/if-services')
};
