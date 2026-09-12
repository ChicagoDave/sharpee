/**
 * The `storyInfo` capability's one precedence rule (ADR-334 A1(ii), F1):
 * authored fields config-wins-trait-fills, build-pipeline fields
 * trait-wins-config-fills, applied identically at `installStory` and at
 * `start()`. The engine cases assert on the capability's stored data —
 * the state the channels read — at both moments, including the F1
 * defect: a trait description no longer overwrites the config's at start.
 */

import { describe, it, expect } from 'vitest';
import { EntityType, StoryInfoTrait, type WorldModel } from '@sharpee/world-model';
import { projectStoryInfo, findStoryInfoTrait } from '../../src/install/story-info-projection';
import type { StoryConfig } from '../../src/install/story';
import { MinimalTestStory } from '../stories';
import { setupTestEngine } from '../test-helpers/setup-test-engine';

const CONFIG: StoryConfig = {
  id: 'projection-test',
  title: 'Projection Test',
  authors: ['A. Author', 'B. Author'],
  version: '2.1.0',
};

/** A story that fills its own StoryInfoTrait with values that disagree with its config. */
class TraitStory extends MinimalTestStory {
  constructor(private readonly traitData: Partial<StoryInfoTrait>) {
    super();
    this.config = {
      ...this.config,
      description: 'From the config',
      buildDate: '2026-01-01',
      ifid: 'IFID-1',
    };
  }
  initializeWorld(world: WorldModel): void {
    super.initializeWorld(world);
    const entity = world.createEntity('story-info', EntityType.OBJECT);
    entity.add(new StoryInfoTrait({ title: this.config.title, author: 'x', version: this.config.version, ...this.traitData }));
  }
}

function storyInfo(world: WorldModel): Record<string, unknown> {
  return world.getCapability('storyInfo') as Record<string, unknown>;
}

describe('projectStoryInfo — the three-way rule', () => {
  it('authored fields: the config wins and the trait fills a gap', () => {
    const trait = new StoryInfoTrait({ description: 'From the trait' });
    expect(projectStoryInfo({ ...CONFIG, description: 'From the config', testers: ['T'], ifid: 'IFID-2' }, trait)).toEqual({
      title: 'Projection Test',
      authors: ['A. Author', 'B. Author'],
      version: '2.1.0',
      testers: ['T'],
      ifid: 'IFID-2',
      description: 'From the config',
    });
    expect(projectStoryInfo(CONFIG, trait).description).toBe('From the trait');
  });

  it('build-pipeline fields: the trait wins and the config fills a gap', () => {
    const trait = new StoryInfoTrait({ buildDate: '2026-09-09', clientVersion: '3.5.0' });
    const withBoth = projectStoryInfo({ ...CONFIG, buildDate: '2026-01-01' }, trait);
    expect(withBoth.buildDate).toBe('2026-09-09');
    expect(withBoth.clientVersion).toBe('3.5.0');
    expect(projectStoryInfo({ ...CONFIG, buildDate: '2026-01-01' }, new StoryInfoTrait()).buildDate).toBe('2026-01-01');
    expect(projectStoryInfo({ ...CONFIG, buildDate: '2026-01-01' }, undefined).buildDate).toBe('2026-01-01');
  });

  it('unset fields are absent, not undefined; empty testers are unset', () => {
    const projection = projectStoryInfo({ ...CONFIG, testers: [] }, undefined);
    expect(Object.keys(projection).sort()).toEqual(['authors', 'title', 'version']);
    expect(projectStoryInfo(CONFIG, new StoryInfoTrait({ description: '' })).description).toBeUndefined();
  });
});

describe('the storyInfo capability at load and at start (F1)', () => {
  it('a trait description no longer overwrites the config description at start; buildDate is the trait\'s at both moments', () => {
    const { engine, world } = setupTestEngine();
    engine.installStory(new TraitStory({ description: 'From the trait', buildDate: '2026-09-09' }));

    const atLoad = storyInfo(world);
    expect(atLoad.description).toBe('From the config');
    expect(atLoad.buildDate).toBe('2026-09-09');
    expect(atLoad.ifid).toBe('IFID-1');

    engine.start();

    const atStart = storyInfo(world);
    expect(atStart.description).toBe('From the config');
    expect(atStart.buildDate).toBe('2026-09-09');
    expect(atStart.title).toBe('Minimal Test Story');
    expect(atStart.authors).toEqual(['Test Suite']);
  });

  it('a build-pipeline field patched onto the trait between installStory and start appears at start', () => {
    const { engine, world } = setupTestEngine();
    engine.installStory(new TraitStory({}));
    expect(storyInfo(world).clientVersion ?? '').toBe('');

    findStoryInfoTrait(world)!.clientVersion = 'client-9';
    engine.start();

    expect(storyInfo(world).clientVersion).toBe('client-9');
    expect(storyInfo(world).description).toBe('From the config');
  });

  it('a story with no trait of its own gets the engine-made trait and the config values at both moments', () => {
    const { engine, world } = setupTestEngine();
    engine.installStory(new MinimalTestStory());
    expect(findStoryInfoTrait(world)).toBeDefined();
    expect(storyInfo(world).description).toBe('A minimal story for testing basic engine functionality');

    engine.start();
    expect(storyInfo(world).description).toBe('A minimal story for testing basic engine functionality');
    expect(storyInfo(world).buildDate ?? '').toBe('');
  });
});
