#!/usr/bin/env node
/**
 * Generate meta.json for a .sharpee story bundle.
 *
 * Usage: node scripts/generate-meta.js <story-name> <output-dir>
 *
 * Reads the story's compiled config from stories/<name>/dist/index.js
 * and the sharpee version from packages/sharpee/package.json.
 */

const fs = require('fs');
const path = require('path');

const storyName = process.argv[2];
const outputDir = process.argv[3];

if (!storyName || !outputDir) {
  console.error('Usage: node scripts/generate-meta.js <story-name> <output-dir>');
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, '..');
const storyDir = path.join(repoRoot, 'stories', storyName);
const storyDist = path.join(storyDir, 'dist', 'index.js');
const sharpeePkg = path.join(repoRoot, 'packages', 'sharpee', 'package.json');

// Load story module to extract config
let config;
try {
  const storyModule = require(storyDist);
  // Story exports either story.config or config directly
  if (storyModule.story && storyModule.story.config) {
    config = storyModule.story.config;
  } else if (storyModule.config) {
    config = storyModule.config;
  } else if (storyModule.default && storyModule.default.config) {
    config = storyModule.default.config;
  } else {
    console.error(`Could not find story config in ${storyDist}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`Failed to load story module: ${err.message}`);
  process.exit(1);
}

// Load sharpee version
let sharpeeVersion;
try {
  const pkg = JSON.parse(fs.readFileSync(sharpeePkg, 'utf8'));
  sharpeeVersion = `>=${pkg.version}`;
} catch (err) {
  console.error(`Failed to read sharpee package.json: ${err.message}`);
  process.exit(1);
}

// Check for optional assets and theme
const hasAssets = fs.existsSync(path.join(storyDir, 'assets'));
const hasTheme = fs.existsSync(path.join(storyDir, 'theme.css'));

const meta = {
  format: 'sharpee-story',
  formatVersion: 1,
  title: config.title,
  author: config.author,
  version: config.version,
  description: config.description || undefined,
  sharpeeVersion,
  ifid: config.ifid || undefined,
  hasAssets,
  hasTheme,
};

// Clean undefined values
Object.keys(meta).forEach(k => meta[k] === undefined && delete meta[k]);

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  path.join(outputDir, 'meta.json'),
  JSON.stringify(meta, null, 2) + '\n'
);

console.log(`Generated meta.json for "${meta.title}" v${meta.version}`);
