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
import { runBuildBrowserCommand } from './build-browser.js';
import { stampVersion } from './version-stamp.js';
import { findStoryFile, loadAuthorGame } from './author-game.js';
import { lintHatchSources } from '../hatch-lint.js';

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

export async function runBuildCommand(args: string[], projectDirArg?: string): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const runTests = args.includes('--test');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const stopOnFailure = args.includes('--stop-on-failure');
  // Default to cwd (author in their project); a registered story name resolves to its dir.
  const projectDir = projectDirArg || process.cwd();
  const packagePath = path.join(projectDir, 'package.json');

  if (!fs.existsSync(packagePath)) {
    console.error('Error: No package.json found. Run from a story project directory.');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  const config: SharpeeConfig = pkg.sharpee || {};
  const storyName = config.title?.toLowerCase().replace(/\s+/g, '-') || pkg.name?.replace(/^@.*\//, '') || 'story';

  // A Chord project (exactly one root `.story` file) builds through the
  // compiler's load-time gates; a module project compiles TypeScript.
  let chordStoryFile: string | null;
  try {
    chordStoryFile = findStoryFile(projectDir);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
    return;
  }
  if (chordStoryFile) {
    await runChordBuild(projectDir, chordStoryFile, config.title || storyName, args, {
      runTests,
      verbose,
      stopOnFailure,
    });
    return;
  }

  const storySrc = path.join(projectDir, 'src', 'index.ts');

  if (!fs.existsSync(storySrc)) {
    console.error('Error: src/index.ts not found (and no .story file — nothing to build).');
    process.exit(1);
  }

  console.log(`\nBuilding: ${config.title || storyName}\n`);

  // --- Compile TypeScript (needed for both bundle and testing) ---

  console.log('--- Compiling TypeScript ---\n');

  // When a browser client is present, src/browser-entry.ts imports ./version — stamp it
  // before tsc compiles src/, or the build fails on a missing module (TS2307).
  if (fs.existsSync(path.join(projectDir, 'src', 'browser-entry.ts'))) {
    stampVersion(projectDir, pkg.name?.replace(/^@.*\//, '') || 'story');
  }

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
    id: pkg.name,
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

  // --- Snippet lint (ADR-209 AC-6) ---
  // Load the compiled story and warn on snippet entries whose marker appears
  // in neither of a room's description texts (usually mid-edit drift). A
  // warning only — the build proceeds. An UNBOUND marker, by contrast, fails
  // the story load itself (engine AC-5) and therefore fails the build here.
  await lintStorySnippets(projectDir);

  // --- Browser client ---

  console.log('--- Browser Client ---\n');

  const browserEntry = path.join(projectDir, 'src', 'browser-entry.ts');
  if (fs.existsSync(browserEntry)) {
    await runBuildBrowserCommand(
      args.filter(a => a !== '--help' && a !== '-h' && a !== '--test' && a !== '--verbose' && a !== '-v' && a !== '--stop-on-failure'),
      projectDir,
    );
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
 * Build a Chord (`.story`) project: run the compiler as the fail-fast
 * validation gate (diagnostics surface here, on the author's machine —
 * never first as a broken page), lint hatch sources, then build the
 * browser client when one is wired and run transcript tests when asked.
 * Per David's ruling (2026-07-18) the shipped browser bundle carries the
 * `.story` SOURCE + the compiler and compiles at boot — so this build
 * emits no IR artifact; validation is its compile step. The `.sharpee`
 * bundle format for Chord projects is deferred (chord-author-pipeline
 * plan), not silently faked.
 */
async function runChordBuild(
  projectDir: string,
  storyFile: string,
  title: string,
  args: string[],
  options: { runTests: boolean; verbose: boolean; stopOnFailure: boolean },
): Promise<void> {
  console.log(`\nBuilding: ${title} (Chord)\n`);
  console.log('--- Validating story (load-time gates) ---\n');

  // Lazy require (compose.ts pattern): pull the compiler only when building.
  const chord = require('@sharpee/chord') as typeof import('@sharpee/chord');
  const rel = path.relative(projectDir, storyFile) || storyFile;
  const result = chord.compile(fs.readFileSync(storyFile, 'utf-8'));
  for (const d of result.diagnostics) {
    console.error(`  ${rel}:${d.span.line}:${d.span.column} ${d.severity} [${d.code}] ${d.message}`);
  }
  if (!result.ok) {
    const errors = result.diagnostics.filter((d) => d.severity === 'error').length;
    console.error(`\n  ${rel} failed the load-time gates (${errors} error(s))`);
    process.exit(1);
  }

  // Hatch source lint (design.md §5.6) — same gate `sharpee compose` runs.
  const hatchFindings = lintHatchSources(
    path.dirname(path.resolve(storyFile)),
    result.ir.hatches.map((h) => h.modulePath),
  );
  for (const f of hatchFindings) {
    console.error(
      `  ${f.file}:${f.line} error [hatch.chord-namespace] \`${f.text}\` — the chord.* state namespace is loader-private`,
    );
  }
  if (hatchFindings.length > 0) process.exit(1);

  console.log(`  ${rel} is gate-clean — ${result.ir.entities.length} entities, ${result.ir.actions.length} action(s)\n`);

  // Story IR artifact (David, 2026-07-18: "the IDE will want the IR") — the
  // gate already compiled; write the versioned IR where tooling can read it.
  // The BROWSER bundle still ships the source (ruling 2); this file is for
  // the IDE/tooling surface (ADR-184/185), not the page.
  const distDir = path.join(projectDir, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  const irOut = path.join(distDir, `${path.basename(storyFile, '.story')}.ir.json`);
  fs.writeFileSync(irOut, JSON.stringify(result.ir, null, 2) + '\n');
  console.log(`  Story IR → ${path.relative(projectDir, irOut)}\n`);

  console.log('--- Story Bundle (.sharpee) ---\n');
  console.log('  Skipped: the .sharpee bundle format for Chord projects is not defined yet.\n');

  // --- Browser client (the shipped artifact: story source + compiler) ---
  console.log('--- Browser Client ---\n');
  const browserEntry = path.join(projectDir, 'src', 'browser-entry.ts');
  if (fs.existsSync(browserEntry)) {
    await runBuildBrowserCommand(
      args.filter((a) => a !== '--help' && a !== '-h' && a !== '--test' && a !== '--verbose' && a !== '-v' && a !== '--stop-on-failure'),
      projectDir,
    );
  } else {
    console.log('  Skipped (no src/browser-entry.ts)\n');
    console.log('  Run "sharpee init-browser" to add browser support.\n');
  }

  if (options.runTests) {
    console.log('--- Running Transcript Tests ---\n');
    await runTranscriptTests(projectDir, { verbose: options.verbose, stopOnFailure: options.stopOnFailure });
  }

  console.log('Build complete!\n');
}

/**
 * Snippet lint (ADR-209 AC-6): load the compiled story and warn, naming room
 * and entry, for every snippet entry whose marker appears in neither of its
 * room's description texts. Warnings never fail the build; an unbound MARKER
 * fails the story load itself (engine AC-5) and is reported as a build error.
 * A story that can't load here for any other reason skips the lint silently —
 * `--test` is the diagnosing path for load problems.
 */
async function lintStorySnippets(projectDir: string): Promise<void> {
  let world: unknown;
  try {
    // Lazy-load so plain builds don't pay the import cost twice.
    const { loadStory } = require('@sharpee/transcript-tester');
    const game = await loadStory(projectDir);
    world = game.world;
  } catch (error: any) {
    if (error?.name === 'SnippetValidationError') {
      console.error('--- Snippet Lint ---\n');
      console.error(`  Error: ${error.message}\n`);
      process.exit(1);
    }
    return; // story didn't load in the build environment — lint skipped
  }

  const { lintUnusedSnippetEntries } = require('@sharpee/engine');
  const unused = lintUnusedSnippetEntries(world);
  if (unused.length > 0) {
    console.log('--- Snippet Lint ---\n');
    for (const u of unused) {
      console.log(`  Warning: room "${u.room}": snippet entry '${u.entry}' matches no {snippet:${u.entry}} marker`);
    }
    console.log('');
  }
}

/**
 * Run transcript tests for a story project.
 * Loads the compiled story from dist/, finds transcript files, and runs them.
 */
async function runTranscriptTests(
  projectDir: string,
  options: { verbose: boolean; stopOnFailure: boolean }
): Promise<void> {
  // Lazy-load transcript-tester to avoid import issues when not testing.
  // Story loading goes through the shared author-game loader (Chord `.story`
  // projects and module projects alike — one resolution, ADR-180).
  const {
    parseTranscriptFile,
    runTranscript,
    reportTranscript,
    reportTestRun,
    getExitCode
  } = require('@sharpee/transcript-tester');
  const loadStory = (dir: string, entry?: string) => loadAuthorGame(dir, { entry });

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

  // Load the chained walkthrough game from compiled dist/. Walkthroughs share one
  // chained game, so the chain targets a single story entry — honor the first
  // walkthrough's `entry:` header (undefined ⇒ default dist/index.js). Unit tests
  // load their own entry per-file below, so with no walkthroughs there is nothing
  // to load here (ADR-207 AC-7: no load-and-discard pre-load).
  let game: any;
  if (walkthroughs.length > 0) {
    try {
      const chainEntry = parseTranscriptFile(walkthroughs[0]).header.entry;
      game = await loadStory(projectDir, chainEntry);
    } catch (error: any) {
      console.error(`  Failed to load story: ${error.message}`);
      console.error('  Make sure TypeScript compiled successfully (dist/index.js exists).\n');
      process.exit(1);
    }
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
      // Parse first so we can honor the transcript's `entry:` header when loading.
      const transcript = parseTranscriptFile(utPath);
      // Create a fresh game per unit test, pinned to the transcript's entry.
      let unitGame: any;
      try {
        unitGame = await loadStory(projectDir, transcript.header.entry);
      } catch (error: any) {
        console.error(`  Failed to reload story for unit test: ${error.message}`);
        continue;
      }

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
  dist/index.js          Compiled story (declaration files land alongside)

Test files:
  walkthroughs/wt-*.transcript   Walkthrough chain (state persists between files)
  tests/transcripts/*.transcript Unit tests (fresh game per file)

Run from a story project directory with a package.json containing
a "sharpee" config block.
`);
}
