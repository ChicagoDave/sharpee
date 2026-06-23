/**
 * Browser Entry Point for Dungeo
 *
 * Uses @sharpee/platform-browser for common browser functionality.
 * This file only contains story-specific code.
 */

import { GameEngine } from '@sharpee/engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { LanguageProvider } from '@sharpee/lang-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import {
  BrowserClient,
  ThemeManager,
  createAmbientChannelRenderer,
} from '@sharpee/platform-browser';
import { story, config } from './index';
import { DUNGEO_AMBIENT_CHANNEL_IDS } from './audio/audio-setup';
import {
  DUNGEO_RNAME_CHANNEL_ID,
  DUNGEO_OBJECTS_CHANNEL_ID,
} from './channels';
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

// Create browser client with story configuration
const client = new BrowserClient({
  storagePrefix: 'dungeo-',
  // The default is the engine's `:root` "classic" baseline (no package) — ADR-188 R7.
  // The clickable theme menu is generated at build time from `sharpee.themes`
  // (this array only feeds ThemeManager's metadata; keep it in sync for clarity).
  defaultTheme: 'classic',
  themes: [
    { id: 'classic', name: 'Classic' },
    { id: 'modern-dark', name: 'Modern Dark' },
    { id: 'retro-terminal', name: 'Retro Terminal' },
    { id: 'paper', name: 'Paper' },
    { id: 'system-6', name: 'System 6' },
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
    saveDialog: document.getElementById('save-dialog') as HTMLDialogElement,
    restoreDialog: document.getElementById('restore-dialog') as HTMLDialogElement,
    startupDialog: document.getElementById('startup-dialog') as HTMLDialogElement,
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

  // Connect client to engine — defaults are registered now.
  client.connectEngine(engine, world);

  // Register story-specific renderers on the channel renderer.
  // Two groups, all flowing through the channel surface (replacing
  // the legacy handleStoryEvent + audio.* event-listener bypasses):
  //  1. ambient:<id> — audio-setup.ts emits media.ambient.* events;
  //     stdlib's `ambient:<id>` channel projects them; this renderer
  //     forwards to the shared AudioManager.
  //  2. dungeo.rname / dungeo.objects — actions emit
  //     dungeo.event.rname / dungeo.event.objects; story-defined
  //     channels in ./channels.ts project them as text strings; these
  //     renderers push the strings to client.displayText.
  // Must run before client.start() so the first packet is rendered.
  const channelRenderer = client.getChannelRenderer();
  const audioManager = client.getAudioManager();
  for (const ambientId of DUNGEO_AMBIENT_CHANNEL_IDS) {
    channelRenderer.registerRenderer(
      `ambient:${ambientId}`,
      createAmbientChannelRenderer(audioManager, ambientId),
    );
  }
  channelRenderer.registerRenderer(DUNGEO_RNAME_CHANNEL_ID, {
    onValue(value: unknown): void {
      if (typeof value === 'string') client.displayText(value);
    },
  });
  channelRenderer.registerRenderer(DUNGEO_OBJECTS_CHANNEL_ID, {
    onValue(value: unknown): void {
      if (typeof value === 'string') client.displayText(value);
    },
  });

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
