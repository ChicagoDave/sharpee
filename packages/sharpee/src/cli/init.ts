/**
 * CLI: sharpee init
 *
 * Creates a new Sharpee story project with the basic structure.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Template directory relative to this file (will be in dist/cli after build)
const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates', 'story');

interface StoryOptions {
  storyId: string;
  storyTitle: string;
  author: string;
  description: string;
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
    .replace(/\{\{DESCRIPTION\}\}/g, options.description);
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

  // Check for non-interactive mode
  const useDefaults = args.includes('-y') || args.includes('--yes');
  const filteredArgs = args.filter(a => a !== '-y' && a !== '--yes');

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

  const options: StoryOptions = {
    storyId,
    storyTitle,
    author,
    description,
  };

  console.log('\nCreating project...\n');

  // Create directory structure
  fs.mkdirSync(absoluteTarget, { recursive: true });
  fs.mkdirSync(path.join(absoluteTarget, 'src'), { recursive: true });

  // Copy and process templates
  const templates = [
    { src: 'index.ts.template', dest: 'src/index.ts' },
    { src: 'package.json.template', dest: 'package.json' },
    { src: 'tsconfig.json.template', dest: 'tsconfig.json' },
  ];

  for (const template of templates) {
    const srcPath = path.join(TEMPLATES_DIR, template.src);
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

  console.log('\n✅ Project created!\n');
  console.log('Next steps:');
  if (targetDir !== '.') {
    console.log(`  cd ${targetDir}`);
  }
  console.log('  npm install');
  console.log('  npm run build');
  console.log('');
  console.log('To add a browser client:');
  console.log('  npx sharpee init-browser');
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

Examples:
  sharpee init                    Create in current directory (interactive)
  sharpee init my-adventure       Create in ./my-adventure/ (interactive)
  sharpee init my-adventure -y    Create with defaults (non-interactive)
`);
}
