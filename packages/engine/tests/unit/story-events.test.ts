/**
 * story-events.test.ts — the engine hands an installed story's story-event
 * vocabulary to its prose pipeline, and to any pipeline swapped in later
 * (ADR-405).
 *
 * The real `GameEngine`, the real `ProsePipeline` and a real installed story;
 * the pipeline's output for a hand-built event is the observation. The one
 * double is the recording pipeline handed to `setTextService`, which is the
 * collaborator that call exists to accept.
 *
 * Public interface: none (test module).
 * Owner context: @sharpee/engine tests
 */
import { describe, expect, it } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import type { ITextBlock } from '@sharpee/text-blocks';
import { ProsePipeline } from '../../src/prose-pipeline/pipeline';
import type { IProsePipeline } from '../../src/prose-pipeline/types';
import { MinimalTestStory } from '../stories/minimal-test-story';
import { setupTestEngine } from '../test-helpers/setup-test-engine';

/** A story event carrying the fields the generic handler would print. */
function signal(type: string): ISemanticEvent {
  return { id: `evt-${type}`, type, timestamp: 1, entities: {}, data: { message: 'SIGNAL TEXT' } };
}

/** The minimal story, declaring the given story-event vocabulary. */
class SignallingStory extends MinimalTestStory {
  constructor(readonly storyEvents: readonly string[]) {
    super();
  }
}

/** A pipeline that records the vocabulary it is told. */
class RecordingPipeline implements IProsePipeline {
  told: readonly string[] | undefined;
  processTurn(): ITextBlock[] {
    return [];
  }
  registerSlotContributor(): void {}
  registerSlotEntry(): void {}
  setStoryEvents(types: readonly string[]): void {
    this.told = types;
  }
}

const textOf = (blocks: ITextBlock[]): string => JSON.stringify(blocks);

describe('the engine and the story-event vocabulary (ADR-405)', () => {
  it('after install, the pipeline renders no event of a declared story-event type', () => {
    const { engine } = setupTestEngine();
    engine.installStory(new SignallingStory(['yard-bell-pushed']));

    const blocks = engine.getTextService().processTurn([signal('yard-bell-pushed')]);

    expect(textOf(blocks)).not.toContain('SIGNAL TEXT');
  });

  it('an event of a type the story did not declare still renders', () => {
    const { engine } = setupTestEngine();
    engine.installStory(new SignallingStory(['yard-bell-pushed']));

    const blocks = engine.getTextService().processTurn([signal('yard-other')]);

    expect(textOf(blocks)).toContain('SIGNAL TEXT');
  });

  it('a story that declares no story events leaves every event rendering as before', () => {
    const { engine } = setupTestEngine();
    engine.installStory(new MinimalTestStory());

    const blocks = engine.getTextService().processTurn([signal('yard-bell-pushed')]);

    expect(textOf(blocks)).toContain('SIGNAL TEXT');
  });

  it('a pipeline swapped in after install is told the installed story\'s vocabulary', () => {
    const { engine } = setupTestEngine();
    engine.installStory(new SignallingStory(['yard-bell-pushed', 'yard-chime-played']));
    const replacement = new RecordingPipeline();

    engine.setTextService(replacement);

    expect(replacement.told).toEqual(['yard-bell-pushed', 'yard-chime-played']);
  });

  it('a declared type is matched without regard to the case it was declared in', () => {
    const { engine } = setupTestEngine();
    engine.installStory(new SignallingStory(['Yard-Bell-Pushed']));

    const blocks = engine.getTextService().processTurn([signal('yard-bell-pushed')]);

    expect(textOf(blocks)).not.toContain('SIGNAL TEXT');
  });

  it('a real pipeline swapped in after install renders no declared story event', () => {
    const { engine, languageProvider, world } = setupTestEngine();
    engine.installStory(new SignallingStory(['yard-bell-pushed']));
    const replacement = new ProsePipeline(languageProvider, world);
    // Before the swap the replacement knows no vocabulary, so it would print.
    expect(textOf(replacement.processTurn([signal('yard-bell-pushed')]))).toContain('SIGNAL TEXT');

    engine.setTextService(replacement);

    expect(textOf(engine.getTextService().processTurn([signal('yard-bell-pushed')]))).not.toContain('SIGNAL TEXT');
    expect(textOf(engine.getTextService().processTurn([signal('yard-other')]))).toContain('SIGNAL TEXT');
  });

  it('a pipeline swapped in before any story is installed is told an empty vocabulary', () => {
    const { engine } = setupTestEngine();
    const replacement = new RecordingPipeline();

    engine.setTextService(replacement);

    expect(replacement.told).toEqual([]);
  });
});
