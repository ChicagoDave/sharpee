/**
 * movement-clauses.test.ts — ADR-325 D3h–D3i (GH #308) compiler half: the
 * player's bare `on going` / `after going` (binding `self`) and its owner
 * gates, `when <entity> moves[, while …]` clause heads and their lowering,
 * and `kill the player` with an inline text body.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const story = (top: string, guards: string, player: string) => `story
  title: Movement
  authors:
    T
  id: movement
  story-version: 0.0.1

define phrase held
  They hold you.
end phrase

define timer waiting for the player
  pausing
end timer

${top}

create the Yard
  a room

  A yard.

create the guards
  a person, plural
  in the Yard
  states, reversible: calm, alert
${guards}
  Guards.

create the player
  starts in the Yard
${player}
  You.
`;

const errs = (src: string) => compile(src).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
const ok = (src: string) => {
  const r = compile(src);
  const e = r.diagnostics.filter((d) => d.severity === 'error');
  if (e.length) throw new Error(e.map((d) => `${d.code}: ${d.message}`).join('\n'));
  return r.ir;
};

describe("the player's own going (D3h)", () => {
  it('lowers bare `on going` and `after going` as self-bound clauses', () => {
    const ir = ok(story('', '', '  on going while the guards is alert\n    refuse held\n  end on\n\n  after going\n    restart waiting\n  end after\n'));
    const player = ir.entities.find((e) => e.isPlayer)!;
    expect(player.onClauses.map((c) => [c.clauseKind, c.action, c.binding, c.routing])).toEqual([
      ['on', 'going', 'self', 'interceptor'],
      ['after', 'going', 'self', 'interceptor'],
    ]);
    expect(player.onClauses[0].condition).not.toBeNull();
    expect(player.onClauses[1].body[0]).toMatchObject({ kind: 'timer', verb: 'restart', timer: 'player.waiting' });
  });

  it('accepts `, once` on the bare form', () => {
    const ir = ok(story('', '', '  after going, once\n    restart waiting\n  end after\n'));
    expect(ir.entities.find((e) => e.isPlayer)!.onClauses[0]).toMatchObject({ binding: 'self', once: true });
  });

  it("rejects `on the player going` inside the player block — the owner is the block's subject (ADR-327 D1)", () => {
    expect(errs(story('', '', '  on the player going\n    refuse held\n  end on\n'))).toContain('analysis.head-actor-is-owner');
  });

  it('accepts bare `on going` in a character block — the character\'s own movement (ADR-327 D1)', () => {
    const ir = ok(story('', '  on going\n    refuse held\n  end on\n', ''));
    expect(ir.entities.find((e) => e.id === 'guards')!.onClauses[0]).toMatchObject({ action: 'going', binding: 'self', actor: null });
  });

  it('rejects bare `on going` on a room and in a trait — no acting owner', () => {
    const onRoom = story('', '', '').replace('create the Yard\n  a room\n', 'create the Yard\n  a room\n  on going\n    refuse held\n  end on\n');
    expect(errs(onRoom)).toContain('analysis.head-bare-outside-actor');
    expect(errs(story('define trait jumpy\n  after going\n    phrase held\n  end after\nend trait', '', ''))).toContain('analysis.head-bare-outside-actor');
  });

  it('the bare form generalizes to any gerund in an actor block (ADR-327 D1, Q1)', () => {
    const ir = ok(story('', '', '  on taking\n    refuse held\n  end on\n'));
    expect(ir.entities.find((e) => e.isPlayer)!.onClauses[0]).toMatchObject({ action: 'taking', binding: 'self', actor: null });
  });

  it('`on the player going` on a room is unchanged', () => {
    const src = `story
  title: Movement
  authors:
    T
  id: movement
  story-version: 0.0.1

define phrase held
  They hold you.
end phrase

create the Yard
  a room
  on the player going
    refuse held
  end on

  A yard.

create the player
  starts in the Yard

  You.
`;
    const ir = ok(src);
    expect(ir.entities.find((e) => e.id === 'yard')!.onClauses[0]).toMatchObject({ action: 'going', binding: 'object', actor: { kind: 'player' } });
  });
});

describe('when <entity> moves (D3h)', () => {
  it('lowers the head, its while, and the owner by name', () => {
    const ir = ok(story('', '  when the player moves, while the guards is calm\n    change the guards to alert\n  end when\n', ''));
    const guards = ir.entities.find((e) => e.id === 'guards')!;
    expect(guards.moveClauses).toHaveLength(1);
    expect(guards.moveClauses![0].mover).toEqual({ kind: 'player' });
    expect(guards.moveClauses![0].condition).not.toBeNull();
    expect(guards.moveClauses![0].body[0]).toMatchObject({ kind: 'change', entity: { kind: 'entity', id: 'guards' } });
  });

  it('accepts `while` without the comma and an entity mover', () => {
    const ir = ok(story('', '', '  when the guards moves while the guards is alert\n    restart waiting\n  end when\n'));
    const player = ir.entities.find((e) => e.isPlayer)!;
    expect(player.moveClauses![0].mover).toEqual({ kind: 'entity', id: 'guards' });
  });

  it('rejects a mover that is not an entity', () => {
    expect(errs(story('', '  when 3 moves\n    change it to alert\n  end when\n', ''))).toContain('analysis.move-clause-mover');
  });

  it('rejects an unknown mover', () => {
    expect(errs(story('', '  when the captain moves\n    change it to alert\n  end when\n', ''))).toContain('analysis.unknown-entity');
  });

  it('rejects a refusal in the body (a reaction cannot refuse)', () => {
    expect(errs(story('', '  when the player moves\n    refuse held\n  end when\n', ''))).toContain('parse.react-refusal');
  });
});

describe('kill the player with an inline body (D3i)', () => {
  it('registers the body under a synthesized key and lowers to it', () => {
    const ir = ok(story('', '  on every turn while the guards is alert\n    kill the player\n      The guards close in. That is the end of you.\n  end on\n', ''));
    const kill = ir.entities.find((e) => e.id === 'guards')!.onClauses[0].body[0];
    expect(kill.kind).toBe('kill');
    const key = (kill as { phraseKey: string }).phraseKey;
    expect(key).toMatch(/^death-at-\d+-\d+$/);
    expect(ir.phrases.locales[ir.phrases.defaultLocale][key].variants[0].text).toBe('The guards close in. That is the end of you.');
  });

  it('the key form still works', () => {
    const ir = ok(story('', '  on every turn while the guards is alert\n    kill the player held\n  end on\n', ''));
    expect(ir.entities.find((e) => e.id === 'guards')!.onClauses[0].body[0]).toMatchObject({ kind: 'kill', phraseKey: 'held' });
  });

  it('keeps the statement `when` with a body', () => {
    const ir = ok(story('', '  on every turn\n    kill the player when the guards is alert\n      Caught.\n  end on\n', ''));
    const kill = ir.entities.find((e) => e.id === 'guards')!.onClauses[0].body[0] as { phraseKey: string; stmtWhen: unknown };
    expect(kill.stmtWhen).not.toBeNull();
    expect(kill.phraseKey).toMatch(/^death-at-/);
  });

  it('rejects a key and a body together', () => {
    expect(errs(story('', '  on every turn\n    kill the player held\n      Caught.\n  end on\n', ''))).toContain('parse.kill-body');
  });
});

describe('inline phrase bodies inside event clauses', () => {
  it('`when … moves` and `when … expires` bodies register owner-scoped inline phrases', () => {
    const ir = ok(story('', '  when the player moves\n    phrase jolt\n      They jolt.\n  end when\n', '  when waiting expires\n    phrase done\n      Done waiting.\n  end when\n'));
    const table = ir.phrases.locales[ir.phrases.defaultLocale];
    expect(table['guards.jolt'].variants[0].text).toBe('They jolt.');
    expect(table['player.done'].variants[0].text).toBe('Done waiting.');
  });
});
