/**
 * no-esbuild-preload.cjs — node --require preload that makes `require('esbuild')`
 * fail with MODULE_NOT_FOUND, simulating a host where esbuild cannot resolve
 * (ADR-274 acceptance 3). The real-path counterpart — the bundle run from a
 * directory with no node_modules — is exercised in ADR-274's acceptance
 * verification; this preload exists so the unit suite can pin the error
 * contract without leaving the repo tree, where esbuild always resolves.
 *
 * Owner context: @sharpee/devkit test suite.
 */
'use strict';
const Module = require('module');
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'esbuild') {
    const err = new Error("Cannot find module 'esbuild'");
    err.code = 'MODULE_NOT_FOUND';
    throw err;
  }
  return originalLoad.call(this, request, parent, isMain);
};
