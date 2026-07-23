/**
 * CLI: sharpee init-browser
 *
 * Adds a browser client to an existing Sharpee story project: the entry-point
 * wiring (src/browser-entry.ts), an author override stylesheet
 * (browser/<package-name>.css), the runtime dependencies the entry point imports,
 * and a build:browser script. The HTML and platform CSS are owned by the
 * platform and supplied at build time by `sharpee build-browser` — never seeded.
 */

import * as fs from 'fs';
import * as path from 'path';
import { platformRanges } from './init.js';
import { stampVersion } from './version-stamp.js';
import { findStoryFile } from './author-game.js';

// In source: standalone/ → ../../templates. In npm publish: standalone/ → ../templates.
const TEMPLATES_DIR = fs.existsSync(path.join(__dirname, '..', 'templates', 'browser'))
  ? path.join(__dirname, '..', 'templates', 'browser')
  : path.join(__dirname, '..', '..', 'templates', 'browser');

/** Runtime packages browser-entry.ts imports that aren't already scaffold deps. */
const BROWSER_RUNTIME_DEPS = [
  '@sharpee/engine',
  '@sharpee/parser-en-us',
  '@sharpee/lang-en-us',
  '@sharpee/stdlib',
  '@sharpee/platform-browser',
];

/** Extra runtime deps of the CHORD browser entry (compiles .story at boot). */
const CHORD_BROWSER_RUNTIME_DEPS = ['@sharpee/chord', '@sharpee/story-loader'];

interface ProjectInfo {
  storyId: string;
  storyTitle: string;
}

/** Read the story id (the package name — it names the override stylesheet)
 *  and title from package.json, falling back to src/index.ts. */
function getProjectInfo(projectDir: string): ProjectInfo | null {
  const packagePath = path.join(projectDir, 'package.json');
  if (fs.existsSync(packagePath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      return {
        storyId: pkg.name || 'my-story',
        storyTitle: pkg.description || pkg.name || 'My Story',
      };
    } catch {
      // Fall through to index.ts.
    }
  }

  const indexPath = path.join(projectDir, 'src', 'index.ts');
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf-8');
    const idMatch = content.match(/id:\s*['"]([^'"]+)['"]/);
    const titleMatch = content.match(/title:\s*['"]([^'"]+)['"]/);
    if (idMatch || titleMatch) {
      return {
        storyId: idMatch?.[1] || 'my-story',
        storyTitle: titleMatch?.[1] || 'My Story',
      };
    }
  }

  return null;
}

/** Substitute the story tokens a browser template file may carry. */
function processTemplate(content: string, info: ProjectInfo): string {
  return content
    .replace(/\{\{STORY_ID\}\}/g, info.storyId)
    .replace(/\{\{STORY_TITLE\}\}/g, info.storyTitle)
    // Browser-entry client config (ADR-252 D3): the scaffold's concrete defaults.
    // (The build's generated entry fills these from the .story header instead.)
    .replace(/\{\{STORAGE_PREFIX\}\}/g, info.storyId)
    .replace(/\{\{DEFAULT_THEME\}\}/g, 'modern-dark')
    .replace(
      /\{\{THEMES_JSON\}\}/g,
      "[\n        { id: 'modern-dark', name: 'Modern Dark' },\n        { id: 'paper', name: 'Paper' },\n      ]",
    );
}

/**
 * Add browser runtime deps + a build:browser script to the project's package.json.
 * Deps pin to the platform major line this devkit shipped with (same source as
 * `sharpee init`). Existing entries are left untouched.
 */
function updatePackageJson(projectDir: string, isChord: boolean): void {
  const packagePath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(packagePath)) {
    console.warn('  ⚠ No package.json — skipped dependency wiring');
    return;
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    const { sharpeeRange } = platformRanges();

    pkg.dependencies = pkg.dependencies || {};
    const deps = isChord ? [...BROWSER_RUNTIME_DEPS, ...CHORD_BROWSER_RUNTIME_DEPS] : BROWSER_RUNTIME_DEPS;
    for (const dep of deps) {
      if (!pkg.dependencies[dep]) pkg.dependencies[dep] = sharpeeRange;
    }

    pkg.devDependencies = pkg.devDependencies || {};
    if (!pkg.devDependencies.esbuild) pkg.devDependencies.esbuild = '^0.20.0';

    pkg.scripts = pkg.scripts || {};
    if (!pkg.scripts['build:browser']) pkg.scripts['build:browser'] = 'sharpee build-browser';

    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
    console.log('  ✓ Updated package.json (deps + build:browser)');
  } catch {
    console.warn('  ⚠ Could not update package.json');
  }
}

/** Run the init-browser command. */
export async function runInitBrowserCommand(args: string[], projectDirArg?: string): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const projectDir = projectDirArg || process.cwd();
  console.log('\n🌐 Adding browser client to your Sharpee project\n');

  const info = getProjectInfo(projectDir);
  if (!info) {
    console.error('Error: This does not appear to be a Sharpee project.');
    console.error('Make sure you have a package.json or src/index.ts with story config.');
    console.error('\nRun "sharpee init" first to create a project.');
    process.exit(1);
  }

  console.log(`  Story: ${info.storyTitle} (${info.storyId})`);

  // A Chord project (root `.story` file) gets the compile-at-boot entry
  // (the bundle ships the story source + the Chord compiler — David's
  // ruling, 2026-07-18); a module project gets the import-the-story entry.
  const isChord = findStoryFile(projectDir) !== null;

  // Entry point — the one wiring file authors may customize.
  const browserEntryPath = path.join(projectDir, 'src', 'browser-entry.ts');
  if (fs.existsSync(browserEntryPath)) {
    console.error('\nError: src/browser-entry.ts already exists.');
    console.error('Remove it first if you want to regenerate.');
    process.exit(1);
  }
  const templateName = isChord ? 'chord-browser-entry.ts.template' : 'browser-entry.ts.template';
  const browserEntryTemplate = path.join(TEMPLATES_DIR, templateName);
  if (!fs.existsSync(browserEntryTemplate)) {
    console.error(`  ✗ Template not found: ${templateName}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(browserEntryPath), { recursive: true });
  fs.writeFileSync(browserEntryPath, processTemplate(fs.readFileSync(browserEntryTemplate, 'utf-8'), info));
  console.log(`  ✓ Created src/browser-entry.ts${isChord ? ' (Chord — compiles story.story at boot)' : ''}`);

  // Seed src/version.ts now (browser-entry imports it) so the project compiles immediately,
  // before any build runs. `sharpee build` / `build-browser` refresh it with current values.
  stampVersion(projectDir, info.storyId);
  console.log('  ✓ Created src/version.ts');

  // Author override stylesheet — the sole CSS customization surface. The platform
  // CSS (base/decorations/styles) and index.html are pulled fresh from devkit at build.
  const browserDir = path.join(projectDir, 'browser');
  fs.mkdirSync(browserDir, { recursive: true });
  const overrideCssPath = path.join(browserDir, `${info.storyId}.css`);
  if (!fs.existsSync(overrideCssPath)) {
    fs.writeFileSync(
      overrideCssPath,
      `/* ${info.storyTitle} — author stylesheet.\n` +
        ` * Loaded after the platform CSS, so any rule here overrides the defaults.\n` +
        ` * Add your own styles below. */\n`,
    );
    console.log(`  ✓ Created browser/${info.storyId}.css`);
  }

  updatePackageJson(projectDir, isChord);

  console.log('\n✅ Browser client added!\n');
  console.log('Next steps:');
  console.log('  sharpee build          # Build the story + web bundle → dist/web/');
  console.log('');
  console.log('Customize:');
  console.log('  src/browser-entry.ts   # Engine + client wiring');
  console.log(`  browser/${info.storyId}.css   # Your style overrides`);
  console.log('');
}

function showHelp(): void {
  console.log(`
sharpee init-browser - Add a browser client to a Sharpee project

Usage: sharpee init-browser

Adds the files needed to build a web version of your story:

  src/browser-entry.ts         Engine + browser-client wiring
  browser/<package-name>.css   Author style overrides (loaded last)

Also adds the browser runtime dependencies and a build:browser script to
package.json. The HTML page and platform CSS are supplied at build time by
"sharpee build-browser".

Run this in the root of your Sharpee project directory.
`);
}
