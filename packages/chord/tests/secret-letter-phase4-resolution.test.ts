/**
 * secret-letter-phase4-resolution.test.ts — the three resolution defects the
 * Secret Letter port filed against the analyzer and parser
 * (`secret-letter-port-platform-defects` Phase 4):
 *
 * - GH #370 (P-8): `select on <entity>` selects on the entity's declared
 *   state — lowered to the `state` field read, so the arms validate and
 *   the runtime reads the state.
 * - GH #366 (P-10): an entity's own declared state wins a colliding
 *   platform word (`fresh` is an ADR-320 recency word) — resolved as the
 *   state test, ahead of the topic-recency intercept.
 * - GH #361 (P-11): a declared name containing `and` or `&` reads whole in
 *   a condition and a `change`; `&` is a name word in the declaration too.
 *
 * Every assertion reads the compiled IR or the diagnostic list.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

/** A minimal story around `body`: header plus a playable character in `room`. */
const story = (body: string, room = 'the Hall') => `story
  title: Phase Four
  authors:
    T
  id: phase-four
  story-version: 0.0.1

${body}
create Jack
  a person
  playable
  starts in ${room}

  You.

before the game starts
  change the player to Jack
end before
`;

const errors = (result: ReturnType<typeof compile>) => result.diagnostics.filter((d) => d.severity === 'error');

describe('GH #370: `select on <entity>` selects on the declared state', () => {
  const WINCH = `create the Hall
  a room

  A hall.

create the chandelier
  scenery
  in the Hall
  states, reversible: raised, lowered

  A chandelier.

  on the player turning
    select on the chandelier
      when raised
        change the chandelier to lowered
      when lowered
        change the chandelier to raised
    end select
  end on
`;

  it('lowers an entity subject to its `state` field read', () => {
    const result = compile(story(WINCH));
    expect(errors(result)).toEqual([]);
    const chandelier = result.ir!.entities.find((e) => e.id === 'chandelier')!;
    expect(chandelier.onClauses[0].body[0]).toMatchObject({
      kind: 'select-on',
      subject: { kind: 'field', base: { kind: 'entity', id: 'chandelier' }, field: 'state' },
      arms: [{ value: 'raised' }, { value: 'lowered' }],
    });
  });

  it('lowers `it` in a trait clause to the composing entity`s state', () => {
    const TRAIT = `define trait crank
  on the player turning
    select on it
      when raised
        change it to lowered
      when lowered
        change it to raised
    end select
  end on
end trait

create the Hall
  a room

  A hall.

create the chandelier
  scenery, crank
  in the Hall
  states, reversible: raised, lowered

  A chandelier.
`;
    const result = compile(story(TRAIT));
    expect(errors(result)).toEqual([]);
    const trait = result.ir!.traits.find((t) => t.name === 'crank')!;
    expect(trait.onClauses[0].body[0]).toMatchObject({
      kind: 'select-on',
      subject: { kind: 'field', base: { kind: 'it' }, field: 'state' },
    });
  });

  it('refuses an arm that is not a declared state of the subject', () => {
    const result = compile(story(WINCH.replace('when lowered', 'when lowred')));
    expect(errors(result).map((d) => d.code)).toContain('analysis.undeclared-state');
    expect(errors(result).find((d) => d.code === 'analysis.undeclared-state')!.message).toContain('lowred');
  });
});

describe('GH #366: a declared state wins over a colliding platform word', () => {
  const COIN = `create the Hall
  a room

  A hall.

create the coin
  in the Hall
  states: fresh, seen

  A coin.

  phrase coin-seen:
    Seen.

  on the player examining
    change the coin to seen when the coin is fresh
    phrase coin-seen when the coin is seen
  end on
`;

  it('resolves `the coin is fresh` as the state test, not a topic-recency read', () => {
    const result = compile(story(COIN));
    expect(errors(result)).toEqual([]);
    const coin = result.ir!.entities.find((e) => e.id === 'coin')!;
    expect(coin.onClauses[0].body[0]).toMatchObject({
      kind: 'change',
      state: 'seen',
      stmtWhen: { kind: 'predicate', pred: 'is', subject: { kind: 'entity', id: 'coin' }, object: { kind: 'symbol', name: 'fresh' } },
    });
  });

  it('keeps the recency reading for a subject that does not declare the word', () => {
    const result = compile(story(COIN.replace('states: fresh, seen', 'states: shiny, seen').replace('when the coin is fresh', 'when the coin is shiny')
      .replace('phrase coin-seen when the coin is seen', 'phrase coin-seen when the market is fresh')));
    const coin = result.ir!.entities.find((e) => e.id === 'coin')!;
    expect(coin.onClauses[0].body[1]).toMatchObject({ kind: 'phrase', stmtWhen: { kind: 'recency', topic: 'market', word: 'fresh' } });
  });

  it('`it is fresh` in a trait clause reads the composing entity`s state', () => {
    const TRAIT = `define trait inspectable
  on the player examining
    change it to seen when it is fresh
  end on
end trait

create the Hall
  a room

  A hall.

create the coin
  inspectable
  in the Hall
  states: fresh, seen

  A coin.
`;
    const result = compile(story(TRAIT));
    expect(errors(result)).toEqual([]);
    const trait = result.ir!.traits.find((t) => t.name === 'inspectable')!;
    expect(trait.onClauses[0].body[0]).toMatchObject({
      kind: 'change',
      stmtWhen: { kind: 'predicate', pred: 'is', subject: { kind: 'it' }, object: { kind: 'symbol', name: 'fresh' } },
    });
  });
});

describe('GH #361: a declared name containing `and` or `&` reads whole', () => {
  const SHOP = (name: string) => `create ${name}
  a room
  states: new, greeted

  A shop.

  after the player entering while ${name} is new
    change ${name} to greeted
  end after

create the Hall
  a room
  east to ${name}

  A hall.
`;

  it.each([
    ['the Sandler and Sons', 'sandler-and-sons', 'Sandler and Sons'],
    ['the Sandler & Sons', 'sandler-&-sons', 'Sandler & Sons'],
  ])('%s: declaration, condition subject, and `change` target all name the one entity', (name, id, display) => {
    const result = compile(story(SHOP(name)));
    expect(errors(result)).toEqual([]);
    const shop = result.ir!.entities.find((e) => e.id === id)!;
    expect(shop).toBeDefined();
    expect(shop.name).toBe(display);
    const clause = shop.onClauses[0];
    expect(clause.condition).toMatchObject({ pred: 'is', subject: { kind: 'entity', id }, object: { kind: 'symbol', name: 'new' } });
    expect(clause.body[0]).toMatchObject({ kind: 'change', entity: { kind: 'entity', id }, state: 'greeted' });
    const hall = result.ir!.entities.find((e) => e.id === 'hall')!;
    expect(hall.exits.find((x) => x.direction === 'east')?.to).toBe(id);
  });

  it('still reads `and` as the connective after a predicate', () => {
    const body = `create the Hall
  a room
  states: dim, lit

  A hall.

create the lamp
  in the Hall
  states: cold, warm

  A lamp.

  on the player examining
    change the Hall to lit when the lamp is warm and the Hall is dim
  end on
`;
    const result = compile(story(body));
    expect(errors(result)).toEqual([]);
    const lamp = result.ir!.entities.find((e) => e.id === 'lamp')!;
    expect(lamp.onClauses[0].body[0]).toMatchObject({ stmtWhen: { kind: 'and' } });
  });

  it('reports a misspelt connective name by the whole phrase', () => {
    const result = compile(story(SHOP('the Sandler and Sons').replace('while the Sandler and Sons is new', 'while the Sandler and Son is new')));
    const miss = errors(result).find((d) => d.code === 'analysis.unknown-entity');
    expect(miss?.message).toContain('Sandler and Son');
  });
});
