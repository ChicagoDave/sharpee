/**
 * The opening banner's platform-version line renders for every story.
 *
 * `start()` used to read the engine version off `StoryInfoTrait`, which only a
 * build pipeline populates — so a story whose loader never stamps one (every
 * Chord/`story-loader` story) emitted `game.started` with no `engineVersion`,
 * and `handleGameStarted` dropped the `platform-version` block entirely. The
 * engine now reports its own stamped constant, which no story can be wrong about.
 *
 * Owner context: `@sharpee/engine` — story start and the `game.started` event.
 */

import { describe, it, expect } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { ENGINE_VERSION } from '@sharpee/stdlib';
import { StoryInfoTrait, TraitType } from '@sharpee/world-model';
import { setupTestEngineWithStory } from '../test-helpers/setup-test-engine';
import { handleGameStarted } from '../../src/prose-pipeline/handlers/game';
import { makeContext } from '../prose-pipeline/test-helpers';

/** Start the engine and return the `game.started` event it emitted. */
function startAndCaptureBanner(engine: ReturnType<typeof setupTestEngineWithStory>['engine']): ISemanticEvent {
  const emitted: ISemanticEvent[] = [];
  engine.on('event', (event) => emitted.push(event));
  engine.start();
  const started = emitted.find((e) => e.type === 'game.started');
  expect(started, 'start() emitted no game.started event').toBeDefined();
  return started!;
}

describe('the opening banner reports the running engine, not the story', () => {
  it('carries the stamped engine version for a story that populates no StoryInfoTrait', () => {
    const { engine, world } = setupTestEngineWithStory();
    // The precondition that made this fail before: nothing stamped a version.
    const trait = world.findByTrait(TraitType.STORY_INFO)[0]?.get(StoryInfoTrait);
    expect(trait?.engineVersion).toBeUndefined();

    const started = startAndCaptureBanner(engine);

    expect((started.data as { engineVersion?: string }).engineVersion).toBe(ENGINE_VERSION);
  });

  it('renders the platform-version block from that event, rather than dropping it', () => {
    const { engine } = setupTestEngineWithStory();

    const started = startAndCaptureBanner(engine);
    const blocks = handleGameStarted(started, makeContext());

    const platform = blocks.find((b) => b.className === 'platform-version');
    expect(platform, 'the banner dropped its platform-version line').toBeDefined();
    expect(platform!.content).toEqual([`Sharpee v${ENGINE_VERSION}`]);
  });
});
