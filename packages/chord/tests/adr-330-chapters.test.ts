/**
 * adr-330-chapters.test.ts — ADR-330 Phase 1: the `define chapters` grammar.
 *
 * Parse + analyze only (the runtime is Phase 2): the block lowers to
 * `ir.chapters` in declaration order with the four trigger kinds resolved;
 * the `use chapters` gate, the opening-row rules, name uniqueness, the
 * one-block rule, and the trigger spellings each refuse by name (ADR-330
 * Acceptance 1 and 4).
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const story = (header: string, body: string) => `story
  title: Chapters
  authors:
    T
  id: chapters
  story-version: 0.0.1
${header}
create the Market
  a room

  A market.

create the Street
  a room
  east to the Market
  states: quiet, busy

  A street.

create Jack
  a person
  playable
  starts in the Market

  You.

define timer bell for the player
end timer

before the game starts
  change the player to Jack
end before

${body}`;

const compileStory = (header: string, body: string) => {
  const r = compile(story(header, body));
  return { ir: r.ir, errors: r.diagnostics.filter((d) => d.severity === 'error') };
};

const BLOCK = `define chapters
  market - Chapter I: The Market
    A stolen apple, and a girl the whole city is about to start looking for.
    begins when the game starts
  street - Chapter II: The Street
    begins when the player visits the Street for the first time
end chapters
`;

describe('define chapters (ADR-330 D1) — the block lowers to ir.chapters', () => {
  it('two rows in order, with name, raw title, description (empty when absent), ordinal, and resolved triggers', () => {
    const { ir, errors } = compileStory('  use chapters', BLOCK);
    expect(errors).toEqual([]);
    expect(ir.uses).toContain('chapters');
    expect(ir.chapters).toBeDefined();
    expect(ir.chapters!.map((c) => c.name)).toEqual(['market', 'street']);
    expect(ir.chapters!.map((c) => c.ordinal)).toEqual([0, 1]);
    expect(ir.chapters![0].title).toBe('Chapter I: The Market');
    expect(ir.chapters![0].description).toBe('A stolen apple, and a girl the whole city is about to start looking for.');
    expect(ir.chapters![1].description).toBe('');
    expect(ir.chapters![0].trigger).toEqual({ kind: 'game-starts' });
    expect(ir.chapters![1].trigger).toEqual({ kind: 'first-visit', room: 'street' });
  });

  it('a timer expiry and a state anchor (entity and story) are triggers; the timer is named by its possessive', () => {
    const body = `define chapters
  market - I
    begins when the game starts
  ball - II
    begins when the player's bell expires
  busy - III
    begins when the Street becomes busy
end chapters
`;
    const { ir, errors } = compileStory('  use chapters\n  states: calm, chase', body);
    expect(errors).toEqual([]);
    expect(ir.chapters![1].trigger).toEqual({ kind: 'timer-expires', timer: 'player.bell' });
    expect(ir.chapters![2].trigger).toEqual({ kind: 'becomes', owner: 'street', state: 'busy' });
  });

  it('`the story becomes <state>` resolves to the story owner', () => {
    const body = `define chapters
  market - I
    begins when the game starts
  chase - II
    begins when the story becomes chase
end chapters
`;
    const { ir, errors } = compileStory('  use chapters\n  states: calm, chase', body);
    expect(errors).toEqual([]);
    expect(ir.chapters![1].trigger).toEqual({ kind: 'becomes', owner: 'story', state: 'chase' });
  });

  it('a story without `use chapters` and without a block carries no `chapters` field at all', () => {
    const { ir, errors } = compileStory('', '');
    expect(errors).toEqual([]);
    expect('chapters' in ir).toBe(false);
  });
});

describe('the gates (ADR-330 D1–D3, Acceptance 4)', () => {
  const codes = (errors: { code: string }[]) => errors.map((e) => e.code);

  it('the block without `use chapters` is analysis.chapters-needs-use, on the block', () => {
    const { errors } = compileStory('', BLOCK);
    expect(codes(errors)).toEqual(['analysis.chapters-needs-use']);
    expect(errors[0].span.line).toBe(story('', BLOCK).split('\n').findIndex((l) => l.startsWith('define chapters')) + 1);
  });

  it('no row on `the game starts` is analysis.chapter-no-opening', () => {
    const body = `define chapters
  street - II
    begins when the player visits the Street for the first time
end chapters
`;
    expect(codes(compileStory('  use chapters', body).errors)).toEqual(['analysis.chapter-no-opening']);
  });

  it('two rows on `the game starts` is analysis.chapter-two-openings, on the second', () => {
    const body = `define chapters
  market - I
    begins when the game starts
  again - II
    begins when the game starts
end chapters
`;
    const { errors } = compileStory('  use chapters', body);
    expect(codes(errors)).toEqual(['analysis.chapter-two-openings']);
    expect(errors[0].message).toContain('second row');
  });

  it('the opening row must be first — analysis.chapter-opening-not-first', () => {
    const body = `define chapters
  street - II
    begins when the player visits the Street for the first time
  market - I
    begins when the game starts
end chapters
`;
    expect(codes(compileStory('  use chapters', body).errors)).toEqual(['analysis.chapter-opening-not-first']);
  });

  it('a repeated name is analysis.duplicate-chapter', () => {
    const body = `define chapters
  market - I
    begins when the game starts
  market - II
    begins when the player visits the Street for the first time
end chapters
`;
    expect(codes(compileStory('  use chapters', body).errors)).toEqual(['analysis.duplicate-chapter']);
  });

  it('a second `define chapters` block is analysis.duplicate-chapters', () => {
    const second = `define chapters
  coda - III
    begins when the player visits the Street for the first time
end chapters
`;
    expect(codes(compileStory('  use chapters', BLOCK + '\n' + second).errors)).toEqual(['analysis.duplicate-chapters']);
  });

  it('a row without `begins when` is parse.chapter-no-trigger', () => {
    const body = `define chapters
  market - I
    begins when the game starts
  street - II
    Just a description, no moment.
end chapters
`;
    expect(codes(compileStory('  use chapters', body).errors)).toEqual(['parse.chapter-no-trigger']);
  });

  it('a row that is not `<name> - <title>` is parse.chapter-row', () => {
    const body = `define chapters
  market I
    begins when the game starts
end chapters
`;
    expect(codes(compileStory('  use chapters', body).errors)).toContain('parse.chapter-row');
  });

  it('`<entity> moves` is refused as a trigger with the four spellings named', () => {
    const body = `define chapters
  market - I
    begins when the game starts
  street - II
    begins when Jack moves
end chapters
`;
    const { errors } = compileStory('  use chapters', body);
    expect(codes(errors)).toEqual(['parse.chapter-trigger', 'parse.chapter-no-trigger']);
    expect(errors[0].message).toContain('not a chapter trigger');
  });

  it('a first visit must name a room — analysis.chapter-visit-not-room', () => {
    const body = `define chapters
  market - I
    begins when the game starts
  jack - II
    begins when the player visits Jack for the first time
end chapters
`;
    expect(codes(compileStory('  use chapters', body).errors)).toEqual(['analysis.chapter-visit-not-room']);
  });

  it('an undeclared state on a becomes trigger is analysis.undeclared-state', () => {
    const body = `define chapters
  market - I
    begins when the game starts
  odd - II
    begins when the Street becomes odd
end chapters
`;
    expect(codes(compileStory('  use chapters', body).errors)).toEqual(['analysis.undeclared-state']);
  });

  it('an unknown timer is analysis.unknown-timer', () => {
    const body = `define chapters
  market - I
    begins when the game starts
  ball - II
    begins when the gong expires
end chapters
`;
    expect(codes(compileStory('  use chapters', body).errors)).toEqual(['analysis.unknown-timer']);
  });

  it('`use chapters` alone (no block) compiles clean — the extension is on, with nothing declared yet', () => {
    const { ir, errors } = compileStory('  use chapters', '');
    expect(errors).toEqual([]);
    expect(ir.uses).toContain('chapters');
    expect('chapters' in ir).toBe(false);
  });
});

describe('chapters are readable (ADR-330 D5) — during / before / after', () => {
  const codes = (errors: { code: string }[]) => errors.map((e) => e.code);
  const withClauses = (clauses: string) => story('  use chapters', BLOCK + clauses);

  it('`during <name>` on a head is sugar for `while during <name>`, and the atom composes with `and`', () => {
    const src = withClauses(`
create the grocer
  a person
  in the Market

  on the player talking during street
    refuse no-time
  end on

  on the player smelling while hunted-ish and during market
    refuse no-time
  end on

define condition hunted-ish: the Street is busy

define phrase no-time
  No time.
end phrase
`);
    const r = compile(src);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const grocer = r.ir.entities.find((e) => e.id === 'grocer')!;
    expect(grocer.onClauses[0].condition).toEqual({ kind: 'chapter', relation: 'during', ordinal: 1 });
    expect(grocer.onClauses[1].condition).toMatchObject({ kind: 'and', operands: [{ kind: 'condition', name: 'hunted-ish' }, { kind: 'chapter', relation: 'during', ordinal: 0 }] });
  });

  it('`before` and `after` are condition atoms; a room\'s `phrase detail during …:` and a blocked exit take the sugar too', () => {
    const src = withClauses(`
create the Alley
  a room
  north to the Market
  north is blocked during street: alley-shut
  east is blocked while before street: alley-early

  An alley.

  phrase detail during market:
    Market noise.

  phrase detail while after market:
    Quiet now.

define phrase alley-shut
  Shut.
end phrase

define phrase alley-early
  Early.
end phrase
`);
    const r = compile(src);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const alley = r.ir.entities.find((e) => e.id === 'alley')!;
    expect(alley.blockedExits.map((b) => b.condition)).toEqual([
      { kind: 'chapter', relation: 'during', ordinal: 1 },
      { kind: 'chapter', relation: 'before', ordinal: 1 },
    ]);
  });

  it('`while` and `during` on one head is parse.head-while-during', () => {
    const src = withClauses(`
create the grocer
  a person
  in the Market

  on the player talking while (the Street is busy) during market
    refuse no-time
  end on

define phrase no-time
  No time.
end phrase
`);
    expect(codes(compile(src).diagnostics.filter((d) => d.severity === 'error'))).toContain('parse.head-while-during');
  });

  it('an unknown chapter name is analysis.unknown-chapter, with the rows named', () => {
    const src = withClauses(`
create the grocer
  a person
  in the Market

  on the player talking during ballroom
    refuse no-time
  end on

define phrase no-time
  No time.
end phrase
`);
    const errors = compile(src).diagnostics.filter((d) => d.severity === 'error');
    expect(codes(errors)).toEqual(['analysis.unknown-chapter']);
    expect(errors[0].message).toContain('market, street');
  });

  it('a chapter predicate without `use chapters` is analysis.chapters-needs-use', () => {
    const src = story('', `
create the grocer
  a person
  in the Market

  on the player talking during market
    refuse no-time
  end on

define phrase no-time
  No time.
end phrase
`);
    expect(codes(compile(src).diagnostics.filter((d) => d.severity === 'error'))).toEqual(['analysis.chapters-needs-use']);
  });
});
