/**
 * CLI: sharpee build-browser
 *
 * Bundles a Sharpee story for web browser deployment.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ProjectInfo {
  storyId: string;
  storyTitle: string;
}

/**
 * Read story info from package.json or index.ts
 */
function getProjectInfo(projectDir: string): ProjectInfo | null {
  // Try package.json first
  const packagePath = path.join(projectDir, 'package.json');
  if (fs.existsSync(packagePath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      return {
        storyId: pkg.name || 'my-story',
        storyTitle: pkg.description || pkg.name || 'My Story',
      };
    } catch {
      // Fall through
    }
  }

  // Try reading from src/index.ts
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

/**
 * Process template placeholders
 */
function processTemplate(content: string, info: ProjectInfo): string {
  return content
    .replace(/\{\{STORY_ID\}\}/g, info.storyId)
    .replace(/\{\{STORY_TITLE\}\}/g, info.storyTitle);
}

/**
 * Run the build-browser command
 */
export async function runBuildBrowserCommand(args: string[]): Promise<void> {
  // Check for help
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const projectDir = process.cwd();
  const minify = !args.includes('--no-minify');
  const sourcemap = !args.includes('--no-sourcemap');

  console.log('\n🔨 Building browser bundle\n');

  // Check if this is a Sharpee project
  const info = getProjectInfo(projectDir);
  if (!info) {
    console.error('Error: This does not appear to be a Sharpee project.');
    console.error('Make sure you have a package.json or src/index.ts with story config.');
    process.exit(1);
  }

  console.log(`  Story: ${info.storyTitle} (${info.storyId})`);

  // Check for browser-entry.ts
  const browserEntryPath = path.join(projectDir, 'src', 'browser-entry.ts');
  if (!fs.existsSync(browserEntryPath)) {
    console.error('\nError: src/browser-entry.ts not found.');
    console.error('Run "sharpee init-browser" first to add browser support.');
    process.exit(1);
  }

  // Create output directory
  const outDir = path.join(projectDir, 'dist', 'web');
  fs.mkdirSync(outDir, { recursive: true });

  // Build with esbuild
  console.log('  Building...');

  const esbuildArgs = [
    browserEntryPath,
    '--bundle',
    '--platform=browser',
    '--target=es2020',
    '--format=iife',
    `--global-name=SharpeeGame`,
    `--outfile=${path.join(outDir, info.storyId + '.js')}`,
    '--define:process.env.NODE_ENV=\\"production\\"',
    '--define:process.env.PARSER_DEBUG=\\"false\\"',
    '--define:process.env.DEBUG_PRONOUNS=\\"\\"',
  ];

  if (minify) {
    esbuildArgs.push('--minify');
  }
  if (sourcemap) {
    esbuildArgs.push('--sourcemap');
  }

  try {
    execSync(`npx esbuild ${esbuildArgs.join(' ')}`, {
      cwd: projectDir,
      stdio: 'pipe',
    });
    console.log(`  ✓ Built ${info.storyId}.js`);
  } catch (error: any) {
    console.error('  ✗ Build failed');
    if (error.stderr) {
      console.error(error.stderr.toString());
    }
    process.exit(1);
  }

  // Copy HTML template
  const browserHtmlPath = path.join(projectDir, 'browser', 'index.html');
  const defaultHtmlPath = path.join(__dirname, '..', '..', 'templates', 'browser', 'index.html');
  const htmlSource = fs.existsSync(browserHtmlPath) ? browserHtmlPath : defaultHtmlPath;

  if (fs.existsSync(htmlSource)) {
    let htmlContent = fs.readFileSync(htmlSource, 'utf-8');
    htmlContent = processTemplate(htmlContent, info);
    fs.writeFileSync(path.join(outDir, 'index.html'), htmlContent);
    console.log('  ✓ Copied index.html');
  } else {
    console.warn('  ⚠ HTML template not found');
  }

  // Copy CSS
  const browserCssPath = path.join(projectDir, 'browser', 'styles.css');
  const defaultCssPath = path.join(__dirname, '..', '..', 'templates', 'browser', 'styles.css');
  const cssSource = fs.existsSync(browserCssPath) ? browserCssPath : defaultCssPath;

  if (fs.existsSync(cssSource)) {
    fs.copyFileSync(cssSource, path.join(outDir, 'styles.css'));
    console.log('  ✓ Copied styles.css');
  } else {
    console.warn('  ⚠ CSS file not found');
  }

  // Report bundle size
  const bundlePath = path.join(outDir, info.storyId + '.js');
  if (fs.existsSync(bundlePath)) {
    const stats = fs.statSync(bundlePath);
    const sizeKb = (stats.size / 1024).toFixed(1);
    console.log(`\n  Bundle size: ${sizeKb} KB`);
  }

  console.log('\n✅ Build complete!\n');
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

Output:
  dist/web/
    index.html     HTML page
    <story-id>.js  JavaScript bundle
    styles.css     Stylesheet

The bundle includes your story, the Sharpee engine, and all dependencies.
`);
}
