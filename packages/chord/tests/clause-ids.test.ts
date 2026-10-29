/**
 * clause-ids.test.ts — ADR-388 AC-3: clause and select ids are head-derived,
 * unique, prefix-stable, never bare digits, and byte-identical across
 * compiles; and AC-2's compiler half: inserting a clause or a non-select
 * statement ahead of another re-keys nothing.
 *
 * Behavior Statement — `assignClauseIds` / `assignSelectIds`
 *   DOES: writes `id` on every `on`/`after` clause of a root as
 *         `<owner>.<head>[#n]`, and on every `select-strategy` under it as
 *         `<clause-id>.select#<k>`.
 *   WHEN: the analyzer has built a root's whole clause list.
 *   BECAUSE: a persisted counter keyed by position drifts when the author
 *            edits the list (ADR-388 D1); a head is a name.
 *   REJECTS WHEN: never — identical heads are legal and numbered (Q-3).
 *
 * Public interface: none — a test module. Owner context: `@sharpee/chord`.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import { clauseHeadId, clauseHeadWordsOf, clauseOrdinalOf, spokenClauseHead } from '../src/clause-ids';
import type { IROnClause, IRStatement, StoryIR } from '../src/ir';

const HEADER = `story
  title: Ids
  authors:
    T
  id: ids
  story-version: 0.0.1

  on every turn
    phrase hum
  end on

  on every turn while the lamp is lit
    phrase hum
  end on

define phrases en-US
  one:
    One.
  two:
    Two.
  hum:
    Hum.

define sound bell

define trait glowing
  on the player rubbing
    phrase one
  end on
end trait

create the Hall
  a room

  A hall.

  after the player entering, once
    phrase one
  end after

  after the player entering while the lamp is lit
    phrase two
  end after

create the lamp
  a thing, glowing
  in the Hall
  states: dim, lit

  A lamp.

`;

const ROUNDS = (middle = '') => `${HEADER}create the troll
  a person, listener
  in the Hall

  A troll.

  on the player attacking
    select cycling
      phrase one
    or
      phrase two
    end select
  end on
${middle}
  on going
    phrase hum
  end on

  after hearing the bell
    phrase hum
  end after

  on every turn while the lamp is lit
    phrase one
  end on

  on every turn while the lamp is dim
    select stopping
      phrase one
    or
      phrase two
    end select
  end on

create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before
`;

function ir(source: string): StoryIR {
  const result = compile(source);
  expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return result.ir;
}

function clausesOf(story: StoryIR, id: string): IROnClause[] {
  return story.entities.find((e) => e.id === id)!.onClauses;
}

function selectIds(body: IRStatement[]): string[] {
  const out: string[] = [];
  const walk = (list: IRStatement[]): void => {
    for (const s of list) {
      if (s.kind === 'select-strategy') {
        out.push(s.id);
        s.alternatives.forEach(walk);
      } else if (s.kind === 'select-on') s.arms.forEach((a) => walk(a.body));
      else if (s.kind === 'ordinal' || s.kind === 'each') walk(s.body);
    }
  };
  walk(body);
  return out;
}

function allClauses(story: StoryIR): IROnClause[] {
  return [...story.story.onClauses, ...story.entities.flatMap((e) => e.onClauses), ...story.traits.flatMap((t) => t.onClauses)];
}

describe('ADR-388 AC-3 — head-derived clause ids', () => {
  it('a unique head carries no number; the actor, a bare self head, a sound and every-turn each spell their part', () => {
    const troll = clausesOf(ir(ROUNDS()), 'troll').map((c) => c.id);
    expect(troll).toEqual([
      'troll.on-attacking-by-player',
      'troll.on-going',
      'troll.after-hearing-bell',
      'troll.on-every-turn#1',
      'troll.on-every-turn#2',
    ]);
  });

  it('identical heads differing only by `, once` or a guard are numbered in source order', () => {
    const hall = clausesOf(ir(ROUNDS()), 'hall').map((c) => c.id);
    expect(hall).toEqual(['hall.after-entering-by-player#1', 'hall.after-entering-by-player#2']);
    expect(clauseOrdinalOf(hall[1])).toBe(2);
    expect(clauseOrdinalOf('troll.on-going')).toBeUndefined();
  });

  it('the story\'s own clauses are keyed under `story`, numbered when identical', () => {
    expect(ir(ROUNDS()).story.onClauses.map((c) => c.id)).toEqual(['story.on-every-turn#1', 'story.on-every-turn#2']);
  });

  it("a trait's clause id begins with `trait.<name>`", () => {
    expect(ir(ROUNDS()).traits.find((t) => t.name === 'glowing')!.onClauses[0].id).toBe('trait.glowing.on-rubbing-by-player');
  });

  it('a select id is its clause id plus its index among the body\'s selects', () => {
    const troll = clausesOf(ir(ROUNDS()), 'troll');
    expect(selectIds(troll[0].body)).toEqual(['troll.on-attacking-by-player.select#1']);
    expect(selectIds(troll[4].body)).toEqual(['troll.on-every-turn#2.select#1']);
  });

  it('every id is unique, none is bare digits, and two compiles agree byte for byte', () => {
    const first = allClauses(ir(ROUNDS()));
    const second = allClauses(ir(ROUNDS()));
    const ids = first.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).not.toMatch(/^\d+$/);
    expect(first.map((c) => [c.id, selectIds(c.body)])).toEqual(second.map((c) => [c.id, selectIds(c.body)]));
  });

  it('AC-2, compiler half: a clause inserted ahead re-keys nothing but a numbered twin', () => {
    const before = clausesOf(ir(ROUNDS()), 'troll').map((c) => c.id);
    const after = clausesOf(ir(ROUNDS('  on the player examining\n    phrase hum\n  end on\n')), 'troll').map((c) => c.id);
    expect(after).toEqual([before[0], 'troll.on-examining-by-player', ...before.slice(1)]);
  });

  it('AC-2, compiler half: a statement that is not a select, inserted ahead of a select, re-keys it not at all', () => {
    const padded = ROUNDS().replace('  on the player attacking\n    select cycling', '  on the player attacking\n    phrase hum\n    select cycling');
    expect(selectIds(clausesOf(ir(padded), 'troll')[0].body)).toEqual(['troll.on-attacking-by-player.select#1']);
  });

  it('the spoken head is the id with its separators spoken (D7), and the id composes from the words', () => {
    const [attacking, going, hearing, turn1] = clausesOf(ir(ROUNDS()), 'troll');
    expect(spokenClauseHead(clauseHeadWordsOf(attacking))).toBe('on attacking by player');
    expect(spokenClauseHead(clauseHeadWordsOf(going))).toBe('on going');
    expect(spokenClauseHead(clauseHeadWordsOf(hearing))).toBe('after hearing bell');
    expect(spokenClauseHead(clauseHeadWordsOf(turn1), 1)).toBe('on every-turn #1');
    expect(clauseHeadId({ clauseKind: 'on', action: 'throwing', actor: 'player', role: 'target', counterpart: 'rock' })).toBe('on-throwing-by-player-as-target-with-rock');
    expect(clauseHeadId({ clauseKind: 'on', action: 'setting', actor: 'player', valueTail: 'titan' }, 2)).toBe('on-setting-by-player-to-titan#2');
  });
});
