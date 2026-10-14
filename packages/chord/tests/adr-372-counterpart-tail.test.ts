/**
 * ADR-372 D1 compile-time gates: a clause head names the other noun of a
 * two-noun action, read from the end of the head, and lowers it to the IR
 * clause's `counterpart` id.
 */

import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import type { StoryIR } from '../src/ir';

const HEADER = `story
  title: Market
  authors:
    T
  id: market
  story-version: 0.0.1
`;

const story = (body: string) => `${HEADER}
before the game starts
  change the player to Courier
end before

create the Market Row
  a room

  Stalls.

create Courier
  a person
  playable
  starts in the Market Row

  You.

create Tobias
  a person
  in the Market Row

  A grocer.

create the brass gong
  a thing, scenery
  in the Market Row

  A gong.

create the dust ball
  a thing
  in the Market Row

  A ball.

create the old boot
  a thing
  in the Market Row

  A boot.

${body}
define phrase rung
  Bong.
end phrase
`;

function codes(source: string): string[] {
  const result = compile(source);
  return result.ok ? [] : result.diagnostics.map((d) => d.code);
}

function ir(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join('; '));
  return result.ir;
}

/** The on-clauses of the entity whose IR id is `id`. */
function clausesOf(compiled: StoryIR, id: string) {
  return compiled.entities.find((e) => e.id === id)!.onClauses;
}

/** A block of clauses appended to one existing entity via a trailing `create`-free story. */
function onGong(clauses: string): string {
  return story('').replace(`create the brass gong
  a thing, scenery
  in the Market Row

  A gong.
`, `create the brass gong
  a thing, scenery
  in the Market Row

  A gong.

${clauses}`);
}

function onBall(clauses: string): string {
  return story('').replace(`create the dust ball
  a thing
  in the Market Row

  A ball.
`, `create the dust ball
  a thing
  in the Market Row

  A ball.

${clauses}`);
}

describe('the counterpart tail (ADR-372 D1)', () => {
  it('names the item from the target side: `throwing the dust ball`', () => {
    const compiled = ir(onGong(`  on the player throwing the dust ball
    phrase rung
  end on
`));
    const clauses = clausesOf(compiled, 'brass-gong');
    expect(clauses).toHaveLength(1);
    expect(clauses[0]).toMatchObject({ action: 'throwing', counterpart: 'dust-ball' });
  });

  it('names the target from the item side, a preposition before the article: `throwing at the brass gong`', () => {
    const clauses = clausesOf(ir(onBall(`  on the player throwing at the brass gong
    phrase rung
  end on
`)), 'dust-ball');
    expect(clauses[0]).toMatchObject({ action: 'throwing', counterpart: 'brass-gong' });
  });

  it('takes a bare preposition before a proper name: `throwing at Tobias`', () => {
    const clauses = clausesOf(ir(onBall(`  on the player throwing at Tobias
    phrase rung
  end on
`)), 'dust-ball');
    expect(clauses[0]).toMatchObject({ action: 'throwing', counterpart: 'tobias' });
  });

  it('reads one word after `to` on a two-noun gerund as the counterpart, not a value', () => {
    const clauses = clausesOf(ir(onBall(`  on the player giving to Tobias
    phrase rung
  end on
`)), 'dust-ball');
    expect(clauses[0]).toMatchObject({ action: 'giving', counterpart: 'tobias' });
    expect(clauses[0].valueTail).toBeUndefined();
  });

  it('reads an article after `to` as a counterpart', () => {
    const clauses = clausesOf(ir(onBall(`  on the player putting to the old boot
    phrase rung
  end on
`)), 'dust-ball');
    expect(clauses[0]).toMatchObject({ action: 'putting', counterpart: 'old-boot' });
  });

  it('leaves an untailed head without a counterpart', () => {
    const clauses = clausesOf(ir(onGong(`  on the player throwing
    phrase rung
  end on
`)), 'brass-gong');
    expect(clauses[0].counterpart).toBeUndefined();
  });

  it('refuses a tail on a one-noun gerund', () => {
    expect(codes(onGong(`  on the player taking the dust ball
    phrase rung
  end on
`))).toContain('analysis.head-counterpart-one-noun');
  });

  it('refuses a counterpart that is not a thing', () => {
    expect(codes(onGong(`  on the player throwing the silver spoon
    phrase rung
  end on
`))).toContain('analysis.head-counterpart-unknown');
  });

  it('refuses a counterpart that is the block owner', () => {
    expect(codes(onGong(`  on the player throwing at the brass gong
    phrase rung
  end on
`))).toContain('analysis.head-counterpart-is-owner');
  });

  it('refuses a tail on a gerund list', () => {
    expect(codes(onGong(`  on the player throwing the dust ball, giving
    phrase rung
  end on
`))).toContain('parse.head-counterpart-list');
  });

  it('catches a bare proper name after the gerund at compile time', () => {
    expect(codes(onBall(`  on the player throwing Tobias
    phrase rung
  end on
`))).toContain('analysis.head-counterpart-bare-name');
  });
});
