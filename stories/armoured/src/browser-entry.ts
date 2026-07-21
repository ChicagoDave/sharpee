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
import { createStory } from './index';

// Storage keys are fixed strings (the story id) so the early theme can be
// applied before any story instance exists (ADR-248 factory contract).
const STORAGE_PREFIX = 'armoured-';
const THEME_STORAGE_KEY = 'armoured-theme';

ThemeManager.applyEarlyTheme(THEME_STORAGE_KEY);

/**
 * The one BrowserClient for this page. Constructed on first boot and
 * reused across restart reboots (ADR-248): the client owns the DOM
 * wiring, which must not be re-bound per boot.
 */
let client: BrowserClient | null = null;

async function start(): Promise<void> {
  // Fresh story instance per boot (ADR-248); config is read off the instance.
  const story = createStory();
  const config = story.config;

  // Create browser client with story configuration (first boot only)
  if (!client) {
  client = new BrowserClient({
    storagePrefix: STORAGE_PREFIX,
    // ADR-248: RESTART reboots by re-running this entry's boot path.
    reboot: () => start(),
    defaultTheme: 'classic-light',
    themes: [
      { id: 'classic-light', name: 'Classic Light' },
      { id: 'modern-dark', name: 'Modern Dark' },
      { id: 'retro-terminal', name: 'Retro Terminal' },
      { id: 'paper', name: 'Paper' },
    ],
    storyInfo: {
      title: config.title,
      description: config.description ?? '',
      authors: Array.isArray(config.author)
        ? config.author.join(', ')
        : config.author,
      version: config.version,
      // Engine + build date come from the build pipeline in real
      // bundles; armoured doesn't generate a version.ts so we leave
      // them empty here.
      engineVersion: '',
      buildDate: '',
    },
  });

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
  }

  const world = new WorldModel();
  const player = world.createEntity('player', EntityType.ACTOR);
  world.setPlayer(player.id);

  const language = new LanguageProvider();
  const parser = new Parser(language);
  // Hook into optional Story methods via the interface. Concrete
  // story classes may or may not declare these.
  const s: Story = story;
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
