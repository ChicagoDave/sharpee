/**
 * Browser Entry Point for Armoured.
 *
 * Uses @sharpee/platform-browser for channel-driven rendering,
 * save/restore dialogs, theme management, audio, and input handling
 * (per ADR-163 / ADR-165). This file only contains story-specific
 * configuration; UI lifecycle lives in BrowserClient.
 */

import { GameEngine } from '@sharpee/engine';
import type { Story } from '@sharpee/engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { LanguageProvider } from '@sharpee/lang-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { BrowserClient, ThemeManager } from '@sharpee/platform-browser';
import { story } from './index';

const config = story.config;
const STORAGE_PREFIX = `${config.id}-`;
const THEME_STORAGE_KEY = `${config.id}-theme`;

ThemeManager.applyEarlyTheme(THEME_STORAGE_KEY);

const GAME_TITLE = config.title;
const GAME_DESCRIPTION = config.description ?? '';
const GAME_AUTHORS = Array.isArray(config.author)
  ? config.author.join(', ')
  : config.author;

const client = new BrowserClient({
  storagePrefix: STORAGE_PREFIX,
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
    version: config.version,
    // Engine + build date come from the build pipeline in real
    // bundles; armoured doesn't generate a version.ts so we leave
    // them empty here.
    engineVersion: '',
    buildDate: '',
  },
});

async function start(): Promise<void> {
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

  const world = new WorldModel();
  const player = world.createEntity('player', EntityType.ACTOR);
  world.setPlayer(player.id);

  const language = new LanguageProvider();
  const parser = new Parser(language);
  // Hook into optional Story methods via the interface. Concrete
  // story classes may or may not declare these.
  const s = story as Story;
  if (s.extendParser) s.extendParser(parser);
  if (s.extendLanguage) s.extendLanguage(language);

  const perceptionService = new PerceptionService();

  const engine = new GameEngine({
    world,
    player,
    parser,
    language,
    perceptionService,
  });

  client.connectEngine(engine, world);
  engine.setStory(story);
  engine.registerSaveRestoreHooks(client.getSaveRestoreHooks());

  await client.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
