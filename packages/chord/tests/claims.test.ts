/**
 * claims.test.ts — the `claims` block and `compileClaims` (ADR-365 D1, D2, D7;
 * AC-6).
 *
 * A claims fragment compiles against its story into the claim set the
 * branch-tester runner takes: ids for rooms and things, verbs as written,
 * one of seven predicate keys per claim. The story's own IR is untouched by
 * the fragment — `compileClaims` returns the IR `compile` returns, and a
 * `claims` block met inside a story or an imported fragment is refused by
 * name. Every malformed line is a diagnostic with a code and the fragment's
 * span; nothing here defaults.
 */
import { describe, expect, it } from 'vitest';
import { compile, compileClaims, type IRClaimSet } from '../src';

const STORY = `story
  title: Claims Fixture
  authors:
    Fixture
  id: claims-fixture
  story-version: 0.0.1
  states: morning, evening

create the Hall
  a room
  north to the Landing

  A hall.

create the Landing
  a room
  south to the Hall

  A landing.

create the note
  aka paper
  a thing, scenery, readable
  in the Hall

  A square of paper.

  on the player reading
    phrase note-text
      "Back by dawn."
  end on

create the kettle
  a thing
  states: cold, hot
  in the Hall

  A kettle.

create the box
  a container, openable
  in the Hall

  A box.

create Mo
  a person
  states: glum, glad
  in the Hall

  Mo.

define topics for Mo
  about "the weather": change Mo to glad
end topics

create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before
`;

const FRAGMENT = `## The fixture's claims.

claims
  needs rooms: the Hall, the Landing
  needs things: the note, the kettle, the box, Mo
  needs verbs: read, take, open, ask, turn on

  claim the story can be won
    the story ends in victory

  claim the story has reached some ending
    the story has ended

  claim the note is in hand
    the player has the note

  claim Mo has been asked about the weather
    Mo was asked about "the weather"
    needs rooms: the Hall
    needs things: Mo
    needs verbs: ask

  claim the note has been read
    the note is read

  claim the kettle is hot
    the kettle is hot

  claim the box stands open
    the box is open

  claim the evening comes
    the story is evening

  claim the Landing is reached
    the player is in the Landing

  never the note leaves the Hall
    the note is not in the Hall

  claim the note is boxed
    the note is in the box

  claim the note answered reading
    the note has been read
end claims
`;

const codesOf = (diagnostics: ReadonlyArray<{ severity: string; code: string }>) =>
  diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

function claimsOf(fragment: string): IRClaimSet {
  const result = compileClaims(STORY, fragment, { claimsFile: 'fixture.claims.chord' });
  if (!result.ok || !result.claims) throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join('\n'));
  return result.claims;
}

describe('compileClaims — the Fernhill-shaped fragment', () => {
  it('lowers the shared set and every predicate kind to the runner\'s shape', () => {
    const claims = claimsOf(FRAGMENT);
    expect(claims.rooms).toEqual(['hall', 'landing']);
    expect(claims.things).toEqual(['note', 'kettle', 'box', 'mo']);
    expect(claims.verbs).toEqual(['read', 'take', 'open', 'ask', 'turn on']);
    expect(claims.claims).toEqual([
      { name: 'the story can be won', ending: { kind: 'victory' } },
      { name: 'the story has reached some ending', ending: {} },
      { name: 'the note is in hand', placement: { thing: 'note', in: 'player' } },
      {
        name: 'Mo has been asked about the weather',
        event: { type: 'if.event.asked', target: 'mo', topic: 'the weather' },
        needs: { rooms: ['hall'], things: ['mo'], verbs: ['ask'] },
      },
      { name: 'the note has been read', flag: { thing: 'note', trait: 'readable', field: 'hasBeenRead', value: true } },
      { name: 'the kettle is hot', state: { entity: 'kettle', value: 'hot' } },
      { name: 'the box stands open', flag: { thing: 'box', trait: 'openable', field: 'isOpen', value: true } },
      { name: 'the evening comes', state: { entity: 'story', value: 'evening' } },
      { name: 'the Landing is reached', room: 'landing' },
      { name: 'the note leaves the Hall', never: true, placement: { thing: 'note', notIn: 'hall' } },
      { name: 'the note is boxed', placement: { thing: 'note', in: 'box' } },
      { name: 'the note answered reading', fired: 'note.reading' },
    ]);
  });

  it('a declared state wins over a platform flag word of the same spelling', () => {
    // `read` is the readable flag word; a thing that declares a `read` state means its own.
    const story = STORY.replace('states: cold, hot', 'states: fresh, read');
    const result = compileClaims(story, 'claims\n  needs rooms: the Hall\n  needs things: the kettle\n  needs verbs: read\n\n  claim the kettle is read\n    the kettle is read\nend claims\n');
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => `${d.code}: ${d.message}`)).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.claims?.claims[0]).toEqual({ name: 'the kettle is read', state: { entity: 'kettle', value: 'read' } });
  });
});

describe('AC-6 — the story is untouched by its claims', () => {
  it('compileClaims returns the IR compile returns, and no claim is in it', () => {
    const plain = compile(STORY);
    const withClaims = compileClaims(STORY, FRAGMENT);
    expect(plain.ok && withClaims.ok).toBe(true);
    expect(withClaims.ir).toEqual(plain.ir);
    expect(Object.keys(withClaims.ir)).not.toContain('claims');
    expect(JSON.stringify(withClaims.ir)).not.toContain('the story can be won');
  });

  it('a claims block inside the story is refused by name and the story does not compile', () => {
    const result = compile(`${STORY}\nclaims\n  needs rooms: the Hall\n  needs things: the note\n  needs verbs: read\n\n  claim the note has been read\n    the note is read\nend claims\n`);
    expect(result.ok).toBe(false);
    expect(codesOf(result.diagnostics)).toEqual(['analysis.claims-in-story']);
  });

  it('a claims block in an imported fragment is refused the same way, at the fragment\'s span', () => {
    const fragment = 'claims\n  needs rooms: the Hall\n  needs things: the note\n  needs verbs: read\n\n  claim the note has been read\n    the note is read\nend claims\n';
    const result = compile(`${STORY}\nimport "claims"\n`, { importResolver: (name) => (name === 'claims.chord' ? fragment : null) });
    expect(result.ok).toBe(false);
    const refusal = result.diagnostics.find((d) => d.code === 'analysis.claims-in-story');
    expect(refusal?.span.file).toBe('claims.chord');
  });
});

describe('the fragment is one claims block and nothing else', () => {
  const codes = (fragment: string) => codesOf(compileClaims(STORY, fragment, { claimsFile: 'x.claims.chord' }).diagnostics);
  const BLOCK = 'claims\n  needs rooms: the Hall\n  needs things: the note\n  needs verbs: read\n\n  claim the note has been read\n    the note is read\nend claims\n';

  it('a story header in the fragment', () => {
    expect(codes(`story\n  title: Nope\n  authors:\n    N\n  id: nope\n\n${BLOCK}`)).toContain('claims.fragment-story');
  });

  it('a declaration beside the block', () => {
    expect(codes(`${BLOCK}\ncreate the Den\n  a room\n\n  A den.\n`)).toContain('claims.fragment-content');
  });

  it('no block, and two blocks', () => {
    expect(codes('## nothing here\n')).toEqual(['claims.fragment-empty']);
    expect(codes(`${BLOCK}\n${BLOCK}`)).toEqual(['claims.fragment-duplicate']);
  });

  it('diagnostics carry the fragment\'s file and name', () => {
    const result = compileClaims(STORY, `${BLOCK}\ncreate the Den\n  a room\n\n  A den.\n`, { claimsFile: 'x.claims.chord' });
    const d = result.diagnostics.find((d) => d.code === 'claims.fragment-content')!;
    expect(d.span.file).toBe('x.claims.chord');
    expect(d.message.startsWith('[x.claims.chord] ')).toBe(true);
  });

  it('a story that does not compile reports the story and never reads the fragment', () => {
    const result = compileClaims('story\n  title: Broken\n', BLOCK);
    expect(result.ok).toBe(false);
    expect(result.claims).toBeNull();
    expect(result.diagnostics.some((d) => d.code.startsWith('claims.'))).toBe(false);
  });
});

describe('parse errors, each by code', () => {
  const codes = (block: string) => codesOf(compileClaims(STORY, block).diagnostics);
  const NEEDS = '  needs rooms: the Hall\n  needs things: the note\n  needs verbs: read\n';

  it('an empty block', () => {
    expect(codes(`claims\n${NEEDS}end claims\n`)).toEqual(['parse.claims-empty']);
  });

  it('a claim with no predicate line, and one with two', () => {
    expect(codes(`claims\n${NEEDS}\n  claim says nothing\n    needs verbs: read\nend claims\n`)).toEqual(['parse.claim-no-predicate']);
    expect(codes(`claims\n${NEEDS}\n  claim says two things\n    the note is read\n    the kettle is hot\nend claims\n`)).toEqual(['parse.claim-two-predicates']);
  });

  it('a needs line with an unknown key, and an empty one', () => {
    expect(codes(`claims\n  needs doors: the Hall\n${NEEDS}\n  claim c\n    the note is read\nend claims\n`)).toEqual(['parse.claim-needs']);
    expect(codes(`claims\n  needs verbs:\n${NEEDS}\n  claim c\n    the note is read\nend claims\n`)).toEqual(['parse.claim-needs']);
  });

  it('a line the block does not know, a nameless claim, and a missing end', () => {
    expect(codes(`claims\n${NEEDS}  wants the Hall\n\n  claim c\n    the note is read\nend claims\n`)).toEqual(['parse.claims-line']);
    expect(codes(`claims\n${NEEDS}\n  claim\n    the note is read\nend claims\n`)).toEqual(['parse.claim-name']);
    expect(codes(`claims\n${NEEDS}\n  claim c\n    the note is read\n`)).toEqual(['parse.claims-end']);
  });

  it('the claim-only forms refuse their malformed spellings', () => {
    expect(codes(`claims\n${NEEDS}\n  claim c\n    the story ends\nend claims\n`)).toEqual(['parse.claim-ending']);
    expect(codes(`claims\n${NEEDS}\n  claim c\n    Mo was asked about the weather\nend claims\n`)).toEqual(['parse.claim-asked']);
  });
});

describe('resolution errors, each by code and naming the claim', () => {
  const one = (predicate: string, needs = '  needs rooms: the Hall\n  needs things: the note, Mo, the kettle\n  needs verbs: read\n') =>
    compileClaims(STORY, `claims\n${needs}\n  claim the case\n    ${predicate}\nend claims\n`);
  const codes = (predicate: string, needs?: string) => codesOf(one(predicate, needs).diagnostics);

  it('an unknown or ambiguous name', () => {
    expect(codes('the lamp is lit')).toEqual(['claims.unknown-entity']);
    expect(codes('the note is read', '  needs rooms: the Hall\n  needs things: the lamp\n  needs verbs: read\n')).toEqual(['claims.unknown-entity']);
  });

  it('a room listed as a thing, a thing listed as a room, the player listed at all', () => {
    expect(codes('the note is read', '  needs rooms: the note\n  needs things: the Hall\n  needs verbs: read\n')).toEqual(['claims.needs-room-kind', 'claims.needs-thing-kind']);
    expect(codes('the note is read', '  needs rooms: the Hall\n  needs things: the player\n  needs verbs: read\n')).toEqual(['claims.needs-player']);
  });

  it('a state the thing never has, naming its states and the platform words', () => {
    const result = one('the kettle is warm');
    expect(codesOf(result.diagnostics)).toEqual(['claims.state-unknown']);
    const d = result.diagnostics[0];
    expect(d.message).toContain('`the case`');
    expect(d.message).toContain('`cold`, `hot`');
    expect(d.message).toContain('`open`');
  });

  it('a place that must be a room', () => {
    expect(codes('the player is in the box')).toEqual(['claims.room-expected']);
    expect(codes('the note is not in the box')).toEqual(['claims.room-expected']);
  });

  it('an action the thing does not answer to, naming what it does', () => {
    const result = one('the note has been eaten');
    expect(codesOf(result.diagnostics)).toEqual(['claims.action-unknown']);
    expect(result.diagnostics[0].message).toContain('`reading`');
    expect(codes('the kettle has been turned')).toEqual(['claims.action-unknown']);
  });

  it('an ending kind the story has no word for', () => {
    expect(codes('the story ends in glory')).toEqual(['claims.ending-kind']);
  });

  it('a negation, and a condition a claim cannot state', () => {
    expect(codes('the kettle is not hot')).toEqual(['claims.predicate-negated']);
    expect(codes('the kettle is hot or the kettle is cold')).toEqual(['claims.predicate-unsupported']);
    expect(codes('the note is here')).toEqual(['claims.predicate-unsupported']);
  });
});
