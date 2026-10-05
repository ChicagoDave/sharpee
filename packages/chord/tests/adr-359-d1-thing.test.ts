/**
 * adr-359-d1-thing.test.ts — `thing` is a kind noun, and the kind line's
 * errors name their fix: a kind beside `a thing`, a kind written bare, and a
 * kind under `while`.
 *
 * REAL-PATH: every case drives Chord source through `compile`.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const story = (body: string) => `story
  title: Things
  authors:
    T
  id: things
  story-version: 0.0.1

create the Vault
  a room

  A vault.

create Alex
  a person
  playable
  starts in the Vault

  You.

before the game starts
  change the player to Alex
end before

${body}`;

const errors = (src: string) => compile(src).diagnostics.filter((d) => d.severity === 'error');

describe('ADR-359 D1 — `a thing` is a kind', () => {
  it('compiles `a thing` with traits and records the kind', () => {
    const result = compile(story('create the bell\n  a thing, scenery\n  in the Vault\n\n  A bell.'));
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const bell = result.ir.entities.find((e) => e.id === 'bell')!;
    expect(bell.kinds.map((k) => k.name)).toEqual(['thing']);
    expect(bell.traits.map((t) => t.name)).toEqual(['scenery']);
  });
});

describe('ADR-359 D1 — a kind beside `a thing` names the fix', () => {
  it('`a thing, container` says a container is already a thing', () => {
    const found = errors(story('create the box\n  a thing, container\n  in the Vault\n\n  A box.'));
    expect(found.map((d) => d.code)).toEqual(['analysis.thing-with-kind']);
    expect(found[0].message).toContain('a container is already a kind of thing; write `a container`');
  });

  it('`a thing, a supporter` reports the fix, not multiple kinds', () => {
    const found = errors(story('create the shelf\n  a thing, a supporter\n  in the Vault\n\n  A shelf.'));
    expect(found.map((d) => d.code)).toEqual(['analysis.thing-with-kind']);
    expect(found[0].message).toContain('write `a supporter`');
  });

  it('`a thing, a room` says a room is not a thing', () => {
    const found = errors(story('create the Annex\n  a thing, a room\n\n  An annex.'));
    expect(found.map((d) => d.code)).toContain('analysis.thing-with-kind');
    expect(found.find((d) => d.code === 'analysis.thing-with-kind')!.message).toContain('a room is not a thing');
  });
});

describe('ADR-359 D1 — a kind written bare takes an article', () => {
  it('`scenery, container` names `a container`, not an undeclared trait', () => {
    const found = errors(story('create the bin\n  scenery, container\n  in the Vault\n\n  A bin.'));
    expect(found.map((d) => d.code)).toEqual(['analysis.kind-noun-needs-article']);
    expect(found[0].message).toContain('write `a container`');
  });
});

describe('ADR-359 D1 — a kind cannot come and go', () => {
  it('refuses `a thing while …`', () => {
    const found = errors(
      story('create the coin\n  a thing while the coin is visible\n  in the Vault\n\n  A coin.'),
    );
    expect(found.map((d) => d.code)).toContain('analysis.conditional-kind');
  });

  it('refuses a conditional kind of any name', () => {
    const found = errors(
      story('create the chest\n  a container while the chest is visible\n  in the Vault\n\n  A chest.'),
    );
    expect(found.map((d) => d.code)).toContain('analysis.conditional-kind');
  });
});
