/**
 * The engine version reaches the event stream, and never the story's banner.
 *
 * `start()` reports the engine's own stamped constant on `game.started` rather
 * than reading a build pipeline's stamp off `StoryInfoTrait` — no story can be
 * wrong about which engine is running it.
 *
 * The banner deliberately does not render it. It is the story's own first
 * screen, and an engine version there is the tool naming itself inside someone's
 * fiction with no way for an author to decline (David, 2026-09-11). A player or
 * tester who needs it types `version`, which reports the same constant.
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

describe('the engine reports its own version, and keeps it out of the banner', () => {
  it('carries the stamped engine version on game.started, with no trait stamp present', () => {
    const { engine, world } = setupTestEngineWithStory();
    // The precondition: nothing stamped a version onto the world.
    const trait = world.findByTrait(TraitType.STORY_INFO)[0]?.get(StoryInfoTrait);
    expect((trait as unknown as { engineVersion?: string })?.engineVersion).toBeUndefined();

    const started = startAndCaptureBanner(engine);

    expect((started.data as { engineVersion?: string }).engineVersion).toBe(ENGINE_VERSION);
  });

  it('renders no platform-version line, even though the event carries the version', () => {
    const { engine } = setupTestEngineWithStory();

    const started = startAndCaptureBanner(engine);
    // The event does carry it — so this asserts a rendering decision, not an
    // absent input. Without the version in hand the test would prove nothing.
    expect((started.data as { engineVersion?: string }).engineVersion).toBe(ENGINE_VERSION);

    const blocks = handleGameStarted(started, makeContext());

    expect(blocks.some((b) => b.className === 'platform-version')).toBe(false);
    expect(JSON.stringify(blocks)).not.toContain('Sharpee v');
  });
});
