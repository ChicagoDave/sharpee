/**
 * region-forest.test.ts — ADR-236 Phase 5 elegance-parity fixture (AC-7):
 * the "weather over a set of outdoor rooms" pattern dungeo's forest daemon
 * hand-rolls in TS (hardcoded room-ID Set + name heuristic) expressed
 * entirely as `region` + `containing` + a region-owned chance-gated daemon
 * + both crossing reactions. This test proves the fixture LOADS and FIRES
 * (REAL-PATH: real compile, real loader world, real goingAction movement)
 * — migrating dungeo itself stays post-launch story work (ADR-236 D8,
 * explicitly out of scope here).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { goingAction } from '@sharpee/stdlib';
import { Direction, DirectionType, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory, SchedulerDaemon } from '../src';

const FIXTURE = readFileSync(
  join(__dirname, '..', '..', 'chord', 'tests', 'fixtures', 'region-forest.story'),
  'utf8',
);

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

const messageIdsOf = (events: ISemanticEvent[]) =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter(Boolean);

describe('region-forest elegance-parity fixture (ADR-236 AC-7, REAL-PATH)', () => {
  let story: ChordStory;
  let world: WorldModel;
  let daemons: SchedulerDaemon[];
  let turn: number;

  const go = (direction: DirectionType): string[] => {
    const player = world.getPlayer()!;
    const currentLocation =
      world.getContainingRoom(player.id) ?? world.getEntity(world.getLocation(player.id)!)!;
    const context: any = {
      world,
      player,
      action: goingAction,
      currentLocation,
      command: { parsed: { extras: { direction } } },
      sharedData: {},
      event: (type: string, data: Record<string, unknown>): ISemanticEvent =>
        ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }) as ISemanticEvent,
    };
    const validation = goingAction.validate(context);
    expect(validation.valid, JSON.stringify(validation)).toBe(true);
    context.validationResult = validation;
    goingAction.execute(context);
    const reported = goingAction.report(context);
    return messageIdsOf(reported.flatMap((e) => story.runtime.fireEventClauses(world, e))) as string[];
  };

  const tick = (): string[] => {
    turn += 1;
    const events: ISemanticEvent[] = [];
    for (const daemon of daemons) {
      const ctx = { world, turn };
      if (daemon.condition && !daemon.condition(ctx)) continue;
      events.push(...daemon.run(ctx));
    }
    return messageIdsOf(events) as string[];
  };

  beforeEach(() => {
    story = createStory(compileSource(FIXTURE), { seed: 7 });
    world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    world.setPlayer(player.id);
    daemons = story.runtime.buildSchedulerDaemons();
    turn = 0;
  });

  it('the whole dungeo forest-weather pattern loads from region + containing + one daemon', () => {
    expect(go(Direction.WEST)).toEqual(['forest-gloom']); // House → Canyon View: crossing in

    // Chance-gated birdsong (canonical MDL probability, seeded evaluator):
    // walking the forest long enough hears the bird; outside it, never.
    const forestSongs: string[] = [];
    for (let i = 0; i < 24; i++) forestSongs.push(...tick());
    expect(forestSongs).toContain('forest-birdsong');

    expect(go(Direction.EAST)).toEqual(['open-sky']); // back out: crossing out
    const fieldSongs: string[] = [];
    for (let i = 0; i < 24; i++) fieldSongs.push(...tick());
    expect(fieldSongs).toEqual([]); // no hardcoded room set, no name heuristic — just membership
  });
});
