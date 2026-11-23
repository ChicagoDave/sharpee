/**
 * room-routes.test.ts — the lens's route planner (ADR-408 D3, Amendment 1)
 * on the test story `test-stories/lodge`, compiled by the real compiler and
 * read by world-index's real `deriveReach`.
 *
 * The lodge's Hall has two guarded ways: west to the Study, blocked while the
 * warden is watchful, and north to the Vault, blocked while the valve is shut.
 * Neither is open at the start, so a route reaches the Porch, the Hall and
 * the Pantry, and the Study and the Vault are unrouted with reach's reasons.
 *
 * Owner context: @sharpee/branch-tester — the lenses.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { deriveReach } from '@sharpee/world-index';
import { planRoomRoutes } from '../src/lens/room-routes.js';

const testStories = process.env.SHARPEE_TEST_STORIES;
const LODGE = testStories ? resolve(testStories, 'lodge/lodge.story') : undefined;

function compileStory(storyFile: string): StoryIR {
  const result = compile(readFileSync(storyFile, 'utf8'));
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}

const describeWithLodge = LODGE && existsSync(LODGE) ? describe : describe.skip;

describeWithLodge('planRoomRoutes on the lodge', () => {
  const ir = LODGE && existsSync(LODGE) ? compileStory(LODGE) : undefined;
  const nameOf = (id: string) => ir!.entities.find((entity) => entity.id === id)?.name ?? id;

  it('routes the opening room first with no moves, then each open room by its shortest route', () => {
    const plan = planRoomRoutes(ir!, deriveReach(ir!));
    expect(nameOf(plan.start!)).toBe('Porch');
    expect(plan.routes.map((route) => [nameOf(route.roomId), route.steps.map((step) => step.command)])).toEqual([
      ['Porch', []],
      ['Hall', ['north']],
      ['Pantry', ['north', 'east']],
    ]);
  });

  it('leaves each room behind a guarded way unrouted, naming the way and what opening it takes', () => {
    const reach = deriveReach(ir!);
    const plan = planRoomRoutes(ir!, reach);
    expect(plan.unrouted.map((room) => nameOf(room.roomId)).sort()).toEqual(['Study', 'Vault']);
    for (const room of plan.unrouted) {
      const guard = reach.lifted.find((edge) => edge.to === room.roomId)!;
      expect(guard).toBeDefined();
      expect(room.reason).toBe(`the ${guard.direction} way from Hall is ${guard.obstacle === 'lock' ? 'locked' : 'guarded'} until the player deals with ${guard.requires.map(nameOf).join(', ')}`);
    }
  });

  it('a room past a shut way names the room it lies beyond', () => {
    const reach = deriveReach(ir!);
    // Shut the way into the Hall from the Porch as well: then every room past
    // the Hall lies beyond it.
    const porchToHall = { from: plan0().start!, to: ir!.entities.find((entity) => entity.name === 'Hall')!.id, direction: 'north', obstacle: 'gate' as const, reason: 'a test guard' };
    const plan = planRoomRoutes(ir!, { ...reach, blocked: [...reach.blocked, porchToHall] });
    const pantry = plan.unrouted.find((room) => nameOf(room.roomId) === 'Pantry')!;
    expect(pantry.reason).toBe('it lies beyond Hall, and the north way from Porch stays shut: a test guard');
  });

  /** The lodge's plan with nothing changed. */
  function plan0() { return planRoomRoutes(ir!, deriveReach(ir!)); }

  it('with every guard lifted out of the reach result, every room is routed', () => {
    const reach = deriveReach(ir!);
    const plan = planRoomRoutes(ir!, { ...reach, blocked: [], lifted: [] });
    expect(plan.unrouted).toEqual([]);
    expect(plan.routes.map((route) => nameOf(route.roomId)).sort()).toEqual(['Hall', 'Pantry', 'Porch', 'Study', 'Vault']);
  });

  it('a story that places no player routes nothing and names why for every room', () => {
    // world-index reads the start room off the player's placement (`startRoomOf`); take every placement away.
    const unplaced: StoryIR = { ...ir!, entities: ir!.entities.map((entity) => ({ ...entity, placement: undefined })) };
    const plan = planRoomRoutes(unplaced, deriveReach(unplaced));
    expect(plan.start).toBeUndefined();
    expect(plan.routes).toEqual([]);
    expect(plan.unrouted.length).toBe(5);
    expect(plan.unrouted.every((room) => room.reason === 'the story places no player in a room')).toBe(true);
  });
});
