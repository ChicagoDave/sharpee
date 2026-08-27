/**
 * adr-320-threads.test.ts — ADR-320 D14 (Phase 10.1): the Chord grammar
 * slice for conversation threads — `define conversation` blocks and the
 * `is concluded` predicate (vocabulary frozen 2026-08-17).
 *
 * Derived from the Phase 10.1 Behavior Statements: every DOES line
 * asserts on the emitted IR (thread shape, lowered conditions, resolved
 * filters), and every REJECTS WHEN line asserts on the specific
 * diagnostic code.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import type { IREntity } from '../src';

const HEADER = 'story\n  title: T\n  authors:\n    N\n  id: t\n  story-version: 0.0.1\n\n';

const WORLD = `create the Hall
  a room

  A hall.

create Alex
  a person
  playable
  in the Hall

  You.

before the game starts
  change the player to Alex
end before

create Will Kemp
  a person
  in the Hall
  mood cheerful
  states: settled, sworn

  The clown.

create Richard Burbage
  a person
  in the Hall

  The tragedian.

`;

function compiled(body: string) {
  return compile(HEADER + WORLD + body);
}

function errorsOf(body: string) {
  return compiled(body).diagnostics.filter((d) => d.severity === 'error');
}

function kemp(result: ReturnType<typeof compile>): IREntity {
  const e = result.ir.entities.find((en) => en.name.toLowerCase().includes('kemp'));
  expect(e).toBeDefined();
  return e!;
}

const THREAD = `define conversation the-defection for Will Kemp, blocking
  about "the rose", "the admirals men"
  opens when Will Kemp is cheerful
  beat:
    phrase kemp-looks-south
      He looks south over the roofs.
  beat, when Will Kemp is sworn:
    phrase kemp-plans-the-jig
      "The Rose will have jigs again."
  on parting:
    phrase kemp-holds-the-thought
      "Hold that thought."
  on resuming:
    phrase kemp-as-i-was-saying
      "As I was saying."
  on refusing:
    phrase kemp-answer-me-first
      "Answer me first."
  conclusion:
    phrase kemp-settles-it
      "Settled, then."
    change Will Kemp to sworn
end conversation
`;

describe('define conversation — the full thread shape on the owner', () => {
  it('folds the block onto the owner with filter, gates, beats, transitions, and conclusion', () => {
    const result = compiled(THREAD);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const owner = kemp(result);
    expect(owner.conversations).toBeDefined();
    expect(owner.conversations!).toHaveLength(1);
    const thread = owner.conversations![0];
    expect(thread.name).toBe('the-defection');
    expect(thread.strength).toBe('blocking');
    expect(thread.filter).toEqual({ kind: 'text', primary: 'the rose', aliases: ['the admirals men'] });
    expect(thread.opensWhen).toBeDefined();
    expect(thread.beats).toHaveLength(2);
    expect(thread.beats[0].condition).toBeNull();
    expect(thread.beats[0].body[0].kind).toBe('phrase');
    expect(thread.beats[1].condition).not.toBeNull();
    expect(thread.onParting?.[0].kind).toBe('phrase');
    expect(thread.onResuming?.[0].kind).toBe('phrase');
    expect(thread.onRefusing?.[0].kind).toBe('phrase');
    // The conclusion body lowered as statements — the mutation rides it.
    expect(thread.conclusion.map((s) => s.kind)).toEqual(['phrase', 'change']);
  });

  it('resolves an entity-tier about filter to the world id', () => {
    const result = compiled(`define conversation hall-talk for Will Kemp
  about the Hall
  beat:
    phrase kemp-on-hall
      "A fine hall."
  conclusion:
    phrase kemp-hall-done
      "Enough of halls."
end conversation
`);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const hallId = result.ir.entities.find((e) => e.name === 'Hall')!.id;
    expect(kemp(result).conversations![0].filter).toEqual({ kind: 'entity', id: hallId });
  });

  it('carries no strength and no filter when unset (runtime derives; opens-when-only threads)', () => {
    const result = compiled(`define conversation quiet-word for Will Kemp
  opens when Will Kemp is cheerful
  beat:
    phrase kemp-a-word
      "A word with you."
  conclusion:
    phrase kemp-word-done
      "That is all."
end conversation
`);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const thread = kemp(result).conversations![0];
    expect(thread.strength).toBeUndefined();
    expect(thread.filter).toBeUndefined();
    expect(thread.opensWhen).toBeDefined();
  });

  it('accepts the same thread key on different owners', () => {
    const burbageThread = `define conversation the-defection for Richard Burbage
  beat:
    phrase burbage-side
      His side of it.
  conclusion:
    phrase burbage-settles
      "Done."
end conversation
`;
    const result = compiled(THREAD + '\n' + burbageThread);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(kemp(result).conversations!).toHaveLength(1);
    const burbage = result.ir.entities.find((e) => e.name.toLowerCase().includes('burbage'))!;
    expect(burbage.conversations!).toHaveLength(1);
  });
});

describe('define conversation — rejection legs', () => {
  it('rejects a duplicate (owner, key) pair', () => {
    expect(errorsOf(THREAD + '\n' + THREAD).some((d) => d.code === 'analysis.duplicate-conversation')).toBe(true);
  });

  it('rejects a non-person host', () => {
    expect(errorsOf(`define conversation hall-life for the Hall
  beat:
    phrase a-key
      X.
  conclusion:
    phrase b-key
      Y.
end conversation
`).some((d) => d.code === 'analysis.conversation-host')).toBe(true);
  });

  it('rejects zero beats and a missing conclusion by name', () => {
    expect(errorsOf(`define conversation empty-thread for Will Kemp
  conclusion:
    phrase a-key
      X.
end conversation
`).some((d) => d.code === 'parse.conversation-no-beat')).toBe(true);
    expect(errorsOf(`define conversation open-thread for Will Kemp
  beat:
    phrase a-key
      X.
end conversation
`).some((d) => d.code === 'parse.conversation-no-conclusion')).toBe(true);
  });

  it('rejects duplicate one-per-block rows by name', () => {
    expect(errorsOf(`define conversation twice-concluded for Will Kemp
  beat:
    phrase a-key
      X.
  conclusion:
    phrase b-key
      Y.
  conclusion:
    phrase c-key
      Z.
end conversation
`).some((d) => d.code === 'parse.conversation-duplicate-row')).toBe(true);
    expect(errorsOf(`define conversation twice-parted for Will Kemp
  beat:
    phrase a-key
      X.
  on parting:
    phrase b-key
      Y.
  on parting:
    phrase c-key
      Z.
  conclusion:
    phrase d-key
      W.
end conversation
`).some((d) => d.code === 'parse.conversation-duplicate-row')).toBe(true);
  });

  it('rejects a malformed strength word, an unknown transition row, and a malformed beat gate', () => {
    expect(errorsOf(`define conversation loud-thread for Will Kemp, loudly
  beat:
    phrase a-key
      X.
  conclusion:
    phrase b-key
      Y.
end conversation
`).some((d) => d.code === 'parse.conversation-strength')).toBe(true);
    expect(errorsOf(`define conversation odd-row for Will Kemp
  beat:
    phrase a-key
      X.
  on sulking:
    phrase b-key
      Y.
  conclusion:
    phrase c-key
      Z.
end conversation
`).some((d) => d.code === 'parse.conversation-row')).toBe(true);
    expect(errorsOf(`define conversation bad-gate for Will Kemp
  beat, after days:
    phrase a-key
      X.
  conclusion:
    phrase b-key
      Y.
end conversation
`).some((d) => d.code === 'parse.conversation-beat')).toBe(true);
  });

  it('rejects a malformed opens-when and an empty block body row', () => {
    expect(errorsOf(`define conversation bad-opens for Will Kemp
  opens tomorrow
  beat:
    phrase a-key
      X.
  conclusion:
    phrase b-key
      Y.
end conversation
`).some((d) => d.code === 'parse.conversation-opens')).toBe(true);
    expect(errorsOf(`define conversation hollow-beat for Will Kemp
  beat:
  conclusion:
    phrase a-key
      X.
end conversation
`).some((d) => d.code === 'parse.conversation-body')).toBe(true);
  });

  it('rejects a missing end conversation', () => {
    expect(errorsOf(`define conversation unclosed for Will Kemp
  beat:
    phrase a-key
      X.
  conclusion:
    phrase b-key
      Y.
`).some((d) => d.code === 'parse.conversation-end')).toBe(true);
  });
});

describe('conversation-row statements — then asks wiring inside beats', () => {
  it('a beat body opens the owner\'s own exchange; a cross-owner target is rejected', () => {
    const withExchange = `define exchange the-offer for Will Kemp
  answer "yes":
    phrase kemp-pleased
      He beams.
end exchange

define conversation the-defection for Will Kemp
  beat:
    phrase kemp-names-it
      "Here is the shape of it."
    then asks the-offer
  conclusion:
    phrase kemp-settles-it
      "Settled."
end conversation
`;
    const result = compiled(withExchange);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const thread = kemp(result).conversations![0];
    expect(thread.beats[0].body[1]).toEqual(
      expect.objectContaining({ kind: 'then-open', word: 'asks', exchange: 'the-offer' }),
    );

    const crossOwner = `define exchange burbage-question for Richard Burbage
  answer "yes":
    phrase burbage-nods
      He nods.
end exchange

define conversation the-defection for Will Kemp
  beat:
    phrase kemp-names-it
      "Here is the shape of it."
    then asks burbage-question
  conclusion:
    phrase kemp-settles-it
      "Settled."
end conversation
`;
    expect(errorsOf(crossOwner).some((d) => d.code === 'analysis.then-target')).toBe(true);
  });
});

describe('`is concluded` — the D14 predicate', () => {
  it('lowers `<thread> is concluded` and its negation against a declared thread', () => {
    const result = compiled(THREAD + `
define topics for Richard Burbage
  about "kemp":
    phrase burbage-after when the-defection is concluded
      "So the clown is settled."
    phrase burbage-before when the-defection is not concluded
      "Kemp is Kemp."
end topics
`);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const burbage = result.ir.entities.find((e) => e.name.toLowerCase().includes('burbage'))!;
    const row = burbage.topics[0];
    const afterStmt = row.body[0] as { stmtWhen?: unknown };
    expect(afterStmt.stmtWhen).toEqual({ kind: 'concluded', thread: 'the-defection' });
    const beforeStmt = row.body[1] as { stmtWhen?: unknown };
    expect(beforeStmt.stmtWhen).toEqual({ kind: 'not', operand: { kind: 'concluded', thread: 'the-defection' } });
  });

  it('rejects an undeclared thread key by name', () => {
    expect(errorsOf(`define topics for Will Kemp
  about "the rose":
    phrase kemp-rose when the-defection is concluded
      "The rose."
end topics
`).some((d) => d.code === 'analysis.unknown-conversation')).toBe(true);
  });

  it('an entity state named like the word keeps its ordinary is-value parse (standalone rule)', () => {
    // `sworn` is a real state; `is concluded` triggers ONLY for the frozen
    // word standing alone — an ordinary state condition still parses.
    expect(errorsOf(`define topics for Will Kemp
  about "the rose":
    phrase kemp-rose when Will Kemp is sworn
      "The rose."
end topics
`)).toEqual([]);
  });
});

describe('cost leg — stories without the new construct are unaffected', () => {
  it('a story with no conversation blocks compiles with no new diagnostics and no new IR fields', () => {
    const result = compile(HEADER + WORLD);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(kemp(result).conversations).toBeUndefined();
  });
});
