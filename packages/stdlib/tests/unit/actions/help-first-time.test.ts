/**
 * Help action — first-time vs general tracking (gameMeta capability).
 *
 * The help action records `helpRequested: true` in the world's gameMeta
 * capability on execute; the first invocation renders
 * if.action.help.first_time, subsequent invocations render
 * if.action.help.general. The flag lives in capability data so it
 * serializes with the world (survives save/restore).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { helpAction } from '../../../src/actions/standard/help/help';
import { IFActions } from '../../../src/actions/constants';
import { ActionContext } from '../../../src/actions/enhanced-types';
import { WorldModel, StandardCapabilities } from '@sharpee/world-model';
import { createRealTestContext, setupBasicWorld, createCommand } from '../../test-utils';

function runHelp(world: WorldModel): ReturnType<typeof helpAction.report> {
  const command = createCommand(IFActions.HELP, { verb: 'help' });
  const context = createRealTestContext(helpAction, world, command);
  helpAction.validate(context);
  helpAction.execute(context);
  return helpAction.report!(context);
}

describe('help action — first-time tracking', () => {
  let world: WorldModel;

  beforeEach(() => {
    const setup = setupBasicWorld();
    world = setup.world;
  });

  it('should render first_time on the first invocation and set the gameMeta flag', () => {
    // PRECONDITION: flag not set (setupBasicWorld registers gameMeta with
    // its schema defaults; helpRequested is not among them)
    expect(world.getCapability(StandardCapabilities.GAME_META)?.helpRequested).toBeFalsy();

    const events = runHelp(world);

    expect(events).toHaveLength(1);
    expect(events[0].data.messageId).toBe('if.action.help.first_time');

    // POSTCONDITION — the mutation: flag persisted in world capability data
    expect(world.getCapability(StandardCapabilities.GAME_META)?.helpRequested).toBe(true);
  });

  it('should render general on subsequent invocations (same world)', () => {
    runHelp(world);
    const second = runHelp(world);

    expect(second).toHaveLength(1);
    expect(second[0].data.messageId).toBe('if.action.help.general');
  });

  it('should not clobber other gameMeta fields when recording the flag', () => {
    // registerCapability is register-once, so seed via updateCapability
    world.updateCapability(StandardCapabilities.GAME_META, { someOtherField: 'kept' });

    runHelp(world);

    const meta = world.getCapability(StandardCapabilities.GAME_META);
    expect(meta?.helpRequested).toBe(true);
    expect(meta?.someOtherField).toBe('kept');
  });
});
