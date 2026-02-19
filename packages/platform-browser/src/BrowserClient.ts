/**
 * BrowserClient - Main orchestrator for browser-based IF games
 *
 * Wires together all managers (save, theme, dialog, menu, input, display)
 * and provides a simple API for story entry points.
 */

import type { GameEngine, SequencedEvent } from '@sharpee/engine';
import type { WorldModel } from '@sharpee/world-model';
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
    // Handle text output
    this.engine.on('text:output', (blocks, turn) => {
      const text = renderToString(blocks);
      console.log('[text:output]', { text, turn, turnOffset: this.turnOffset });
      this.textDisplay.displayText(text);

      // Apply turn offset (set after restore to maintain correct turn count)
      this.currentTurn = turn + this.turnOffset;
      this.updateStatusLine();

      // Auto-save after each turn (if enabled)
      if (this.config.autoSave && turn > 0) {
        this.saveManager.performAutoSave(this.getSaveContext());
      }
    });

    // Handle game events
    this.engine.on('event', (event: SequencedEvent) => {
      console.log('[event]', event.type, event.data);

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
        const storyInfoEntities = this.world.findByTrait('storyInfo' as any);
        const trait = storyInfoEntities[0]?.get<any>('storyInfo');
        if (trait) {
          trait.clientVersion = this.config.storyInfo.version;
        } else {
          (this.world as unknown as Record<string, unknown>).clientVersion = this.config.storyInfo.version;
        }
      }

      // Start the engine first (builds the world)
      await this.engine.start();

      // Capture baseline state for delta saves (before any commands or restore)
      this.saveManager.captureBaseline();

      // Sync localStorage saves to world
      this.saveManager.syncSavesToWorld();

      // Check for autosave and restore
      const autosaveData = this.saveManager.loadAutosave();
      if (autosaveData && autosaveData.locations) {
        console.log('[startup] Found autosave, restoring...');
        try {
          // Restore state without replacing entities (preserves handlers)
          this.saveManager.restoreWorldState(autosaveData);
          this.currentTurn = autosaveData.turnCount || 0;
          this.currentScore = autosaveData.score || 0;
          // Set offset so engine's turn counter aligns with saved turn
          this.turnOffset = this.currentTurn - 1;

          // Restore transcript HTML if available
          if (autosaveData.transcriptHtml) {
            const html = this.saveManager.decompressTranscript(autosaveData.transcriptHtml);
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
      onSaveRequested: async (_data: ISaveData): Promise<void> => {
        // Ignore the engine's ISaveData - we'll use our own state capture
        const saved = await this.dialogManager.showSaveDialog();
        if (!saved) {
          this.textDisplay.displayText('[Save cancelled]');
        }
      },

      onRestoreRequested: async (): Promise<ISaveData | null> => {
        const slotName = await this.dialogManager.showRestoreDialog();
        if (!slotName) {
          this.textDisplay.displayText('[Restore cancelled]');
          return null;
        }

        const saveData = this.saveManager.loadSaveSlot(slotName);
        if (!saveData) {
          this.textDisplay.displayText(`[No saved game found: ${slotName}]`);
          this.beep();
          return null;
        }

        // Restore world state
        this.saveManager.restoreWorldState(saveData);
        this.currentTurn = saveData.turnCount || 0;
        this.currentScore = saveData.score || 0;
        this.turnOffset = this.currentTurn - 1;

        // Restore transcript
        if (saveData.transcriptHtml) {
          const html = this.saveManager.decompressTranscript(saveData.transcriptHtml);
          this.textDisplay.setHTML(html);
        }

        this.updateStatusLine();
        this.textDisplay.displayText(`[Game restored from "${slotName}"]`);
        this.syncScoreFromWorld();

        // Return null since we handled the restore ourselves
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
    const hooks = this.getSaveRestoreHooks();
    await hooks.onRestoreRequested();
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

  private performSave(slotName: string): void {
    const result = this.saveManager.performSave(slotName, this.getSaveContext());
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
