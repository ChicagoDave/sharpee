/**
 * story-is-state.test.ts — `the story is [not] <state>` in a condition
 * (GH #705): the read that matches `change the story to <state>`.
 *
 * Public interface: none (test file).
 * Owner context: @sharpee/chord, analyzer (condition resolution).
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

/** A two-room story whose two blocked exits carry the conditions under test. */
function source(states: string | null, northCondition: string, southCondition: string): string {
  return `story
  title: Nightfall
  authors:
    T
  id: nightfall
  story-version: 0.0.1
${states === null ? '' : `  states: ${states}\n`}
create the Terrace
  a room
  north to the Garden
  north is blocked while ${northCondition}: gate-chained

  A stone terrace.

create the Garden
  a room
  south to the Terrace
  south is blocked while ${southCondition}: gate-chained

  A walled garden.

create Alex
  a person
  playable
  starts in the Terrace

  You.

before the game starts
  change the player to Alex
end before

define phrase gate-chained
  The garden gate is chained for the night.
end phrase
`;
}

function errorCodes(text: string): string[] {
  return compile(text)
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => d.code);
}

function blockedConditions(text: string) {
  const result = compile(text);
  expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return result.ir.entities
    .filter((e) => e.id === 'terrace' || e.id === 'garden')
    .map((e) => e.blockedExits[0].condition);
}

describe('`the story is <state>` reads the story state (GH #705)', () => {
  it('lowers to the story-state node, and `is not` to `not` over it', () => {
    expect(blockedConditions(source('day, night', 'the story is night', 'the story is not day'))).toEqual([
      { kind: 'story-state', state: 'night' },
      { kind: 'not', operand: { kind: 'story-state', state: 'day' } },
    ]);
  });

  it('produces the same conditions as the bare state word', () => {
    expect(blockedConditions(source('day, night', 'the story is night', 'the story is not day'))).toEqual(
      blockedConditions(source('day, night', 'night', 'not day')),
    );
  });

  it('refuses a word the story does not declare, and suggests the near one', () => {
    const result = compile(source('day, night', 'the story is nigt', 'night'));
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.map((d) => d.code)).toEqual(['analysis.undeclared-state']);
    expect(errors[0].message).toContain('`nigt` is not a declared state of the story');
    expect(errors[0].message).toContain('night');
  });

  it('says so when the story declares no states', () => {
    const result = compile(source(null, 'the story is night', 'the story is night'));
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.map((d) => d.code)).toEqual(['analysis.undeclared-state', 'analysis.undeclared-state']);
    expect(errors[0].message).toContain('the story declares no states');
  });

  it('refuses any other predicate on the story by name, never as an unknown entity', () => {
    expect(errorCodes(source('day, night', 'the story is in the Garden', 'night'))).toEqual(['analysis.story-predicate']);
    expect(errorCodes(source('day, night', 'the story has Alex', 'night'))).toEqual(['analysis.story-predicate']);
  });
});
