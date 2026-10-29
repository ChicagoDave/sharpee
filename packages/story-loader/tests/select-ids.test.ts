/**
 * select-ids.test.ts — compiler-assigned select identity (ADR-289 D2, re-shaped
 * by ADR-388 D2) and the loader's identity backstops.
 *
 * Purpose: pin the select id shape under a clause (the clause's id plus the
 * select's index among its body's selects), the never-bare-digits property,
 * per-composing-entity keying for trait clauses, the rogue-IR backstops for
 * id-less clauses and selects (ADR-388 AC-8), and that a restore leaves live
 * counters untouched now that no sweep runs (ADR-388 D6).
 *
 * Public interface: none — a test module. Owner context:
 * `@sharpee/story-loader`.
 */
import { describe, expect, it } from 'vitest';
import { compile, IR_FORMAT, type IRStatement, type StoryIR } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import {
  assertClauseIds,
  assertSelectIds,
  createStory,
  LoadError,
  selectOccurrenceKey,
  CHORD_SELECT_PREFIX,
} from '../src';

const SOURCE = `story
  title: Select Ids
  authors:
    Sharpee Platform
  id: select-ids
  story-version: 0.0.1

create the Lab
  a room

  A bare lab.

create the tablet
  a thing, scenery, readable
  in the Lab

  A stone tablet.

  on the player reading
    select cycling
      phrase one
        One.
    or
      phrase two
        Two.
    end select
  end on

define trait chimed
  on the player pushing
    select cycling
      phrase ring
        A ring.
    or
      phrase clang
        A clang.
    end select
  end on
end trait

create the bell
  a thing, scenery, pushable, chimed
  in the Lab

  A bronze bell.

create the gong
  a thing, scenery, pushable, chimed
  in the Lab

  A brass gong.

create Alex
  a person
  playable
  starts in the Lab

  You.

before the game starts
  change the player to Alex
end before

`;

function compiled(): StoryIR {
  const result = compile(SOURCE);
  expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return result.ir;
}

/** Every select-strategy id in a compiled story, in walk order. */
function selectIds(ir: StoryIR): string[] {
  const ids: string[] = [];
  const walk = (body: IRStatement[]): void => {
    for (const stmt of body) {
      switch (stmt.kind) {
        case 'select-strategy':
          ids.push(stmt.id);
          stmt.alternatives.forEach(walk);
          break;
        case 'select-on':
          stmt.arms.forEach((a) => walk(a.body));
          break;
        case 'ordinal':
        case 'each':
          walk(stmt.body);
          break;
        default:
          break;
      }
    }
  };
  ir.story.onClauses.forEach((c) => walk(c.body));
  ir.entities.forEach((e) => {
    e.onClauses.forEach((c) => walk(c.body));
    e.topics.forEach((r) => walk(r.body));
  });
  ir.traits.forEach((t) => t.onClauses.forEach((c) => walk(c.body)));
  ir.actions.forEach((a) => walk(a.body));
  ir.sequences.forEach((s) => s.steps.forEach((step) => walk(step.body)));
  ir.machines.forEach((m) =>
    m.states.forEach((s) => {
      walk(s.onEnter);
      walk(s.onExit);
    }),
  );
  return ids;
}

describe('ADR-289 D2 / ADR-388 D2 — compiler-assigned select ids', () => {
  it('IR_FORMAT is `story language 6`', () => {
    expect(IR_FORMAT).toBe('story language 6');
    expect(compiled().format).toBe('story language 6');
  });

  it('names the clause by its head and the select by its index among the body\'s selects', () => {
    const ids = selectIds(compiled());
    // <clause-id>.select#<k>
    expect(ids).toContain('tablet.on-reading-by-player.select#1');
    expect(ids).toContain('trait.chimed.on-pushing-by-player.select#1');
  });

  it('every id is unique', () => {
    const ids = selectIds(compiled());
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no id is ever bare digits', () => {
    for (const id of selectIds(compiled())) {
      expect(id).not.toMatch(/^\d+$/);
    }
  });

  it('a trait select counts per composing entity', () => {
    const id = 'trait.chimed.on-pushing-by-player.select#1';
    expect(selectOccurrenceKey(id, 'bell')).toBe(`${CHORD_SELECT_PREFIX}${id}.bell`);
    expect(selectOccurrenceKey(id, 'gong')).toBe(`${CHORD_SELECT_PREFIX}${id}.gong`);
    expect(selectOccurrenceKey(id, 'bell')).not.toBe(selectOccurrenceKey(id, 'gong'));
  });

  it('the compiler id is a strict prefix of every per-owner key', () => {
    // So tooling can address "all counters for this statement".
    const id = 'trait.chimed.on-pushing-by-player.select#1';
    expect(selectOccurrenceKey(id, 'bell').startsWith(selectOccurrenceKey(id))).toBe(true);
  });
});

describe('ADR-388 AC-8 — rogue-IR backstops (ADR-276 two-layer)', () => {
  it('an id-less select raises a LoadError naming the compiler gate', () => {
    const ir = compiled();
    const clause = ir.entities.find((e) => e.id === 'tablet')!.onClauses[0];
    const select = clause.body.find((s) => s.kind === 'select-strategy')!;
    delete (select as { id?: string }).id;

    let err: unknown;
    try {
      assertSelectIds(ir);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(LoadError);
    expect(String(err)).toMatch(/no compiler-assigned id/);
    expect(String(err)).toMatch(/ADR-289 D2/);
  });

  it('an id-less clause raises a LoadError naming the compiler gate', () => {
    const ir = compiled();
    const clause = ir.traits.find((t) => t.name === 'chimed')!.onClauses[0];
    delete (clause as { id?: string }).id;

    let err: unknown;
    try {
      assertClauseIds(ir);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(LoadError);
    expect(String(err)).toMatch(/on pushing.*trait chimed.*no compiler-assigned id/);
    expect(String(err)).toMatch(/ADR-388 D2/);
  });

  it('createStory refuses an id-less select on the real load path', () => {
    const ir = compiled();
    const clause = ir.entities.find((e) => e.id === 'tablet')!.onClauses[0];
    delete (clause.body.find((s) => s.kind === 'select-strategy') as { id?: string }).id;
    expect(() => createStory(ir)).toThrow(LoadError);
  });

  it('createStory refuses an id-less entity clause on the real load path', () => {
    const ir = compiled();
    delete (ir.entities.find((e) => e.id === 'tablet')!.onClauses[0] as { id?: string }).id;
    expect(() => createStory(ir)).toThrow(/tablet.*no compiler-assigned id/);
  });

  it('createStory refuses an id-less trait clause on the real load path', () => {
    const ir = compiled();
    delete (ir.traits.find((t) => t.name === 'chimed')!.onClauses[0] as { id?: string }).id;
    expect(() => createStory(ir)).toThrow(/trait chimed.*no compiler-assigned id/);
  });

  it('does NOT fall back to a position or a line number', () => {
    // A fallback would silently restore the drifting key space these decisions replaced.
    const ir = compiled();
    const select = ir.entities.find((e) => e.id === 'tablet')!.onClauses[0].body.find(
      (s) => s.kind === 'select-strategy',
    )!;
    delete (select as { id?: string }).id;
    expect(() => assertSelectIds(ir)).toThrow();
  });
});

describe('ADR-388 D6 — a restore leaves live counters untouched; no sweep runs', () => {
  function loadedWorld() {
    const story = createStory(compiled());
    const world = new WorldModel();
    story.initializeWorld(world);
    world.setPlayer(story.createPlayer(world).id);
    return { story, world };
  }

  it('a save round-trips its select counters intact through onWorldRestored', () => {
    const { story, world } = loadedWorld();
    const live = selectOccurrenceKey('tablet.on-reading-by-player.select#1');
    const traitLive = selectOccurrenceKey('trait.chimed.on-pushing-by-player.select#1', 'bell');
    // A cycling select mid-sequence, as a real save would carry it.
    world.setStateValue(live, 3);
    world.setStateValue(traitLive, 1);

    story.onWorldRestored(world, 7);

    expect(world.getStateValue(live)).toBe(3);
    expect(world.getStateValue(traitLive)).toBe(1);
  });

  it('a key of a shape the loader no longer writes is left for the reconciler, not swept here', () => {
    // ADR-388 D6: the retired-key sweep is gone with its key space; D5's
    // reconciler is the one mechanism that drops orphans, and it is not this hook.
    const { story, world } = loadedWorld();
    world.setStateValue('chord.occurrence.select.40', 3);
    story.onWorldRestored(world, 7);
    expect(world.getStateValue('chord.occurrence.select.40')).toBe(3);
  });
});
