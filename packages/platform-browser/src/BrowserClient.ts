/**
 * BrowserClient - Main orchestrator for browser-based IF games
 *
 * Wires together all managers (save, theme, dialog, menu, input, display)
 * and provides a simple API for story entry points.
 */

import type { GameEngine } from '@sharpee/engine';
import type { ISemanticEvent } from '@sharpee/core';
import type { WorldModel } from '@sharpee/world-model';
import { TraitType, StoryInfoTrait } from '@sharpee/world-model';
import type { ISaveRestoreHooks, ISaveData, IRestartContext } from '@sharpee/core';
import { renderToString } from '@sharpee/text-service';

import type {
  BrowserClientConfig,
  BrowserClientInterface,
  DOMElements,
  MenuHandlers,
  SaveContext,
} from './types';

import { ThemeManager } from './managers/ThemeManager';
import { SaveManager } from './managers/SaveManager';
import { DialogManager } from './managers/DialogManager';
import { MenuManager } from './managers/MenuManager';
import { InputManager } from './managers/InputManager';
import { TextDisplay } from './display/TextDisplay';
import { StatusLine } from './display/StatusLine';
import { AudioManager } from './audio/AudioManager';

export class BrowserClient implements BrowserClientInterface {
  // Configuration
  private config: BrowserClientConfig;

  // Managers
  private themeManager!: ThemeManager;
  private saveManager!: SaveManager;
  private dialogManager!: DialogManager;
  private menuManager!: MenuManager;
  private inputManager!: InputManager;
  private textDisplay!: TextDisplay;
  private statusLine!: StatusLine;
  private audioManager: AudioManager;

  // Engine integration
  private engine!: GameEngine;
  private world!: WorldModel;

  // Game state
  private currentTurn = 0;
  private currentScore = 0;
  private turnOffset = 0; // Offset to add to engine turn after restore
  /**
   * The `ISaveData` produced by the engine for the in-flight save
   * request. Set by `onSaveRequested` while the save dialog is open;
   * cleared in the hook's `finally`. Reused by `performSave` so the
   * persisted blob matches what the engine actually serialized for
   * this request, not whatever the world looked like by the time the
   * dialog returned.
   */
  private pendingEngineSave: ISaveData | null = null;

  // DOM elements reference
  private elements!: DOMElements;

  constructor(config: BrowserClientConfig) {
    this.config = {
      autoSave: true,
      ...config,
    };
    this.audioManager = new AudioManager();
  }

  /**
   * Initialize the browser client with DOM elements.
   * Call after DOMContentLoaded.
   */
  initialize(elements: DOMElements): void {
    this.elements = elements;

    // Set page title and menu title from story config
    document.title = this.config.storyInfo.title;
    const menuTitle = document.getElementById('menu-title');
    if (menuTitle) {
      menuTitle.textContent = this.config.storyInfo.title;
    }

    // Create text display and status line first (no dependencies)
    this.textDisplay = new TextDisplay({
      textContent: elements.textContent,
      mainWindow: elements.mainWindow,
    });

    this.statusLine = new StatusLine({
      statusLocation: elements.statusLocation,
      statusScore: elements.statusScore,
    });
  }

  /**
   * Connect to game engine and set up event handlers.
   * Call after creating the engine.
   */
  connectEngine(engine: GameEngine, world: WorldModel): void {
    this.engine = engine;
    this.world = world;

    // Now create managers that need world reference
    this.saveManager = new SaveManager({
      storagePrefix: this.config.storagePrefix,
      world: this.world,
      onStateChange: () => this.updateStatusLine(),
    });

    // Create dialog manager
    this.dialogManager = new DialogManager({
      elements: {
        modalOverlay: this.elements.modalOverlay,
        saveDialog: this.elements.saveDialog,
        restoreDialog: this.elements.restoreDialog,
        startupDialog: this.elements.startupDialog,
        saveNameInput: this.elements.saveNameInput,
        saveSlotsListEl: this.elements.saveSlotsListEl,
        restoreSlotsListEl: this.elements.restoreSlotsListEl,
        noSavesMessage: this.elements.noSavesMessage,
        startupSaveInfo: this.elements.startupSaveInfo,
      },
      saveManager: this.saveManager,
      onDialogOpen: () => this.inputManager?.disable(),
      onDialogClose: () => {
        this.inputManager?.enable();
        this.inputManager?.focus();
      },
      generateSaveName: () => this.saveManager.generateSaveName(this.currentTurn),
      sanitizeSaveName: (name) => this.saveManager.sanitizeSaveName(name),
      performSave: (name) => this.performSave(name),
    });

    // Create theme manager
    this.themeManager = new ThemeManager({
      storageKey: `${this.config.storagePrefix}theme`,
      themes: this.config.themes,
      defaultTheme: this.config.defaultTheme,
    });

    // Create menu manager with handlers
    const menuHandlers: MenuHandlers = {
      onSave: () => this.handleSave(),
      onRestore: () => this.handleRestore(),
      onRestart: () => this.handleRestart(),
      onQuit: () => this.handleQuit(),
      onThemeSelect: (theme) => this.themeManager.applyTheme(theme),
      onHelp: () => this.engine.executeTurn('help'),
      onAbout: () => this.engine.executeTurn('about'),
    };

    this.menuManager = new MenuManager({
      menuBar: this.elements.menuBar,
      handlers: menuHandlers,
    });

    // Create input manager
    this.inputManager = new InputManager({
      commandInput: this.elements.commandInput,
      onCommand: (cmd) => this.executeCommand(cmd),
      isDialogOpen: () => this.dialogManager.isDialogOpen(),
    });

    // Set up event handlers on engine
    this.setupEngineHandlers();

    // Set up all manager handlers
    this.dialogManager.setupHandlers();
    this.menuManager.setupHandlers();
    this.inputManager.setupHandlers();

    // Apply saved theme
    const savedTheme = this.themeManager.getSavedTheme();
    this.themeManager.applyTheme(savedTheme);

    // Sync existing saves to world
    this.saveManager.syncSavesToWorld();
  }

  /**
   * Set up event handlers on the game engine
   */
  private setupEngineHandlers(): void {
    // Handle text output (ADR-137: extract prompt block for input field)
    this.engine.on('text:output', (blocks, turn) => {
      // Extract prompt block and set on input field
      const promptBlock = blocks.find((b: any) => b.key === 'prompt');
      if (promptBlock && promptBlock.content.length > 0) {
        const promptText = promptBlock.content[0];
        if (typeof promptText === 'string') {
          this.inputManager.setPrompt(promptText);
        }
      }

      // Display non-prompt blocks as narrative text
      const displayBlocks = blocks.filter((b: any) => b.key !== 'prompt');
      const text = renderToString(displayBlocks);
      console.log('[text:output]', { text, turn, turnOffset: this.turnOffset });
      this.textDisplay.displayText(text);

      // Apply turn offset (set after restore to maintain correct turn count)
      this.currentTurn = turn + this.turnOffset;
      this.updateStatusLine();

      // Auto-save after each turn (if enabled). The engine produces a
      // complete `ISaveData` via the same path the user-driven save
      // uses; `SaveManager` wraps it in a `BrowserSaveEnvelope` and
      // writes the autosave slot.
      if (this.config.autoSave && turn > 0) {
        const engineSave = this.engineCreateSave();
        this.saveManager.performAutoSave(engineSave, this.getSaveContext());
      }
    });

    // Handle game events
    this.engine.on('event', (event: ISemanticEvent) => {
      console.log('[event]', event.type, event.data);

      // Forward audio events to the audio manager
      if (event.type.startsWith('audio.')) {
        this.audioManager.handleAudioEvent(event as { type: string; data: any });
        return;
      }

      // Let story handle custom events first
      if (this.config.callbacks?.handleStoryEvent?.(event, this)) {
        return; // Story handled it
      }

      // Beep on errors/failures (classic Infocom style)
      if (event.type === 'command.failed' ||
          event.type === 'action.blocked' ||
          event.type.includes('.blocked') ||
          event.type === 'game.player_death') {
        this.beep();
      }

      // Track score changes
      if (event.type === 'game.score_changed' && event.data) {
        const scoreData = event.data as { newScore?: number; oldScore?: number };
        this.currentScore = scoreData.newScore ?? this.currentScore;
        this.updateStatusLine();
        // Celebratory beep on score increase
        if ((scoreData.newScore ?? 0) > (scoreData.oldScore ?? 0)) {
          this.beep(1000, 50); // Higher, shorter beep for points
        }
      }

      // Handle platform events for save/restore
      if (event.type === 'platform.save_failed') {
        const errorData = event.data as { error?: string } | undefined;
        this.textDisplay.displayText(`[Save failed: ${errorData?.error || 'Unknown error'}]`);
        this.beep();
      } else if (event.type === 'platform.restore_failed') {
        const errorData = event.data as { error?: string } | undefined;
        this.textDisplay.displayText(`[Restore failed: ${errorData?.error || 'No saved game found'}]`);
        this.beep();
      } else if (event.type === 'platform.restore_completed') {
        const restoreData = event.data as { turnCount?: number } | undefined;
        if (restoreData?.turnCount !== undefined) {
          this.currentTurn = restoreData.turnCount;
        }
        this.updateStatusLine();
      }

    });
  }

  /**
   * Start the game (check for autosave, show initial look)
   */
  async start(): Promise<void> {
    console.log('=== BROWSER CLIENT START ===');

    try {
      // Set client version on StoryInfoTrait for banner display
      if (this.world) {
        const storyInfoEntities = this.world.findByTrait(TraitType.STORY_INFO);
        const trait = storyInfoEntities[0]?.get<StoryInfoTrait>(TraitType.STORY_INFO);
        if (trait) {
          trait.clientVersion = this.config.storyInfo.version;
        }
      }

      // Start the engine first (builds the world)
      await this.engine.start();

      // Sync localStorage saves to world
      this.saveManager.syncSavesToWorld();

      // Check for autosave and restore. The envelope carries the
      // engine's full `ISaveData`; applying it via the engine wipes
      // the freshly-initialized world and rebuilds from the snapshot,
      // restoring score / capabilities / state values / relationships
      // / ID counters that the v3 in-house serializer used to drop.
      const autosaveEnvelope = this.saveManager.loadAutosaveEnvelope();
      if (autosaveEnvelope) {
        console.log('[startup] Found autosave, restoring...');
        try {
          this.engineApplySave(autosaveEnvelope.engineSave);
          this.currentTurn = autosaveEnvelope.engineSave.metadata.turnCount;
          this.currentScore = autosaveEnvelope.score;
          // Engine's turn counter is now `currentTurn + 1` after the
          // engine restore; offset keeps the displayed counter aligned.
          this.turnOffset = this.currentTurn - 1;

          if (autosaveEnvelope.transcriptHtml) {
            const html = this.saveManager.decompressTranscript(
              autosaveEnvelope.transcriptHtml,
            );
            this.textDisplay.setHTML(html);
          }

          console.log('[startup] Restored to turn', this.currentTurn, 'score', this.currentScore, 'offset', this.turnOffset);
          this.updateStatusLine();

          // Show restored message
          this.textDisplay.displayText('[Session restored]');
          this.textDisplay.scrollToBottom();
          this.syncScoreFromWorld();
        } catch (error) {
          console.error('[startup] Failed to restore autosave:', error);
          // Fall through to new game
          await this.engine.executeTurn('look');
        }
      } else {
        // New game - execute initial look
        console.log('Executing initial look command...');
        await this.engine.executeTurn('look');
        console.log('Initial look complete');
      }

      // Focus input
      this.inputManager?.focus();
    } catch (error) {
      console.error('=== STARTUP ERROR ===', error);
      this.textDisplay.displayText(`[Startup Error: ${error}]`);
    }
  }

  /**
   * Execute a command
   */
  async executeCommand(command: string): Promise<void> {
    // Unlock audio on first user command (browsers block autoplay)
    this.audioManager.unlock();

    // Display command echo
    this.textDisplay.displayCommand(command);

    // Execute command
    try {
      await this.engine.executeTurn(command);
      // Sync score from world after each turn
      this.syncScoreFromWorld();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.textDisplay.displayText(`[Error: ${message}]`);
    }
  }

  /**
   * Get ISaveRestoreHooks for engine registration
   */
  getSaveRestoreHooks(): ISaveRestoreHooks {
    return {
      onSaveRequested: async (data: ISaveData): Promise<void> => {
        // Stash the engine's save data so the dialog handler
        // (`performSave`) uses *this* `ISaveData` rather than producing
        // a fresh one — the engine has already serialized for this
        // request. Cleared in the `finally` so a later menu-driven
        // save doesn't reuse stale state.
        this.pendingEngineSave = data;
        try {
          const saved = await this.dialogManager.showSaveDialog();
          if (!saved) {
            this.textDisplay.displayText('[Save cancelled]');
          }
        } finally {
          this.pendingEngineSave = null;
        }
      },

      onRestoreRequested: async (): Promise<ISaveData | null> => {
        // The dialog helper applies the engine save itself (preserves
        // the v3 timing where UI reads from the post-restore world),
        // so we always return null here — the engine emits
        // `restore_completed` regardless.
        await this.runRestoreDialog();
        return null;
      },

      onRestartRequested: async (_context: IRestartContext): Promise<boolean> => {
        if (confirm('Are you sure you want to restart? All unsaved progress will be lost.')) {
          // Clear autosave and reload
          this.saveManager.clearAutosave();
          window.location.reload();
          return true;
        }
        return false;
      },
    };
  }

  // === Menu handlers ===

  private async handleSave(): Promise<void> {
    await this.dialogManager.showSaveDialog();
  }

  private async handleRestore(): Promise<void> {
    await this.runRestoreDialog();
  }

  /**
   * Show the restore dialog, load the envelope, apply the engine save,
   * and update browser-side UI. Returns true on success, false if the
   * user cancelled or no save was found. Used by both the menu path
   * and the engine-event hook path so they share identical timing.
   *
   * The order is deliberate: the engine save is applied to the world
   * BEFORE any UI update so that {@link updateStatusLine} (which reads
   * the player's containing room from the world) sees the post-restore
   * state.
   */
  private async runRestoreDialog(): Promise<boolean> {
    const slotName = await this.dialogManager.showRestoreDialog();
    if (!slotName) {
      this.textDisplay.displayText('[Restore cancelled]');
      return false;
    }

    const envelope = this.saveManager.loadEnvelope(slotName);
    if (!envelope) {
      this.textDisplay.displayText(`[No saved game found: ${slotName}]`);
      this.beep();
      return false;
    }

    // Apply the engine save first — this clears the live world and
    // rebuilds it from the snapshot. Without this, the v3 in-house
    // serializer's known gaps return (score / capabilities / world
    // state values / relationships / ID counters all silently
    // dropped). See docs/work/save-restore/...platform-save-restore-bug.md.
    this.engineApplySave(envelope.engineSave);

    this.currentTurn = envelope.engineSave.metadata.turnCount;
    this.currentScore = envelope.score;
    this.turnOffset = this.currentTurn - 1;

    if (envelope.transcriptHtml) {
      const html = this.saveManager.decompressTranscript(envelope.transcriptHtml);
      this.textDisplay.setHTML(html);
    }

    this.updateStatusLine();
    this.textDisplay.displayText(`[Game restored from "${slotName}"]`);
    this.syncScoreFromWorld();
    return true;
  }

  private async handleRestart(): Promise<void> {
    const hooks = this.getSaveRestoreHooks();
    await hooks.onRestartRequested?.({});
  }

  private handleQuit(): void {
    if (confirm('Are you sure you want to quit?')) {
      window.close();
      // If that doesn't work, show message
      this.textDisplay.displayText('[Close this browser tab to quit]');
    }
  }

  // === Public display methods (for story callbacks) ===

  displayText(text: string): void {
    this.textDisplay.displayText(text);
  }

  displayCommand(command: string): void {
    this.textDisplay.displayCommand(command);
  }

  clearScreen(): void {
    this.textDisplay.clearScreen();
  }

  beep(frequency = 800, duration = 100): void {
    this.audioManager.beep(frequency, duration);
  }

  // === Public getters (for story callbacks) ===

  getWorld(): WorldModel {
    return this.world;
  }

  getCurrentTurn(): number {
    return this.currentTurn;
  }

  getCurrentScore(): number {
    return this.currentScore;
  }

  // === Private helpers ===

  /**
   * Call into the engine's save serializer. The engine produces a
   * complete `ISaveData` carrying the world's full runtime state via
   * the gzipped `worldSnapshot` field. Used by every save path
   * (interactive, autosave, startup).
   *
   * The cast bypasses the engine's `private` modifier on this method;
   * the platform-browser host needs both interactive (hook-driven) and
   * non-interactive (autosave / startup-restore) save paths, and the
   * public hook flow only covers the interactive case. Mirrors the
   * pattern used by the engine's own test suite.
   */
  private engineCreateSave(): ISaveData {
    return (
      this.engine as unknown as { createSaveData(): ISaveData }
    ).createSaveData();
  }

  /** Apply an engine save to the live world via `WorldModel.loadJSON`. */
  private engineApplySave(data: ISaveData): void {
    (
      this.engine as unknown as { loadSaveData(d: ISaveData): void }
    ).loadSaveData(data);
  }

  private performSave(slotName: string): void {
    // If we got here via an engine-fired `platform.save_requested`, the
    // hook stashed the engine's save data; reuse it so the persisted
    // state matches the moment the engine produced it. Otherwise (menu
    // File→Save), produce a fresh save now.
    const engineSave = this.pendingEngineSave ?? this.engineCreateSave();
    const result = this.saveManager.performSave(
      slotName,
      engineSave,
      this.getSaveContext(),
    );
    if (result.success) {
      this.textDisplay.displayText(`[Game saved as "${slotName}"]`);
    } else {
      this.textDisplay.displayText(`[Save failed: ${result.error}]`);
      this.beep();
    }
  }

  private getSaveContext(): SaveContext {
    return {
      turnCount: this.currentTurn,
      score: this.currentScore,
      transcriptHtml: this.textDisplay.getHTML(),
    };
  }

  private updateStatusLine(): void {
    const location = this.saveManager.getCurrentLocation();
    this.statusLine.update(location, this.currentScore, this.currentTurn);
  }

  private syncScoreFromWorld(): void {
    const scoring = this.world.getCapability('scoring');
    if (scoring && typeof scoring.scoreValue === 'number') {
      const newScore = scoring.scoreValue;
      if (newScore !== this.currentScore) {
        this.currentScore = newScore;
        this.updateStatusLine();
      }
    }
  }

}
