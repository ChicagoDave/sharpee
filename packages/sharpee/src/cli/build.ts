/**
 * CLI: sharpee build
 *
 * Builds a .sharpee story bundle and browser client from a story project.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { zipSync, strToU8 } from 'fflate';
import { runBuildBrowserCommand } from './build-browser';

interface SharpeeConfig {
  title?: string;
  author?: string;
  ifid?: string;
  headline?: string;
  preferredTheme?: string;
}

function readRecursive(dir: string, base: string = ''): Record<string, Uint8Array> {
  const entries: Record<string, Uint8Array> = {};
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const rel = base ? `${base}/${item}` : item;
    if (fs.statSync(full).isDirectory()) {
      Object.assign(entries, readRecursive(full, rel));
    } else {
      entries[rel] = new Uint8Array(fs.readFileSync(full));
    }
  }
  return entries;
}

export async function runBuildCommand(args: string[]): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const projectDir = process.cwd();
  const packagePath = path.join(projectDir, 'package.json');

  if (!fs.existsSync(packagePath)) {
    console.error('Error: No package.json found. Run from a story project directory.');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  const config: SharpeeConfig = pkg.sharpee || {};
  const storyName = config.title?.toLowerCase().replace(/\s+/g, '-') || pkg.name?.replace(/^@.*\//, '') || 'story';
  const storySrc = path.join(projectDir, 'src', 'index.ts');

  if (!fs.existsSync(storySrc)) {
    console.error('Error: src/index.ts not found.');
    process.exit(1);
  }

  console.log(`\nBuilding: ${config.title || storyName}\n`);

  // --- .sharpee bundle ---

  console.log('--- Story Bundle (.sharpee) ---\n');

  const distDir = path.join(projectDir, 'dist');
  fs.mkdirSync(distDir, { recursive: true });

  // 1. esbuild story → ESM with @sharpee/* external
  const storyJsPath = path.join(distDir, 'story.js');
  const tsconfigPath = path.join(projectDir, 'tsconfig.json');
  const tsconfigArg = fs.existsSync(tsconfigPath) ? `--tsconfig=${tsconfigPath}` : '';

  try {
    execSync(
      `npx esbuild "${storySrc}" --bundle --platform=browser --format=esm --target=es2020 --outfile="${storyJsPath}" --external:@sharpee/* ${tsconfigArg}`,
      { cwd: projectDir, stdio: 'pipe' }
    );
    console.log('  story.js');
  } catch (error: any) {
    console.error('  Failed to build story.js');
    if (error.stderr) console.error(error.stderr.toString());
    process.exit(1);
  }

  // 2. Generate meta.json
  const meta = {
    format: 'sharpee-story',
    formatVersion: 1,
    title: config.title || pkg.name,
    author: config.author || 'Unknown',
    version: pkg.version,
    description: config.headline || pkg.description || '',
    sharpeeVersion: '>=0.9.0',
    ifid: config.ifid || '',
    hasAssets: fs.existsSync(path.join(projectDir, 'assets')),
    hasTheme: fs.existsSync(path.join(projectDir, 'theme.css')),
    preferredTheme: config.preferredTheme || 'classic-light',
  };

  // 3. Assemble zip contents
  const zipEntries: Record<string, Uint8Array> = {};
  zipEntries['story.js'] = new Uint8Array(fs.readFileSync(storyJsPath));
  zipEntries['meta.json'] = strToU8(JSON.stringify(meta, null, 2) + '\n');

  const assetsDir = path.join(projectDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const assetEntries = readRecursive(assetsDir, 'assets');
    Object.assign(zipEntries, assetEntries);
    console.log(`  assets/ (${Object.keys(assetEntries).length} files)`);
  }

  const themePath = path.join(projectDir, 'theme.css');
  if (fs.existsSync(themePath)) {
    zipEntries['theme.css'] = new Uint8Array(fs.readFileSync(themePath));
    console.log('  theme.css');
  }

  // 4. Create .sharpee zip
  const zipped = zipSync(zipEntries);
  const outFile = path.join(distDir, `${storyName}.sharpee`);
  fs.writeFileSync(outFile, zipped);
  const sizeKb = (fs.statSync(outFile).size / 1024).toFixed(1);
  console.log(`  meta.json`);
  console.log(`\n  Output: ${path.relative(projectDir, outFile)} (${sizeKb} KB)\n`);

  // Clean up temp story.js
  fs.unlinkSync(storyJsPath);

  // --- Browser client ---

  console.log('--- Browser Client ---\n');

  const browserEntry = path.join(projectDir, 'src', 'browser-entry.ts');
  if (fs.existsSync(browserEntry)) {
    await runBuildBrowserCommand(args.filter(a => a !== '--help' && a !== '-h'));
  } else {
    console.log('  Skipped (no src/browser-entry.ts)\n');
    console.log('  Run "sharpee init-browser" to add browser support.\n');
  }

  console.log('Build complete!\n');
}

function showHelp(): void {
  console.log(`
sharpee build - Build story bundle and browser client

Usage: sharpee build [options]

Options:
  --no-minify      Skip minification (browser client)
  --no-sourcemap   Skip source map generation (browser client)

Output:
  dist/<story>.sharpee   Story bundle for Zifmia runner
  dist/web/              Browser client (if browser-entry.ts exists)

Run from a story project directory with a package.json containing
a "sharpee" config block.
`);
}
