/**
 * select-ids.test.ts — ADR-289 D2: compiler-assigned select identity.
 *
 * Purpose: pin the id shape, the bare-digits reservation the sweep depends on,
 * per-composing-entity keying for trait clauses, the rogue-IR backstop, and
 * the load-time sweep of the retired line-number key space.
 *
 * Public interface: none — a test module. Owner context:
 * `@sharpee/story-loader`.
 */
import { describe, expect, it } from 'vitest';
import { compile, IR_FORMAT, type IRStatement, type StoryIR } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import {
  assertSelectIds,
  createStory,
  LoadError,
  selectOccurrenceKey,
  sweepRetiredSelectKeys,
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
  scenery, readable
  in the Lab

  A stone tablet.

  on reading it
    select cycling
      phrase one
        One.
    or
      phrase two
        Two.
    end select
  end on

define trait chimed
  on pushing it
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
  scenery, pushable, chimed
  in the Lab

  A bronze bell.

create the gong
  scenery, pushable, chimed
  in the Lab

  A brass gong.

create the player
  starts in the Lab

  You.
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

describe('ADR-289 D2 — compiler-assigned select ids', () => {
  it('IR_FORMAT is `story language 2`', () => {
    expect(IR_FORMAT).toBe('story language 2');
    expect(compiled().format).toBe('story language 2');
  });

  it('names owner, clause and statement path', () => {
    const ids = selectIds(compiled());
    // <owner>.<clauseKind>-<action>-<clauseIndex>.<statement-path>
    expect(ids).toContain('tablet.on-reading-0.0');
    expect(ids).toContain('trait.chimed.on-pushing-0.0');
  });

  it('every id is unique', () => {
    const ids = selectIds(compiled());
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // The bare-digits reservation is the discriminator the sweep depends on
  // FOREVER. The argument that owner-plus-clause-key can never be all digits
  // is sound — the clause key always contains letters — but an argument is not
  // an invariant, and this is two lines.
  it('no id is ever bare digits (the sweep’s discriminator)', () => {
    for (const id of selectIds(compiled())) {
      expect(id, `id ${id} would collide with the retired line-number space`).not.toMatch(/^\d+$/);
    }
  });

  it('a trait select counts per composing entity', () => {
    const id = 'trait.chimed.on-pushing-0.0';
    expect(selectOccurrenceKey(id, 'bell')).toBe(`${CHORD_SELECT_PREFIX}${id}.bell`);
    expect(selectOccurrenceKey(id, 'gong')).toBe(`${CHORD_SELECT_PREFIX}${id}.gong`);
    expect(selectOccurrenceKey(id, 'bell')).not.toBe(selectOccurrenceKey(id, 'gong'));
  });

  it('the compiler id is a strict prefix of every per-owner key', () => {
    // So tooling and sweeps can address "all counters for this statement".
    const id = 'trait.chimed.on-pushing-0.0';
    expect(selectOccurrenceKey(id, 'bell').startsWith(selectOccurrenceKey(id))).toBe(true);
  });
});

describe('ADR-289 D2 — rogue-IR backstop (ADR-276 two-layer)', () => {
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

  it('createStory refuses the same IR — the gate is on the real load path', () => {
    const ir = compiled();
    const clause = ir.entities.find((e) => e.id === 'tablet')!.onClauses[0];
    delete (clause.body.find((s) => s.kind === 'select-strategy') as { id?: string }).id;
    expect(() => createStory(ir)).toThrow(LoadError);
  });

  it('does NOT fall back to a line number', () => {
    // A fallback would silently restore the colliding key space D2 replaced.
    const ir = compiled();
    const select = ir.entities.find((e) => e.id === 'tablet')!.onClauses[0].body.find(
      (s) => s.kind === 'select-strategy',
    )!;
    delete (select as { id?: string }).id;
    expect(() => assertSelectIds(ir)).toThrow();
  });
});

describe('ADR-289 D2 — the retired key sweep', () => {
  function loadedWorld() {
    const story = createStory(compiled());
    const world = new WorldModel();
    story.initializeWorld(world);
    world.setPlayer(story.createPlayer(world).id);
    return { story, world };
  }

  it('removes bare-digit keys on load', () => {
    const story = createStory(compiled());
    const world = new WorldModel();
    world.setStateValue('chord.occurrence.select.40', 3);
    world.setStateValue('chord.occurrence.select.117', 1);
    story.initializeWorld(world);

    expect(world.getStateValue('chord.occurrence.select.40')).toBeUndefined();
    expect(world.getStateValue('chord.occurrence.select.117')).toBeUndefined();
  });

  it('leaves the NEW key space alone — the glob-sweep trap', () => {
    // A `chord.occurrence.select.*` glob would delete these. That is the
    // BLOCKER the first adr-review caught, pinned here so it cannot return.
    const { world } = loadedWorld();
    const live = selectOccurrenceKey('tablet.on-reading-0.0');
    const traitLive = selectOccurrenceKey('trait.chimed.on-pushing-0.0', 'bell');
    world.setStateValue(live, 5);
    world.setStateValue(traitLive, 2);

    expect(sweepRetiredSelectKeys(world)).toBe(0);
    expect(world.getStateValue(live)).toBe(5);
    expect(world.getStateValue(traitLive)).toBe(2);
  });

  it('leaves other chord.occurrence keys alone', () => {
    const { world } = loadedWorld();
    world.setStateValue('chord.occurrence.on.tablet.reading', 4);
    world.setStateValue('chord.occurrence.topic.kettle.0', 1);

    expect(sweepRetiredSelectKeys(world)).toBe(0);
    expect(world.getStateValue('chord.occurrence.on.tablet.reading')).toBe(4);
    expect(world.getStateValue('chord.occurrence.topic.kettle.0')).toBe(1);
  });

  it('is idempotent and reports what it removed', () => {
    const { world } = loadedWorld();
    world.setStateValue('chord.occurrence.select.40', 3);
    expect(sweepRetiredSelectKeys(world)).toBe(1);
    expect(sweepRetiredSelectKeys(world)).toBe(0);
  });

  // AC4 / AC5. The sweep must also run on RESTORE: restored state arrives
  // wholesale from the save snapshot, so a load-only sweep would never see
  // the keys it exists to remove. `ChordStory.onWorldRestored` is what the
  // engine calls (ADR-289 D2); the engine-side ordering contract is pinned
  // in @sharpee/engine's on-world-restored.test.ts.
  it('AC4: a pre-D2 save restores with no bare-digit key surviving', () => {
    const { story, world } = loadedWorld();
    // Simulate the restored snapshot: pre-D2 counters, mid-sequence.
    world.setStateValue('chord.occurrence.select.40', 3);
    world.setStateValue('chord.occurrence.select.117', 7);

    story.onWorldRestored(world);

    expect(world.getStateValue('chord.occurrence.select.40')).toBeUndefined();
    expect(world.getStateValue('chord.occurrence.select.117')).toBeUndefined();
  });

  it('AC4: the select resumes from its first alternative after that restore', () => {
    const { story, world } = loadedWorld();
    world.setStateValue('chord.occurrence.select.40', 3);
    story.onWorldRestored(world);

    // Nothing under the NEW key, so the next firing starts the cycle over.
    expect(world.getStateValue(selectOccurrenceKey('tablet.on-reading-0.0'))).toBeUndefined();
  });

  it('AC5: a post-D2 save round-trips its counters intact', () => {
    const { story, world } = loadedWorld();
    const live = selectOccurrenceKey('tablet.on-reading-0.0');
    const traitLive = selectOccurrenceKey('trait.chimed.on-pushing-0.0', 'bell');
    // A cycling select mid-sequence, as a real save would carry it.
    world.setStateValue(live, 3);
    world.setStateValue(traitLive, 1);

    story.onWorldRestored(world);

    // Untouched — proving the sweep did not match the new key space.
    expect(world.getStateValue(live)).toBe(3);
    expect(world.getStateValue(traitLive)).toBe(1);
  });
});
