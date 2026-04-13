/**
 * New Story Wizard — scaffolds a new Sharpee story project.
 *
 * Prompts for story metadata via VS Code input boxes, then generates
 * a minimal but compilable story directory with entry point, starter
 * room, package.json, tsconfig.json, and a starter transcript test.
 *
 * Public interface: handleNewStory()
 * Owner: tools/vscode-ext
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/** Command ID for the New Story wizard. */
export const NEW_STORY_COMMAND = 'sharpee.newStory';

/** Validates a story ID slug: lowercase alphanumeric + hyphens, no leading/trailing hyphens. */
function isValidStoryId(id: string): string | null {
  if (!id) return 'Story ID is required';
  if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(id) && !/^[a-z]$/.test(id)) {
    return 'Must be lowercase letters, numbers, and hyphens (e.g., "my-story")';
  }
  if (id.includes('--')) return 'No consecutive hyphens';
  return null;
}

/** Generates a v4-style UUID for the IFID. */
function generateIfid(): string {
  const hex = () => Math.floor(Math.random() * 16).toString(16).toUpperCase();
  const seg = (n: number) => Array.from({ length: n }, hex).join('');
  return `${seg(8)}-${seg(4)}-4${seg(3)}-${hex()}${seg(3)}-${seg(12)}`;
}

/** Converts "my-story" to "MyStory" for class names. */
function toPascalCase(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

// -- Template generators --

function generatePackageJson(storyId: string, title: string, author: string, description: string): string {
  const ifid = generateIfid();
  return JSON.stringify({
    name: `@sharpee/story-${storyId}`,
    version: '0.1.0-beta',
    description,
    main: './dist/index.js',
    types: './dist/index.d.ts',
    sharpee: {
      ifid,
      title,
      author,
      firstPublished: new Date().getFullYear().toString(),
      headline: description,
      genre: 'Fiction',
      language: 'en',
      forgiveness: 'Merciful',
    },
    scripts: {
      build: 'tsc',
      clean: 'rimraf dist',
    },
    dependencies: {
      '@sharpee/core': 'workspace:*',
      '@sharpee/engine': 'workspace:*',
      '@sharpee/if-domain': 'workspace:*',
      '@sharpee/lang-en-us': 'workspace:*',
      '@sharpee/parser-en-us': 'workspace:*',
      '@sharpee/stdlib': 'workspace:*',
      '@sharpee/world-model': 'workspace:*',
    },
    devDependencies: {
      '@types/node': '^20.11.19',
      rimraf: '^5.0.5',
      typescript: '^5.3.3',
    },
    keywords: ['sharpee', 'interactive-fiction', 'if', 'story'],
    author,
    license: 'MIT',
  }, null, 2) + '\n';
}

function generateTsconfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'commonjs',
      moduleResolution: 'node',
      lib: ['ES2022'],
      outDir: './dist',
      rootDir: './src',
      declaration: true,
      sourceMap: true,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      baseUrl: '.',
      paths: {
        '@sharpee/core': ['./node_modules/@sharpee/core'],
        '@sharpee/world-model': ['./node_modules/@sharpee/world-model'],
        '@sharpee/stdlib': ['./node_modules/@sharpee/stdlib'],
        '@sharpee/lang-en-us': ['./node_modules/@sharpee/lang-en-us'],
        '@sharpee/parser-en-us': ['./node_modules/@sharpee/parser-en-us'],
        '@sharpee/engine': ['./node_modules/@sharpee/engine'],
      },
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  }, null, 2) + '\n';
}

function generateIndexTs(storyId: string, title: string, author: string, description: string): string {
  const className = toPascalCase(storyId) + 'Story';
  return `/**
 * ${title}
 *
 * ${description}
 * By ${author}
 *
 * Public interface: Story implementation (${className})
 * Owner: stories/${storyId}
 */

import { Story, StoryConfig } from '@sharpee/engine';
import type { Parser } from '@sharpee/parser-en-us';
import type { LanguageProvider } from '@sharpee/lang-en-us';
import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType,
} from '@sharpee/world-model';

/** Room IDs for the story. */
const RoomIds = {
  startingRoom: '',
};

/**
 * Creates the starting room.
 *
 * @param world - The world model to create the room in
 * @returns The starting room entity
 */
function createStartingRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Starting Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: false,
  }));

  room.add(new IdentityTrait({
    name: 'Starting Room',
    aliases: ['room', 'start'],
    description: 'You are in a small, featureless room. This is where your story begins.',
    properName: true,
    article: '',
  }));

  return room;
}

const ${className}: Story = {
  config: {
    id: '${storyId}',
    title: '${title}',
    author: '${author}',
    version: '0.1.0',
    maxScore: 0,
  } as StoryConfig,

  initializeWorld(world: WorldModel): void {
    // Create rooms
    const startingRoom = createStartingRoom(world);
    RoomIds.startingRoom = startingRoom.id;
  },

  extendParser(parser: Parser): void {
    // Add story-specific grammar here:
    // const grammar = parser.getStoryGrammar();
    // grammar.define('verb :target').mapsTo(ACTION_ID).withPriority(150).build();
  },

  registerMessages(language: LanguageProvider): void {
    // Register story-specific messages here:
    // language.addMessage('${storyId}.message.id', 'Message text.');
  },

  getPlayerStart(): string {
    return RoomIds.startingRoom;
  },
};

export default ${className};
`;
}

function generateStarterTranscript(storyId: string, title: string): string {
  return `title: ${title} - Hello World
story: ${storyId}
description: Basic test that the story loads and starting room works
---

# Verify the game starts in the Starting Room
> look
[OK: contains "Starting Room"]
[OK: contains "your story begins"]
`;
}

/**
 * Runs the New Story wizard: prompts for metadata, generates scaffold files.
 */
export async function handleNewStory(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('Open a Sharpee workspace first.');
    return;
  }

  // Step 1: Story ID
  const storyId = await vscode.window.showInputBox({
    title: 'Sharpee: New Story (1/4)',
    prompt: 'Story ID (lowercase slug, e.g., "my-story")',
    placeHolder: 'my-story',
    validateInput: (value) => isValidStoryId(value),
  });
  if (!storyId) return;

  // Check if directory already exists
  const storiesDir = path.join(workspaceFolder.uri.fsPath, 'stories', storyId);
  if (fs.existsSync(storiesDir)) {
    vscode.window.showErrorMessage(`stories/${storyId}/ already exists. Choose a different ID.`);
    return;
  }

  // Step 2: Title
  const title = await vscode.window.showInputBox({
    title: 'Sharpee: New Story (2/4)',
    prompt: 'Story title (display name)',
    placeHolder: 'My Amazing Story',
  });
  if (!title) return;

  // Step 3: Author
  let defaultAuthor = '';
  try {
    const { execSync } = require('child_process');
    defaultAuthor = execSync('git config user.name', { encoding: 'utf-8' }).trim();
  } catch {
    // Git not available or no user.name configured
  }

  const author = await vscode.window.showInputBox({
    title: 'Sharpee: New Story (3/4)',
    prompt: 'Author name',
    value: defaultAuthor,
    placeHolder: 'Your Name',
  });
  if (!author) return;

  // Step 4: Description
  const description = await vscode.window.showInputBox({
    title: 'Sharpee: New Story (4/4)',
    prompt: 'Brief description (one line)',
    placeHolder: 'A short interactive fiction story about...',
  });
  if (!description) return;

  // Generate scaffold
  try {
    const srcDir = path.join(storiesDir, 'src');
    const testsDir = path.join(storiesDir, 'tests', 'transcripts');

    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(testsDir, { recursive: true });

    fs.writeFileSync(
      path.join(storiesDir, 'package.json'),
      generatePackageJson(storyId, title, author, description),
    );

    fs.writeFileSync(
      path.join(storiesDir, 'tsconfig.json'),
      generateTsconfig(),
    );

    fs.writeFileSync(
      path.join(srcDir, 'index.ts'),
      generateIndexTs(storyId, title, author, description),
    );

    fs.writeFileSync(
      path.join(testsDir, 'hello-world.transcript'),
      generateStarterTranscript(storyId, title),
    );

    // Open the entry point in the editor
    const indexUri = vscode.Uri.file(path.join(srcDir, 'index.ts'));
    const doc = await vscode.workspace.openTextDocument(indexUri);
    await vscode.window.showTextDocument(doc);

    vscode.window.showInformationMessage(
      `Story "${title}" created at stories/${storyId}/. Build with: ./build.sh -s ${storyId}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Failed to create story: ${message}`);
  }
}
