/**
 * Browser entry point for The Folly at Fernhill — a Chord (`.story`) project.
 *
 * The bundle ships the story SOURCE (story.story beside this page) and the
 * Chord compiler; the story compiles here, in the browser, at boot
 * (compile → Story IR → story-loader → engine). This entry adds one
 * story-specific renderer: the `clock` channel (G5) — the case clock's
 * `estate.clock` emits project `{ hour }` here, shown in the status bar.
 */

import { GameEngine, type Story } from '@sharpee/engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { LanguageProvider } from '@sharpee/lang-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { BrowserClient, ThemeManager } from '@sharpee/platform-browser';
import { compile } from '@sharpee/chord';
import { createStory } from '@sharpee/story-loader';
import { STORY_VERSION, ENGINE_VERSION, BUILD_DATE } from './version.js';

const THEME_STORAGE_KEY = 'fernhill-theme';
ThemeManager.applyEarlyTheme(THEME_STORAGE_KEY);

/** Compile the shipped .story source; surface diagnostics on the page. */
async function loadStory(): Promise<Story> {
  const response = await fetch('./story.story');
  if (!response.ok) {
    throw new Error(`could not fetch story.story (${response.status})`);
  }
  const source = await response.text();
  const result = compile(source);
  if (!result.ok) {
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    const lines = errors.map((d) => `story.story:${d.span.line}:${d.span.column} [${d.code}] ${d.message}`);
    throw new Error(`Chord load-time gate failed (${errors.length} error(s)):\n${lines.join('\n')}`);
  }
  // Hatch modules are not supported in the browser scaffold (the build
  // refuses hatched stories before shipping); pure-IR stories load here.
  return createStory(result.ir) as unknown as Story;
}

/**
 * The one BrowserClient for this page. Constructed on first boot and
 * reused across restart reboots (ADR-248): the client owns the DOM
 * wiring, which must not be re-bound per boot.
 */
let client: BrowserClient | null = null;

async function start(): Promise<void> {
  // Fresh compile + build per boot (ADR-248): a restart reboot re-runs
  // start() and gets a fully fresh ChordStory from the bundled source.
  let story: Story;
  try {
    story = await loadStory();
  } catch (error) {
    const target = document.getElementById('text-content');
    const message = error instanceof Error ? error.message : String(error);
    if (target) {
      const pre = document.createElement('pre');
      pre.textContent = message;
      target.appendChild(pre);
    }
    throw error;
  }

  if (!client) {
    const author = story.config.author;
    client = new BrowserClient({
      storagePrefix: 'fernhill-',
      // ADR-248: RESTART reboots by re-running this entry's boot path.
      reboot: () => start(),
      defaultTheme: 'modern-dark',
      themes: [
        { id: 'modern-dark', name: 'Modern Dark' },
        { id: 'paper', name: 'Paper' },
      ],
      storyInfo: {
        title: story.config.title,
        description: story.config.description || '',
        authors: Array.isArray(author) ? author.join(', ') : author,
        version: STORY_VERSION,
        engineVersion: ENGINE_VERSION,
        buildDate: BUILD_DATE,
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
  if (story.extendParser) story.extendParser(parser);
  if (story.extendLanguage) story.extendLanguage(language);

  const perceptionService = new PerceptionService();
  const engine = new GameEngine({ world, player, parser, language, perceptionService });

  client.connectEngine(engine, world);

  // Story-specific renderer for the `clock` channel (define channel clock,
  // from event estate.clock, take hour): show the estate's hour beside the
  // score whenever the wound case clock chimes. Registered in the window
  // between connectEngine() (renderer exists) and start() (first packet).
  client.getChannelRenderer().registerRenderer('clock', {
    onValue(value: unknown): void {
      if (!value || typeof value !== 'object') return;
      const hour = (value as { hour?: unknown }).hour;
      if (typeof hour !== 'string') return;
      let el = document.getElementById('estate-clock');
      if (!el) {
        el = document.createElement('span');
        el.id = 'estate-clock';
        document.getElementById('status-line')?.appendChild(el);
      }
      el.textContent = `The clock: ${hour}`;
    },
  });

  engine.setStory(story);
  engine.registerSaveRestoreHooks(client.getSaveRestoreHooks());

  await client.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
