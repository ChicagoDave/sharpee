/**
 * CLI: sharpee build-browser
 *
 * Bundles a Sharpee story for the browser into dist/web/. The bundle (game.js)
 * is esbuilt from src/browser-entry.ts; the HTML page and platform CSS
 * (base/decorations/styles + theme fonts) are owned by the platform and copied
 * fresh from devkit's bundled template every build. The author's only CSS
 * surface is browser/<story-id>.css, loaded last so it wins the cascade.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { stampVersion } from './version-stamp';

// In source: standalone/ → ../../templates. In npm publish: standalone/ → ../templates.
const TEMPLATES_DIR = fs.existsSync(path.join(__dirname, '..', 'templates', 'browser'))
  ? path.join(__dirname, '..', 'templates', 'browser')
  : path.join(__dirname, '..', '..', 'templates', 'browser');

interface ProjectInfo {
  storyId: string;
  storyTitle: string;
}

/** Read story id/title from package.json, falling back to src/index.ts. */
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

/** Substitute the story tokens index.html carries (the override stylesheet link). */
function processTemplate(content: string, info: ProjectInfo): string {
  return content
    .replace(/\{\{STORY_ID\}\}/g, info.storyId)
    .replace(/\{\{STORY_TITLE\}\}/g, info.storyTitle);
}

/** Copy a platform asset from devkit's template into the output, warning if absent. */
function copyPlatformAsset(name: string, outDir: string): void {
  const src = path.join(TEMPLATES_DIR, name);
  if (fs.existsSync(src)) {
    fs.cpSync(src, path.join(outDir, name), { recursive: true });
  } else {
    console.warn(`  ⚠ Template asset not found: ${name}`);
  }
}

/** Run the build-browser command. */
export async function runBuildBrowserCommand(args: string[], projectDirArg?: string): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const projectDir = projectDirArg || process.cwd();
  const minify = !args.includes('--no-minify');
  const sourcemap = !args.includes('--no-sourcemap');

  console.log('\n🔨 Building browser bundle\n');

  const info = getProjectInfo(projectDir);
  if (!info) {
    console.error('Error: This does not appear to be a Sharpee project.');
    console.error('Make sure you have a package.json or src/index.ts with story config.');
    process.exit(1);
  }
  console.log(`  Story: ${info.storyTitle} (${info.storyId})`);

  const browserEntryPath = path.join(projectDir, 'src', 'browser-entry.ts');
  if (!fs.existsSync(browserEntryPath)) {
    console.error('\nError: src/browser-entry.ts not found.');
    console.error('Run "sharpee init-browser" first to add browser support.');
    process.exit(1);
  }

  const outDir = path.join(projectDir, 'dist', 'web');
  fs.mkdirSync(outDir, { recursive: true });

  // browser-entry.ts imports ./version — stamp it fresh before bundling.
  stampVersion(projectDir, info.storyId);

  // Bundle browser-entry.ts → dist/web/game.js. The <script src="game.js"> in
  // index.html depends on this exact name. esbuild runs with cwd=projectDir so it
  // resolves @sharpee/* from the project's node_modules; --conditions=require picks
  // the CJS branch of the platform packages' exports maps (matches the monorepo build).
  console.log('  Bundling game.js...');
  const esbuildArgs = [
    'esbuild',
    browserEntryPath,
    '--bundle',
    '--platform=browser',
    '--target=es2020',
    '--format=iife',
    '--global-name=SharpeeGame',
    `--outfile=${path.join(outDir, 'game.js')}`,
    '--conditions=require',
    '--define:process.env.NODE_ENV="production"',
    '--define:process.env.PARSER_DEBUG=undefined',
    '--define:process.env.DEBUG_PRONOUNS=undefined',
  ];
  if (minify) esbuildArgs.push('--minify');
  if (sourcemap) esbuildArgs.push('--sourcemap');

  try {
    execFileSync('npx', esbuildArgs, { cwd: projectDir, stdio: 'pipe' });
    console.log('  ✓ Built game.js');
  } catch (error: any) {
    console.error('  ✗ Build failed');
    if (error.stderr) console.error(error.stderr.toString());
    process.exit(1);
  }

  // Platform-owned page + CSS + theme fonts: always copied fresh from devkit.
  let html = fs.readFileSync(path.join(TEMPLATES_DIR, 'index.html'), 'utf-8');
  fs.writeFileSync(path.join(outDir, 'index.html'), processTemplate(html, info));
  console.log('  ✓ Copied index.html');
  for (const asset of ['base.css', 'decorations.css', 'styles.css', 'themes']) {
    copyPlatformAsset(asset, outDir);
  }
  console.log('  ✓ Copied platform CSS + themes');

  // Author override stylesheet → dist/web/<story-id>.css. index.html links it last,
  // so write an empty stub when the author hasn't added one (avoids a 404).
  const overrideCss = path.join(projectDir, 'browser', `${info.storyId}.css`);
  const overrideOut = path.join(outDir, `${info.storyId}.css`);
  if (fs.existsSync(overrideCss)) {
    fs.copyFileSync(overrideCss, overrideOut);
    console.log(`  ✓ Copied ${info.storyId}.css`);
  } else {
    fs.writeFileSync(overrideOut, `/* ${info.storyTitle} — author overrides (none yet) */\n`);
  }

  const bundlePath = path.join(outDir, 'game.js');
  if (!fs.existsSync(bundlePath) || fs.statSync(bundlePath).size === 0) {
    console.error('\nError: dist/web/game.js is missing or empty after build.');
    process.exit(1);
  }
  const sizeKb = (fs.statSync(bundlePath).size / 1024).toFixed(1);

  console.log(`\n✅ Build complete! (game.js ${sizeKb} KB)\n`);
  console.log(`Output: ${path.relative(projectDir, outDir)}/`);
  console.log('');
  console.log('To test locally:');
  console.log(`  npx serve ${path.relative(projectDir, outDir)}`);
  console.log('');
}

function showHelp(): void {
  console.log(`
sharpee build-browser - Build a web browser bundle

Usage: sharpee build-browser [options]

Options:
  --no-minify      Skip minification
  --no-sourcemap   Skip source map generation

Output (dist/web/):
  game.js          Story + engine + browser client (one bundle)
  index.html       The page (platform-owned)
  base.css, decorations.css, styles.css, themes/   Platform CSS
  <story-id>.css   Your overrides (from browser/<story-id>.css)
`);
}
