/**
 * @sharpee/bridge - Native Engine Bridge (ADR-135)
 *
 * Runs in a Node.js subprocess. Reads newline-delimited JSON from stdin,
 * drives the Sharpee engine, writes newline-delimited JSON to stdout.
 * stderr is reserved for diagnostics and is not part of the protocol.
 */

import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { Readable, Writable } from 'node:stream';

import { GameEngine } from '@sharpee/engine';
import { WorldModel, IdentityTrait } from '@sharpee/world-model';
import { PerceptionService } from '@sharpee/stdlib';
import { EnglishParser } from '@sharpee/parser-en-us';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import type { ITextBlock } from '@sharpee/text-blocks';
import type { Story } from '@sharpee/engine';
import type { ISemanticEvent } from '@sharpee/core';
import type { ISaveData } from '@sharpee/core';
import { unzipSync } from 'fflate';

import type {
  InboundMessage,
  OutboundMessage,
  DomainEvent,
} from './protocol';
import {
  BRIDGE_PROTOCOL_VERSION,
  isInboundMessage,
  shouldForwardEvent,
} from './protocol';

/**
 * NativeEngineBridge
 *
 * Lifecycle:
 *   1. Host spawns Node.js subprocess running bridge-entry.ts
 *   2. Bridge sends { type: "ready", version: "1.0.0" }
 *   3. Host sends { method: "start", bundle: "/path/to/game.sharpee" }
 *   4. Bridge loads story, bootstraps engine, sends blocks + events + status
 *   5. Host sends { method: "command", text: "go north" } for each turn
 *   6. Host sends { method: "quit" } to shut down
 */
export class NativeEngineBridge {
  private engine: GameEngine | null = null;
  private world: WorldModel | null = null;
  private story: Story | null = null;
  private rl: readline.Interface | null = null;

  // Turn accumulation: collect blocks and events during executeTurn(),
  // then flush blocks → events → status atomically after it resolves.
  private pendingBlocks: ITextBlock[] = [];
  private pendingEvents: DomainEvent[] = [];

  // Command queue: enforces sequential processing.
  // Next command is dequeued only after the current one completes.
  private commandQueue: InboundMessage[] = [];
  private processing = false;

  constructor(
    private readonly input: Readable,
    private readonly output: Writable,
  ) {}

  /**
   * Start the bridge. Sends 'ready' and begins reading stdin.
   */
  listen(): void {
    this.send({ type: 'ready', version: BRIDGE_PROTOCOL_VERSION });

    this.rl = readline.createInterface({ input: this.input });

    this.rl.on('line', (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        this.send({ type: 'error', message: `Invalid JSON: ${trimmed}` });
        return;
      }

      if (!isInboundMessage(parsed)) {
        this.send({ type: 'error', message: `Unknown message: ${trimmed}` });
        return;
      }

      this.enqueue(parsed);
    });

    this.rl.on('close', () => {
      // stdin closed — host process exited
      this.shutdown();
    });
  }

  /**
   * Clean shutdown: send bye, close readline, flush stdout.
   */
  shutdown(): void {
    this.send({ type: 'bye' });
    this.rl?.close();
    this.engine = null;
    this.world = null;
    this.story = null;
  }

  // ─── Command queue ──────────────────────────────────────────────

  private enqueue(msg: InboundMessage): void {
    this.commandQueue.push(msg);
    if (!this.processing) {
      this.processNext();
    }
  }

  private async processNext(): Promise<void> {
    if (this.commandQueue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const msg = this.commandQueue.shift()!;

    try {
      await this.dispatch(msg);
    } catch (err) {
      this.send({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }

    // Process next command in queue
    this.processNext();
  }

  // ─── Message dispatch ───────────────────────────────────────────

  private async dispatch(msg: InboundMessage): Promise<void> {
    switch (msg.method) {
      case 'start':
        await this.handleStart(msg.bundle, msg.storyPath);
        break;
      case 'command':
        await this.handleCommand(msg.text);
        break;
      case 'save':
        await this.handleSave();
        break;
      case 'restore':
        await this.handleRestore(msg.data);
        break;
      case 'quit':
        this.shutdown();
        process.exit(0);
        break;
    }
  }

  // ─── Handlers ───────────────────────────────────────────────────

  private async handleStart(bundle?: string, storyPath?: string): Promise<void> {
    if (!bundle && !storyPath) {
      this.send({ type: 'error', message: 'start requires either "bundle" or "storyPath"' });
      return;
    }

    try {
      // Load the story
      if (bundle) {
        this.story = await this.loadBundle(bundle);
      } else if (storyPath) {
        this.story = await this.loadStoryPath(storyPath);
      }

      if (!this.story) {
        this.send({ type: 'error', message: 'Failed to load story' });
        return;
      }

      // Bootstrap the engine
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

      // Wire text output accumulation
      this.engine.on('text:output', (blocks: ITextBlock[]) => {
        this.pendingBlocks.push(...blocks);
      });

      // Wire event accumulation (filter to bridge-worthy events)
      this.engine.on('event', (event: ISemanticEvent) => {
        if (shouldForwardEvent(event.type)) {
          this.pendingEvents.push({
            type: event.type,
            data: (event.data as Record<string, unknown>) ?? {},
          });
        }
      });

      // Wire save/restore hooks
      this.engine.registerSaveRestoreHooks({
        onSaveRequested: async (saveData: ISaveData) => {
          // Save data flows through the event channel as platform.save_completed
          // The event is already emitted by the engine; we store the serialized
          // data in the event's data field so the host can retrieve it.
          // Nothing extra needed here — the event handler above will forward it.
        },
        onRestoreRequested: async (): Promise<ISaveData | null> => {
          // Restore is driven by the host sending 'restore' command,
          // not by the engine requesting it. Return null here.
          return null;
        },
      });

      // Set story and extend parser/language
      this.engine.setStory(this.story);

      if (this.story.extendParser) {
        this.story.extendParser(parser);
      }
      if (this.story.extendLanguage) {
        this.story.extendLanguage(language);
      }

      this.engine.start();

      // Run the opening look
      this.clearAccumulators();
      await this.engine.executeTurn('look');
      this.flushTurn();
    } catch (err) {
      this.send({
        type: 'error',
        message: `start failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private async handleCommand(text: string): Promise<void> {
    if (!this.engine) {
      this.send({ type: 'error', message: 'Engine not started. Send "start" first.' });
      return;
    }

    try {
      this.clearAccumulators();
      await this.engine.executeTurn(text);
      this.flushTurn();
    } catch (err) {
      this.send({
        type: 'error',
        message: `command failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private async handleSave(): Promise<void> {
    if (!this.engine) {
      this.send({ type: 'error', message: 'Engine not started.' });
      return;
    }

    try {
      // Trigger save via a 'save' command — the engine processes it as a
      // meta-command that triggers the save hook, which emits platform.save_completed
      this.clearAccumulators();
      await this.engine.executeTurn('save');
      this.flushTurn();
    } catch (err) {
      this.send({
        type: 'error',
        message: `save failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private async handleRestore(data: string): Promise<void> {
    if (!this.engine) {
      this.send({ type: 'error', message: 'Engine not started.' });
      return;
    }

    try {
      const saveData = JSON.parse(data) as ISaveData;

      // Install a temporary restore hook that returns our data
      const originalHooks = (this.engine as any).saveRestoreHooks;
      this.engine.registerSaveRestoreHooks({
        onSaveRequested: originalHooks?.onSaveRequested || (async () => {}),
        onRestoreRequested: async () => saveData,
      });

      this.clearAccumulators();
      await this.engine.executeTurn('restore');

      // Restore original hooks
      if (originalHooks) {
        this.engine.registerSaveRestoreHooks(originalHooks);
      }

      this.flushTurn();
    } catch (err) {
      this.send({
        type: 'error',
        message: `restore failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // ─── Story loading ──────────────────────────────────────────────

  /**
   * Load a .sharpee bundle. Extracts story.js from the zip,
   * writes it to a temp file, and imports it.
   */
  private async loadBundle(bundlePath: string): Promise<Story> {
    const absPath = path.resolve(bundlePath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Bundle not found: ${absPath}`);
    }

    const zipBytes = fs.readFileSync(absPath);
    const files = unzipSync(new Uint8Array(zipBytes.buffer));

    const metaBytes = files['meta.json'];
    if (!metaBytes) throw new Error('Invalid .sharpee bundle: missing meta.json');

    const storyBytes = files['story.js'];
    if (!storyBytes) throw new Error('Invalid .sharpee bundle: missing story.js');

    const storyCode = new TextDecoder().decode(storyBytes);

    // story.js is ESM with @sharpee/* as externals.
    // Write to a temp file and use dynamic import().
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sharpee-bridge-'));
    const tmpFile = path.join(tmpDir, 'story.mjs');
    fs.writeFileSync(tmpFile, storyCode, 'utf-8');

    try {
      const storyModule = await import(tmpFile);
      const story: Story = storyModule.story ?? storyModule.default?.story ?? storyModule.default;

      if (!story || !story.config) {
        throw new Error('Bundle story.js does not export a valid story object');
      }

      return story;
    } finally {
      // Clean up temp file
      try {
        fs.unlinkSync(tmpFile);
        fs.rmdirSync(tmpDir);
      } catch {
        // Best-effort cleanup
      }
    }
  }

  /**
   * Load a story from a .ts file path (authoring mode).
   * Compiles via esbuild programmatically, then imports the result.
   */
  private async loadStoryPath(storyPath: string): Promise<Story> {
    const absPath = path.resolve(storyPath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Story file not found: ${absPath}`);
    }

    // Use esbuild to compile TS → JS
    let esbuild: typeof import('esbuild');
    try {
      esbuild = await import('esbuild');
    } catch {
      throw new Error(
        'esbuild is required for storyPath mode but not found. ' +
        'Install it with: npm install esbuild'
      );
    }

    const result = await esbuild.build({
      entryPoints: [absPath],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      write: false,
      external: ['@sharpee/*'],
      tsconfig: path.join(path.dirname(absPath), 'tsconfig.json'),
    });

    if (result.errors.length > 0) {
      throw new Error(`esbuild errors: ${result.errors.map(e => e.text).join('\n')}`);
    }

    const code = result.outputFiles[0].text;

    // Execute the compiled code with require() resolution for @sharpee/*
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sharpee-bridge-'));
    const tmpFile = path.join(tmpDir, 'story.js');
    fs.writeFileSync(tmpFile, code, 'utf-8');

    try {
      const storyModule = require(tmpFile);
      const story: Story = storyModule.story ?? storyModule.default?.story ?? storyModule.default;

      if (!story || !story.config) {
        throw new Error('Story file does not export a valid story object');
      }

      return story;
    } finally {
      try {
        fs.unlinkSync(tmpFile);
        fs.rmdirSync(tmpDir);
      } catch {
        // Best-effort cleanup
      }
    }
  }

  // ─── Turn flush ─────────────────────────────────────────────────

  private clearAccumulators(): void {
    this.pendingBlocks = [];
    this.pendingEvents = [];
  }

  /**
   * Flush accumulated blocks, events, and status in the correct order.
   * Per ADR-135: blocks → events → status.
   */
  private flushTurn(): void {
    // 1. Blocks
    if (this.pendingBlocks.length > 0) {
      this.send({ type: 'blocks', blocks: this.pendingBlocks });
    }

    // 2. Events
    if (this.pendingEvents.length > 0) {
      this.send({ type: 'events', events: this.pendingEvents });
    }

    // 3. Status (marks end of turn)
    this.sendStatus();

    this.clearAccumulators();
  }

  // ─── Output helpers ─────────────────────────────────────────────

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

    const context = (this.engine as any).context;
    this.send({
      type: 'status',
      location: locationName,
      turn: context?.currentTurn ?? 0,
    });
  }

  private send(message: OutboundMessage): void {
    this.output.write(JSON.stringify(message) + '\n');
  }
}
