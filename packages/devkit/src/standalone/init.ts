/**
 * CLI: sharpee init
 *
 * Creates a new Sharpee story project. The default scaffold is a Chord
 * `.story` project (ruled by David 2026-07-18, chord-author-pipeline plan —
 * ADR-233/210 Chord-first positioning); `--ts` keeps the TypeScript story
 * scaffold.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { runInitBrowserCommand } from './init-browser.js';

// Template directories relative to this file.
// In source: src/standalone/ → ../../templates. In npm publish: standalone/ → ../templates.
const templatesRoot = fs.existsSync(path.join(__dirname, '..', 'templates', 'story'))
  ? path.join(__dirname, '..', 'templates')
  : path.join(__dirname, '..', '..', 'templates');
const TEMPLATES_DIR = path.join(templatesRoot, 'story');
const CHORD_TEMPLATES_DIR = path.join(templatesRoot, 'story-chord');

interface StoryOptions {
  storyId: string;
  storyTitle: string;
  author: string;
  description: string;
  /** Injected `@sharpee/sharpee` dependency range. */
  sharpeeRange: string;
  /** Injected `@sharpee/devkit` dependency range. */
  devkitRange: string;
}

/**
 * Dependency ranges to inject into a scaffold, derived from this devkit's own
 * version (so a project pins the platform line this CLI shipped with — never a
 * stale literal). The platform (`@sharpee/sharpee`) is pinned to the major line
 * (its patch may lag devkit's); `@sharpee/devkit` is pinned to its own current
 * version so the scaffold gets an introspect-capable CLI.
 */
export function platformRanges(): { sharpeeRange: string; devkitRange: string } {
  let version = '1.0.0';
  // devkit's package.json is one dir up in the published (flattened) package
  // (<pkg>/standalone/) and two dirs up in the monorepo (<pkg>/dist/standalone/).
  // Probe both and accept only devkit's own manifest (not a parent package.json).
  for (const rel of [['..', 'package.json'], ['..', '..', 'package.json']]) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, ...rel), 'utf-8'));
      if (pkg.name === '@sharpee/devkit' && pkg.version) {
        version = pkg.version;
        break;
      }
    } catch {
      /* try the next candidate */
    }
  }
  const major = version.split('.')[0];
  return { sharpeeRange: `^${major}.0.0`, devkitRange: `^${version}` };
}

/**
 * Prompt user for input
 */
async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const defaultHint = defaultValue ? ` (${defaultValue})` : '';
    rl.question(`${question}${defaultHint}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

/**
 * Convert title to kebab-case ID
 */
function toStoryId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Read template file and replace placeholders
 */
function processTemplate(templatePath: string, options: StoryOptions): string {
  const content = fs.readFileSync(templatePath, 'utf-8');
  return content
    .replace(/\{\{STORY_ID\}\}/g, options.storyId)
    .replace(/\{\{STORY_TITLE\}\}/g, options.storyTitle)
    .replace(/\{\{AUTHOR\}\}/g, options.author)
    .replace(/\{\{DESCRIPTION\}\}/g, options.description)
    .replace(/\{\{SHARPEE_VERSION\}\}/g, options.sharpeeRange)
    .replace(/\{\{DEVKIT_VERSION\}\}/g, options.devkitRange)
    // Browser-entry client config (ADR-252 D3): the scaffold's concrete defaults.
    // (The build's generated entry fills these from the .story header instead.)
    .replace(/\{\{STORAGE_PREFIX\}\}/g, options.storyId)
    .replace(/\{\{DEFAULT_THEME\}\}/g, 'modern-dark')
    .replace(
      /\{\{THEMES_JSON\}\}/g,
      "[\n        { id: 'modern-dark', name: 'Modern Dark' },\n        { id: 'paper', name: 'Paper' },\n      ]",
    );
}

/**
 * Run the init command
 */
export async function runInitCommand(args: string[]): Promise<void> {
  // Check for help
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  // Check for non-interactive mode; `--ts` keeps the TypeScript scaffold
  // (Chord `.story` is the default — David's ruling, 2026-07-18).
  const useDefaults = args.includes('-y') || args.includes('--yes');
  const useTs = args.includes('--ts');
  const filteredArgs = args.filter(a => a !== '-y' && a !== '--yes' && a !== '--ts');

  // Get target directory
  const targetDir = filteredArgs[0] || '.';
  const absoluteTarget = path.resolve(process.cwd(), targetDir);

  console.log('\n📖 Create a new Sharpee story\n');

  // Check if directory exists and is not empty
  if (fs.existsSync(absoluteTarget)) {
    const files = fs.readdirSync(absoluteTarget);
    if (files.length > 0 && !files.every(f => f.startsWith('.'))) {
      console.error(`Error: Directory "${targetDir}" is not empty.`);
      console.error('Please use an empty directory or specify a new one.');
      process.exit(1);
    }
  }

  // Gather project info (use defaults if -y flag)
  const defaultTitle = path.basename(absoluteTarget) || 'My Adventure';
  const storyTitle = useDefaults ? defaultTitle : await prompt('Story title', defaultTitle);
  const storyId = useDefaults ? toStoryId(storyTitle) : await prompt('Story ID (package name)', toStoryId(storyTitle));
  const author = useDefaults ? (process.env.USER || 'Anonymous') : await prompt('Author name', process.env.USER || 'Anonymous');
  const description = useDefaults ? 'An interactive fiction adventure' : await prompt('Description', 'An interactive fiction adventure');

  const { sharpeeRange, devkitRange } = platformRanges();
  const options: StoryOptions = {
    storyId,
    storyTitle,
    author,
    description,
    sharpeeRange,
    devkitRange,
  };

  console.log('\nCreating project...\n');

  // Create directory structure
  fs.mkdirSync(absoluteTarget, { recursive: true });

  // Copy and process templates. Default: a Chord `.story` project (the
  // story is source data — no TypeScript in the story's own logic); `--ts`
  // scaffolds the TypeScript story form instead.
  const templates = useTs
    ? [
        { dir: TEMPLATES_DIR, src: 'index.ts.template', dest: 'src/index.ts' },
        { dir: TEMPLATES_DIR, src: 'package.json.template', dest: 'package.json' },
        { dir: TEMPLATES_DIR, src: 'tsconfig.json.template', dest: 'tsconfig.json' },
      ]
    : [
        { dir: CHORD_TEMPLATES_DIR, src: 'story.story.template', dest: `${storyId}.story` },
        { dir: CHORD_TEMPLATES_DIR, src: 'package.json.template', dest: 'package.json' },
      ];
  if (useTs) fs.mkdirSync(path.join(absoluteTarget, 'src'), { recursive: true });

  for (const template of templates) {
    const srcPath = path.join(template.dir, template.src);
    const destPath = path.join(absoluteTarget, template.dest);

    if (fs.existsSync(srcPath)) {
      const content = processTemplate(srcPath, options);
      fs.writeFileSync(destPath, content);
      console.log(`  ✓ Created ${template.dest}`);
    } else {
      console.warn(`  ⚠ Template not found: ${template.src}`);
    }
  }

  // Create .gitignore
  const gitignore = `node_modules/
dist/
*.log
.DS_Store
`;
  fs.writeFileSync(path.join(absoluteTarget, '.gitignore'), gitignore);
  console.log('  ✓ Created .gitignore');

  // A Chord project ships browser-ready (G2: install → scaffold → build →
  // play in the browser): wire the browser client into the scaffold now.
  if (!useTs) {
    await runInitBrowserCommand([], absoluteTarget);
  }

  console.log('\n✅ Project created!\n');
  console.log('Next steps:');
  if (targetDir !== '.') {
    console.log(`  cd ${targetDir}`);
  }
  console.log('  npm install');
  if (useTs) {
    console.log('  sharpee build');
    console.log('');
    console.log('To add a browser client:');
    console.log('  sharpee init-browser');
  } else {
    console.log('  sharpee build             # story + playable web client → dist/web/<id>/ (browser is the default)');
    console.log('  sharpee play              # play in the terminal');
    console.log('');
    console.log(`Your story lives in ${storyId}.story — edit it and rebuild.`);
  }
  console.log('');
}

function showHelp(): void {
  console.log(`
sharpee init - Create a new Sharpee story project

Usage: sharpee init [directory] [options]

Arguments:
  directory    Target directory (default: current directory)

Options:
  -y, --yes    Use defaults without prompting
  --ts         Scaffold a TypeScript story project (default: Chord .story)

Examples:
  sharpee init                    Create in current directory (interactive)
  sharpee init my-adventure       Create a Chord .story project (interactive)
  sharpee init my-adventure -y    Create with defaults (non-interactive)
  sharpee init my-adventure --ts  Create a TypeScript story project
`);
}
