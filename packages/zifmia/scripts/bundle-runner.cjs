#!/usr/bin/env node
/**
 * Bundle the Zifmia runner frontend using esbuild.
 *
 * Uses tsf's cross-platform esbuild loader so the correct native binary
 * is auto-installed regardless of whether pnpm install was run from WSL,
 * Windows, or macOS.
 *
 * Usage:
 *   node packages/zifmia/scripts/bundle-runner.js [--theme <name>]
 *
 * Produces:
 *   dist/runner/modules/platform.js  - All @sharpee/* ESM exports
 *   dist/runner/runner.js            - React runner app (IIFE)
 *   dist/runner/index.html           - HTML shell with importmap
 */

const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Resolve paths
// ---------------------------------------------------------------------------
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const TSF_ROOT = path.resolve(REPO_ROOT, '..', 'tsf');
const RUNNER_DIST = path.join(REPO_ROOT, 'dist', 'runner');
const MODULES_DIR = path.join(RUNNER_DIST, 'modules');

// ---------------------------------------------------------------------------
// Parse args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
let theme = 'classic-light';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--theme' && args[i + 1]) {
    theme = args[++i];
  }
}

// ---------------------------------------------------------------------------
// Load esbuild via tsf's cross-platform loader
// ---------------------------------------------------------------------------
const loaderPath = path.join(TSF_ROOT, 'dist', 'utils', 'esbuild-loader.js');
if (!fs.existsSync(loaderPath)) {
  console.error(`tsf esbuild-loader not found at ${loaderPath}`);
  console.error('Build tsf first: cd ../tsf && npm run build');
  process.exit(1);
}
const { loadEsbuild } = require(loaderPath);
const esbuild = loadEsbuild();

// ---------------------------------------------------------------------------
// Shared esbuild options
// ---------------------------------------------------------------------------
const PLATFORM_PACKAGES = [
  'core', 'world-model', 'engine', 'stdlib',
  'parser-en-us', 'lang-en-us', 'if-domain', 'if-services',
  'event-processor', 'text-blocks', 'text-service',
  'plugins', 'plugin-npc', 'plugin-scheduler', 'plugin-state-machine',
];

const aliases = {};
for (const pkg of PLATFORM_PACKAGES) {
  aliases[`@sharpee/${pkg}`] = path.join(REPO_ROOT, 'packages', pkg, 'dist-esm', 'index.js');
}

// pnpm symlinks created under WSL are broken on native Windows, so resolve
// react/react-dom/scheduler to their actual locations in the pnpm store.
aliases['react'] = path.join(REPO_ROOT, 'node_modules', '.pnpm', 'react@18.3.1', 'node_modules', 'react');
aliases['react-dom'] = path.join(REPO_ROOT, 'node_modules', '.pnpm', 'react-dom@18.3.1_react@18.3.1', 'node_modules', 'react-dom');
aliases['scheduler'] = path.join(REPO_ROOT, 'node_modules', '.pnpm', 'scheduler@0.23.2', 'node_modules', 'scheduler');

const defines = {
  'process.env.PARSER_DEBUG': 'undefined',
  'process.env.DEBUG_PRONOUNS': 'undefined',
  'process.env.NODE_ENV': '"production"',
};

// ---------------------------------------------------------------------------
// 1. Bundle platform.js (ESM - all @sharpee/* re-exported)
// ---------------------------------------------------------------------------
function bundlePlatform() {
  // Write a temp entry file that re-exports all packages
  const entryLines = PLATFORM_PACKAGES.map(
    (pkg) => `export * from "${path.join(REPO_ROOT, 'packages', pkg, 'dist-esm', 'index.js').replace(/\\/g, '/')}";`
  );
  const entryFile = path.join(RUNNER_DIST, '_platform-entry.js');
  fs.mkdirSync(MODULES_DIR, { recursive: true });
  fs.writeFileSync(entryFile, entryLines.join('\n'));

  try {
    esbuild.buildSync({
      entryPoints: [entryFile],
      bundle: true,
      platform: 'browser',
      format: 'esm',
      target: 'es2020',
      outfile: path.join(MODULES_DIR, 'platform.js'),
      sourcemap: true,
      minify: true,
      define: defines,
      alias: aliases,
    });
    console.log('  [OK] platform.js');
  } finally {
    fs.unlinkSync(entryFile);
  }
}

// ---------------------------------------------------------------------------
// 2. Bundle runner.js (IIFE React app)
// ---------------------------------------------------------------------------
function bundleRunner() {
  const runnerEntry = path.join(REPO_ROOT, 'packages', 'zifmia', 'src', 'runner', 'runner-entry.tsx');
  if (!fs.existsSync(runnerEntry)) {
    console.error(`Runner entry not found: ${runnerEntry}`);
    process.exit(1);
  }

  esbuild.buildSync({
    entryPoints: [runnerEntry],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'es2020',
    globalName: 'ZifmiaRunner',
    outfile: path.join(RUNNER_DIST, 'runner.js'),
    sourcemap: true,
    minify: true,
    loader: { '.tsx': 'tsx' },
    jsx: 'automatic',
    define: defines,
    alias: aliases,
  });
  console.log('  [OK] runner.js');
}

// ---------------------------------------------------------------------------
// 3. Generate index.html with importmap
// ---------------------------------------------------------------------------
function generateHtml() {
  const themesFile = path.join(REPO_ROOT, 'packages', 'zifmia', 'src', 'styles', 'themes.css');
  const themesCss = fs.existsSync(themesFile) ? fs.readFileSync(themesFile, 'utf-8') : '';

  const importmapPackages = [
    'core', 'world-model', 'engine', 'stdlib',
    'parser-en-us', 'lang-en-us', 'plugin-npc',
    'plugin-scheduler', 'plugin-state-machine',
    'if-domain', 'if-services',
  ];
  const imports = {};
  for (const pkg of importmapPackages) {
    imports[`@sharpee/${pkg}`] = './modules/platform.js';
  }

  const html = `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zifmia Story Runner</title>
  <script type="importmap">
  ${JSON.stringify({ imports }, null, 2).replace(/\n/g, '\n  ')}
  </script>
  <style>
${themesCss}
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="runner.js"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(RUNNER_DIST, 'index.html'), html);
  console.log('  [OK] index.html');
}

// ---------------------------------------------------------------------------
// 4. Copy assets
// ---------------------------------------------------------------------------
function copyAssets() {
  const fontsDir = path.join(RUNNER_DIST, 'assets', 'fonts');
  fs.mkdirSync(fontsDir, { recursive: true });

  const logo = path.join(REPO_ROOT, 'docs', 'design', 'sharpee-logo.png');
  if (fs.existsSync(logo)) {
    fs.copyFileSync(logo, path.join(RUNNER_DIST, 'assets', 'sharpee-logo.png'));
    console.log('  [OK] sharpee-logo.png');
  }

  const font = path.join(REPO_ROOT, 'docs', 'design', 'fonts', 'Enchanted Land DS D.otf');
  if (fs.existsSync(font)) {
    fs.copyFileSync(font, path.join(fontsDir, 'enchanted-land.otf'));
    console.log('  [OK] enchanted-land.otf');
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log('Bundling Zifmia runner...');

bundlePlatform();
bundleRunner();
generateHtml();
copyAssets();

// Report sizes
const runnerSize = Math.round(fs.statSync(path.join(RUNNER_DIST, 'runner.js')).size / 1024);
const platformSize = Math.round(fs.statSync(path.join(MODULES_DIR, 'platform.js')).size / 1024);
console.log(`\n  runner.js   (${runnerSize} KB)`);
console.log(`  platform.js (${platformSize} KB)`);
