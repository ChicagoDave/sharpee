/**
 * gh-359-detail-gate-timer-read.test.ts — a `phrase detail while <timer read>`
 * gate compiles exactly as the same read compiles on a clause head
 * (`secret-letter-port-platform-defects` Phase 5, P-12; GH #359).
 *
 * The defect was pass order: an entity's override gates resolved in pass 1,
 * before `buildTimers` registered any timer, so `the player's
 * pole-destruction has started` fell to a field read and `has started`
 * reported `analysis.unknown-timer`. The gate now resolves in pass 2.
 *
 * The same file records the bare-word case the issue raised beside it: a
 * bare entity state word (`while huddled:`) stays refused by design — a bare
 * word in a `while` is a story state; an entity's own state is spelled with
 * the entity's name.
 *
 * Every assertion reads the compiled IR or the diagnostic list.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const story = (body: string) => `story
  title: Detail Gate
  authors:
    T
  id: detail-gate
  story-version: 0.0.1
  states: calm, hunted

create the Hall
  a room

  A hall.

${body}
create Jack
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Jack
end before
`;

const errors = (result: ReturnType<typeof compile>) => result.diagnostics.filter((d) => d.severity === 'error');

const MERCENARIES = (gate: string) => `define timer pole-destruction for the player
  axe
  chopping
end timer

create the mercenaries
  scenery, plural
  in the Hall
  states, reversible: huddled, chopping

  Mercenaries.

  phrase detail while ${gate}:
    The mercenaries are chopping the pole down!

  on the player listening
    phrase merc-below when the player's pole-destruction has started
  end on

define phrase merc-below
  Chopping, from below.
end phrase
`;

describe('GH #359: a timer read is accepted on `phrase detail while`', () => {
  it('compiles the player-owned timer read as a timer-has gate on the detail entry', () => {
    const result = compile(story(MERCENARIES("the player's pole-destruction has started")));
    expect(errors(result)).toEqual([]);
    const detail = result.ir!.phrases.locales['en-US']['mercenaries.detail'];
    expect(detail).toBeDefined();
    expect(detail.condition).toEqual({ kind: 'timer-has', timer: 'player.pole-destruction', what: 'started' });
  });

  it('compiles the negated read (`has not started`) the same way', () => {
    const result = compile(story(MERCENARIES("the player's pole-destruction has not started")));
    expect(errors(result)).toEqual([]);
    const detail = result.ir!.phrases.locales['en-US']['mercenaries.detail'];
    expect(detail.condition).toEqual({
      kind: 'not',
      operand: { kind: 'timer-has', timer: 'player.pole-destruction', what: 'started' },
    });
  });

  it('still refuses a read of an undeclared timer, with the same diagnostic a clause head gives', () => {
    const result = compile(story(MERCENARIES("the player's market-escape has started")));
    const codes = errors(result).map((d) => d.code);
    expect(codes).toContain('analysis.unknown-timer');
  });

  it('accepts a bare STORY state word and the entity state spelled with the entity name', () => {
    const byStory = compile(story(MERCENARIES('hunted')));
    expect(errors(byStory)).toEqual([]);
    expect(byStory.ir!.phrases.locales['en-US']['mercenaries.detail'].condition).toBeDefined();

    const byName = compile(story(MERCENARIES('the mercenaries is chopping')));
    expect(errors(byName)).toEqual([]);
    expect(byName.ir!.phrases.locales['en-US']['mercenaries.detail'].condition).toBeDefined();
  });

  it('refuses a bare ENTITY state word by design — a bare word in a `while` is a story state', () => {
    const result = compile(story(MERCENARIES('huddled')));
    const codes = errors(result).map((d) => d.code);
    expect(codes).toContain('analysis.unknown-condition');
  });
});
