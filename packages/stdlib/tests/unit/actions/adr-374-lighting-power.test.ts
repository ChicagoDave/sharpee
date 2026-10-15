/**
 * Tests for ADR-374 D9 and D10 — lighting and putting out a light, and a
 * device powered by what is inside it.
 *
 * Behavior Statement (lighting / extinguishing):
 *   DOES    a flame light: lighting sets LightSourceTrait.isLit true (with
 *           `lit_in_darkness` and the room's description when it lifts the
 *           actor's darkness); extinguishing sets it false (with
 *           `extinguished_into_darkness` when the room goes dark). A
 *           switchable light is handed to switching on / off: the switch
 *           changes, and switching's hooks run.
 *   REJECTS not a light source (not_light_source); already lit / not lit;
 *           out of fuel (no_fuel); a declared tool missing or not held
 *           (needs_tool, tool_not_held); for a switchable light, switching's
 *           own refusal in switching's words (switching_on.no_power). isLit
 *           and isOn unchanged on every refusal.
 *
 * Behavior Statement (power, D10):
 *   DOES    a device with power sources has power exactly while every one
 *           is inside it; a powered light gives light only then, so taking
 *           the battery out darkens the room with the switch still on.
 *   REJECTS switching on with no power (no_power), isOn unchanged.
 */

import { describe, test, expect } from 'vitest';
import {
  WorldModel,
  ContainerTrait,
  LightSourceTrait,
  LightSourceBehavior,
  RoomTrait,
  SwitchableTrait,
  SwitchableBehavior,
  VisibilityBehavior,
  TraitType,
  type IFEntity
} from '@sharpee/world-model';
import { lightingAction } from '../../../src/actions/standard/lighting';
import { extinguishingAction } from '../../../src/actions/standard/extinguishing';
import { switchingOnAction } from '../../../src/actions/standard/switching_on';
import { IFActions } from '../../../src/actions/constants';
import type { Action } from '../../../src/actions/enhanced-types';
import { runValidatePhase, runExecutePhase, runReportPhase, runBlockedPhase } from '../../../src/actions/lifecycle/phase-runner';
import { createRealTestContext, createCommand, setupBasicWorld, TEST_MARKER_TRAIT } from '../../test-utils';

type Command = ReturnType<typeof createCommand>;

/** Drive the four phases as the executor does. */
function drive(action: Action, world: WorldModel, command: Command) {
  const context = createRealTestContext(action, world, command);
  const validation = runValidatePhase(action, context);
  (context as any).validationResult = validation;
  if (!validation.valid) return { validation, events: runBlockedPhase(action, context, validation) };
  runExecutePhase(action, context);
  return { validation, events: runReportPhase(action, context) };
}

const messageIds = (events: { data?: unknown }[]) =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter(Boolean);

const light = (entity: IFEntity) => entity.get(TraitType.LIGHT_SOURCE) as LightSourceTrait;
const switchOf = (entity: IFEntity) => entity.get(TraitType.SWITCHABLE) as SwitchableTrait;

/** A dark cellar with a lantern (a flame, lit with the match) and a torch (switchable, battery-powered). */
function cellar() {
  const { world, player, room } = setupBasicWorld();
  room.add(new RoomTrait({ requiresLight: true }));
  const match = world.createEntity('match', 'object');
  const lantern = world.createEntity('lantern', 'object');
  const battery = world.createEntity('battery', 'object');
  const torch = world.createEntity('torch', 'object');
  lantern.add(new LightSourceTrait({ isLit: false, toolId: match.id }));
  torch.add(new LightSourceTrait());
  torch.add(new ContainerTrait());
  torch.add(new SwitchableTrait({ powerSourceIds: [battery.id] }));
  world.moveEntity(lantern.id, player.id);
  world.moveEntity(torch.id, player.id);
  world.moveEntity(battery.id, player.id);
  world.moveEntity(match.id, room.id);
  return { world, player, room, match, lantern, battery, torch };
}

describe('lighting a flame (ADR-374 D9)', () => {
  test('refuses without its tool held, isLit unchanged', () => {
    const { world, lantern } = cellar();
    const { validation } = drive(lightingAction, world, createCommand(IFActions.LIGHTING, { entity: lantern }));
    expect(validation).toMatchObject({ valid: false, error: 'needs_tool' });
    expect(light(lantern).isLit).toBe(false);
  });

  test('lights with the tool held, the darkness lifts, and the room is described', () => {
    const { world, player, room, match, lantern } = cellar();
    world.moveEntity(match.id, player.id);
    expect(VisibilityBehavior.isDarkFor(player, room, world)).toBe(true);
    const { validation, events } = drive(lightingAction, world, createCommand(IFActions.LIGHTING, { entity: lantern }));
    expect(validation.valid).toBe(true);
    expect(light(lantern).isLit).toBe(true);
    expect(VisibilityBehavior.isDarkFor(player, room, world)).toBe(false);
    expect(messageIds(events)).toContain(`${IFActions.LIGHTING}.lit_in_darkness`);
    expect(events.some((e) => e.type === 'if.event.room.description')).toBe(true);
  });

  test('refuses a lit light and a thing that is not a light', () => {
    const { world, player, match, lantern } = cellar();
    world.moveEntity(match.id, player.id);
    drive(lightingAction, world, createCommand(IFActions.LIGHTING, { entity: lantern }));
    expect(drive(lightingAction, world, createCommand(IFActions.LIGHTING, { entity: lantern })).validation).toMatchObject({ error: 'already_lit' });
    expect(drive(lightingAction, world, createCommand(IFActions.LIGHTING, { entity: match })).validation).toMatchObject({ error: 'not_light_source' });
  });

  test('refuses a light with no fuel', () => {
    const { world, player, match, lantern } = cellar();
    world.moveEntity(match.id, player.id);
    light(lantern).fuelRemaining = 0;
    expect(drive(lightingAction, world, createCommand(IFActions.LIGHTING, { entity: lantern })).validation).toMatchObject({ error: 'no_fuel' });
    expect(light(lantern).isLit).toBe(false);
  });

  test('putting it out darkens the room and says so', () => {
    const { world, player, room, match, lantern } = cellar();
    world.moveEntity(match.id, player.id);
    drive(lightingAction, world, createCommand(IFActions.LIGHTING, { entity: lantern }));
    const { events } = drive(extinguishingAction, world, createCommand(IFActions.EXTINGUISHING, { entity: lantern }));
    expect(light(lantern).isLit).toBe(false);
    expect(VisibilityBehavior.isDarkFor(player, room, world)).toBe(true);
    expect(messageIds(events)).toContain(`${IFActions.EXTINGUISHING}.extinguished_into_darkness`);
    expect(drive(extinguishingAction, world, createCommand(IFActions.EXTINGUISHING, { entity: lantern })).validation).toMatchObject({ error: 'not_lit' });
  });
});

describe('a switchable light is switched (ADR-374 D9 delegation)', () => {
  test('lighting a torch with no battery refuses in switching on\'s words', () => {
    const { world, torch } = cellar();
    const { validation, events } = drive(lightingAction, world, createCommand(IFActions.LIGHTING, { entity: torch }));
    expect(validation).toMatchObject({ valid: false, error: `${IFActions.SWITCHING_ON}.no_power`, errorQualified: true });
    expect(messageIds(events)).toContain(`${IFActions.SWITCHING_ON}.no_power`);
    expect(switchOf(torch).isOn).toBe(false);
  });

  test('lighting a powered torch switches it on, and switching on\'s hooks run', () => {
    const { world, battery, torch } = cellar();
    world.moveEntity(battery.id, torch.id);
    torch.add({ type: TEST_MARKER_TRAIT } as any);
    let switchingHooks = 0;
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.SWITCHING_ON, { postExecute() { switchingHooks++; } });
    drive(lightingAction, world, createCommand(IFActions.LIGHTING, { entity: torch }));
    expect(switchOf(torch).isOn).toBe(true);
    expect(switchingHooks).toBe(1);
  });

  test('putting out a torch switches it off', () => {
    const { world, battery, torch } = cellar();
    world.moveEntity(battery.id, torch.id);
    drive(switchingOnAction, world, createCommand(IFActions.SWITCHING_ON, { entity: torch }));
    drive(extinguishingAction, world, createCommand(IFActions.EXTINGUISHING, { entity: torch }));
    expect(switchOf(torch).isOn).toBe(false);
  });
});

describe('power is what is inside it (ADR-374 D10)', () => {
  test('declaring power sources requires power', () => {
    const { torch } = cellar();
    expect(switchOf(torch).requiresPower).toBe(true);
  });

  test('switching on with the battery outside refuses no_power, isOn unchanged', () => {
    const { world, torch } = cellar();
    const { validation } = drive(switchingOnAction, world, createCommand(IFActions.SWITCHING_ON, { entity: torch }));
    expect(validation).toMatchObject({ valid: false, error: 'no_power' });
    expect(switchOf(torch).isOn).toBe(false);
  });

  test('taking the battery out darkens the room with the switch still on; putting it back lights it', () => {
    const { world, player, room, battery, torch } = cellar();
    world.moveEntity(battery.id, torch.id);
    drive(switchingOnAction, world, createCommand(IFActions.SWITCHING_ON, { entity: torch }));
    expect(VisibilityBehavior.isDarkFor(player, room, world)).toBe(false);
    world.moveEntity(battery.id, player.id);
    expect(SwitchableBehavior.hasPower(torch, world)).toBe(false);
    expect(switchOf(torch).isOn).toBe(true);
    expect(LightSourceBehavior.givesLight(torch, world)).toBe(false);
    expect(VisibilityBehavior.isDarkFor(player, room, world)).toBe(true);
    world.moveEntity(battery.id, torch.id);
    expect(VisibilityBehavior.isDarkFor(player, room, world)).toBe(false);
  });

  test('a device without declared sources keeps its own flag', () => {
    const { world } = cellar();
    const radio = world.createEntity('radio', 'object');
    radio.add(new SwitchableTrait({ requiresPower: true, hasPower: false }));
    expect(SwitchableBehavior.hasPower(radio, world)).toBe(false);
    switchOf(radio).hasPower = true;
    expect(SwitchableBehavior.hasPower(radio, world)).toBe(true);
  });
});
