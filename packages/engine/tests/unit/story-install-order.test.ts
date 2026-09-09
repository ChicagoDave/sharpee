/**
 * A story's installation order is pinned by name (ADR-334 A1): the list
 * in order, every `requires` satisfied, a reordered copy reported by
 * name, one module per step, and a real engine driving the list — an
 * installation runs every step exactly once. A step re-inlined into
 * `installStory` around the list would not run its step, and this test would
 * say which one.
 *
 * The guard is pinned here too: an engine installs exactly one story,
 * before it starts, and refuses a second install or a post-start install
 * naming the field. And the one playthrough-side hook, `onEngineReady`,
 * sees the engine after it has adopted the result.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { STORY_INSTALL_STEPS } from '../../src/install/steps';
import { requiresOrderViolations } from '../../src/turn/runner';
import type { GameEngine } from '../../src/game-engine';
import type { NarrativeSettings } from '../../src/narrative';
import type { StoryConfig, CustomVocabulary } from '../../src/story';
import { vocabularyRegistry } from '@sharpee/stdlib';
import type { ISemanticEvent } from '@sharpee/core';
import { MinimalTestStory } from '../stories';
import { setupTestEngine } from '../test-helpers/setup-test-engine';

const INSTALL_ORDER = [
  'validate-config',
  'emit-story-loading',
  'narrative-settings',
  'concealed-visibility',
  'initialize-world',
  'create-player',
  'listener-trait',
  'validate-room-snippets',
  'validate-combatant-health',
  'narrative-language',
  'metadata',
  'story-info-entity',
  'story-info-capability',
  'implicit-actions',
  'custom-actions',
  'story-initialize',
  'emit-story-loaded',
  'custom-vocabulary'
];

describe('the story installation list (ADR-334 A1)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('STORY_INSTALL_STEPS names every step in order', () => {
    expect(STORY_INSTALL_STEPS.map((s) => s.name)).toEqual(INSTALL_ORDER);
  });

  it('every requires is satisfied by an earlier step', () => {
    expect(requiresOrderViolations(STORY_INSTALL_STEPS)).toEqual([]);
  });

  it('a reordered copy is reported by name', () => {
    const swapped = [...STORY_INSTALL_STEPS];
    const world = swapped.findIndex((s) => s.name === 'initialize-world');
    const player = swapped.findIndex((s) => s.name === 'create-player');
    [swapped[world], swapped[player]] = [swapped[player], swapped[world]];
    expect(requiresOrderViolations(swapped)).toEqual([
      { name: 'create-player', requires: 'initialize-world' }
    ]);
  });

  it('one module per step under src/install/', () => {
    const modules = readdirSync(join(__dirname, '..', '..', 'src', 'install'))
      .filter((f) => f.endsWith('.ts'))
      .map((f) => f.replace(/\.ts$/, ''))
      .filter((f) => !['context', 'runner', 'steps', 'index'].includes(f));
    expect(new Set(modules)).toEqual(new Set(INSTALL_ORDER));
  });

  it('an installation runs every step exactly once', () => {
    const spies = STORY_INSTALL_STEPS.map((step) => [step.name, vi.spyOn(step, 'run')] as const);
    const { engine } = setupTestEngine();
    engine.installStory(new MinimalTestStory());
    for (const [name, spy] of spies) expect([name, spy.mock.calls.length]).toEqual([name, 1]);
  });
});

describe('the install guard: one story, before start', () => {
  it('a second install throws naming the story field', () => {
    const { engine } = setupTestEngine();
    engine.installStory(new MinimalTestStory());
    expect(() => engine.installStory(new MinimalTestStory())).toThrow(/story: 'minimal-test'/);
    expect(engine.getStory()?.config.id).toBe('minimal-test');
  });

  it('an install after start() throws naming the running field', () => {
    const { engine } = setupTestEngine();
    engine.start();
    expect(() => engine.installStory(new MinimalTestStory())).toThrow(/running: true/);
    expect(engine.getStory()).toBeUndefined();
  });

  it('a failed step adopts nothing', () => {
    const { engine } = setupTestEngine();
    const story = new MinimalTestStory();
    story.forceInitError = true;
    expect(() => engine.installStory(story)).toThrow('Forced initialization error');
    expect(engine.getStory()).toBeUndefined();
    expect(engine.getContext().metadata.title).toBeUndefined();
    // Nothing adopted, so a good story still installs.
    expect(() => engine.installStory(new MinimalTestStory())).not.toThrow();
  });
});

describe('onEngineReady sees the adopted engine', () => {
  it('the hook reads the story, its narrative settings, the player, and the metadata', () => {
    class ReadyStory extends MinimalTestStory {
      seen?: { story: unknown; narrative: NarrativeSettings; playerId: string; title?: string; author?: string };
      onEngineReady(engine: GameEngine): void {
        this.seen = {
          story: engine.getStory(),
          narrative: engine.getNarrativeSettings(),
          playerId: engine.getContext().player.id,
          title: engine.getContext().metadata.title,
          author: engine.getContext().metadata.author
        };
      }
    }
    const { engine, world } = setupTestEngine();
    const story = new ReadyStory();
    engine.installStory(story);
    expect(story.seen?.story).toBe(story);
    expect(story.seen?.narrative).toEqual(engine.getNarrativeSettings());
    expect(story.seen?.playerId).toBe(world.getPlayer()?.id);
    expect(story.seen).toMatchObject({ title: 'Minimal Test Story', author: 'Test Suite' });
  });
});

describe('what the steps leave behind', () => {
  it('emit-story-loading and emit-story-loaded reach a listener, in that order, with the story in the payload', () => {
    const { engine } = setupTestEngine();
    const events: ISemanticEvent[] = [];
    engine.on('event', (event) => events.push(event));
    engine.installStory(new MinimalTestStory());
    const types = events.map((e) => e.type);
    expect(types.indexOf('game.story_loading')).toBeGreaterThanOrEqual(0);
    expect(types.indexOf('game.story_loading')).toBeLessThan(types.indexOf('game.story_loaded'));
    const loading = events.find((e) => e.type === 'game.story_loading')!;
    const loaded = events.find((e) => e.type === 'game.story_loaded')!;
    expect(loading.data).toMatchObject({ story: { id: 'minimal-test' } });
    expect(loaded.data).toMatchObject({
      story: { id: 'minimal-test', title: 'Minimal Test Story', author: 'Test Suite', version: '1.0.0' }
    });
  });

  it('custom-vocabulary registers the story\'s verbs on the parser\'s vocabulary', () => {
    class VocabularyStory extends MinimalTestStory {
      getCustomVocabulary(): CustomVocabulary {
        return { verbs: [{ actionId: 'test.action.grokking', verbs: ['grokify'] }] };
      }
    }
    expect(vocabularyRegistry.hasWord('grokify', 'verb')).toBe(false);
    const { engine } = setupTestEngine();
    engine.installStory(new VocabularyStory());
    expect(vocabularyRegistry.hasWord('grokify', 'verb')).toBe(true);
    expect(vocabularyRegistry.lookup('grokify', 'verb').map((e) => e.mapsTo)).toContain('test.action.grokking');
  });

  it('narrative-settings and implicit-actions are adopted from a non-default config', () => {
    class FirstPersonStory extends MinimalTestStory {
      config: StoryConfig = {
        ...new MinimalTestStory().config,
        narrative: { perspective: '1st' },
        implicitActions: { implicitTake: false }
      };
    }
    const { engine } = setupTestEngine();
    expect(engine.getNarrativeSettings().perspective).toBe('2nd');
    expect(engine.getContext().implicitActions).toBeUndefined();
    engine.installStory(new FirstPersonStory());
    expect(engine.getNarrativeSettings().perspective).toBe('1st');
    expect(engine.getContext().implicitActions).toEqual({ implicitTake: false });
  });
});
