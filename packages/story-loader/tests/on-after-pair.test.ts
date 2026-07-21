/**
 * on-after-pair.test.ts — ratchet D3's `on`/`after` pair on the SAME owner
 * and gerund BOTH fire (regression for the arm-shadowing defect: first-match
 * routing silently killed whichever clause was declared second). Shapes are
 * the two real casualties from Fernhill Phase 7: an `on`-text + `after`-state
 * pair (the diary shape) and an `on`-refusal + `after`-award pair (the
 * boiler shape), plus the trait-registration variant (last-wins overwrite)
 * and the capability-pair legible refusal.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { createStory, LoadError } from '../src';

const SOURCE = `story "Pairs" by "T"
  id: pairs
  version: 0.0.1

create the Shrine
  a room

  A quiet shrine.

create the tablet
  scenery, readable
  in the Shrine
  states: whole, studied

  A stone tablet.

  on reading it
    phrase tablet-text
      The letters bite deep: REMEMBER.
  end on

  after reading it, once
    change it to studied
    phrase tablet-after
      Something in the words stays with you.
  end after

create the bell
  scenery
  in the Shrine
  states: silent, rung

  A bronze bell.

create the player
  starts in the Shrine

  You.

define trait chimed
  on pushing it
    phrase bell-swings
      The bell swings.
  end on

  after pushing it, once
    change it to rung
    phrase bell-echo
      The echo hangs on.
  end after
end trait
`;

const TRAIT_SOURCE = SOURCE.replace(`create the bell
  scenery
  in the Shrine
  states: silent, rung`, `create the bell
  scenery, pushable, chimed
  in the Shrine
  states: silent, rung`);

function load(source: string) {
  const result = compile(source);
  expect(result.diagnostics).toEqual([]);
  const story = createStory(result.ir);
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, player };
}

/** Drive a target's REAL registered interceptor through all four hooks. */
function fire(cw: ReturnType<typeof load>, irId: string, actionId: string) {
  const target = cw.world.getEntity(cw.story.entityId(irId)!)!;
  const lookup = cw.world.getInterceptorForAction(target, actionId)!;
  const data = {};
  const veto = lookup.interceptor.preValidate?.(target, cw.world, cw.player.id, data) ?? null;
  lookup.interceptor.postValidate?.(target, cw.world, cw.player.id, data);
  lookup.interceptor.postExecute?.(target, cw.world, cw.player.id, data);
  const report = lookup.interceptor.postReport?.(target, cw.world, cw.player.id, data) ?? {};
  return { veto, report };
}

describe('D3 pair on one ENTITY owner: both clauses fire', () => {
  it("the `on` override AND the `after` mutation+append both land (the diary shape)", () => {
    const cw = load(SOURCE);
    const { report } = fire(cw, 'tablet', 'if.action.reading');

    // The `on` clause owns the primary message…
    expect(report.override?.messageId).toBe('tablet.tablet-text');
    // …the `after` clause's mutation actually happened…
    expect(cw.world.getStateValue('chord.state.tablet')).toBe('studied');
    // …and its phrase APPENDED (D3), not vanished.
    expect(report.emit?.some((e) => String((e.payload as any).messageId).includes('tablet-after'))).toBe(true);
  });

  it('the `, once` on the after half is independent of the on half', () => {
    const cw = load(SOURCE);
    fire(cw, 'tablet', 'if.action.reading');
    const second = fire(cw, 'tablet', 'if.action.reading');
    // on-text still overrides every read; the once-after appended only once.
    expect(second.report.override?.messageId).toBe('tablet.tablet-text');
    expect(second.report.emit ?? []).toHaveLength(0);
  });
});

describe('D3 pair in a TRAIT: merged registration, no last-wins overwrite', () => {
  it('both trait clauses fire through the one registered interceptor', () => {
    const cw = load(TRAIT_SOURCE);
    const { report } = fire(cw, 'bell', 'if.action.pushing');
    expect(report.override?.messageId).toBe('bell-swings');
    expect(cw.world.getStateValue('chord.state.bell')).toBe('rung');
    expect(report.emit?.some((e) => String((e.payload as any).messageId).includes('bell-echo'))).toBe(true);
  });
});

describe('capability pair: refused legibly, never silently overwritten', () => {
  it('two trait clauses on one dispatch action throw a LoadError naming the merge fix', () => {
    const source = SOURCE.replace(`define trait chimed
  on pushing it`, `define action ringing
  grammar
    ring :target
  the target must be reachable
  otherwise refuse cant-ring

  phrases en-US
    cant-ring:
      You can't ring that.

define trait chimed
  on ringing it`).replace('after pushing it, once', 'after ringing it, once')
      .replace(`create the bell
  scenery
  in the Shrine`, `create the bell
  scenery, chimed
  in the Shrine`);
    const result = compile(source);
    expect(result.diagnostics).toEqual([]);
    const story = createStory(result.ir);
    let err: unknown;
    try {
      story.initializeWorld(new WorldModel());
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(LoadError);
    expect(String(err)).toMatch(/one behavior per \(trait, action\)/);
  });
});
