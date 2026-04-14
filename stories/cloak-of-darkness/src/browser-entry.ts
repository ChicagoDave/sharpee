/**
 * Browser Entry Point for Cloak of Darkness
 *
 * Uses @sharpee/platform-browser for common browser functionality.
 * This file only contains story-specific configuration.
 */

import { GameEngine } from '@sharpee/engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { LanguageProvider } from '@sharpee/lang-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import {
  BrowserClient,
  ThemeManager,
} from '@sharpee/platform-browser';
import { story, config } from './index';
import { STORY_VERSION, ENGINE_VERSION, BUILD_DATE } from './version';

// Storage key for theme
const THEME_STORAGE_KEY = 'cloak-theme';

// Apply saved theme immediately to prevent flash of default theme
ThemeManager.applyEarlyTheme(THEME_STORAGE_KEY);

// Game metadata from story config
const GAME_TITLE = config.title;
const GAME_DESCRIPTION = config.description || '';
const GAME_AUTHORS = Array.isArray(config.author) ? config.author.join(', ') : config.author;

/**
 * Get the HELP text
 */
function getHelpText(): string {
  return `Cloak of Darkness - A demonstration of interactive fiction.

Commands:
  GO <direction>    Move in a direction (N, S, E, W)
  LOOK (L)          Look around
  EXAMINE <item>    Examine something
  TAKE <item>       Pick something up
  DROP <item>       Put something down
  HANG <item> ON <item>  Hang something on a hook
  PUT <item> ON <item>   Place something on a surface
  READ <item>       Read something
  INVENTORY (I)     Check what you're carrying
  HELP              Show this help
  QUIT              Leave the game`;
}

/**
 * Get the ABOUT text
 */
function getAboutText(): string {
  return [
    GAME_TITLE,
    GAME_DESCRIPTION,
    `By ${GAME_AUTHORS}`,
    '',
    `Sharpee v${ENGINE_VERSION} | Game v${STORY_VERSION}`,
    `Built: ${BUILD_DATE}`,
  ].filter(Boolean).join('\n');
}

// Create browser client with story configuration
const client = new BrowserClient({
  storagePrefix: 'cloak-',
  defaultTheme: 'classic-light',
  themes: [
    { id: 'classic-light', name: 'Classic Light' },
    { id: 'modern-dark', name: 'Modern Dark' },
    { id: 'retro-terminal', name: 'Retro Terminal' },
    { id: 'paper', name: 'Paper' },
  ],
  storyInfo: {
    title: GAME_TITLE,
    description: GAME_DESCRIPTION,
    authors: GAME_AUTHORS,
    version: STORY_VERSION,
    engineVersion: ENGINE_VERSION,
    buildDate: BUILD_DATE,
  },
  callbacks: {
    getHelpText,
    getAboutText,
  },
});

/**
 * Start the game
 */
async function start(): Promise<void> {
  console.log('=== CLOAK OF DARKNESS BROWSER START ===');

  // Initialize client with DOM elements
  client.initialize({
    statusLocation: document.getElementById('location-name'),
    statusScore: document.getElementById('score-turns'),
    textContent: document.getElementById('text-content'),
    mainWindow: document.getElementById('main-window'),
    commandInput: document.getElementById('command-input') as HTMLInputElement,
    modalOverlay: document.getElementById('modal-overlay'),
    saveDialog: document.getElementById('save-dialog'),
    restoreDialog: document.getElementById('restore-dialog'),
    startupDialog: document.getElementById('startup-dialog'),
    saveNameInput: document.getElementById('save-name-input') as HTMLInputElement,
    saveSlotsListEl: document.getElementById('save-slots-list'),
    restoreSlotsListEl: document.getElementById('restore-slots-list'),
    noSavesMessage: document.getElementById('no-saves-message'),
    startupSaveInfo: document.getElementById('startup-save-info'),
    menuBar: document.getElementById('menu-bar'),
  });

  // Create world and player
  const world = new WorldModel();
  const player = world.createEntity('player', EntityType.ACTOR);
  world.setPlayer(player.id);

  // Create parser and language
  const language = new LanguageProvider();
  const parser = new Parser(language);

  // Extend parser and language with story-specific vocabulary
  if (story.extendParser) {
    story.extendParser(parser);
  }
  if (story.extendLanguage) {
    story.extendLanguage(language);
  }

  // Create perception service
  const perceptionService = new PerceptionService();

  // Create engine
  const engine = new GameEngine({
    world,
    player,
    parser,
    language,
    perceptionService,
  });

  // Connect client to engine
  client.connectEngine(engine, world);

  // Set the story and register save/restore hooks
  engine.setStory(story);
  engine.registerSaveRestoreHooks(client.getSaveRestoreHooks());

  // Start the game
  await client.start();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
