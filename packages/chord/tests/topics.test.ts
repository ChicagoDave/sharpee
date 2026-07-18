/**
 * topics.test.ts — ADR-239 D3 (as amended) / D4: the `define topics for
 * <entity> … end topics` table block through the real parse → analyze
 * pipeline. Assertions land on the lowered `IREntity.topics` shape (both
 * tiers, aliases, body-form rows) and on specific diagnostic codes
 * (AC-3), never just "compile failed". Alias separator: comma list
 * (ruled by David 2026-07-18, superseding the ADR example's `or`).
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const errorCodes = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

/** A person (with states + aka), a room, a thing (with aka), phrase keys. */
const story = (body: string) => `story "Topics" by "T"
  id: topics
  version: 0.0.1

create the player

  You.

create the Lodge
  a room

create the porter
  a person
  in the Lodge
  states: calm, nervous
  aka gatekeeper

create the sword
  in the Lodge
  aka blade

define phrase sword-reply
  Old and notched.
end phrase

define phrase treasure-reply
  Heaps of it, all cursed.
end phrase

define phrase folly-reply
  Nobody speaks of the folly.
end phrase

${body}`;

const FULL_TABLE = `define topics for the porter
  about the sword: phrase sword-reply
  about "treasure", "the hoard": phrase treasure-reply
  about "the folly":
    phrase folly-reply
    change it to nervous
end topics
`;

describe('`define topics` table block (ADR-239 D3 as amended / D4)', () => {
  it('lowers both tiers onto IREntity.topics — entity id, primary+aliases, one-line and body-form rows', () => {
    const result = compile(story(FULL_TABLE));
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);

    const porter = result.ir.entities.find((e) => e.id === 'porter')!;
    expect(porter.topics).toHaveLength(3);

    // Entity tier: resolved to the canonical entity id.
    expect(porter.topics[0].filter).toEqual({ kind: 'entity', id: 'sword' });
    expect(porter.topics[0].body).toMatchObject([{ kind: 'phrase', phraseKey: 'sword-reply' }]);

    // Free-text tier: primary spelling + declared aliases, comma-separated.
    expect(porter.topics[1].filter).toEqual({ kind: 'text', primary: 'treasure', aliases: ['the hoard'] });
    expect(porter.topics[1].body).toMatchObject([{ kind: 'phrase', phraseKey: 'treasure-reply' }]);

    // Body-form row: full statement kit, `it` bound to the owner.
    expect(porter.topics[2].filter).toEqual({ kind: 'text', primary: 'the folly', aliases: [] });
    expect(porter.topics[2].body).toMatchObject([
      { kind: 'phrase', phraseKey: 'folly-reply' },
      { kind: 'change', entity: { kind: 'it' }, state: 'nervous' },
    ]);

    // Additive default: entities without a block carry an empty table.
    const sword = result.ir.entities.find((e) => e.id === 'sword')!;
    expect(sword.topics).toEqual([]);
  });

  it('a one-line row takes the declare-and-emit prose sugar — the text registers owner-scoped', () => {
    const result = compile(story(`define topics for the porter
  about the sword: phrase gate-story
    They brought it here before my time, you know.
end topics
`));
    expect(result.diagnostics).toEqual([]);
    const porter = result.ir.entities.find((e) => e.id === 'porter')!;
    expect(porter.topics[0].body).toMatchObject([{ kind: 'phrase', phraseKey: 'gate-story' }]);
    expect(result.ir.phrases.locales['en-US']['porter.gate-story'].variants[0].text)
      .toBe('They brought it here before my time, you know.');
  });

  // ---------------------------------------------------------- parse gates

  it('rejects a missing `for` (parse.topics-for)', () => {
    expect(errorCodes(story(`define topics the porter
  about the sword: phrase sword-reply
end topics
`))).toContain('parse.topics-for');
  });

  it('rejects a non-`about` line in the block (parse.topics-row)', () => {
    expect(errorCodes(story(`define topics for the porter
  about the sword: phrase sword-reply
  concerning the moon: phrase sword-reply
end topics
`))).toContain('parse.topics-row');
  });

  it('rejects an unquoted alias after the comma (parse.topics-alias)', () => {
    expect(errorCodes(story(`define topics for the porter
  about "treasure", the hoard: phrase treasure-reply
end topics
`))).toContain('parse.topics-alias');
  });

  it('rejects a missing `:` after the topic key (parse.topics-colon)', () => {
    expect(errorCodes(story(`define topics for the porter
  about the sword phrase sword-reply
end topics
`))).toContain('parse.topics-colon');
  });

  it('rejects a row with no response (parse.topics-response)', () => {
    expect(errorCodes(story(`define topics for the porter
  about the sword:
  about "treasure": phrase treasure-reply
end topics
`))).toContain('parse.topics-response');
  });

  it('rejects an empty block (parse.topics-empty)', () => {
    expect(errorCodes(story(`define topics for the porter
end topics
`))).toContain('parse.topics-empty');
  });

  it('rejects a block missing `end topics` (parse.topics-end)', () => {
    expect(errorCodes(story(`define topics for the porter
  about the sword: phrase sword-reply

create the gate
  in the Lodge
`))).toContain('parse.topics-end');
  });

  // --------------------------------------------- analyzer gates (AC-3)

  it('rejects the same entity declared twice in a table (analysis.duplicate-topic)', () => {
    expect(errorCodes(story(`define topics for the porter
  about the sword: phrase sword-reply
  about the blade: phrase treasure-reply
end topics
`))).toContain('analysis.duplicate-topic');
  });

  it('rejects a duplicate quoted entry via normalization — case + leading article (analysis.duplicate-topic)', () => {
    expect(errorCodes(story(`define topics for the porter
  about "treasure": phrase treasure-reply
  about "The Treasure": phrase folly-reply
end topics
`))).toContain('analysis.duplicate-topic');
  });

  it('rejects a duplicate arriving through an alias list (analysis.duplicate-topic)', () => {
    expect(errorCodes(story(`define topics for the porter
  about "gold", "the hoard": phrase treasure-reply
  about "hoard": phrase folly-reply
end topics
`))).toContain('analysis.duplicate-topic');
  });

  it('rejects a quoted entry colliding with an entity-tier row entity name (analysis.topic-entity-collision)', () => {
    expect(errorCodes(story(`define topics for the porter
  about the sword: phrase sword-reply
  about "sword": phrase treasure-reply
end topics
`))).toContain('analysis.topic-entity-collision');
  });

  it('collision gate covers akas and is order-independent — quoted row first still collides', () => {
    expect(errorCodes(story(`define topics for the porter
  about "blade": phrase treasure-reply
  about the sword: phrase sword-reply
end topics
`))).toContain('analysis.topic-entity-collision');
  });

  it('a quoted entry matching an entity NOT in the table is legal — the gate is per-table, not global (D4)', () => {
    const result = compile(story(`define topics for the porter
  about "sword": phrase sword-reply
end topics
`));
    expect(result.diagnostics).toEqual([]);
    const porter = result.ir.entities.find((e) => e.id === 'porter')!;
    expect(porter.topics[0].filter).toEqual({ kind: 'text', primary: 'sword', aliases: [] });
  });

  it('rejects a second `define topics` block for the same entity (analysis.duplicate-topics-block)', () => {
    expect(errorCodes(story(`define topics for the porter
  about the sword: phrase sword-reply
end topics

define topics for the gatekeeper
  about "treasure": phrase treasure-reply
end topics
`))).toContain('analysis.duplicate-topics-block');
  });

  it('rejects a table on a non-person — thing and room alike (analysis.topics-host)', () => {
    expect(errorCodes(story(`define topics for the sword
  about "treasure": phrase treasure-reply
end topics
`))).toContain('analysis.topics-host');
    expect(errorCodes(story(`define topics for the Lodge
  about "treasure": phrase treasure-reply
end topics
`))).toContain('analysis.topics-host');
  });

  it('unknown owner and unknown row entity take the standard unresolved-entity error', () => {
    expect(errorCodes(story(`define topics for the ghost
  about "treasure": phrase treasure-reply
end topics
`))).toContain('analysis.unknown-entity');
    expect(errorCodes(story(`define topics for the porter
  about the ghost: phrase treasure-reply
end topics
`))).toContain('analysis.unknown-entity');
  });

  it('a missing response phrase key gates like any phrase reference (analysis.missing-phrase)', () => {
    expect(errorCodes(story(`define topics for the porter
  about "treasure": phrase never-declared
end topics
`))).toContain('analysis.missing-phrase');
  });
});
