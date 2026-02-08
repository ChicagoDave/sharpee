/**
 * Browser Entry Point for Dungeo
 *
 * Uses @sharpee/platform-browser for common browser functionality.
 * This file only contains story-specific code.
 */

import { GameEngine, SequencedEvent } from '@sharpee/engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { LanguageProvider } from '@sharpee/lang-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import {
  BrowserClient,
  ThemeManager,
  BrowserClientInterface,
} from '@sharpee/platform-browser';
import { story, config } from './index';
import { STORY_VERSION, ENGINE_VERSION, BUILD_DATE } from './version';

// Storage key for theme
const THEME_STORAGE_KEY = 'dungeo-theme';

// Apply saved theme immediately to prevent flash of default theme
ThemeManager.applyEarlyTheme(THEME_STORAGE_KEY);

// Game metadata from story config
const GAME_TITLE = config.title;
const GAME_DESCRIPTION = config.description || '';
const GAME_AUTHORS = Array.isArray(config.author) ? config.author.join(', ') : config.author;
const PORTED_BY = config.custom?.portedBy || '';

/**
 * Get the HELP text (1981 Fortran-style)
 */
function getHelpText(): string {
  return `Commands to DUNGEO are simple sentences: <verb>, <verb> <object>,
and <verb> <object> <indirect object> are examples.

Some useful commands are:

<direction>     Walk in that direction. Common directions
                are N, S, E, W, NE, NW, SE, SW, U(p), and D(own).
AGAIN (G)       Repeat the last command.
LOOK (L)        Describe the surroundings.
ROOM            Print the verbose room description without objects.
RNAME           Print the short room name.
OBJECTS         Print the objects in the room.
INVENTORY (I)   Describe your possessions.
DIAGNOSE        Describe your state of health.
WAIT (Z)        Causes "time" to pass.
SCORE           Print your score and number of moves.
SAVE            Save the game to a named slot.
RESTORE         Restore a saved game.
RESTART         Start the game over.
QUIT (Q)        Leave the game.`;
}

/**
 * Get the ABOUT text
 */
function getAboutText(): string {
  return [
    GAME_TITLE,
    GAME_DESCRIPTION,
    `By ${GAME_AUTHORS}`,
    `Ported by ${PORTED_BY}`,
    '',
    `Sharpee v${ENGINE_VERSION} | Game v${STORY_VERSION}`,
    `Built: ${BUILD_DATE}`,
  ].filter(Boolean).join('\n');
}

/**
 * Format OBJECTS output
 */
function formatObjects(data: Record<string, unknown>): string {
  const hasItems = data.hasItems as boolean | undefined;
  const items = data.items as Array<{ name: string }> | undefined;
  const containerContents = data.containerContents as Array<{
    containerName: string;
    preposition: string;
    items: Array<{ name: string }>;
  }> | undefined;

  if (!hasItems || !items || items.length === 0) {
    return 'There is nothing here.';
  }

  const lines: string[] = [];

  // List items directly in room
  for (const item of items) {
    lines.push(`There is a ${item.name} here.`);
  }

  // List contents of open containers
  if (containerContents) {
    for (const container of containerContents) {
      const itemNames = container.items.map(i => i.name).join(', ');
      const prep = container.preposition === 'in' ? 'In' : 'On';
      lines.push(`${prep} the ${container.containerName}: ${itemNames}`);
    }
  }

  return lines.join('\n');
}

/**
 * Handle story-specific events
 */
function handleStoryEvent(event: SequencedEvent, client: BrowserClientInterface): boolean {
  // Handle RNAME command (room name only)
  if (event.type === 'dungeo.event.rname') {
    const roomName = (event.data as Record<string, unknown>)?.roomName as string | undefined;
    client.displayText(roomName || 'Unknown');
    return true;
  }

  // Handle OBJECTS command
  if (event.type === 'dungeo.event.objects') {
    client.displayText(formatObjects(event.data as Record<string, unknown>));
    return true;
  }

  return false; // Not handled
}

// Create browser client with story configuration
const client = new BrowserClient({
  storagePrefix: 'dungeo-',
  defaultTheme: 'dos-classic',
  themes: [
    { id: 'dos-classic', name: 'DOS Classic' },
    { id: 'modern-dark', name: 'Modern Dark' },
    { id: 'retro-terminal', name: 'Retro Terminal' },
    { id: 'paper', name: 'Paper' },
  ],
  storyInfo: {
    title: GAME_TITLE,
    description: GAME_DESCRIPTION,
    authors: GAME_AUTHORS,
    portedBy: PORTED_BY,
    version: STORY_VERSION,
    engineVersion: ENGINE_VERSION,
    buildDate: BUILD_DATE,
  },
  callbacks: {
    getHelpText,
    getAboutText,
    handleStoryEvent,
  },
});

/**
 * Start the game
 */
async function start(): Promise<void> {
  console.log('=== DUNGEO BROWSER START ===');

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
