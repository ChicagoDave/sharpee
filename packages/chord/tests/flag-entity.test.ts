/**
 * flag-entity.test.ts — a thing that only holds a state for something else
 * draws a warning.
 *
 * A thing that declares states, is never anywhere, is never described, has
 * no clauses of its own, and is referenced only as the target of
 * `change … to` and the subject of `is` draws `analysis.flag-entity`, a
 * warning naming where its states belong. The compile still succeeds. A
 * placed thing, a described thing, a thing with a clause, a thing a `move`
 * names and a thing the player carries draw nothing.
 *
 * References:
 * - ADR-394 D7 — a flag entity draws a warning.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const source = readFileSync(join(__dirname, 'fixtures', 'gates', 'flag-entity.story'), 'utf8');

describe('a flag entity draws a warning (analysis.flag-entity)', () => {
  const result = compile(source);
  const flagged = result.diagnostics.filter((d) => d.code === 'analysis.flag-entity');

  it('compiles: a warning never fails the compile, and the fixture has no error', () => {
    expect(result.ok).toBe(true);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('warns exactly once, on the alarm flag (line 8), at warning severity', () => {
    expect(flagged.map((d) => `${d.span.line} ${d.severity}`)).toEqual(['8 warning']);
  });

  it('names the thing and says where its states belong', () => {
    expect(flagged[0].message).toBe(
      '`the alarm flag` is never anywhere and is only ever changed and tested: it is holding a state for something else. Put the states on the thing they describe, or on the story (`states:` in the story block).',
    );
  });

  it('leaves the placed bell, the described rumour, the ward with a clause, the moved token and the carried watch alone', () => {
    const at = (name: string) => source.split('\n').indexOf(`create the ${name}`) + 1;
    for (const name of ['brass bell', 'rumour', 'ward', 'token', 'pocket watch']) {
      expect(at(name)).toBeGreaterThan(0);
      expect(flagged.some((d) => d.span.line === at(name))).toBe(false);
    }
  });
});
