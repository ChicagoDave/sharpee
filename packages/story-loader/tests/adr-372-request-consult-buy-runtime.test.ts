/**
 * ADR-372 D3–D5 on the REAL path: asking a person for a thing, consulting a
 * readable thing's topic table, and buying a priced thing with the buyer's
 * own counter. A compiled Chord story, loaded through the loader and driven
 * by `GameEngine.executeTurn`; assertions read the world (locations, the
 * counter's world-state entry) and the turn's message ids.
 *
 * Behavior Statements:
 *   asking_for  DOES no mutation of its own; a clause on the person moves
 *               the thing. REJECTS an unauthored request with the stock
 *               refusal, the thing's location unchanged.
 *   consulting  DOES run a matched topic row of a readable thing (its
 *               mutation applies). REJECTS an unmatched topic with
 *               nothing_found and an unreadable source with not_consultable.
 *   buying      DOES subtract the price from the buyer's `credits` counter
 *               and move the thing to the buyer. REJECTS a short purse
 *               (cant_afford), an unpriced thing (not_for_sale) and a held
 *               thing (already_have), the counter and location unchanged.
 *
 * Owner context: story-loader tests (rule 13a real-path gate).
 */
import { describe, expect, it } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { CHORD_STATE_PREFIX, counterKey } from '../src/state-keys';
import { bootEngine } from './helpers/boot-engine';

const SOURCE = `story
  title: Market
  authors:
    T
  id: market
  story-version: 0.0.1

before the game starts
  change the player to Courier
end before

create the Market Row
  a room

  Stalls.

  on the player waving
    change the player to Clerk
  end on

  on the player jumping
    change the player to Drifter
  end on

create Courier
  a person
  playable
  starts in the Market Row
  counter credits starts 10

  You.

create the grocer
  a person
  in the Market Row
  carries the ration bar
  carries the apple
  carries the scarf

  A grocer.

  on the player asking_for the ration bar
    move the ration bar to the player
    phrase grocer-hands-bar
  end on

create the ration bar
  a thing
  aka bar

  A bar.

create the apple
  a thing

  An apple.

create the scarf
  a thing, costs 1 credits

  A scarf.

create Clerk
  a person
  playable
  in the Market Row
  counter credits starts 5

  A clerk.

create Drifter
  a person
  playable
  in the Market Row

  A drifter.

define topics for the grocer
  about "apples":
    phrase grocer-apples
end topics

create the map
  a thing, costs 4 credits
  in the Market Row

  A map.

create the telescope
  a thing, costs 25 credits
  in the Market Row

  A telescope.

create the crate
  a thing
  in the Market Row

  A crate.

create the station directory
  a thing, readable with text "KEPLER STATION"
  in the Market Row
  aka directory
  states, reversible: unread, consulted

  A directory.

define topics for the station directory
  about "vance":
    change the station directory to consulted
    phrase directory-vance
end topics

define phrase grocer-apples
  Apples are dear this week.
end phrase

define phrase grocer-hands-bar
  The grocer hands you a bar.
end phrase

define phrase directory-vance
  VANCE SHIPPING: Company Lobby.
end phrase
`;

/** The message ids a turn emitted, in order. */
function ids(result: { events: ISemanticEvent[] }): string[] {
  return result.events
    .map((e) => (e.data as { messageId?: unknown } | undefined)?.messageId)
    .filter((m): m is string => typeof m === 'string');
}

async function boot() {
  const b = bootEngine(SOURCE, 7);
  await b.engine.start();
  const byName = (name: string) => b.world.getAllEntities().find((e) => e.name === name)!;
  const at = (name: string) => b.world.getLocation(byName(name).id);
  const credits = (who = 'courier') => b.world.getStateValue(counterKey('credits', who));
  return { ...b, byName, at, credits };
}

describe('asking for a thing (ADR-372 D3)', () => {
  it('runs the person\'s tailed clause, which hands the thing over', async () => {
    const b = await boot();
    expect(b.at('ration bar')).toBe(b.byName('grocer').id);
    const result = await b.engine.executeTurn('ask grocer for bar');
    expect(b.at('ration bar')).toBe(b.player.id);
    expect(ids(result).join(' ')).not.toContain('if.action.asking_for.refused');
  });

  it('refuses an unauthored request with the stock line and moves nothing', async () => {
    const b = await boot();
    const result = await b.engine.executeTurn('ask grocer for apple');
    expect(b.at('apple')).toBe(b.byName('grocer').id);
    expect(ids(result)).toContain('if.action.asking_for.refused');
  });
});

describe('consulting a readable thing (ADR-372 D4)', () => {
  it('runs the matched topic row', async () => {
    const b = await boot();
    expect(b.world.getStateValue(`${CHORD_STATE_PREFIX}station-directory`)).toBe('unread');
    await b.engine.executeTurn('consult directory about vance');
    expect(b.world.getStateValue(`${CHORD_STATE_PREFIX}station-directory`)).toBe('consulted');
  });

  it('answers through `look up … in …` the same way', async () => {
    const b = await boot();
    await b.engine.executeTurn('look up vance in directory');
    expect(b.world.getStateValue(`${CHORD_STATE_PREFIX}station-directory`)).toBe('consulted');
  });

  it('speaks nothing_found for an unmatched topic and changes nothing', async () => {
    const b = await boot();
    const result = await b.engine.executeTurn('consult directory about plumbing');
    expect(ids(result)).toContain('if.action.consulting.nothing_found');
    expect(b.world.getStateValue(`${CHORD_STATE_PREFIX}station-directory`)).toBe('unread');
  });

  it('keeps each table with its own verb: a person is not consulted, a book is not asked', async () => {
    const b = await boot();
    const consulted = await b.engine.executeTurn('consult grocer about apples');
    expect(ids(consulted)).toContain('if.action.consulting.not_consultable');
    expect(ids(consulted)).not.toContain('grocer-apples');
    const asked = await b.engine.executeTurn('ask directory about vance');
    expect(ids(asked)).not.toContain('directory-vance');
    expect(b.world.getStateValue(`${CHORD_STATE_PREFIX}station-directory`)).toBe('unread');
  });

  it('refuses an unreadable source', async () => {
    const b = await boot();
    const result = await b.engine.executeTurn('consult crate about vance');
    expect(ids(result)).toContain('if.action.consulting.not_consultable');
  });
});

describe('buying with the buyer\'s counter (ADR-372 D5)', () => {
  it('spends the price and moves the thing to the buyer', async () => {
    const b = await boot();
    expect(b.credits()).toBe(10);
    await b.engine.executeTurn('buy map');
    expect(b.credits()).toBe(6);
    expect(b.at('map')).toBe(b.player.id);
  });

  it('refuses a short purse, leaving purse and thing as they were', async () => {
    const b = await boot();
    const result = await b.engine.executeTurn('buy telescope');
    expect(ids(result)).toContain('if.action.buying.cant_afford');
    expect(b.credits()).toBe(10);
    expect(b.at('telescope')).toBe(b.byName('Market Row').id);
  });

  it('refuses an unpriced thing as not for sale', async () => {
    const b = await boot();
    const result = await b.engine.executeTurn('buy crate');
    expect(ids(result)).toContain('if.action.buying.not_for_sale');
    expect(b.credits()).toBe(10);
  });

  it('speaks `bought` and carries the purse after the sale on the event', async () => {
    const b = await boot();
    const result = await b.engine.executeTurn('buy map');
    expect(ids(result)).toContain('if.action.buying.bought');
    const bought = result.events.find((e) => e.type === 'if.event.bought')!;
    expect((bought.data as { purseAfter?: number }).purseAfter).toBe(6);
  });

  it('buys a thing another character carries, moving it from the holder', async () => {
    const b = await boot();
    expect(b.at('scarf')).toBe(b.byName('grocer').id);
    await b.engine.executeTurn('buy scarf');
    expect(b.at('scarf')).toBe(b.player.id);
    expect(b.credits()).toBe(9);
  });

  it('spends the purse of whoever holds the player role', async () => {
    const b = await boot();
    await b.engine.executeTurn('wave');
    const clerk = b.byName('Clerk');
    expect(b.world.getPlayer()!.id).toBe(clerk.id);
    await b.engine.executeTurn('buy map');
    expect(b.credits('clerk')).toBe(1);
    expect(b.credits()).toBe(10);
    expect(b.at('map')).toBe(clerk.id);
  });

  it('refuses a buyer who carries no such counter', async () => {
    const b = await boot();
    await b.engine.executeTurn('jump');
    expect(b.world.getPlayer()!.id).toBe(b.byName('Drifter').id);
    const result = await b.engine.executeTurn('buy map');
    expect(ids(result)).toContain('if.action.buying.cant_afford');
    expect(b.at('map')).toBe(b.byName('Market Row').id);
  });

  it('refuses buying what the buyer already holds', async () => {
    const b = await boot();
    await b.engine.executeTurn('buy map');
    const result = await b.engine.executeTurn('buy map');
    expect(ids(result)).toContain('if.action.buying.already_have');
    expect(b.credits()).toBe(6);
  });
});
