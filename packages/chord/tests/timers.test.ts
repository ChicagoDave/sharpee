/**
 * timers.test.ts — ADR-325 D3 (GH #307) compiler half: `define timer`
 * parse + lowering (states, prose, meanwhile, interrupted, owners), the
 * five verbs with owner-first resolution, `is <turn>` / `has started` /
 * `has expired` reads, `when <timer> expires` clause heads, and the gates
 * (tally verbs on a timer, timer verbs on a tally, `is expired`, unknown
 * turn, unknown timer, `expired` written as a turn, plural possessive).
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const story = (top: string, guards: string, player: string) => `story
  title: Timers
  authors:
    T
  id: timers
  story-version: 0.0.1

${top}

create the Yard
  a room

  A yard.

create the guards
  a person, plural
  in the Yard
  states, reversible: calm, alert
  counter suspicion starts 0 between 0 and 5
${guards}
  Guards.

create Alex
  a person
  playable
  starts in the Yard

${player}
  You.

before the game starts
  change the player to Alex
end before

`;

const TIMERS = `define timer search for the guards
  arriving
  lingering
    The guards are getting close.
  meanwhile, one chance in 5
    phrase idle
  interrupted one chance in 3
end timer

define timer waiting for the player
  pausing
end timer

define timer curfew
end timer

define phrase idle
  They mutter.
end phrase
`;

const errs = (src: string) => compile(src).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
const ok = (src: string) => {
  const r = compile(src);
  const e = r.diagnostics.filter((d) => d.severity === 'error');
  if (e.length) throw new Error(e.map((d) => `${d.code}: ${d.message}`).join('\n'));
  return r.ir;
};

describe('define timer (D3a)', () => {
  it('lowers owners, turns, prose, meanwhile, and interrupted', () => {
    const ir = ok(story(TIMERS, '', ''));
    expect(ir.timers.map((t) => [t.qualified, t.owner, t.states, t.interrupted, t.meanwhile?.chance ?? null])).toEqual([
      ['guards.search', 'guards', ['arriving', 'lingering'], 3, 5],
      ['player.waiting', 'player', ['pausing'], null, null],
      ['curfew', null, [], null, null],
    ]);
    expect(ir.timers[0].meanwhile?.body).toMatchObject([{ kind: 'phrase', phraseKey: 'idle' }]);
    // A turn's prose lives in the phrase table under <qualified>.<turn>.
    expect(ir.phrases.locales[ir.phrases.defaultLocale]['guards.search.lingering'].variants[0].text).toBe('The guards are getting close.');
    expect(ir.phrases.locales[ir.phrases.defaultLocale]['guards.search.arriving']).toBeUndefined();
  });

  it('rejects `expired` written as a turn', () => {
    expect(errs(story('define timer t for the guards\n  expired\nend timer', '', ''))).toContain('parse.timer-expired');
  });

  it('rejects a duplicate turn and a duplicate timer', () => {
    expect(errs(story('define timer t for the guards\n  a\n  a\nend timer', '', ''))).toContain('analysis.duplicate-timer-state');
    expect(errs(story('define timer t\nend timer\ndefine timer t\nend timer', '', ''))).toContain('analysis.duplicate-timer');
  });

  it('rejects an unknown owner', () => {
    expect(errs(story('define timer t for the captain\nend timer', '', ''))).toContain('analysis.unknown-entity');
  });
});

describe('timer verbs (D3c)', () => {
  const inGuards = (stmt: string) => story(TIMERS, `  on every turn\n    ${stmt}\n  end on\n`, '');
  const verb = (src: string) => {
    const ir = ok(src);
    return ir.entities.find((e) => e.id === 'guards')!.onClauses[0].body[0];
  };

  it('a bare name resolves owner-first', () => {
    expect(verb(inGuards('start search'))).toMatchObject({ kind: 'timer', verb: 'start', timer: 'guards.search' });
  });

  it('a bare name falls back to the story', () => {
    expect(verb(inGuards('restart curfew'))).toMatchObject({ kind: 'timer', verb: 'restart', timer: 'curfew' });
  });

  it("a possessive names its owner (`the player's waiting`, `the guards\' search`)", () => {
    expect(verb(inGuards("reset the player's waiting"))).toMatchObject({ verb: 'reset', timer: 'player.waiting' });
    expect(verb(inGuards('interrupt the guards\' search'))).toMatchObject({ verb: 'interrupt', timer: 'guards.search' });
  });

  it('`stop <timer>` is a timer verb; `stop music` stays media', () => {
    expect(verb(inGuards('stop search'))).toMatchObject({ kind: 'timer', verb: 'stop' });
    expect(errs(inGuards('stop music'))).not.toContain('analysis.unknown-timer');
  });

  it("the plural possessive works from the player's block (GH #305)", () => {
    const ir = ok(story(TIMERS, '', "  on every turn\n    restart the guards\' search\n  end on\n"));
    expect(ir.entities.find((e) => e.id === 'alex')!.onClauses[0].body[0]).toMatchObject({ verb: 'restart', timer: 'guards.search' });
  });

  it('rejects an unknown timer, and a tally named where a timer is wanted', () => {
    expect(errs(inGuards('start patrol'))).toContain('analysis.unknown-timer');
    expect(errs(inGuards('start suspicion'))).toEqual(['analysis.timer-verb-on-tally']);
  });

  it('rejects raise / lower / set on a timer', () => {
    expect(errs(inGuards('raise search by 1'))).toContain('analysis.tally-verb-on-timer');
    expect(errs(inGuards('lower the guards\' search by 1'))).toContain('analysis.tally-verb-on-timer');
    expect(errs(inGuards('set search to 3'))).toContain('analysis.tally-verb-on-timer');
  });
});

describe('timer reads (D3d)', () => {
  const cond = (c: string) => story(TIMERS, `  on every turn while ${c}\n    phrase idle\n  end on\n`, '');
  const condition = (src: string) => ok(src).entities.find((e) => e.id === 'guards')!.onClauses[0].condition;

  it('`is <turn>` reads the named turn against the timer\'s own list', () => {
    expect(condition(cond('search is lingering'))).toMatchObject({ kind: 'predicate', pred: 'is', subject: { kind: 'timer', timer: 'guards.search' }, object: { kind: 'symbol', name: 'lingering' } });
    expect(errs(cond('search is calm'))).toContain('analysis.unknown-timer-state');
  });

  it('an entity state and a timer turn sharing a word are told apart by subject', () => {
    const src = story(TIMERS.replace('  arriving\n', '  arriving\n  calm\n'), '  on every turn while the guards is calm and search is calm\n    phrase idle\n  end on\n', '');
    expect(errs(src)).toEqual([]);
  });

  it('`has started` / `has not expired` lower to timer-has; `is expired` is rejected', () => {
    expect(condition(cond('search has started'))).toEqual({ kind: 'timer-has', timer: 'guards.search', what: 'started' });
    expect(condition(cond("the player's waiting has not expired"))).toEqual({ kind: 'not', operand: { kind: 'timer-has', timer: 'player.waiting', what: 'expired' } });
    expect(errs(cond('search is expired'))).toContain('analysis.timer-is-expired');
  });

  it('`has started` on something that is not a timer is an error', () => {
    expect(errs(cond('suspicion has started'))).toContain('analysis.unknown-timer');
  });
});

describe('when <timer> expires (D3e)', () => {
  it('lowers on an entity naming the clause owner, and on the story header', () => {
    const src = story(
      TIMERS,
      "  when search expires\n    change the guards to alert\n  end when\n\n  when the player's waiting expires, while the guards is calm\n    start search\n  end when\n",
      '',
    ).replace('  story-version: 0.0.1\n', '  story-version: 0.0.1\n\n  when curfew expires\n    phrase idle\n  end when\n');
    const ir = ok(src);
    const guards = ir.entities.find((e) => e.id === 'guards')!;
    expect(guards.timerClauses).toMatchObject([
      { timer: 'guards.search', condition: null, body: [{ kind: 'change', entity: { kind: 'entity', id: 'guards' }, state: 'alert' }] },
      { timer: 'player.waiting', condition: { kind: 'predicate' }, body: [{ kind: 'timer', verb: 'start', timer: 'guards.search' }] },
    ]);
    expect(ir.story.timerClauses).toMatchObject([{ timer: 'curfew', body: [{ kind: 'phrase', phraseKey: 'idle' }] }]);
  });

  it('rejects a timer the owner does not have and the story does not declare', () => {
    expect(errs(story(TIMERS, '  when waiting expires\n    phrase idle\n  end when\n', ''))).toContain('analysis.unknown-timer');
  });
});
