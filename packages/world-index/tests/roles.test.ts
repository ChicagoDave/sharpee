/**
 * roles.test.ts — D12's three-way split, pinned against the real corpus.
 *
 * Every rule is established against a compiled story rather than a hand-built
 * IR, because the four facts this derivation rests on are exactly the ones a
 * reading of the ADR got wrong: there is no `takeable` row, affordances can live
 * on a trait declaration rather than on the entity, `every-turn` is a binding
 * and not an action word, and rooms answer `on entering` like anything else.
 *
 * Owner context: @sharpee/world-index — tests.
 *
 * @see ADR-321 D12, D11a
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { StoryIR } from '@sharpee/chord';
import { buildDocument } from '../src/document.js';
import { deriveIncomplete } from '../src/incomplete.js';
import { deriveReach } from '../src/reach.js';
import { roleTable, type MentionRole } from '../src/roles.js';
import { CORPUS, compileSource, compileStory, entity } from './corpus.js';

/** Role every entity of a story, the way the document does. */
function rolesOf(ir: StoryIR): Map<string, MentionRole> {
  return roleTable(ir, deriveReach(ir));
}

/** How many edges of each role a story's prose produces. */
function edgeRoles(ir: StoryIR): Record<MentionRole, number> {
  const counts: Record<MentionRole, number> = {
    tool: 0,
    'progression-info': 0,
    'atmosphere-info': 0,
  };
  for (const edge of deriveIncomplete(ir).edges) counts[edge.role] += 1;
  return counts;
}

describe('roles — what a mention is worth (D12)', () => {
  let fernhill: StoryIR;
  let alderman: StoryIR;
  let idesOfMarch: StoryIR;

  beforeAll(() => {
    fernhill = compileStory(CORPUS.fernhill);
    alderman = compileStory(CORPUS.alderman);
    idesOfMarch = compileStory(CORPUS.idesOfMarch);
  });

  it('puts the chain above every affordance a thing also has', () => {
    // Mrs Kettle answers `on giving` — an affordance by any reading — and stands
    // on the progression chain. The chain wins, because a reader asking "what
    // must I do next" is not helped by being told she is also a person you can
    // hand things to.
    expect(entity(fernhill, 'mrs-kettle').onClauses.some((c) => c.action === 'giving')).toBe(true);
    expect(deriveReach(fernhill).progression).toContain('mrs-kettle');
    expect(rolesOf(fernhill).get('mrs-kettle')).toBe('progression-info');
  });

  it('reads an affordance the entity never declares, off the trait it composes', () => {
    // The case clock is the whole D12 lesson in one entity. Its only clause of
    // its own is `on every turn` — a daemon, not something the player does — and
    // it is scenery, so portability cannot save it either. It is a tool solely
    // because `windable`, declared at story level, answers `on winding`. An
    // entity-only reading files it under atmosphere.
    const clock = entity(fernhill, 'case-clock');
    expect(clock.onClauses.every((clause) => clause.binding === 'every-turn')).toBe(true);
    expect(clock.traits.map((t) => t.name)).toContain('scenery');

    const windable = fernhill.traits.find((trait) => trait.name === 'windable');
    expect(windable?.onClauses.map((clause) => clause.action)).toContain('winding');

    expect(rolesOf(fernhill).get('case-clock')).toBe('tool');
  });

  it('is not fooled by an every-turn clause on a thing that affords nothing', () => {
    const ir = compileSource(`story
  title: Roles
  authors:
    Test
  id: roles
  story-version: 1.0.0

create the Hall
  a room

  A hall.

create the humming pipe
  scenery
  in the Hall

  A pipe runs up the wall.

  on every turn
    phrase pipe-knock
  end on

define phrase pipe-knock
  The pipe knocks once.
end phrase

create Alex
  a person
  playable

before the game starts
  change the player to Alex
end before
`);
    const pipe = entity(ir, 'humming-pipe');
    expect(pipe.onClauses).toHaveLength(1);
    expect(pipe.onClauses[0].binding).toBe('every-turn');
    expect(rolesOf(ir).get('humming-pipe')).toBe('atmosphere-info');
  });

  it('never calls a place a tool, though a place answers on entering', () => {
    // Measured before the guard existed: `grounds`, `house` and `iron-gates` all
    // came back tools, because a region and a room answer `on entering` and that
    // is player-fired by every other test here.
    const gates = entity(fernhill, 'iron-gates');
    expect(gates.onClauses.some((clause) => clause.binding !== 'every-turn')).toBe(true);

    const roles = rolesOf(fernhill);
    expect(roles.get('iron-gates')).toBe('atmosphere-info');
    expect(roles.get('grounds')).toBe('atmosphere-info');
    expect(roles.get('house')).toBe('atmosphere-info');
  });

  it('never calls the player a tool, though nothing withdraws their portability', () => {
    const player = fernhill.entities.find((e) => e.isPlayable);
    expect(player?.traits ?? []).toHaveLength(0);
    expect(rolesOf(fernhill).get(player!.id)).toBe('atmosphere-info');
  });

  it('calls an ordinary portable thing a tool, though no IR row says takeable', () => {
    // The sherry bottle declares nothing at all: no trait, no kind, no clause.
    // It is a tool because world-model grants portability by default, which is a
    // fact about the loader and not a row anything can read.
    const bottle = entity(fernhill, 'sherry-bottle');
    expect(bottle.traits).toHaveLength(0);
    expect(bottle.kinds).toHaveLength(0);
    expect(bottle.onClauses).toHaveLength(0);
    expect(rolesOf(fernhill).get('sherry-bottle')).toBe('tool');
  });

  it('calls scenery with nothing to do atmosphere', () => {
    const range = entity(fernhill, 'cold-range');
    expect(range.traits.map((t) => t.name)).toEqual(['scenery']);
    expect(range.onClauses).toHaveLength(0);
    expect(rolesOf(fernhill).get('cold-range')).toBe('atmosphere-info');
  });

  it('roles every declared entity, not only the ones this extractor reached', () => {
    // The table is published whole so Chord Writer can role edges the analyzer
    // never made. The Alderman is the proof it must be: all six `accusable`
    // suspects are proper-named, so the article-gated extractor resolves not one
    // of them, yet each is a tool the moment D11's chunking finds it.
    const roles = rolesOf(alderman);
    expect(roles.size).toBe(alderman.entities.length);

    const named = new Set(deriveIncomplete(alderman).edges.map((edge) => edge.entity));
    const accusable = alderman.entities.filter((e) => e.traits.some((t) => t.name === 'accusable'));
    expect(accusable.length).toBe(6);
    for (const suspect of accusable) {
      expect(named.has(suspect.id)).toBe(false);
      expect(roles.get(suspect.id)).toBe('tool');
    }
  });

  it('rides the wire as a table of its own', () => {
    const document = buildDocument(fernhill, 'test');
    expect(Object.keys(document.roles)).toHaveLength(fernhill.entities.length);
    expect(document.roles['stopcock']).toBe('progression-info');
    expect(document.incomplete.edges.length).toBeGreaterThan(0);
    expect(document.incomplete.edges[0]).toMatchObject({
      phrase: expect.any(String),
      entity: expect.any(String),
      role: expect.any(String),
      site: expect.objectContaining({ key: expect.any(String) }),
    });
  });

  // THE PIN. These are the counts the World tab ranks by, and the reason the
  // three-way split replaced a two-way one: Fernhill's seven progression edges
  // are the five the ADR measured plus the two D14's machine reading recovered,
  // and they stay separable from twenty-six tool edges instead of being lost
  // inside a single "info" list of fifty.
  it('splits the corpus the way D12 says it should', () => {
    expect(edgeRoles(fernhill)).toEqual({
      tool: 25,
      'progression-info': 7,
      'atmosphere-info': 43,
    });
    expect(edgeRoles(alderman)).toEqual({
      tool: 7,
      'progression-info': 0,
      'atmosphere-info': 18,
    });
    expect(edgeRoles(idesOfMarch)).toEqual({
      tool: 43,
      'progression-info': 0,
      'atmosphere-info': 26,
    });
  });

  it('keeps a resolved phrase as an edge rather than discarding it', () => {
    // The edge is the resolution `classify` used to throw away: a phrase naming
    // exactly one thing is not a finding, and it is not nothing either.
    const result = deriveIncomplete(fernhill);
    const lamp = result.edges.filter((edge) => edge.entity === 'oil-lamp');
    expect(lamp.length).toBeGreaterThan(0);
    expect(lamp[0].role).toBe('tool');
    expect(result.edges.every((edge) => edge.site.text.includes(edge.phrase.split(' ')[0]))).toBe(true);
  });
});
