/**
 * door-elegance.test.ts — ADR-234 Phase 5 elegance-parity demo
 * (door-vignette.story): the classic IF locked-door-and-key beat authored
 * in ONE exit line + one door block. The `through` tail carries the whole
 * relationship (pair, direction, inferred reverse); `lockable with the
 * iron key` (R3 keyless) makes it a locked-door puzzle with zero extra
 * lines (D4 kind-scoped default). REAL-PATH: the full take → unlock →
 * open → walk-through beat drives real stdlib actions against the loaded
 * world, asserting world state at every step — the demo IS the smoke.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { goingAction, openingAction, takingAction, unlockingAction } from '@sharpee/stdlib';
import {
  Direction,
  IFEntity,
  LockableTrait,
  OpenableTrait,
  TraitType,
  WorldModel,
} from '@sharpee/world-model';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ChordStory, createStory } from '../src';

const FIXTURE = readFileSync(
  join(__dirname, '..', '..', 'chord', 'tests', 'fixtures', 'door-vignette.story'),
  'utf8',
);

describe('locked-door-and-key vignette (ADR-234 elegance parity)', () => {
  it('take key → unlock → open → walk through, all real actions on the loaded world', () => {
    const result = compile(FIXTURE);
    expect(result.diagnostics).toEqual([]);
    const story: ChordStory = createStory(result.ir as StoryIR);
    const world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    world.setPlayer(player.id);

    const byId = (irId: string): IFEntity => world.getEntity(story.entityId(irId)!)!;
    const door = byId('study-door');
    const key = byId('iron-key');

    const drive = (action: any, command: Record<string, unknown>) => {
      const context: any = {
        world,
        player,
        action,
        currentLocation: world.getContainingRoom(player.id)!,
        command,
        sharedData: {},
        requireScope: (target: IFEntity) =>
          world.getInScope(player.id).some((e) => e.id === target.id)
            ? { ok: true }
            : { ok: false, error: { valid: false, error: 'not_in_scope' } },
        event: (type: string, data: Record<string, unknown>): ISemanticEvent =>
          ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }) as ISemanticEvent,
      };
      const validation = action.validate(context);
      context.validationResult = validation;
      if (validation.valid) {
        action.execute(context);
        action.report(context);
      }
      return validation;
    };

    // The one-line relationship loaded locked (D4) — north is a puzzle.
    expect((door.get(TraitType.LOCKABLE) as LockableTrait).isLocked).toBe(true);
    expect(drive(goingAction, { parsed: { extras: { direction: Direction.NORTH } } }).error).toBe('door_locked');

    // The classic beat, every step a real stdlib action + state assertion.
    expect(drive(takingAction, { parsed: { structure: {} }, directObject: { entity: key } }).valid).toBe(true);
    expect(world.getLocation(key.id)).toBe(player.id);

    expect(drive(unlockingAction, {
      directObject: { entity: door },
      indirectObject: { entity: key },
      preposition: 'with',
    }).valid).toBe(true);
    expect((door.get(TraitType.LOCKABLE) as LockableTrait).isLocked).toBe(false);

    expect(drive(openingAction, { directObject: { entity: door } }).valid).toBe(true);
    expect((door.get(TraitType.OPENABLE) as OpenableTrait).isOpen).toBe(true);

    expect(drive(goingAction, { parsed: { extras: { direction: Direction.NORTH } } }).valid).toBe(true);
    expect(world.getContainingRoom(player.id)?.id).toBe(story.entityId('study'));
  });
});
