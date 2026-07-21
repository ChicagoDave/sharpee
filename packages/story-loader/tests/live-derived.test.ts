/**
 * live-derived.test.ts — ADR-240 AC-2/AC-3/AC-5: derived state answers
 * LIVE. A chord `change` (story-state mutation with NO platform event —
 * exactly the class the deleted eleven-event trigger list could never
 * cover) flips a `dark while` room and a state-conditioned blocked exit
 * at the very next read; the recompute mechanism is GONE from the
 * runtime's surface; registration is per-world and re-registration is
 * idempotent.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { exitBlockedKey, exitMessageKey } from '@sharpee/stdlib';
import { Direction, TraitType, VisibilityBehavior, WorldModel, darkKey } from '@sharpee/world-model';
import { createStory } from '../src';

const SOURCE = `story "Nightfall" by "T"
  id: nightfall
  version: 0.0.1
  states: day, night

create the Terrace
  a room
  dark while night
  north to the Garden
  north is blocked while night: gate-chained

  A stone terrace.

create the Garden
  a room
  south to the Terrace

  A walled garden.

create the sundial
  scenery
  in the Terrace

  A brass sundial.

  on pushing it
    change the story to night
  end on

create the player
  starts in the Terrace

  You.

define phrase gate-chained
  The garden gate is chained for the night.
end phrase
`;

function load() {
  const result = compile(SOURCE);
  expect(result.diagnostics).toEqual([]);
  const story = createStory(result.ir);
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, player };
}

/** Run the sundial's real registered interceptor (mutation phase). */
function pushSundial({ story, world, player }: ReturnType<typeof load>): void {
  const sundial = world.getEntity(story.entityId('sundial')!)!;
  const lookup = world.getInterceptorForAction(sundial, 'if.action.pushing')!;
  const data = {};
  lookup.interceptor.postValidate!(sundial, world, player.id, data);
  lookup.interceptor.postExecute!(sundial, world, player.id, data);
}

describe('AC-2: a chord `change` flips derived state at the NEXT READ — no event, no recompute', () => {
  it('dark-while-story-state and blocked-while-story-state both answer live', () => {
    const cw = load();
    const terrace = cw.world.getEntity(cw.story.entityId('terrace')!)!;
    const terraceId = terrace.id;

    // Day: lit, gate open.
    expect(cw.world.evaluate(darkKey(terraceId))).toBe(false);
    expect(VisibilityBehavior.isDark(terrace, cw.world)).toBe(false);
    expect(cw.world.evaluate(exitBlockedKey(terraceId, Direction.NORTH))).toBe(false);

    // The mutation: a chord `change the story to night` through the REAL
    // registered interceptor. No platform event fires anywhere.
    pushSundial(cw);

    // Night: the very next reads see current truth.
    expect(cw.world.evaluate(darkKey(terraceId))).toBe(true);
    expect(VisibilityBehavior.isDark(terrace, cw.world)).toBe(true);
    expect(cw.world.evaluate(exitBlockedKey(terraceId, Direction.NORTH))).toBe(true);
    expect(cw.world.evaluate(exitMessageKey(terraceId, Direction.NORTH))).toContain('chained for the night');
  });
});

describe('AC-3: the recompute mechanism is deleted, not extended', () => {
  it('the runtime exposes no recomputeDerived and chains no chord.derived triggers', () => {
    const cw = load();
    expect((cw.story as unknown as { runtime: Record<string, unknown> }).runtime.recomputeDerived).toBeUndefined();
  });
});

describe('AC-5: registration is per-world; re-loading re-registers cleanly', () => {
  it('two worlds from the same story hold independent live registrations', () => {
    const a = load();
    const b = load();
    pushSundial(a);
    expect(a.world.evaluate(darkKey(a.world.getEntity(a.story.entityId('terrace')!)!.id))).toBe(true);
    // World B is untouched — its own evaluators, its own state.
    expect(b.world.evaluate(darkKey(b.world.getEntity(b.story.entityId('terrace')!)!.id))).toBe(false);
  });
});
