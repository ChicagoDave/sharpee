/**
 * @sharpee/runtime - PostMessage Bridge
 *
 * Headless engine that communicates with the parent frame via postMessage.
 * No DOM manipulation — all output goes through the protocol.
 */

import { GameEngine } from '@sharpee/engine';
import { WorldModel, IdentityTrait } from '@sharpee/world-model';
import { PerceptionService } from '@sharpee/stdlib';
import { EnglishParser } from '@sharpee/parser-en-us';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { ITextBlock } from '@sharpee/text-blocks';
import type { Story } from '@sharpee/engine';
import type { ISaveData } from '@sharpee/core';

import type {
  InboundMessage,
  OutboundMessage,
} from './protocol';
import { isInboundMessage } from './protocol';

/** Runtime version — updated by build */
const RUNTIME_VERSION = '0.1.0';

/**
 * SharpeeRuntimeBridge
 *
 * Lifecycle:
 *   1. Parent loads iframe containing the bundled runtime
 *   2. Bridge sends 'sharpee:ready'
 *   3. Parent sends 'sharpee:load-story' with generated JS code
 *   4. Bridge evals the code, reads window.SharpeeStory, sends 'sharpee:story-loaded'
 *   5. Parent sends 'sharpee:start'
 *   6. Bridge calls engine.start() + engine.executeTurn('look'), sends output
 *   7. Parent sends 'sharpee:command' for each player input
 */
export class SharpeeRuntimeBridge {
  private engine: GameEngine | null = null;
  private world: WorldModel | null = null;
  private story: Story | null = null;
  private pendingSaveResolve: ((data: string) => void) | null = null;

  /**
   * Start listening for messages from the parent frame.
   * Call this once when the iframe loads.
   */
  listen(): void {
    window.addEventListener('message', (event: MessageEvent) => {
      this.handleMessage(event);
    });

    this.send({ type: 'sharpee:ready', version: RUNTIME_VERSION });
  }

  /**
   * Stop listening (cleanup).
   */
  destroy(): void {
    this.engine = null;
    this.world = null;
    this.story = null;
  }

  // ─── Message dispatch ─────────────────────────────────────────

  private handleMessage(event: MessageEvent): void {
    const data = event.data;
    if (!isInboundMessage(data)) return;

    const msg = data as InboundMessage;

    try {
      switch (msg.type) {
        case 'sharpee:load-story':
          this.handleLoadStory(msg.code);
          break;
        case 'sharpee:start':
          this.handleStart();
          break;
        case 'sharpee:command':
          this.handleCommand(msg.text);
          break;
        case 'sharpee:restart':
          this.handleRestart();
          break;
        case 'sharpee:save':
          this.handleSave();
          break;
        case 'sharpee:restore':
          this.handleRestore(msg.data);
          break;
      }
    } catch (err) {
      this.sendError('unknown', err);
    }
  }

  // ─── Handlers ─────────────────────────────────────────────────

  private handleLoadStory(code: string): void {
    try {
      // Clear any previous story
      this.engine = null;
      this.world = null;
      this.story = null;

      // Eval the story code — it must set window.SharpeeStory
      // The code runs in the same context where window.Sharpee has the full API
      window.SharpeeStory = undefined;

      // Use Function constructor instead of eval for slightly better CSP compat
      const fn = new Function(code);
      fn();

      const story = window.SharpeeStory;
      if (!story) {
        this.sendError('load', new Error(
          'Story code did not set window.SharpeeStory. ' +
          'The generated code must assign a Story object to window.SharpeeStory.'
        ));
        return;
      }

      if (!story.config || !story.initializeWorld || !story.createPlayer) {
        this.sendError('load', new Error(
          'window.SharpeeStory is missing required properties: config, initializeWorld, createPlayer'
        ));
        return;
      }

      this.story = story;

      this.send({
        type: 'sharpee:story-loaded',
        title: story.config.title,
        author: story.config.author,
      });
    } catch (err) {
      this.sendError('load', err);
    }
  }

  private async handleStart(): Promise<void> {
    if (!this.story) {
      this.sendError('start', new Error('No story loaded. Send sharpee:load-story first.'));
      return;
    }

    try {
      // Bootstrap the engine stack
      this.world = new WorldModel();
      const player = this.story.createPlayer(this.world);
      this.world.setPlayer(player.id);

      const language = new EnglishLanguageProvider();
      const parser = new EnglishParser(language);
      const perceptionService = new PerceptionService();

      this.engine = new GameEngine({
        world: this.world,
        player,
        parser,
        language,
        perceptionService,
      });

      // Wire text output → postMessage
      this.engine.on('text:output', (blocks: ITextBlock[], turn: number) => {
        this.send({ type: 'sharpee:output', blocks });
        this.sendStatus();
      });

      // Wire save/restore hooks → postMessage
      this.engine.registerSaveRestoreHooks({
        onSaveRequested: async (saveData: ISaveData) => {
          const serialized = JSON.stringify(saveData);
          this.send({ type: 'sharpee:save-data', data: serialized });
        },
        onRestoreRequested: async (): Promise<ISaveData | null> => {
          // Restore is driven by the parent sending sharpee:restore,
          // not by the engine requesting it. Return null here.
          return null;
        },
      });

      // Set story and start
      this.engine.setStory(this.story);

      // Extend parser/language if the story provides it
      if (this.story.extendParser) {
        this.story.extendParser(parser);
      }
      if (this.story.extendLanguage) {
        this.story.extendLanguage(language);
      }

      this.engine.start();

      this.send({ type: 'sharpee:started' });

      // Run the opening look
      await this.engine.executeTurn('look');
    } catch (err) {
      this.sendError('start', err);
    }
  }

  private async handleCommand(text: string): Promise<void> {
    if (!this.engine) {
      this.sendError('command', new Error('Engine not started. Send sharpee:start first.'));
      return;
    }

    try {
      await this.engine.executeTurn(text);
    } catch (err) {
      this.sendError('command', err);
    }
  }

  private async handleRestart(): Promise<void> {
    if (!this.story) {
      this.sendError('command', new Error('No story loaded.'));
      return;
    }

    try {
      // Tear down current engine and rebuild from scratch
      this.engine = null;
      this.world = null;
      await this.handleStart();
    } catch (err) {
      this.sendError('command', err);
    }
  }

  private handleSave(): void {
    if (!this.engine) {
      this.sendError('save', new Error('Engine not started.'));
      return;
    }

    try {
      // This triggers the save hook we registered, which sends save-data via postMessage
      this.engine.save();
    } catch (err) {
      this.sendError('save', err);
    }
  }

  private handleRestore(data: string): void {
    if (!this.engine) {
      this.sendError('restore', new Error('Engine not started.'));
      return;
    }

    try {
      const saveData = JSON.parse(data) as ISaveData;
      // Use the engine's internal loadSaveData via restore flow
      // Since we can't call private loadSaveData directly,
      // we register a temporary hook that returns our data
      const originalHooks = this.engine.getSaveRestoreHooks();
      this.engine.registerSaveRestoreHooks({
        onSaveRequested: originalHooks?.onSaveRequested || (async () => {}),
        onRestoreRequested: async () => saveData,
      });
      this.engine.restore().then((success) => {
        // Restore original hooks
        if (originalHooks) {
          this.engine!.registerSaveRestoreHooks(originalHooks);
        }
        if (success) {
          this.send({ type: 'sharpee:restored' });
          this.sendStatus();
        } else {
          this.sendError('restore', new Error('Restore failed'));
        }
      });
    } catch (err) {
      this.sendError('restore', err);
    }
  }

  // ─── Output helpers ───────────────────────────────────────────

  private sendStatus(): void {
    if (!this.world || !this.engine) return;

    const player = this.world.getPlayer();
    if (!player) return;

    const locationId = this.world.getLocation(player.id);
    let locationName = 'Unknown';
    if (locationId) {
      const room = this.world.getEntity(locationId);
      if (room) {
        const identity = room.get<IdentityTrait>(IdentityTrait.type);
        locationName = identity?.name || room.name || 'Unknown';
      }
    }

    const context = this.engine.getContext();
    const playerIdentity = player.get<IdentityTrait>(IdentityTrait.type);
    this.send({
      type: 'sharpee:status',
      location: locationName,
      score: playerIdentity?.points,
      turns: context?.currentTurn,
    });
  }

  private send(message: OutboundMessage): void {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, '*');
    }
  }

  private sendError(category: 'load' | 'start' | 'command' | 'save' | 'restore' | 'unknown', err: unknown): void {
    const error = err instanceof Error ? err : new Error(String(err));
    this.send({
      type: 'sharpee:error',
      category,
      message: error.message,
      stack: error.stack,
    });
  }
}
