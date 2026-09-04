/**
 * adr-327-phase3.test.ts — D9 + D10, the compile half.
 *
 * The player stops being a block and becomes a ROLE a named character holds:
 * `playable` marks who may hold it, `before the game starts` says who does,
 * and `change the player to <character>` is the one statement that assigns it
 * — at load and mid-play alike. This file pins the grammar, the gates, and the
 * wire shape; the runtime half (the switch itself, the D9 role gate on
 * autonomous behaviour) is `story-loader`'s `adr-327-phase3-role.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { compile, IR_FORMAT, type StoryIR } from '../src';

const HEADER = 'story\n  title: T\n  authors:\n    N\n  id: t\n  story-version: 0.0.1\n\n';
const ROOM = 'create the Hall\n  a room\n\n  A hall.\n\n';
const START = 'before the game starts\n  change the player to Alex\nend before\n';
const ALEX = 'create Alex\n  a person\n  playable\n  in the Hall\n\n  You.\n\n';

const errorsOf = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error' && d.code !== 'analysis.missing-ifid');
const codesOf = (source: string) => errorsOf(source).map((d) => d.code);
const ok = (source: string): StoryIR => {
  const result = compile(source);
  const errors = errorsOf(source);
  if (errors.length) throw new Error(errors.map((d) => `${d.code}: ${d.message}`).join('\n'));
  return result.ir;
};
const story = (body: string) => `${HEADER}${ROOM}${body}`;
const whole = (body = '') => story(`${ALEX}${body}${START}`);

describe('D10 — `playable` marks who may hold the role', () => {
  it('composes on a person and rides the IR as isPlayable', () => {
    const ir = ok(whole());
    const alex = ir.entities.find((e) => e.id === 'alex')!;
    expect(alex.isPlayable).toBe(true);
    // The word is consumed as a reserved composition: it never reaches the
    // trait census, so it is not among the entity's composed traits.
    expect(alex.traits.map((t) => t.name)).not.toContain('playable');
  });

  it('a person without it is not playable', () => {
    const ir = ok(whole('create Jack\n  a person\n  in the Hall\n\n  A man.\n\n'));
    expect(ir.entities.find((e) => e.id === 'jack')!.isPlayable).toBe(false);
  });

  it('`playable` off a person is analysis.playable-non-person', () => {
    const codes = codesOf(story(`create the crate\n  a container\n  playable\n  in the Hall\n\n  A crate.\n\n${ALEX}${START}`));
    expect(codes).toContain('analysis.playable-non-person');
  });

  it('an NPC behavior adjective composes on a playable character (D9 drives them off-role)', () => {
    expect(errorsOf(story(`create Alex\n  a person, wanderer\n  playable\n  in the Hall\n\n  You.\n\n${START}`))).toEqual([]);
  });

  it('character declaration lines compose on a playable character', () => {
    expect(errorsOf(story(`create Alex\n  a person\n  playable\n  mood calm\n  in the Hall\n\n  You.\n\n${START}`))).toEqual([]);
  });
});

describe('D10 — the start block', () => {
  it('parses at top level and lowers its body into the IR', () => {
    const ir = ok(whole());
    expect(ir.startBlock).not.toBeNull();
    expect(ir.startBlock!.body).toMatchObject([{ kind: 'change-player', entity: { kind: 'entity', id: 'alex' } }]);
  });

  it('a story with no start block is analysis.start-block-missing', () => {
    expect(codesOf(story(ALEX))).toEqual(['analysis.start-block-missing']);
  });

  it('a start block that never assigns the role is analysis.start-block-no-role', () => {
    const codes = codesOf(story(`${ALEX}before the game starts\n  change the Hall to lit\nend before\n`));
    expect(codes).toContain('analysis.start-block-no-role');
  });

  it('a second start block is analysis.duplicate-start-block', () => {
    expect(codesOf(whole() + '\n' + START)).toContain('analysis.duplicate-start-block');
  });

  it('`phrase` inside the block is analysis.start-block-narration, pointing at prologue:', () => {
    const errors = errorsOf(
      story(`${ALEX}define phrase opening\n  A cold night.\nend phrase\n\nbefore the game starts\n  phrase opening\n  change the player to Alex\nend before\n`),
    );
    expect(errors.map((d) => d.code)).toEqual(['analysis.start-block-narration']);
    expect(errors[0].message).toContain('prologue:');
  });

  it('a conditional role assignment compiles — which arm fires is a run-time fact', () => {
    const ir = ok(
      story(`${ALEX}create Jack\n  a person\n  playable\n  in the Hall\n\n  A man.\n\nbefore the game starts\n  change the player to Jack when the Hall is lit\n  change the player to Alex\nend before\n`),
    );
    expect(ir.startBlock!.body).toHaveLength(2);
    expect(ir.startBlock!.body[0]).toMatchObject({ kind: 'change-player' });
  });

  it('a malformed head is parse.start-block', () => {
    expect(codesOf(story(`${ALEX}before the game begins\n  change the player to Alex\nend before\n`))).toContain(
      'parse.start-block',
    );
  });

  it('an unterminated block is parse.unterminated-block', () => {
    expect(codesOf(story(`${ALEX}before the game starts\n  change the player to Alex\n`))).toContain(
      'parse.unterminated-block',
    );
  });
});

describe('D10 — `create the player` is removed', () => {
  it('reports parse.removed-create-player with the D10 fix-it', () => {
    const errors = errorsOf(story('create the player\n  in the Hall\n\n  You.\n\n'));
    const removed = errors.find((d) => d.code === 'parse.removed-create-player')!;
    expect(removed).toBeDefined();
    expect(removed.message).toContain('playable');
    expect(removed.message).toContain('before the game starts');
  });
});

describe('D9 — `change the player to <character>`', () => {
  it('takes a multi-word name, which the plain `change` statement could not', () => {
    const ir = ok(
      story(`create Jack Toresal\n  a person\n  playable\n  in the Hall\n\n  A man.\n\n${ALEX}before the game starts\n  change the player to Jack Toresal\nend before\n`),
    );
    expect(ir.startBlock!.body[0]).toMatchObject({ kind: 'change-player', entity: { kind: 'entity', id: 'jack-toresal' } });
  });

  it('lowers inside an ordinary clause body, `when` tail intact', () => {
    const ir = ok(
      whole(`create Jack\n  a person\n  playable\n  in the Hall\n\n  A man.\n\ncreate the lever\n  in the Hall\n\n  A lever.\n\n  on the player pulling\n    change the player to Jack when the Hall is lit\n  end on\n\n`),
    );
    const clause = ir.entities.find((e) => e.id === 'lever')!.onClauses[0];
    expect(clause.body[0]).toMatchObject({ kind: 'change-player', entity: { kind: 'entity', id: 'jack' } });
    expect((clause.body[0] as { stmtWhen?: unknown }).stmtWhen).toBeTruthy();
  });

  it('a non-playable target is analysis.player-target-not-playable', () => {
    const codes = codesOf(
      whole('create Jack\n  a person\n  in the Hall\n\n  A man.\n\ncreate the lever\n  in the Hall\n\n  A lever.\n\n  on the player pulling\n    change the player to Jack\n  end on\n\n'),
    );
    expect(codes).toContain('analysis.player-target-not-playable');
  });

  it('a non-person target is analysis.player-target-not-person', () => {
    const codes = codesOf(
      whole('create the crate\n  a container\n  in the Hall\n\n  A crate.\n\ncreate the lever\n  in the Hall\n\n  A lever.\n\n  on the player pulling\n    change the player to the crate\n  end on\n\n'),
    );
    expect(codes).toContain('analysis.player-target-not-person');
  });

  it('an unresolved target rides the standard unknown-entity gate, and only that', () => {
    const codes = codesOf(
      whole('create the lever\n  in the Hall\n\n  A lever.\n\n  on the player pulling\n    change the player to Mirabel\n  end on\n\n'),
    );
    expect(codes).toContain('analysis.unknown-entity');
    expect(codes).not.toContain('analysis.player-target-not-person');
  });

  it('`change <entity> to <state>` still reads as a state change', () => {
    const ir = ok(
      whole('create the lamp\n  in the Hall\n  states: lit, dark\n\n  A lamp.\n\n  on the player pulling\n    change the lamp to dark\n  end on\n\n'),
    );
    expect(ir.entities.find((e) => e.id === 'lamp')!.onClauses[0].body[0]).toMatchObject({
      kind: 'change',
      state: 'dark',
    });
  });
});

describe('D10 — the wire shape', () => {
  it('stamps story language 4 and drops isPlayer', () => {
    const ir = ok(whole());
    expect(ir.format).toBe('story language 4');
    expect(ir.format).toBe(IR_FORMAT);
    expect(ir.entities.every((e) => !('isPlayer' in e))).toBe(true);
  });

  it('`the player` in a clause head is still the ROLE, resolved at fire time', () => {
    const ir = ok(
      whole(
        'create the sword\n  in the Hall\n\n  A sword.\n\n  on the player taking\n    refuse nope\n  end on\n\ndefine phrases en-US\n  nope:\n    Not yours.\n\n',
      ),
    );
    expect(ir.entities.find((e) => e.id === 'sword')!.onClauses[0].actor).toEqual({ kind: 'player' });
  });
});
