#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to replace workspace:* with file: protocol
function fixWorkspaceProtocol(packageJsonPath) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  let modified = false;

  // Fix dependencies
  if (packageJson.dependencies) {
    for (const [dep, version] of Object.entries(packageJson.dependencies)) {
      if (version === 'workspace:*' || version.startsWith('workspace:')) {
        // Convert to file: protocol pointing to the package
        const packageName = dep.replace('@sharpee/', '');
        packageJson.dependencies[dep] = `file:../../packages/${packageName}`;
        modified = true;
      }
    }
  }

  // Fix devDependencies
  if (packageJson.devDependencies) {
    for (const [dep, version] of Object.entries(packageJson.devDependencies)) {
      if (version === 'workspace:*' || version.startsWith('workspace:')) {
        const packageName = dep.replace('@sharpee/', '');
        packageJson.devDependencies[dep] = `file:../../packages/${packageName}`;
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`Fixed workspace protocol in ${packageJsonPath}`);
  }
}

// Fix the cloak-of-darkness package.json
const cloakPackageJson = path.join(__dirname, 'stories', 'cloak-of-darkness', 'package.json');
if (fs.existsSync(cloakPackageJson)) {
  fixWorkspaceProtocol(cloakPackageJson);