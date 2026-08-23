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

  it('rejects `on going it` inside the player block', () => {
    expect(errs(story('', '', '  on going it\n    refuse held\n  end on\n'))).toContain('analysis.going-player-it');
  });

  it('rejects bare `on going` on another entity and in a trait', () => {
    expect(errs(story('', '  on going\n    refuse held\n  end on\n', ''))).toContain('analysis.going-self-owner');
    expect(errs(story('define trait jumpy\n  after going\n    phrase held\n  end after\nend trait', '', ''))).toContain('analysis.going-self-owner');
  });

  it('the bare form exists only for going', () => {
    expect(errs(story('', '', '  on taking\n    refuse held\n  end on\n'))).toContain('parse.on-target');
  });

  it('`on going it` on a room is unchanged', () => {
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
  on going it
    refuse held
  end on

  A yard.

create the player
  starts in the Yard

  You.
`;
    const ir = ok(src);
    expect(ir.entities.find((e) => e.id === 'yard')!.onClauses[0]).toMatchObject({ action: 'going', binding: 'it' });
  });
});

describe('when <entity> moves (D3h)', () => {
  it('lowers the head, its while, and `it` as the owner', () => {
    const ir = ok(story('', '  when the player moves, while it is calm\n    change it to alert\n  end when\n', ''));
    const guards = ir.entities.find((e) => e.id === 'guards')!;
    expect(guards.moveClauses).toHaveLength(1);
    expect(guards.moveClauses![0].mover).toEqual({ kind: 'player' });
    expect(guards.moveClauses![0].condition).not.toBeNull();
    expect(guards.moveClauses![0].body[0]).toMatchObject({ kind: 'change', entity: { kind: 'it' } });
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
