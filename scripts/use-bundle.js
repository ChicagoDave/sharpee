/**
 * Preload script that redirects @sharpee/* imports to the bundle.
 *
 * Usage: node -r ./scripts/use-bundle.js <your-script.js>
 *
 * This intercepts all require('@sharpee/...') calls and returns
 * exports from dist/cli/sharpee.js instead, giving 578x faster load times.
 */

const Module = require('module');
const path = require('path');

const bundlePath = path.resolve(__dirname, '../dist/cli/sharpee.js');

// Load bundle once
let bundle = null;
function getBundle() {
  if (!bundle) {
    const start = Date.now();
    bundle = require(bundlePath);
    console.error(`[use-bundle] Loaded sharpee bundle in ${Date.now() - start}ms`);
  }
  return bundle;
}

// Intercept require
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id.startsWith('@sharpee/')) {
    return getBundle();
  }
  return originalRequire.apply(this, arguments);
};
