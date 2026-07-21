/**
 * Opening action — ADR-230 D3b: author-configurable tool requirement and
 * the tool interceptor slot.
 *
 * Mirrors the ADR-229 R2 key-slot pinning pattern (locking-interceptor.test.ts):
 * tool hook fires on an explicit tool with seeded target context, tool-side
 * preValidate veto blocks the open (state asserted), target → tool
 * consultation order pinned, no consultation when the command names no tool.
 * Plus the validateToolRequirements contract: no_tool / tool_not_held /
 * wrong_tool refusals and the no-requirement-ignores-tool rule — every
 * assertion checks OpenableTrait.isOpen, not just events.
 */

import { describe, test, expect } from 'vitest';
import { openingAction } from '../../../src/actions/standard/opening';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, OpenableTrait } from '@sharpee/world-model';
import {
  createRealTestContext,
  createCommand,
  setupBasicWorld,
  TEST_MARKER_TRAIT,
  SECOND_TEST_MARKER_TRAIT,
} from '../../test-utils';

const setup = (toolRequired: boolean) => {
  const { world, player, room } = setupBasicWorld();
  const crowbar = world.createEntity('rusty crowbar', 'object');
  const crate = world.createEntity('nailed crate', 'object');
  crate.add({
    type: TraitType.OPENABLE,
    isOpen: false,
    ...(toolRequired ? { toolId: crowbar.id } : {})
  });
  // Inert marker trait — the target-side interceptor registration key.
  crate.add({ type: TEST_MARKER_TRAIT } as any);
  world.moveEntity(crate.id, room.id);
  world.moveEntity(crowbar.id, player.id);
  return { world, player, room, crate, crowbar };
};

const drive = (world: WorldModel, crate: any, tool?: any) => {
  const context = createRealTestContext(
    openingAction,
    world,
    createCommand(IFActions.OPENING, {
      entity: crate,
      ...(tool ? { secondEntity: tool, preposition: 'with' } : {})
    })
  );
  const validation = openingAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: openingAction.blocked(context, validation) };
  }
  openingAction.execute(context);
  return { context, validation, events: openingAction.report(context) };
};

const isOpen = (crate: any) => (crate.get(TraitType.OPENABLE) as OpenableTrait).isOpen;

describe('Opening tool requirement (ADR-230 D3b)', () => {
  test('correct tool opens the target — isOpen flips', () => {
    const { world, crate, crowbar } = setup(true);

    const { validation } = drive(world, crate, crowbar);

    expect(validation.valid).toBe(true);
    // THE state assertion: actually open.
    expect(isOpen(crate)).toBe(true);
  });

  test('requirement + no tool named refuses with no_tool — stays closed', () => {
    const { world, crate } = setup(true);

    const { validation } = drive(world, crate);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('no_tool');
    expect(isOpen(crate)).toBe(false);
  });

  test('tool not held refuses with tool_not_held — stays closed', () => {
    const { world, room, crate, crowbar } = setup(true);
    world.moveEntity(crowbar.id, room.id); // on the floor, not in hand

    const { validation } = drive(world, crate, crowbar);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('tool_not_held');
    expect(isOpen(crate)).toBe(false);
  });

  test('wrong tool refuses with wrong_tool — stays closed', () => {
    const { world, player, crate } = setup(true);
    const spoon = world.createEntity('silver spoon', 'object');
    world.moveEntity(spoon.id, player.id);

    const { validation } = drive(world, crate, spoon);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('wrong_tool');
    expect(isOpen(crate)).toBe(false);
  });

  test('no requirement: an offered tool is ignored and the open succeeds', () => {
    const { world, player, crate } = setup(false);
    const spoon = world.createEntity('silver spoon', 'object');
    world.moveEntity(spoon.id, player.id);

    const { validation } = drive(world, crate, spoon);

    expect(validation.valid).toBe(true);
    expect(isOpen(crate)).toBe(true);
  });
});

describe('Tool slot (ADR-230 D3b, R2 template)', () => {
  test('explicit tool is consulted after the target, with seeded context', () => {
    const { world, crate, crowbar } = setup(true);
    // Inert marker trait (second, distinct) — the tool-slot registration key.
    crowbar.add({ type: SECOND_TEST_MARKER_TRAIT } as any);

    const fired: string[] = [];
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.OPENING, {
      postExecute(entity: any, _w: any, _a: any, data: any) {
        fired.push('target');
        expect(entity.id).toBe(crate.id);
        expect(data.toolId).toBe(crowbar.id); // symmetric seedData
      },
    });
    world.registerActionInterceptor(SECOND_TEST_MARKER_TRAIT, IFActions.OPENING, {
      postExecute(entity: any, _w: any, _a: any, data: any) {
        fired.push('tool');
        expect(entity.id).toBe(crowbar.id);
        expect(data.targetId).toBe(crate.id); // tool consultation sees the target
      },
    });

    drive(world, crate, crowbar);

    // Published order (D3-B): target first, tool second.
    expect(fired).toEqual(['target', 'tool']);
    // And the consultation rode a real successful open, not a decoupled stub.
    expect(isOpen(crate)).toBe(true);
  });

  test('a tool-side preValidate veto blocks the open — target stays closed', () => {
    const { world, crate, crowbar } = setup(true);
    // Inert marker trait (second, distinct) — the tool-slot registration key.
    crowbar.add({ type: SECOND_TEST_MARKER_TRAIT } as any);
    world.registerActionInterceptor(SECOND_TEST_MARKER_TRAIT, IFActions.OPENING, {
      preValidate() {
        return { valid: false, error: 'test.crowbar_too_bent' };
      },
    });

    const { validation } = drive(world, crate, crowbar);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.crowbar_too_bent');
    // THE state assertion: still closed.
    expect(isOpen(crate)).toBe(false);
  });

  test('no tool named: the tool slot is not consulted', () => {
    const { world, player, crate } = setup(false); // no requirement, OPEN CRATE is valid bare
    const crowbar = world.createEntity('rusty crowbar', 'object');
    // Inert marker trait (second, distinct) — the tool-slot registration key.
    crowbar.add({ type: SECOND_TEST_MARKER_TRAIT } as any);
    world.moveEntity(crowbar.id, player.id);

    let toolConsulted = false;
    world.registerActionInterceptor(SECOND_TEST_MARKER_TRAIT, IFActions.OPENING, {
      preValidate() {
        toolConsulted = true;
        return null;
      },
    });

    const { validation } = drive(world, crate);

    expect(validation.valid).toBe(true);
    expect(toolConsulted).toBe(false);
    expect(isOpen(crate)).toBe(true);
  });
});
