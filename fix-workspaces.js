#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Function to get all package.json files
function getAllPackageJsonFiles(rootDir) {
  const patterns = [
    'packages/*/package.json',
    'packages/extensions/*/package.json',
    'stories/*/package.json'
  ];
  
  let files = [];
  patterns.forEach(pattern => {
    const matches = glob.sync(path.join(rootDir, pattern));
    files = files.concat(matches);
  });
  
  return files;
}

// Function to replace workspace:* with version
function fixWorkspaceReferences(packageJsonPath) {
  const content = fs.readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(content);
  let modified = false;

  // Fix dependencies
  if (packageJson.dependencies) {
    Object.keys(packageJson.dependencies).forEach(dep => {
      if (packageJson.dependencies[dep] === 'workspace:*') {
        packageJson.dependencies[dep] = '^0.1.0';
        modified = true;
      }
    });
  }

  // Fix devDependencies
  if (packageJson.devDependencies) {
    Object.keys(packageJson.devDependencies).forEach(dep => {
      if (packageJson.devDependencies[dep] === 'workspace:*') {
        packageJson.devDependencies[dep] = '^0.1.0';
        modified = true;
      }
    });
  }

  if (modified) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`Fixed workspace references in ${packageJsonPath}`);
  }
}

// Main execution
const rootDir = __dirname;
console.log('Fixing workspace: references in all package.json files...\n');

// First, ensure glob is available
try {
  require.resolve('glob');
} catch (e) {
  console.error('Installing glob package...');
  require('child_process').execSync('npm install glob', { stdio: 'inherit' });
}

// Fix root package.json if needed
const rootPackageJsonPath = path.join(rootDir, 'package.json');
fixWorkspaceReferences(rootPackageJsonPath);

// Fix all sub-packages
const packageJsonFiles = getAllPackageJsonFiles(rootDir);
packageJsonFiles.forEach(file => {
  fixWorkspaceReferences(file);
});

console.log('\nDone! Now run: npm install');
