/**
 * engine-version-single-source.test.ts — every engine-version banner read site
 * reports the stamped platform constant, whatever the world says.
 *
 * The engine version is the running engine's own fact. It used to travel from a
 * build tool, through a stamped `version.ts`, a generated entry, `storyInfo`, and
 * `StoryInfoTrait`, before an action read it back — a route on which a tool could
 * (and did) disagree with the engine about which engine was running, and on which
 * a story that populated no trait reported nothing at all.
 *
 * Owner context: @sharpee/stdlib — meta actions and the info channel.
 */

import { describe, it, expect } from 'vitest';
import { aboutAction } from '../../../src/actions/standard/about/about';
import { versionAction, ENGINE_VERSION } from '../../../src/actions/standard/version/version';
import { IFActions } from '../../../src/actions/constants';
import { infoChannel } from '../../../src/channels/standard';
import { EntityType, StoryInfoTrait, WorldModel } from '@sharpee/world-model';
import { createRealTestContext, setupBasicWorld, createCommand } from '../../test-utils';

/** Put a story-info entity in the world carrying exactly the given trait data. */
function withStoryInfo(world: WorldModel, data: Record<string, unknown>): void {
  const entity = world.createEntity('Story Info', EntityType.OBJECT);
  entity.add(new StoryInfoTrait(data as ConstructorParameters<typeof StoryInfoTrait>[0]));
}

/** Report an action against a world, returning the first event's params. */
function reportParams(action: typeof aboutAction, world: WorldModel, actionId: string): Record<string, unknown> {
  const context = createRealTestContext(action, world, createCommand(actionId, { verb: actionId }));
  const events = action.report!(context);
  return (events[0].data as { params: Record<string, unknown> }).params;
}

describe('the engine-version banner has one source: the stamped constant', () => {
  it('the version action reports it when the world carries no story-info trait at all', () => {
    const { world } = setupBasicWorld();

    const params = reportParams(versionAction, world, IFActions.VERSION);

    expect(params.engineVersion).toBe(ENGINE_VERSION);
  });

  it('the about action reports it when the world carries no story-info trait at all', () => {
    const { world } = setupBasicWorld();

    const params = reportParams(aboutAction, world, IFActions.ABOUT);

    expect(params.engineVersion).toBe(ENGINE_VERSION);
  });

  it('a stale stamped engineVersion on the trait does not override the running engine', () => {
    const { world } = setupBasicWorld();
    // The exact defect: an author build stamped the major-line floor, so the
    // story told the player 5.0.0 while the engine was 5.4.0.
    withStoryInfo(world, { title: 'Fernhill', version: '0.3.0', engineVersion: '5.0.0' });

    expect(reportParams(versionAction, world, IFActions.VERSION).engineVersion).toBe(ENGINE_VERSION);
    expect(reportParams(aboutAction, world, IFActions.ABOUT).engineVersion).toBe(ENGINE_VERSION);
  });

  it('the story-owned fields still come from the trait — only the engine version is seized', () => {
    const { world } = setupBasicWorld();
    withStoryInfo(world, { title: 'Fernhill', version: '0.3.0', engineVersion: '5.0.0' });

    const params = reportParams(versionAction, world, IFActions.VERSION);

    expect(params.storyTitle).toBe('Fernhill');
    expect(params.storyVersion).toBe('0.3.0');
  });

  it('the info channel always carries it, even when the capability has none', () => {
    const capability: Record<string, unknown> = { title: 'Fernhill', version: '0.3.0' };
    const ctx = {
      world: { getCapability: (id: string) => (id === 'storyInfo' ? capability : undefined) },
    } as unknown as Parameters<typeof infoChannel.produce>[0];

    const payload = infoChannel.produce(ctx) as { engineVersion?: string; title?: string };

    expect(payload.engineVersion).toBe(ENGINE_VERSION);
    expect(payload.title).toBe('Fernhill');
  });
});
