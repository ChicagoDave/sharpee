#!/usr/bin/env node

/**
 * CLI runner for Cloak of Darkness
 * This sets up proper module resolution for the monorepo
 */

const path = require('path');

// Set NODE_PATH to include our packages directory
const packagesDir = path.resolve(__dirname, '../../packages');
const nodeModulesDir = path.resolve(__dirname, '../../node_modules');

// Add both packages and node_modules to NODE_PATH
process.env.NODE_PATH = `${packagesDir}:${nodeModulesDir}:${process.env.NODE_PATH || ''}`;
require('module').Module._initPaths();

// Now we need to help with @sharpee/* resolution
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain) {
  // Handle @sharpee/* packages specially
  if (request.startsWith('@sharpee/')) {
    const packageName = request.replace('@sharpee/', '');
    
    // Debug logging
    if (packageName === 'text-services') {
      console.log('[DEBUG] Resolving text-services package...');
    }
    
    // First try the dist directory
    try {
      const distPath = path.join(packagesDir, packageName, 'dist', 'index.js');
      return originalResolveFilename.call(this, distPath, parent, isMain);
    } catch (e) {
      // Try the package.json main field
      try {
        const packageJsonPath = path.join(packagesDir, packageName, 'package.json');
        const packageJson = require(packageJsonPath);
        if (packageJson.main) {
          const mainPath = path.join(packagesDir, packageName, packageJson.main);
          return originalResolveFilename.call(this, mainPath, parent, isMain);
        }
      } catch (e2) {
        // Try src/index.ts (TypeScript source)
        try {
          const tsPath = path.join(packagesDir, packageName, 'src', 'index.ts');
          // Register ts-node if needed
          try {
            require('ts-node/register');
          } catch (e) {
            // ts-node not available
          }
          return originalResolveFilename.call(this, tsPath, parent, isMain);
        } catch (e3) {
          // Try src/index.js for packages without dist
          try {
            const srcPath = path.join(packagesDir, packageName, 'src', 'index.js');
            return originalResolveFilename.call(this, srcPath, parent, isMain);
          } catch (e4) {
            // Try without dist as last resort
            try {
              const packagePath = path.join(packagesDir, packageName);
              return originalResolveFilename.call(this, packagePath, parent, isMain);
            } catch (e5) {
              // Fall through to original resolver
              console.log(`[DEBUG] Failed to resolve ${request}:`, e5.message);
            }
          }
        }
      }
    }
  }
  
  return originalResolveFilename.call(this, request, parent, isMain);
};

// Run the test runner or debug script
console.log('Starting Cloak of Darkness with proper module resolution...\n');

// Check if text-services is built
const fs = require('fs');
const textServicesDistPath = path.join(packagesDir, 'text-services', 'dist', 'index.js');
if (!fs.existsSync(textServicesDistPath)) {
  console.error('[ERROR] text-services package is not built!');
  console.error('Please run: cd ../../packages/text-services && pnpm run build');
  console.error('Or from root: pnpm run build -F @sharpee/text-services');
  process.exit(1);
}

// Check if a specific script was requested
const scriptPath = process.argv[2] || './dist/test-runner.js';
require(scriptPath);