/**
 * CLI: sharpee build
 *
 * Builds a .sharpee story bundle and browser client from a story project.
 * With --test, also compiles the story and runs transcript tests.
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

/**
 * Find transcript files matching a glob pattern in a directory.
 * Returns sorted file paths.
 */
function findTranscriptFiles(dir: string, pattern: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const files: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    if (entry.endsWith('.transcript')) {
      // Simple glob: 'wt-*.transcript' matches files starting with 'wt-'
      if (!pattern || entry.match(new RegExp('^' + pattern.replace(/\*/g, '.*') + '$'))) {
        files.push(path.join(dir, entry));
      }
    }
  }
  return files.sort();
}

export async function runBuildCommand(args: string[]): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const runTests = args.includes('--test');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const stopOnFailure = args.includes('--stop-on-failure');
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

  // --- Compile TypeScript (needed for both bundle and testing) ---

  console.log('--- Compiling TypeScript ---\n');

  const tsconfigPath = path.join(projectDir, 'tsconfig.json');
  try {
    execSync('npx tsc', { cwd: projectDir, stdio: 'pipe' });
    console.log('  TypeScript compiled successfully\n');
  } catch (error: any) {
    console.error('  TypeScript compilation failed');
    if (error.stdout) console.error(error.stdout.toString());
    if (error.stderr) console.error(error.stderr.toString());
    process.exit(1);
  }

  // --- .sharpee bundle ---

  console.log('--- Story Bundle (.sharpee) ---\n');

  const distDir = path.join(projectDir, 'dist');
  fs.mkdirSync(distDir, { recursive: true });

  // 1. esbuild story → ESM with @sharpee/* external
  const storyJsPath = path.join(distDir, 'story.js');
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
    await runBuildBrowserCommand(args.filter(a => a !== '--help' && a !== '-h' && a !== '--test' && a !== '--verbose' && a !== '-v' && a !== '--stop-on-failure'));
  } else {
    console.log('  Skipped (no src/browser-entry.ts)\n');
    console.log('  Run "sharpee init-browser" to add browser support.\n');
  }

  // --- Run transcript tests ---

  if (runTests) {
    console.log('--- Running Transcript Tests ---\n');
    await runTranscriptTests(projectDir, { verbose, stopOnFailure });
  }

  console.log('Build complete!\n');
}

/**
 * Run transcript tests for a story project.
 * Loads the compiled story from dist/, finds transcript files, and runs them.
 */
async function runTranscriptTests(
  projectDir: string,
  options: { verbose: boolean; stopOnFailure: boolean }
): Promise<void> {
  // Lazy-load transcript-tester to avoid import issues when not testing
  const {
    loadStory,
    parseTranscriptFile,
    runTranscript,
    reportTranscript,
    reportTestRun,
    getExitCode
  } = require('@sharpee/transcript-tester');

  const { TranscriptResult, TestRunResult } = require('@sharpee/transcript-tester');

  // Find transcript files
  const walkthroughDir = path.join(projectDir, 'walkthroughs');
  const unitTestDir = path.join(projectDir, 'tests', 'transcripts');

  const walkthroughs = findTranscriptFiles(walkthroughDir, 'wt-*.transcript');
  const unitTests = findTranscriptFiles(unitTestDir, '*.transcript');

  if (walkthroughs.length === 0 && unitTests.length === 0) {
    console.log('  No transcript files found.\n');
    console.log('  Place walkthroughs in walkthroughs/wt-*.transcript');
    console.log('  Place unit tests in tests/transcripts/*.transcript\n');
    return;
  }

  // Load the story from compiled dist/
  let game: any;
  try {
    game = await loadStory(projectDir);
  } catch (error: any) {
    console.error(`  Failed to load story: ${error.message}`);
    console.error('  Make sure TypeScript compiled successfully (dist/index.js exists).\n');
    process.exit(1);
  }

  const allResults: any[] = [];
  let totalPassed = 0;
  let totalFailed = 0;
  let totalExpectedFailures = 0;
  let totalSkipped = 0;
  let totalDuration = 0;

  // Run walkthrough chain (state persists between transcripts)
  if (walkthroughs.length > 0) {
    console.log(`  Walkthroughs: ${walkthroughs.length} files (chained)\n`);

    for (const wtPath of walkthroughs) {
      const transcript = parseTranscriptFile(wtPath);
      const result = await runTranscript(transcript, game, {
        verbose: options.verbose,
        stopOnFailure: options.stopOnFailure,
        savesDirectory: path.join(projectDir, '.test-saves'),
      });

      reportTranscript(result, { verbose: options.verbose });
      allResults.push(result);

      totalPassed += result.passed;
      totalFailed += result.failed;
      totalExpectedFailures += result.expectedFailures;
      totalSkipped += result.skipped;
      totalDuration += result.duration;

      if (options.stopOnFailure && result.failed > 0) {
        break;
      }
    }
  }

  // Run unit tests (each gets a fresh game instance)
  if (unitTests.length > 0 && !(options.stopOnFailure && totalFailed > 0)) {
    console.log(`\n  Unit tests: ${unitTests.length} files\n`);

    for (const utPath of unitTests) {
      // Create fresh game for each unit test
      let unitGame: any;
      try {
        unitGame = await loadStory(projectDir);
      } catch (error: any) {
        console.error(`  Failed to reload story for unit test: ${error.message}`);
        continue;
      }

      const transcript = parseTranscriptFile(utPath);
      const result = await runTranscript(transcript, unitGame, {
        verbose: options.verbose,
        stopOnFailure: options.stopOnFailure,
        savesDirectory: path.join(projectDir, '.test-saves'),
      });

      reportTranscript(result, { verbose: options.verbose });
      allResults.push(result);

      totalPassed += result.passed;
      totalFailed += result.failed;
      totalExpectedFailures += result.expectedFailures;
      totalSkipped += result.skipped;
      totalDuration += result.duration;

      if (options.stopOnFailure && result.failed > 0) {
        break;
      }
    }
  }

  // Report summary
  const testRunResult = {
    transcripts: allResults,
    totalPassed,
    totalFailed,
    totalExpectedFailures,
    totalSkipped,
    totalDuration,
  };

  reportTestRun(testRunResult);

  if (totalFailed > 0) {
    process.exit(1);
  }
}

function showHelp(): void {
  console.log(`
sharpee build - Build story bundle, browser client, and run tests

Usage: sharpee build [options]

Options:
  --test             Compile story and run transcript tests after building
  --verbose, -v      Show detailed test output
  --stop-on-failure  Stop on first test failure
  --no-minify        Skip minification (browser client)
  --no-sourcemap     Skip source map generation (browser client)

Output:
  dist/<story>.sharpee   Story bundle for Zifmia runner
  dist/web/              Browser client (if browser-entry.ts exists)

Test files:
  walkthroughs/wt-*.transcript   Walkthrough chain (state persists between files)
  tests/transcripts/*.transcript Unit tests (fresh game per file)

Run from a story project directory with a package.json containing
a "sharpee" config block.
`);
}
