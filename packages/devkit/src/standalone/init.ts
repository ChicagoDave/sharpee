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
import { generateIfid } from '@sharpee/core';
import { STORY_CONFIG_VERSION, writeStoryConfig } from './story-config.js';
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
  /** IFID minted once at init (ADR-298 D5); immutable thereafter by convention. */
  ifid: string;
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
/**
 * The lockstep platform version — devkit's own package.json version (probing the
 * published flat + monorepo layouts, accepting only devkit's manifest). devkit
 * rides the `@sharpee/*` lockstep, so this IS the platform version shown by
 * `sharpee --version` (ADR-257 D4). Falls back to `'1.0.0'` if unreadable.
 */
export function platformVersion(): string {
  for (const rel of [['..', 'package.json'], ['..', '..', 'package.json']]) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, ...rel), 'utf-8'));
      if (pkg.name === '@sharpee/devkit' && pkg.version) return pkg.version;
    } catch {
      /* try the next candidate */
    }
  }
  return '1.0.0';
}

export function platformRanges(): { sharpeeRange: string; devkitRange: string } {
  const version = platformVersion();
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
/**
 * The folders a story project can use, scaffolded empty so a new author can
 * SEE what the tool supports instead of having to read for it.
 *
 * Each is kept alive by a `.gitkeep` rather than a README: the build copies
 * `assets/` and `feelies/` into the published artifact wholesale, so a doc file
 * inside either would ship to players. Dotfiles are already skipped by that
 * copy, which is what makes `.gitkeep` the safe marker. The explanation lives
 * in the project's one root README.
 */
const PROJECT_FOLDERS: { path: string; purpose: string }[] = [
  { path: 'assets', purpose: 'Media your STORY uses — audio it plays, images it renders in prose.' },
  { path: 'feelies', purpose: 'Extras the PLAYER opens — a map, a letter, a clipping. Shipped as a folder.' },
  { path: 'walkthroughs', purpose: 'Transcripts that play the story through, run in order as one chain.' },
];

/** Creates the project folders and the root README that explains them. */
function scaffoldProjectFolders(target: string, options: StoryOptions): void {
  for (const folder of PROJECT_FOLDERS) {
    const dir = path.join(target, folder.path);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '.gitkeep'), '');
  }
  console.log(`  ✓ Created ${PROJECT_FOLDERS.map((f) => `${f.path}/`).join(', ')}`);

  const readmePath = path.join(target, 'README.md');
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, projectReadme(options));
    console.log('  ✓ Created README.md');
  }
}

/** The root README: what each folder is for, and what publishing does. */
function projectReadme(options: StoryOptions): string {
  const rows = PROJECT_FOLDERS.map((f) => `| \`${f.path}/\` | ${f.purpose} |`).join('\n');
  return `# ${options.storyTitle}

An interactive fiction story written in Chord, for the Sharpee engine.

## Playing it while you write

\`\`\`
sharpee play    # play in the terminal
sharpee build   # build the playable web client into dist/web/
\`\`\`

## Project layout

| Folder | What goes in it |
| --- | --- |
| \`${options.storyId}.story\` | Your story. One file to begin with; \`import\` more as it grows. |
${rows}
| \`browser/\` | Your own CSS (and, if you want it, your own \`index.html\`). |

The folders start empty — they are here so you can see what the tool
supports. Delete any you do not want; nothing depends on them existing.

\`assets/\` and \`feelies/\` are easy to confuse. An asset is media the story
itself consumes, and it lands flat beside the page. A feelie is something a
player opens on their own, and it keeps its folder in the published artifact.

## Publishing

\`\`\`
sharpee publish
\`\`\`

Builds the story and zips it — unzip anywhere, open \`index.html\`, and it
runs. Upload that same zip to itch.io as an HTML project.

Your \`.story\` source does **not** ship by default. To release it alongside
the game, add this to the story header:

\`\`\`
  publish-source: yes
\`\`\`

Publishing requires an \`ifid:\` in the header — a Treaty of Babel identifier,
which \`sharpee init\` has already minted for you.
`;
}

function processTemplate(templatePath: string, options: StoryOptions): string {
  const content = fs.readFileSync(templatePath, 'utf-8');
  // No browser-entry tokens here: the story/story-chord templates carry none.
  // Browser-entry client config is init-browser's job (scaffold) and the
  // build's generated entry (from the .story header) everywhere else.
  return content
    .replace(/\{\{STORY_ID\}\}/g, options.storyId)
    .replace(/\{\{STORY_TITLE\}\}/g, options.storyTitle)
    .replace(/\{\{AUTHOR\}\}/g, options.author)
    .replace(/\{\{DESCRIPTION\}\}/g, options.description)
    .replace(/\{\{IFID\}\}/g, options.ifid)
    .replace(/\{\{SHARPEE_VERSION\}\}/g, options.sharpeeRange)
    .replace(/\{\{DEVKIT_VERSION\}\}/g, options.devkitRange);
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
    // ADR-298 D5: mint the IFID at init time — the one moment a story gets
    // its Treaty of Babel identity. Immutable afterwards by convention.
    ifid: generateIfid(),
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

  // ADR-309 D2: the config sidecar is written BEFORE the header is even
  // rendered — the story is born with identity, and the config (not the
  // header line the template renders from the same value) is its canonical
  // home. Chord `.story` projects only; the TS story form has no `.story`
  // file for the sidecar to sit beside.
  if (!useTs) {
    writeStoryConfig(path.join(absoluteTarget, `${storyId}.config.json`), {
      version: STORY_CONFIG_VERSION,
      ifid: options.ifid,
    });
    console.log(`  ✓ Created ${storyId}.config.json (the story's identity — committed, never edited by hand)`);
  }

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

  scaffoldProjectFolders(absoluteTarget, options);

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
