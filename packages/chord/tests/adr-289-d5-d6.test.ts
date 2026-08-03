/**
 * adr-289-d5-d6.test.ts — ADR-289 Phase 5, the analyzer half.
 *
 * D5 (duplicate-declaration gates become one helper): every namespace that
 * admits one declaration per name goes through `registerUnique`, which cites
 * the FIRST span — and `define action` and `define trait`, the two
 * constructs the hand-rolled gates missed, are gated for the first time.
 *
 * D6 (exits are gated to rooms at compile): `north to the Hall` in a non-room
 * `create` block is an analyzer error, and blocked and deadly exits ride the
 * same gate. The loader's defensive backstop against rogue IR lives in
 * `packages/story-loader/tests/adr-289-d6-backstop.test.ts`.
 *
 * Acceptance 14, 15.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const HEADER = 'story\n  title: T\n  authors: N\n  id: t\n  story-version: 0.0.1\n\n';

const WORLD = `create the Hall
  a room

  A hall.

create the player
  starts in the Hall

  You.
`;

function errorsOf(source: string) {
  return compile(source).diagnostics.filter((d) => d.severity === 'error');
}

describe('D5 — one duplicate-name gate, citing the first span (Acceptance 14)', () => {
  it('a second `define action` is a duplicate-name error naming the first line', () => {
    // The phrases live in one top-level block, so the ONLY thing duplicated
    // is the action name — a per-action `phrases` block would trip
    // `analysis.duplicate-phrase` first and prove nothing about D5.
    const action = `define action petting
  grammar
    pet the animal
  otherwise refuse cant-pet

`;
    const errors = errorsOf(
      `${HEADER}${action}${action}${WORLD}\ndefine phrases en-US\n  cant-pet:\n    No.\n`,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.duplicate-action');
    expect(errors[0].message).toContain('petting');
    // The first declaration opens at line 7 of the assembled source.
    expect(errors[0].message).toContain('line 7');
    expect(errors[0].span.line).toBeGreaterThan(7);
  });

  it('a second `define trait` is a duplicate-name error naming the first line', () => {
    const trait = `define trait guard
  states: alert, dozing
end trait

`;
    const errors = errorsOf(`${HEADER}${trait}${trait}${WORLD}`);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.duplicate-trait');
    expect(errors[0].message).toContain('guard');
    expect(errors[0].message).toContain('line 7');
  });

  it('the pre-existing namespaces keep their codes and gain the first-span citation', () => {
    const errors = errorsOf(
      `${HEADER}define counter dread starts 0\n\ndefine counter dread starts 0\n\n${WORLD}`,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.duplicate-counter');
    expect(errors[0].message).toContain('line 7');
  });

  it('an entity redeclared under the same name still errors, once', () => {
    const errors = errorsOf(`${HEADER}${WORLD}\ncreate the Hall\n  a room\n\n  Again.\n`);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.duplicate-entity');
  });

  it('namespaces do not collide — an action and a trait may share a name', () => {
    const source = `${HEADER}define trait petting
  states: calm, spooked
end trait

define action petting
  grammar
    pet the animal
  otherwise refuse cant-pet

  phrases en-US
    cant-pet:
      No.

${WORLD}`;
    expect(errorsOf(source)).toEqual([]);
  });

  it('two distinct names in one namespace are both fine', () => {
    const source = `${HEADER}define trait guard
  states: alert, dozing
end trait

define trait skittish
  states: calm, spooked
end trait

${WORLD}`;
    expect(errorsOf(source)).toEqual([]);
  });
});

describe('D6 — exits are gated to rooms (Acceptance 15)', () => {
  it('Acceptance 15: `north to the Hall` in a non-room create block is a compile error', () => {
    const source = `${HEADER}${WORLD}
create the crate
  a container
  in the Hall
  north to the Hall

  A crate.
`;
    const errors = errorsOf(source);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.exit-non-room');
    expect(errors[0].message).toContain('crate');
  });

  it('a blocked exit rides the same gate', () => {
    const source = `${HEADER}${WORLD}
create the crate
  a container
  in the Hall
  north is blocked: sealed

  A crate.

define phrases en-US
  sealed:
    Sealed.
`;
    const errors = errorsOf(source);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.exit-non-room');
  });

  it('a deadly exit rides the same gate', () => {
    const source = `${HEADER}${WORLD}
create the crate
  a container
  in the Hall
  north is deadly: fell

  A crate.

define phrases en-US
  fell:
    You fell.
`;
    const errors = errorsOf(source);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.exit-non-room');
  });

  it('a room keeps its exits — the gate refuses the kind, not the construct', () => {
    const source = `${HEADER}create the Hall
  a room
  north to the Study

  A hall.

create the Study
  a room
  south to the Hall

  A study.

create the player
  starts in the Hall

  You.
`;
    expect(errorsOf(source)).toEqual([]);
  });
});
