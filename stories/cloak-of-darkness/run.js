#!/usr/bin/env node

/**
 * Runner script that ensures packages can be found
 */

const path = require('path');
const Module = require('module');

// Add the monorepo packages to the module paths
const packagesDir = path.resolve(__dirname, '../../packages');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain) {
  // Handle @sharpee/* packages
  if (request.startsWith('@sharpee/')) {
    const packageName = request.split('/')[1];
    const packagePath = path.join(packagesDir, packageName);
    
    try {
      // Try to resolve from the packages directory
      return originalResolveFilename.call(this, packagePath, parent, isMain);
    } catch (e) {
      // Fall back to original resolution
    }
  }
  
  return originalResolveFilename.call(this, request, parent, isMain);
};

// Now run the test runner
require('./dist/test-runner.js');