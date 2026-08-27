/**
 * adr-320-phase4.test.ts — ADR-320 Phase 4: the Chord grammar slice for
 * exchange blocks, initiative blocks, and the conversation-row agency
 * statements (vocabulary frozen 2026-08-17).
 *
 * Derived from the Phase 4 Behavior Statements: every DOES line asserts on
 * the emitted IR (exchanges, initiative rows, lowered statements), and
 * every REJECTS WHEN line asserts on the specific diagnostic code.
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

const EXCHANGE = `define exchange loyalty-question for Will Kemp
  answer "yes", "aye":
    phrase kemp-pleased
      He beams.
  answer the Hall:
    phrase kemp-looks-around
      He looks around the hall.
  on leaving:
    phrase kemp-calls-after
      "Walk away, then!"
  on silence:
    phrase kemp-shrugs
      He shrugs.
end exchange
`;

describe('define exchange — rows, strength, then-open wiring', () => {
  it('folds the exchange onto the owner with lowered rows of all three head kinds', () => {
    const result = compiled(EXCHANGE);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const owner = kemp(result);
    expect(owner.exchanges).toBeDefined();
    expect(owner.exchanges!).toHaveLength(1);
    const exchange = owner.exchanges![0];
    expect(exchange.name).toBe('loyalty-question');
    expect(exchange.strength).toBeUndefined();
    expect(exchange.rows.map((r) => r.head)).toEqual([
      { kind: 'answer', filter: { kind: 'text', primary: 'yes', aliases: ['aye'] } },
      { kind: 'answer', filter: { kind: 'entity', id: result.ir.entities.find((e) => e.name === 'Hall')!.id } },
      { kind: 'act', action: 'leaving' },
      { kind: 'silence' },
    ]);
    // Bodies lowered as statements — the silence row renders its phrase (D8:
    // silence is a response, never an absence).
    expect(exchange.rows[3].body[0].kind).toBe('phrase');
  });

  it('carries the header strength word exactly as spelled (D10)', () => {
    const result = compiled(`define exchange the-accusation for Will Kemp, blocking
  answer "no":
    phrase kemp-denies
      "Never."
end exchange
`);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(kemp(result).exchanges![0].strength).toBe('blocking');
  });

  it('accepts the same exchange key on different owners, in declaration order', () => {
    const result = compiled(EXCHANGE + `
define exchange loyalty-question for Richard Burbage
  answer "yes":
    phrase burbage-nods
      He nods gravely.
end exchange
`);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const burbage = result.ir.entities.find((e) => e.name.toLowerCase().includes('burbage'))!;
    expect(burbage.exchanges!).toHaveLength(1);
    expect(kemp(result).exchanges!).toHaveLength(1);
  });

  it('rejects a duplicate (owner, key) pair', () => {
    const errors = errorsOf(EXCHANGE + '\n' + EXCHANGE);
    expect(errors.some((d) => d.code === 'analysis.duplicate-exchange')).toBe(true);
  });

  it('rejects a non-person host', () => {
    const errors = errorsOf(`define exchange lobby-talk for the Hall
  answer "yes":
    phrase a-key
      X.
end exchange
`);
    expect(errors.some((d) => d.code === 'analysis.exchange-host')).toBe(true);
  });

  it('rejects duplicate answers (aliases included), duplicate act and silence rows', () => {
    expect(errorsOf(`define exchange e-one for Will Kemp
  answer "yes":
    phrase a-key
      X.
  answer "aye", "yes":
    phrase b-key
      Y.
end exchange
`).some((d) => d.code === 'analysis.duplicate-answer')).toBe(true);
    expect(errorsOf(`define exchange e-two for Will Kemp
  on leaving:
    phrase a-key
      X.
  on leaving:
    phrase b-key
      Y.
end exchange
`).some((d) => d.code === 'analysis.duplicate-answer')).toBe(true);
    expect(errorsOf(`define exchange e-three for Will Kemp
  on silence:
    phrase a-key
      X.
  on silence:
    phrase b-key
      Y.
end exchange
`).some((d) => d.code === 'analysis.duplicate-answer')).toBe(true);
  });

  it('rejects a quoted answer colliding with an entity-tier answer', () => {
    const errors = errorsOf(`define exchange e-four for Will Kemp
  answer the Hall:
    phrase a-key
      X.
  answer "hall":
    phrase b-key
      Y.
end exchange
`);
    expect(errors.some((d) => d.code === 'analysis.answer-entity-collision')).toBe(true);
  });

  it('rejects a malformed strength marker by naming the vocabulary', () => {
    const errors = errorsOf(`define exchange e-five for Will Kemp, loudly
  answer "yes":
    phrase a-key
      X.
end exchange
`);
    expect(errors.some((d) => d.code === 'parse.exchange-strength')).toBe(true);
  });

  it('rejects malformed rows, empty bodies, and empty blocks by name', () => {
    expect(errorsOf('define exchange e-six for Will Kemp\n  about x: phrase y\nend exchange\n')
      .some((d) => d.code === 'parse.exchange-row')).toBe(true);
    expect(errorsOf('define exchange e-seven for Will Kemp\n  answer "yes":\nend exchange\n')
      .some((d) => d.code === 'parse.exchange-response')).toBe(true);
    expect(errorsOf('define exchange e-eight for Will Kemp\nend exchange\n')
      .some((d) => d.code === 'parse.exchange-empty')).toBe(true);
  });
});

describe('then asks / then invites — opening an exchange from a row', () => {
  const TOPICS_AND_EXCHANGE = `define topics for Will Kemp
  about "the tour":
    phrase kemp-complains-tour
      "Nothing but rain and fleas."
    then asks loyalty-question
  about "the money":
    phrase kemp-eyes-narrow
      His eyes narrow.
    then invites loyalty-question
end topics

` + EXCHANGE;

  it('lowers both words as data on the then-open statement', () => {
    const result = compiled(TOPICS_AND_EXCHANGE);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const owner = kemp(result);
    const tourRow = owner.topics[0];
    expect(tourRow.body[1]).toEqual(
      expect.objectContaining({ kind: 'then-open', word: 'asks', exchange: 'loyalty-question' }),
    );
    const moneyRow = owner.topics[1];
    expect(moneyRow.body[1]).toEqual(
      expect.objectContaining({ kind: 'then-open', word: 'invites', exchange: 'loyalty-question' }),
    );
  });

  it('chains from an exchange row', () => {
    const result = compiled(EXCHANGE + `
define exchange why-the-change for Will Kemp
  answer "why":
    phrase kemp-why
      "Why indeed."
    then asks loyalty-question
end exchange
`);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const chained = kemp(result).exchanges!.find((x) => x.name === 'why-the-change')!;
    expect(chained.rows[0].body[1]).toEqual(
      expect.objectContaining({ kind: 'then-open', word: 'asks', exchange: 'loyalty-question' }),
    );
  });

  it('rejects a target that is not an exchange of the same owner', () => {
    // Burbage owns the exchange; Kemp's row must not open it (a cross-owner
    // open makes no sense — the exchange is the speaker's own moment).
    const errors = errorsOf(`define topics for Will Kemp
  about "the tour":
    phrase kemp-complains-tour
      "Rain."
    then asks burbage-question
end topics

define exchange burbage-question for Richard Burbage
  answer "yes":
    phrase burbage-nods
      He nods.
end exchange
`);
    expect(errors.some((d) => d.code === 'analysis.then-target')).toBe(true);
  });

  it('rejects the statement outside conversation rows', () => {
    const errors = errorsOf(`create the playbill
  a thing
  in the Hall

  A playbill.

  on the player reading
    then asks loyalty-question
  end on

` + EXCHANGE);
    expect(errors.some((d) => d.code === 'parse.then-context')).toBe(true);
  });

  it('rejects a malformed form by name', () => {
    expect(errorsOf(`define topics for Will Kemp
  about "the tour":
    phrase a-key
      X.
    then ponders loyalty-question
end topics
`).some((d) => d.code === 'parse.then-word')).toBe(true);
  });
});

describe('deflect to / leave — the agency statements (D8)', () => {
  const TOPICS = `define topics for Will Kemp
  about "the tour":
    phrase kemp-complains-tour
      "Rain."
  about the Hall:
    phrase kemp-on-hall
      "A fine house."
  about "the money":
    phrase kemp-deflects
      He waves the question off.
    deflect to "the tour"
  about "the wager":
    phrase kemp-wager
      He glances at the door.
    deflect to the Hall
  about "the crown":
    phrase kemp-leaves
      Enough of this.
    leave
end topics
`;

  it('lowers deflect targets (text normalized, entity resolved) and leave', () => {
    const result = compiled(TOPICS);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const owner = kemp(result);
    expect(owner.topics[2].body[1]).toEqual(
      expect.objectContaining({ kind: 'deflect', target: { kind: 'text', primary: 'the tour' } }),
    );
    const hallId = result.ir.entities.find((e) => e.name === 'Hall')!.id;
    expect(owner.topics[3].body[1]).toEqual(
      expect.objectContaining({ kind: 'deflect', target: { kind: 'entity', id: hallId } }),
    );
    expect(owner.topics[4].body[1]).toEqual(expect.objectContaining({ kind: 'leave' }));
  });

  it('rejects a deflect target absent from the owner\'s own table', () => {
    const errors = errorsOf(`define topics for Will Kemp
  about "the tour":
    phrase kemp-complains-tour
      "Rain."
    deflect to "the weather"
end topics
`);
    expect(errors.some((d) => d.code === 'analysis.deflect-target')).toBe(true);
  });

  it('rejects both statements outside conversation rows', () => {
    const body = `create the playbill
  a thing
  in the Hall

  A playbill.

  on the player reading
    STMT
  end on
`;
    expect(errorsOf(body.replace('STMT', 'deflect to "the tour"'))
      .some((d) => d.code === 'parse.deflect-context')).toBe(true);
    expect(errorsOf(body.replace('STMT', 'leave'))
      .some((d) => d.code === 'parse.leave-context')).toBe(true);
  });
});

describe('define initiative — occasion rows (D7)', () => {
  const INITIATIVE = `define initiative for Will Kemp
  on an open floor, when Will Kemp is cheerful:
    phrase kemp-grumbles
      "Speak up, whoever you are."
  on silence:
    phrase kemp-fills-the-silence
      "Well. Someone must say something."
  when the subject changes:
    phrase kemp-pounces
      "Don't change the subject on my account."
  on drawing:
    phrase kemp-flinches
      He flinches.
  on an open floor, when Will Kemp is sad:
    hold their tongue
end initiative
`;

  it('folds all four occasion heads, the condition refinement, and the suppression row', () => {
    const result = compiled(INITIATIVE);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const owner = kemp(result);
    expect(owner.initiative).toBeDefined();
    expect(owner.initiative!.map((r) => r.occasion)).toEqual([
      { kind: 'open-floor' },
      { kind: 'silence' },
      { kind: 'subject-change' },
      { kind: 'act', action: 'drawing' },
      { kind: 'open-floor' },
    ]);
    expect(owner.initiative![0].condition).not.toBeNull();
    expect(owner.initiative![1].condition).toBeNull();
    expect(owner.initiative![4].body).toEqual([
      expect.objectContaining({ kind: 'hold-tongue' }),
    ]);
  });

  it('rejects `hold their tongue` sharing a row with other statements', () => {
    const errors = errorsOf(`define initiative for Will Kemp
  on an open floor:
    phrase kemp-grumbles
      "Hm."
    hold their tongue
end initiative
`);
    expect(errors.some((d) => d.code === 'analysis.hold-tongue-alone')).toBe(true);
  });

  it('rejects the suppression statement outside initiative rows', () => {
    const errors = errorsOf(`define topics for Will Kemp
  about "the tour":
    hold their tongue
end topics
`);
    expect(errors.some((d) => d.code === 'parse.hold-tongue-context')).toBe(true);
  });

  it('rejects a duplicate block and a non-person host', () => {
    expect(errorsOf(INITIATIVE + '\n' + INITIATIVE)
      .some((d) => d.code === 'analysis.duplicate-initiative-block')).toBe(true);
    expect(errorsOf(`define initiative for the Hall
  on silence:
    phrase a-key
      X.
end initiative
`).some((d) => d.code === 'analysis.initiative-host')).toBe(true);
  });

  it('rejects unknown occasion heads and a comma not followed by `when`', () => {
    expect(errorsOf(`define initiative for Will Kemp
  at dawn:
    phrase a-key
      X.
end initiative
`).some((d) => d.code === 'parse.initiative-row')).toBe(true);
    expect(errorsOf(`define initiative for Will Kemp
  on an open floor, after days:
    phrase a-key
      X.
end initiative
`).some((d) => d.code === 'parse.initiative-when')).toBe(true);
  });
});

describe('cost leg — stories without the new constructs are unaffected', () => {
  it('a story with no exchange/initiative blocks compiles with no new diagnostics and no new IR fields', () => {
    const result = compile(HEADER + WORLD);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const owner = kemp(result);
    expect(owner.exchanges).toBeUndefined();
    expect(owner.initiative).toBeUndefined();
  });
});
