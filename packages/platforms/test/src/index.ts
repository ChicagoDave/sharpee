/**
 * Test platform for Sharpee engine.
 *
 * Provides a minimal platform that captures text output, semantic events,
 * and query interactions for use in integration tests.
 *
 * Public interface: TestPlatformOptions, createTestEngine, TestPlatform.
 * Owner context: @sharpee/test-platform
 */

import { GameEngine } from '@sharpee/engine';
import { WorldModel, IFEntity } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { LanguageProvider } from '@sharpee/lang-en-us';
import { Story } from '@sharpee/engine';
import { PlatformEventType } from '@sharpee/core';

export interface TestPlatformOptions {
  story?: Story;
  world: WorldModel;
  player: IFEntity;
  parser?: Parser;
  language?: LanguageProvider;
}

export function createTestEngine(options: TestPlatformOptions): GameEngine {
  const language = options.language || new LanguageProvider();
  const parser = options.parser || new Parser(language);

  if (options.story?.extendParser) {
    options.story.extendParser(parser);
  }

  if (options.story?.extendLanguage) {
    options.story.extendLanguage(language);
  }

  const engine = new GameEngine({
    world: options.world,
    player: options.player,
    parser,
    language,
  });

  return engine;
}

/**
 * Test platform that captures engine output for assertions.
 *
 * Subscribes to the engine's public event API to collect text output,
 * platform events, and query interactions.
 */
export class TestPlatform {
  public output: string[] = [];
  public events: Array<{ event: string; data: Record<string, unknown> }> = [];

  constructor(private engine: GameEngine) {
    this.initialize();
  }

  private initialize(): void {
    // Capture text output via the public text:output event
    this.engine.on('text:output', (blocks) => {
      const text = blocks.map(b => {
        if (!b.content) return '';
        return b.content.map(c => typeof c === 'string' ? c : c.text ?? '').join('');
      }).join('\n');
      if (text) {
        this.output.push(text);
      }
    });

    // Capture platform events via the public event channel
    this.engine.on('event', (event) => {
      switch (event.type) {
        case PlatformEventType.QUIT_REQUESTED:
          this.events.push({ event: 'platform.quit', data: {} });
          break;
        case PlatformEventType.SAVE_REQUESTED:
          this.events.push({ event: 'platform.save', data: event.data ?? {} });
          break;
        case PlatformEventType.RESTORE_REQUESTED:
          this.events.push({ event: 'platform.restore', data: event.data ?? {} });
          break;
        case PlatformEventType.RESTART_REQUESTED:
          this.events.push({ event: 'platform.restart', data: {} });
          break;
      }
    });
  }

  clear(): void {
    this.output = [];
    this.events = [];
  }
}
