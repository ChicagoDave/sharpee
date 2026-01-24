/**
 * CLI: sharpee init-browser
 *
 * Adds browser client files to an existing Sharpee story project.
 */

import * as fs from 'fs';
import * as path from 'path';

// Template directory relative to this file (will be in dist/cli after build)
const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates', 'browser');

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
 * Read template file and replace placeholders
 */
function processTemplate(templatePath: string, info: ProjectInfo): string {
  const content = fs.readFileSync(templatePath, 'utf-8');
  return content
    .replace(/\{\{STORY_ID\}\}/g, info.storyId)
    .replace(/\{\{STORY_TITLE\}\}/g, info.storyTitle);
}

/**
 * Run the init-browser command
 */
export async function runInitBrowserCommand(args: string[]): Promise<void> {
  // Check for help
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const projectDir = process.cwd();

  console.log('\n🌐 Adding browser client to your Sharpee project\n');

  // Check if this is a Sharpee project
  const info = getProjectInfo(projectDir);
  if (!info) {
    console.error('Error: This does not appear to be a Sharpee project.');
    console.error('Make sure you have a package.json or src/index.ts with story config.');
    console.error('\nRun "sharpee init" first to create a project.');
    process.exit(1);
  }

  console.log(`  Story: ${info.storyTitle} (${info.storyId})`);

  // Check if browser-entry.ts already exists
  const browserEntryPath = path.join(projectDir, 'src', 'browser-entry.ts');
  if (fs.existsSync(browserEntryPath)) {
    console.error('\nError: src/browser-entry.ts already exists.');
    console.error('Remove it first if you want to regenerate.');
    process.exit(1);
  }

  // Create browser directory for templates (optional, for customization)
  const browserDir = path.join(projectDir, 'browser');
  fs.mkdirSync(browserDir, { recursive: true });

  // Copy browser-entry.ts template
  const browserEntryTemplate = path.join(TEMPLATES_DIR, 'browser-entry.ts.template');
  if (fs.existsSync(browserEntryTemplate)) {
    const content = processTemplate(browserEntryTemplate, info);
    fs.writeFileSync(browserEntryPath, content);
    console.log('  ✓ Created src/browser-entry.ts');
  } else {
    console.error('  ✗ Template not found: browser-entry.ts.template');
    process.exit(1);
  }

  // Copy HTML template
  const htmlTemplate = path.join(TEMPLATES_DIR, 'index.html');
  if (fs.existsSync(htmlTemplate)) {
    const content = processTemplate(htmlTemplate, info);
    fs.writeFileSync(path.join(browserDir, 'index.html'), content);
    console.log('  ✓ Created browser/index.html');
  }

  // Copy CSS
  const cssTemplate = path.join(TEMPLATES_DIR, 'styles.css');
  if (fs.existsSync(cssTemplate)) {
    fs.copyFileSync(cssTemplate, path.join(browserDir, 'styles.css'));
    console.log('  ✓ Created browser/styles.css');
  }

  // Update package.json to add esbuild dev dependency and build script
  const packagePath = path.join(projectDir, 'package.json');
  if (fs.existsSync(packagePath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

      // Add esbuild to devDependencies
      pkg.devDependencies = pkg.devDependencies || {};
      if (!pkg.devDependencies.esbuild) {
        pkg.devDependencies.esbuild = '^0.20.0';
      }

      // Add build:browser script
      pkg.scripts = pkg.scripts || {};
      if (!pkg.scripts['build:browser']) {
        pkg.scripts['build:browser'] = 'npx sharpee build-browser';
      }

      fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
      console.log('  ✓ Updated package.json');
    } catch (e) {
      console.warn('  ⚠ Could not update package.json');
    }
  }

  console.log('\n✅ Browser client added!\n');
  console.log('Next steps:');
  console.log('  npm install          # Install esbuild');
  console.log('  npm run build:browser  # Build web bundle');
  console.log('');
  console.log('Output will be in dist/web/');
  console.log('');
  console.log('Customize the UI:');
  console.log('  browser/index.html   # HTML template');
  console.log('  browser/styles.css   # Styles');
  console.log('');
}

function showHelp(): void {
  console.log(`
sharpee init-browser - Add browser client to a Sharpee project

Usage: sharpee init-browser

This command adds the files needed to build a web browser version
of your interactive fiction game:

  src/browser-entry.ts   Entry point for browser bundle
  browser/index.html     HTML template
  browser/styles.css     Infocom-style CSS

Run this in the root of your Sharpee project directory.
`);
}
