/**
 * composition-legality.test.ts — ADR-276 Phase 1 (census entries 9, 11–15,
 * plus 17/18 discovered during the phase — kind-noun legality):
 * composition-legality rules migrated from story-loader into the analyzer.
 * Each rule is IR-derivable, so it reports as a collected compile diagnostic
 * with a span; the loader keeps the same rules as first-throw defensive
 * backstops for rogue IR (tested in @sharpee/story-loader).
 * REAL-PATH: every case drives Chord source through the actual compile
 * pipeline (`compile`), never a hand-built AST or IR fixture.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const story = (body: string) => `story
  title: Legality
  authors:
    T
  id: legality
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
const errorCodes = (src: string) => errors(src).map((d) => d.code);

describe('census 9 — a patrol NPC needs a route (analysis.patrol-needs-route)', () => {
  it('reports patrol with no route config', () => {
    const found = errors(story('create the guard\n  a person, patrol\n  in the Vault\n\n  A guard.'));
    expect(found.map((d) => d.code)).toEqual(['analysis.patrol-needs-route']);
    expect(found[0].message).toContain('with route [ … ]');
    expect(found[0].span.line).toBeGreaterThan(0);
  });

  it('accepts patrol with a non-empty route', () => {
    expect(
      errorCodes(story('create the guard\n  a person, patrol with route [the Vault]\n  in the Vault\n\n  A guard.')),
    ).toEqual([]);
  });
});

describe('census 11 — dark applies to rooms only (analysis.dark-rooms-only)', () => {
  it('reports dark on a non-room', () => {
    const found = errors(story('create the lamp\n  dark\n  in the Vault\n\n  A lamp.'));
    expect(found.map((d) => d.code)).toEqual(['analysis.dark-rooms-only']);
  });

  it('accepts dark on a room', () => {
    expect(errorCodes(story('create the Cellar\n  a room, dark\n\n  A cellar.'))).toEqual([]);
  });
});

describe('census 12 — worn items must be wearable (analysis.worn-not-wearable)', () => {
  const wornStory = (cloakTraits: string) => `story
  title: Worn
  authors:
    T
  id: worn
  story-version: 0.0.1

create the Vault
  a room

  A vault.

create the cloak
${cloakTraits}
  A cloak.

create Alex
  a person
  playable
  starts in the Vault
  wears the cloak

  You.

before the game starts
  change the player to Alex
end before

`;

  it('reports a worn item without the wearable trait', () => {
    const found = errors(wornStory('\n'));
    expect(found.map((d) => d.code)).toEqual(['analysis.worn-not-wearable']);
    expect(found[0].message).toContain('worn by the player but is not wearable');
  });

  it('accepts a worn wearable', () => {
    expect(errorCodes(wornStory('  wearable\n\n'))).toEqual([]);
  });
});

describe('census 13 — tool-gated gerunds register exactly one implementation (analysis.gerund-implementation)', () => {
  const rope = (traits: string, clauses = '') =>
    story(`create the rope\n  ${traits}\n  in the Vault\n  states: whole, cut\n\n  A rope.\n${clauses}`);

  it('reports a cuttable with no cutting implementation in a hatch-free story', () => {
    const found = errors(rope('cuttable'));
    expect(found.map((d) => d.code)).toEqual(['analysis.gerund-implementation']);
    expect(found[0].message).toContain('registers no cutting implementation');
  });

  it('stays silent on zero surfaces when the story declares a hatch (capability surface is invisible to source)', () => {
    const src = rope('cuttable') + '\ndefine chain opened-revealed from "./reveal.ts"\n';
    expect(errorCodes(src)).toEqual([]);
  });

  it('accepts exactly one entity-level implementation', () => {
    expect(errorCodes(rope('cuttable', '\n  on the player cutting\n    change the rope to cut\n  end on\n'))).toEqual([]);
  });

  it('reports two implementations (entity clause + composed trait clause)', () => {
    const src =
      rope('cuttable, sharp', '\n  on the player cutting\n    change the rope to cut\n  end on\n') +
      '\ndefine trait sharp\n  states, reversible: keen, dull\n\n  on the player cutting\n    change it to dull\n  end on\nend trait\n';
    const found = errors(src);
    expect(found.map((d) => d.code)).toEqual(['analysis.gerund-implementation']);
    expect(found[0].message).toContain('has 2 cutting implementations');
  });
});

describe('census 14 — conditional composition legality (analysis.conditional-composition-unsupported)', () => {
  it('reports a conditional composition that is neither room-dark nor NPC-shaped', () => {
    const found = errors(
      story(
        'create the pebble\n  in the Vault\n\n  A pebble.\n\ncreate the statue\n  scenery while the player has the pebble\n  in the Vault\n\n  A statue.',
      ),
    );
    expect(found.map((d) => d.code)).toEqual(['analysis.conditional-composition-unsupported']);
    expect(found[0].message).toContain("Conditional composition isn't supported for `scenery`");
  });

  it('accepts conditional dark on a room', () => {
    const src = `story
  title: Cond
  authors:
    T
  id: cond
  story-version: 0.0.1

create the cloak
  wearable

  A cloak.

create the Bar
  a room, dark while the player has the cloak

  A bar.

create Alex
  a person
  playable
  starts in the Bar

  You.

before the game starts
  change the player to Alex
end before

`;
    expect(errorCodes(src)).toEqual([]);
  });
});

describe('census 17/18 (discovered in Phase 1) — kind nouns are the closed catalog set, one per entity', () => {
  it('reports an unknown kind noun', () => {
    const found = errors(story('create the lamp\n  a thing\n  in the Vault\n\n  A lamp.'));
    expect(found.map((d) => d.code)).toEqual(['analysis.unknown-kind-noun']);
    expect(found[0].message).toContain('unknown kind noun `thing`');
  });

  it('reports more than one kind noun', () => {
    const found = errors(story('create the crate\n  a container, a supporter\n  in the Vault\n\n  A crate.'));
    expect(found.map((d) => d.code)).toEqual(['analysis.multiple-kind-nouns']);
  });

  it('accepts every catalog kind noun', () => {
    expect(
      errorCodes(story('create the crate\n  a container\n  in the Vault\n\n  A crate.')),
    ).toEqual([]);
  });
});

describe('census 15 — traits must be declared or v1 vocabulary (analysis.trait-not-declared)', () => {
  it('reports an unknown trait word', () => {
    const found = errors(story('create the box\n  glowy\n  in the Vault\n\n  A box.'));
    expect(found.map((d) => d.code)).toEqual(['analysis.trait-not-declared']);
    expect(found[0].message).toContain('`glowy` is not declared');
  });

  it('accepts a declared define trait', () => {
    const src =
      story('create the box\n  glowy\n  in the Vault\n\n  A box.') +
      '\ndefine trait glowy\n  states, reversible: dim, bright\nend trait\n';
    expect(errorCodes(src)).toEqual([]);
  });
});
