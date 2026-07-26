/**
 * scope-requirements.test.ts — ADR-271 D1: the closed scope-constraint
 * requirement-word set. The analyzer rejects any requirement word outside
 * `SCOPE_REQUIREMENT_PREDICATES` (`analysis.unknown-requirement`, with the
 * supported list and a did-you-mean), and the three supported words round-
 * trip parse → analyze → IR with the correct `{slot, requirement}` shape.
 */
import { describe, expect, it } from 'vitest';
import { compile, SCOPE_REQUIREMENT_PREDICATES } from '../src';

const HEADER = 'story "T" by "N"\n  id: t\n  version: 0.0.1\n\n';

/** A minimal story whose one action carries the given constraint line. */
const storyWith = (constraintLine: string) =>
  `${HEADER}define action petting\n  grammar\n    pet the animal\n  ${constraintLine}\n  otherwise refuse cant-pet\n\n  phrases en-US\n    cant-pet:\n      No.\n\ncreate the Barn\n  a room\n\n  A barn.\n\ncreate the player\n  starts in the Barn\n\n  You.\n`;

function errorsOf(source: string) {
  return compile(source).diagnostics.filter((d) => d.severity === 'error');
}

describe('scope-constraint requirement words (ADR-271 D1)', () => {
  it('exports the closed set with its predicate mapping', () => {
    expect(SCOPE_REQUIREMENT_PREDICATES).toEqual({
      reachable: 'touchable',
      visible: 'visible',
      held: 'carried',
    });
  });

  it('rejects an unsupported requirement word with analysis.unknown-requirement', () => {
    const errors = errorsOf(storyWith('the animal must be purple'));
    const err = errors.find((e) => e.code === 'analysis.unknown-requirement');
    expect(err, errors.map((e) => `${e.code} ${e.message}`).join(' | ')).toBeDefined();
    expect(err!.message).toContain('purple');
    expect(err!.message).toContain('reachable, visible, held');
    expect(err!.span.line).toBe(8); // the constraint line, not the action head
  });

  it('suggests the nearest supported word on a near-miss', () => {
    const errors = errorsOf(storyWith('the animal must be reachible'));
    const err = errors.find((e) => e.code === 'analysis.unknown-requirement');
    expect(err).toBeDefined();
    expect(err!.message).toContain('did you mean `reachable`');
  });

  it.each(['reachable', 'visible', 'held'])('compiles `must be %s` clean and carries it to IR', (word) => {
    const result = compile(storyWith(`the animal must be ${word}`));
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors, errors.map((e) => `${e.code} ${e.message}`).join(' | ')).toEqual([]);
    const petting = result.ir.actions.find((a) => a.name === 'petting')!;
    expect(petting.constraints).toEqual([{ slot: 'animal', requirement: word }]);
  });

  it('reports unknown-slot and unknown-requirement independently on one line', () => {
    const errors = errorsOf(storyWith('the beast must be purple'));
    expect(errors.some((e) => e.code === 'analysis.unknown-slot')).toBe(true);
    expect(errors.some((e) => e.code === 'analysis.unknown-requirement')).toBe(true);
  });

  it('rewrote the parser hint to enumerate the actual set', () => {
    // A constraint line missing its requirement word hits the parse-level hint.
    const errors = errorsOf(storyWith('the animal must be'));
    const err = errors.find((e) => e.code === 'parse.action-constraint');
    expect(err).toBeDefined();
    expect(err!.message).toContain('reachable, visible, held');
  });
});
