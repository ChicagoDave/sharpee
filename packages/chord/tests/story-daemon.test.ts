/**
 * story-daemon.test.ts — ADR-236 D7 (ratchet R4): the story header block
 * hosts `on every turn [while <cond>][, once]` in its indented body,
 * lowering to StoryIR.story.onClauses (story-owned, broadcast narration).
 * `it` in a story clause is the unbound-referent compile error
 * (`analysis.story-clause-it`); any other clause form in the header is
 * `parse.story-clause`. REAL-PATH: every case drives source through the
 * real parse → analyze pipeline.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const errorCodes = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

const story = (headerBody: string) => `story "Clockwork" by "T"
  id: clockwork
  version: 0.0.1
${headerBody}
create the Hall
  a room

  A hall.

create the player
  starts in the Hall

  You.

define phrase clock-tick
  Somewhere, a clock ticks.
end phrase
`;

describe('story-owned `on every turn` (ADR-236 D7, ratchet R4)', () => {
  it('lowers a header clause onto StoryIR.story.onClauses with broadcast narration', () => {
    const result = compile(
      story(`
  on every turn
    phrase clock-tick
  end on
`),
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.ir.story.onClauses).toHaveLength(1);
    const clause = result.ir.story.onClauses[0];
    expect(clause.binding).toBe('every-turn');
    expect(clause.narration).toBe('broadcast');
    expect(clause.once).toBe(false);
  });

  it('`while <condition>` and `, once` compose on the header clause', () => {
    const result = compile(
      story(`
  states: calm, stormy

  on every turn while stormy, once
    phrase clock-tick
  end on
`),
    );
    expect(result.diagnostics).toEqual([]);
    const clause = result.ir.story.onClauses[0];
    expect(clause.once).toBe(true);
    expect(clause.condition).toEqual({ kind: 'story-state', state: 'stormy' });
  });

  it('`it` in a story clause body → analysis.story-clause-it', () => {
    expect(
      errorCodes(
        story(`
  on every turn
    move it to the Hall
  end on
`),
      ),
    ).toEqual(['analysis.story-clause-it']);
  });

  it('`its <field>` in a story clause condition → the same unbound-referent gate', () => {
    expect(
      errorCodes(
        story(`
  on every turn while its state is calm
    phrase clock-tick
  end on
`),
      ),
    ).toContain('analysis.story-clause-it');
  });

  it('an action clause in the header → parse.story-clause', () => {
    expect(
      errorCodes(
        story(`
  on taking it
    phrase clock-tick
  end on
`),
      ),
    ).toContain('parse.story-clause');
  });

  it('`after every turn` in the header keeps its own error, no stacked diagnostic', () => {
    const codes = errorCodes(
      story(`
  after every turn
    phrase clock-tick
  end after
`),
    );
    expect(codes).toContain('parse.after-every-turn');
    expect(codes).not.toContain('parse.story-clause');
  });
});
