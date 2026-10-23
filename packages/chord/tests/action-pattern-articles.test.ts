/**
 * action-pattern-articles.test.ts — a fixed noun beside a slot writes its
 * article in brackets, and a slot nothing uses is a warning. `[the] arrow`
 * lowers to an optional word `the` and the word `arrow`, never a slot;
 * `[the target]` stays an optional slot. `analysis.slot-unused` names a
 * `define action` slot that is not the action's primary slot and that no
 * line constrains, refuses on, types or reads, and is silent on every slot
 * that is used and on an `extend action`.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const HEADER = 'story\n  title: T\n  authors:\n    N\n  id: t\n  story-version: 0.0.1\n\n';
const WORLD = 'create the Barn\n  a room\n\n  A barn.\n\ncreate Alex\n  a person\n  playable\n  starts in the Barn\n\n  You.\n\nbefore the game starts\n  change the player to Alex\nend before\n';

/** A `define action shooting` with the given lines, a dispatch-miss phrase and a world. */
const action = (lines: string) =>
  `${HEADER}define action shooting\n${lines}  otherwise refuse cant\n\n  phrases en-US\n    cant:\n      No.\n\n${WORLD}`;

const diagnostics = (source: string) => compile(source).diagnostics;
const unused = (source: string) =>
  diagnostics(source)
    .filter((d) => d.code === 'analysis.slot-unused')
    .map((d) => d.message);

describe('`[the]` beside a slot', () => {
  it('`shoot [the] arrow at the target` lowers `the` as an optional word and `arrow` as a word', () => {
    const result = compile(action('  grammar\n    shoot [the] arrow at the target\n'));
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const parts = result.ir!.actions.find((a) => a.name === 'shooting')!.patterns[0].parts;
    expect(parts).toEqual([
      { kind: 'word', word: 'shoot' },
      { kind: 'word', word: 'the', optional: true },
      { kind: 'word', word: 'arrow' },
      { kind: 'word', word: 'at' },
      { kind: 'slot', word: 'target' },
    ]);
  });

  it('`[the target]` stays an optional slot', () => {
    const result = compile(action('  grammar\n    shoot [the target]\n'));
    const parts = result.ir!.actions.find((a) => a.name === 'shooting')!.patterns[0].parts;
    expect(parts).toEqual([
      { kind: 'word', word: 'shoot' },
      { kind: 'slot', word: 'target', optional: true },
    ]);
  });
});

describe('analysis.slot-unused', () => {
  it('fires on a second slot nothing uses, naming it and the `[the]` fix-it', () => {
    const messages = unused(action('  grammar\n    shoot the target\n    shoot the arrow at the target\n'));
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('`the arrow`');
    expect(messages[0]).toContain('[the] arrow');
  });

  it('is a warning, not an error', () => {
    const found = diagnostics(action('  grammar\n    shoot the target\n    shoot the arrow at the target\n')).find((d) => d.code === 'analysis.slot-unused');
    expect(found?.severity).toBe('warning');
  });

  it('does not fire on the primary slot, which binds the noun whose clauses the action consults', () => {
    expect(unused(action('  grammar\n    shoot the target\n'))).toEqual([]);
  });

  it('does not fire on a slot a scope constraint names', () => {
    // `target` is primary and constrained; `arrow`, the second slot, is neither.
    expect(unused(action('  grammar\n    shoot the target\n    shoot the arrow at the target\n  the target must be visible\n'))).toHaveLength(1);
    expect(unused(action('  grammar\n    shoot the target with the arrow\n  the arrow must be held\n'))).toEqual([]);
  });

  it('does not fire on a slot a refusal names', () => {
    const source = action('  grammar\n    shoot the target with the arrow\n  refuse without arrow: cant\n');
    expect(unused(source)).toEqual([]);
  });

  it('does not fire on a slot the body reads', () => {
    const source = action('  grammar\n    shoot the target with the arrow\n  move the arrow to the Barn\n');
    expect(unused(source)).toEqual([]);
  });

  it('does not fire on a slot only a phrase in the action\'s own block reads (ADR-380 D2a amendment)', () => {
    const source =
      `${HEADER}define action hanging\n  grammar\n    hang the item on the hook\n  phrase hung\n\n` +
      `  phrases en-US\n    hung:\n      You hang {the item} on {the hook}.\n\n${WORLD}`;
    expect(unused(source)).toEqual([]);
  });

  it('does not fire on a slot only a story phrase the action speaks reads', () => {
    const source =
      `${HEADER}define action hanging\n  grammar\n    hang the item on the hook\n  phrase hung\n\n` +
      `define phrase hung\n  {capitalize the item} {verb:hangs item} from {the hook}.\nend phrase\n\n${WORLD}`;
    expect(unused(source)).toEqual([]);
  });

  it('does not fire on a slot only a colon-qualified marker reads (`{verb:is hook}`)', () => {
    const source =
      `${HEADER}define action hanging\n  grammar\n    hang the item on the hook\n  phrase hung\n\n` +
      `  phrases en-US\n    hung:\n      You hang {the item} up; {the hook} {verb:is hook} sturdy.\n\n${WORLD}`;
    expect(unused(source)).toEqual([]);
    const onlyColon =
      `${HEADER}define action hanging\n  grammar\n    hang the item on the hook\n  phrase hung\n\n` +
      `  phrases en-US\n    hung:\n      You hang {the item} up and it {verb:holds hook}.\n\n${WORLD}`;
    expect(unused(onlyColon)).toEqual([]);
  });

  it('still fires on a slot no phrase reads, beside one a phrase does', () => {
    const source =
      `${HEADER}define action hanging\n  grammar\n    hang the item on the hook\n  phrase hung\n\n` +
      `  phrases en-US\n    hung:\n      You hang {the item} up.\n\n${WORLD}`;
    const messages = unused(source);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('`the hook`');
  });

  it('does not fire on a slot typed as an instrument', () => {
    const source = action('  grammar\n    shoot the target with the arrow\n  the arrow is an instrument\n');
    expect(unused(source)).toEqual([]);
  });

  it('does not fire on an `extend action`, whose slots bind the extended action\'s nouns', () => {
    const source = `${HEADER}extend action putting\n  grammar\n    hook the item on the hook\n\n${WORLD}`;
    expect(unused(source)).toEqual([]);
  });

  it('is silent once the fixed noun is written `[the] arrow`', () => {
    expect(unused(action('  grammar\n    shoot the target\n    shoot [the] arrow at the target\n'))).toEqual([]);
  });
});
