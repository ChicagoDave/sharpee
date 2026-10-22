/**
 * player-timers.test.ts — a timer defined for the player belongs to each
 * playable character, and an event on it names one person.
 *
 * Compiler half, across one, two and three playable characters:
 * `define timer … for the player` lowers to one timer per character, keyed on
 * the character; a read, condition or verb on `the player's <timer>` keeps the
 * role as its owner, resolved when it runs; `when the player's <timer>
 * expires` and a chapter trigger compile only while one character is
 * playable, and with two or more are refused with the fix-it to name the
 * person; a named character's timer reads and expires by their own name.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const PEOPLE = ['Alex', 'Brook', 'Casey'];

/** A story with the first `playable` of Alex, Brook and Casey playable; `body` lands at top level. */
const story = (playable: number, body: string, header = '') => `story
  title: Player timers
  authors:
    T
  id: player-timers
  story-version: 0.0.1
${header}
create the Yard
  a room

  A yard.

${PEOPLE.slice(0, playable).map((name) => `create ${name}
  a person
  playable
  starts in the Yard

  ${name}.
`).join('\n')}
define timer wound for the player
  bleeding
    {You} {bleed} into the dirt.
  weak
end timer

before the game starts
  change the player to Alex
end before

${body}`;

const compiled = (source: string) => compile(source);
const errorCodes = (source: string) => compiled(source).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
const ok = (source: string) => {
  const r = compiled(source);
  const errors = r.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length) throw new Error(errors.map((d) => `${d.code}: ${d.message}`).join('\n'));
  return r.ir;
};

const onYard = (clause: string) => `create the Gate
  a thing, scenery
  in the Yard

  A gate.

${clause}
`;

describe('`define timer … for the player` is one timer per playable character', () => {
  it.each([
    [1, ['alex.wound']],
    [2, ['alex.wound', 'brook.wound']],
    [3, ['alex.wound', 'brook.wound', 'casey.wound']],
  ])('%i playable: one timer each, owned by and keyed on the character', (playable, keys) => {
    const ir = ok(story(playable, ''));
    expect(ir.timers.map((t) => [t.qualified, t.owner, t.states])).toEqual(
      keys.map((key) => [key, key.split('.')[0], ['bleeding', 'weak']]),
    );
    const table = ir.phrases.locales[ir.phrases.defaultLocale];
    for (const key of keys) expect(table[`${key}.bleeding`].variants[0].text).toBe('{You} {bleed} into the dirt.');
  });
});

describe('a read, condition or verb on the player\'s timer keeps the role as its owner', () => {
  it.each([1, 2, 3])('%i playable: `start the player\'s wound` and `the player\'s wound has started`', (playable) => {
    const ir = ok(story(playable, onYard('  on every turn while the player\'s wound has started\n    start the player\'s wound\n  end on\n')));
    const clause = ir.entities.find((e) => e.id === 'gate')!.onClauses[0];
    expect(clause.condition).toEqual({ kind: 'timer-has', name: 'wound', owner: { kind: 'player' }, what: 'started' });
    expect(clause.body[0]).toMatchObject({ kind: 'timer', verb: 'start', name: 'wound', owner: { kind: 'player' } });
  });

  it('a turn the player\'s timer does not have is refused', () => {
    expect(errorCodes(story(2, onYard('  on every turn while the player\'s wound is fainting\n    start the player\'s wound\n  end on\n')))).toContain('analysis.unknown-timer-state');
  });

  it('a named character\'s timer reads by their own name (`Brook\'s wound is bleeding`)', () => {
    const ir = ok(story(2, onYard('  on every turn while Brook\'s wound is bleeding\n    start Alex\'s wound\n  end on\n')));
    const clause = ir.entities.find((e) => e.id === 'gate')!.onClauses[0];
    expect(clause.condition).toMatchObject({ kind: 'predicate', subject: { kind: 'timer', name: 'wound', owner: { kind: 'entity', id: 'brook' } } });
    expect(clause.body[0]).toMatchObject({ kind: 'timer', verb: 'start', name: 'wound', owner: { kind: 'entity', id: 'alex' } });
  });
});

describe('an event on the player\'s timer names one person', () => {
  const expiresOnGate = (who: string) => onYard(`  when ${who} wound expires\n    change the Gate to open\n  end when\n`).replace('  A gate.', '  states: shut, open\n\n  A gate.');

  it('1 playable: `when the player\'s wound expires` is that character\'s', () => {
    const ir = ok(story(1, expiresOnGate('the player\'s')));
    expect(ir.entities.find((e) => e.id === 'gate')!.timerClauses).toMatchObject([{ timer: 'alex.wound' }]);
  });

  it.each([
    [2, 'Alex, Brook'],
    [3, 'Alex, Brook, Casey'],
  ])('%i playable: `when the player\'s wound expires` is refused, naming every playable character', (playable, names) => {
    const diagnostics = compiled(story(playable, expiresOnGate('the player\'s'))).diagnostics.filter((d) => d.severity === 'error');
    expect(diagnostics.map((d) => d.code)).toEqual(['analysis.timer-event-names-the-player']);
    expect(diagnostics[0].message).toContain(`(${names})`);
    expect(diagnostics[0].message).toContain('`when Alex\'s wound expires`');
  });

  it.each([2, 3])('%i playable: `when Brook\'s wound expires` names the person and compiles', (playable) => {
    const ir = ok(story(playable, expiresOnGate('Brook\'s')));
    expect(ir.entities.find((e) => e.id === 'gate')!.timerClauses).toMatchObject([{ timer: 'brook.wound' }]);
  });

  const CHAPTERS = (who: string) => `define chapters
  yard - Chapter I: The Yard
    begins when the game starts
  fall - Chapter II: The Fall
    begins when ${who} wound expires
end chapters
`;

  it('1 playable: a chapter beginning when the player\'s wound expires is that character\'s', () => {
    const ir = ok(story(1, CHAPTERS('the player\'s'), '  use chapters'));
    expect(ir.chapters![1].trigger).toEqual({ kind: 'timer-expires', timer: 'alex.wound' });
  });

  it.each([2, 3])('%i playable: a chapter on the player\'s wound is refused; on Brook\'s it compiles', (playable) => {
    expect(errorCodes(story(playable, CHAPTERS('the player\'s'), '  use chapters'))).toEqual(['analysis.timer-event-names-the-player']);
    const ir = ok(story(playable, CHAPTERS('Brook\'s'), '  use chapters'));
    expect(ir.chapters![1].trigger).toEqual({ kind: 'timer-expires', timer: 'brook.wound' });
  });
});
