/**
 * ADR-373 on the REAL path: `attached to` (with `detachable`), `breakable`
 * (with `fragile` and `starts broken`), the `broken`/`attached` state
 * adjectives, `after the player breaking`, and stock tying with a
 * counterpart-tailed clause. A compiled Chord story, loaded through the
 * loader and driven by `GameEngine.executeTurn`; assertions read the world
 * (locations, trait fields, the story's declared state) and the turn's
 * message ids.
 *
 * Behavior Statements:
 *   attached    DOES lower to AttachedTrait anchored at the named thing;
 *               taking refuses it in place; pulling a detachable one
 *               clears attachedTo. REJECTS pulling a non-detachable one
 *               (wont_budge), attachedTo unchanged.
 *   breakable   DOES lower to BreakableTrait (fragile from its sibling,
 *               broken from `starts broken`); attacking or dropping a
 *               fragile one sets broken and runs the owner's
 *               `after the player breaking` body. REJECTS a break on a
 *               non-fragile drop or a drop into a container: broken stays
 *               false and the body does not run.
 *   is broken / is attached  DOES read the live trait fields.
 *   tying       DOES attach the held thing to the anchor and runs the
 *               `on the player tying to <anchor>` clause; untying detaches.
 *
 * Owner context: story-loader tests (rule 13a real-path gate).
 */
import { describe, expect, it } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { AttachedTrait, BreakableTrait, TraitType } from '@sharpee/world-model';
import { CHORD_STATE_PREFIX } from '../src/state-keys';
import { bootEngine } from './helpers/boot-engine';

const SOURCE = `story
  title: Specimens
  authors:
    T
  id: specimens
  story-version: 0.0.1

before the game starts
  change the player to Alex
end before

create the Specimen Room
  a room

  A room.

create Alex
  a person
  playable
  starts in the Specimen Room

  You.

create the sorting machine
  a thing, scenery
  in the Specimen Room

  A machine.

create the route placard
  a thing, detachable, attached to the sorting machine
  in the Specimen Room

  A placard.

create the brass plate
  a thing, attached to the sorting machine
  in the Specimen Room

  A plate.

create the specimen jar
  a thing, fragile, breakable
  in the Specimen Room
  states, reversible: intact-shelf, swept

  A jar.

  after the player breaking
    change the specimen jar to swept
    phrase shards
  end after

create the clay pot
  a thing, breakable
  in the Specimen Room

  A pot.

create the cracked lens
  a thing, breakable, starts broken
  in the Specimen Room

  A lens.

create the crate
  a container
  in the Specimen Room

  A crate.

create the mooring line
  a thing
  in the Specimen Room
  aka line

  A line.

  on the player tying to the sorting machine
    phrase line-made-fast
  end on

create the signal lamp
  a thing
  in the Specimen Room
  states, reversible: dim, flagged

  A lamp.

  after the player examining while the specimen jar is broken
    change the signal lamp to flagged
  end after

define phrase shards
  Shards everywhere.
end phrase

define phrase line-made-fast
  The line is fast.
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
  const attached = (name: string) => byName(name).get(TraitType.ATTACHED) as AttachedTrait | undefined;
  const breakable = (name: string) => byName(name).get(TraitType.BREAKABLE) as BreakableTrait | undefined;
  const state = (id: string) => b.world.getStateValue(`${CHORD_STATE_PREFIX}${id}`);
  return { ...b, byName, at, attached, breakable, state };
}

describe('attached to (ADR-373 D1)', () => {
  it('lowers the anchor to its world id, detachable from the sibling word', async () => {
    const b = await boot();
    expect(b.attached('route placard')?.attachedTo).toBe(b.byName('sorting machine').id);
    expect(b.attached('route placard')?.detachable).toBe(true);
    expect(b.attached('brass plate')?.detachable).toBe(false);
  });

  it('refuses taking an attached thing and leaves it in place', async () => {
    const b = await boot();
    const room = b.byName('Specimen Room').id;
    const result = await b.engine.executeTurn('take placard');
    expect(ids(result).join(' ')).toContain('attached');
    expect(b.at('route placard')).toBe(room);
  });

  it('pulls a detachable thing free, after which taking succeeds', async () => {
    const b = await boot();
    await b.engine.executeTurn('pull placard');
    expect(b.attached('route placard')?.attachedTo).toBeUndefined();
    await b.engine.executeTurn('take placard');
    expect(b.at('route placard')).toBe(b.player.id);
  });

  it('refuses pulling a thing that is not detachable, anchor unchanged', async () => {
    const b = await boot();
    const result = await b.engine.executeTurn('pull plate');
    expect(ids(result).join(' ')).toContain('wont_budge');
    expect(b.attached('brass plate')?.attachedTo).toBe(b.byName('sorting machine').id);
  });
});

describe('breakable and the breaking clause (ADR-373 D2–D4, D7)', () => {
  it('lowers fragile from the sibling word and starts broken from the pairing', async () => {
    const b = await boot();
    expect(b.breakable('specimen jar')).toMatchObject({ fragile: true, broken: false });
    expect(b.breakable('clay pot')).toMatchObject({ fragile: false, broken: false });
    expect(b.breakable('cracked lens')?.broken).toBe(true);
  });

  it('breaks a fragile thing dropped on the floor and runs the after-breaking body', async () => {
    const b = await boot();
    await b.engine.executeTurn('take jar');
    expect(b.state('specimen-jar')).toBe('intact-shelf');
    const result = await b.engine.executeTurn('drop jar');
    expect(b.breakable('specimen jar')?.broken).toBe(true);
    expect(b.at('specimen jar')).toBe(b.byName('Specimen Room').id);
    expect(b.state('specimen-jar')).toBe('swept');
    expect(ids(result)).toContain('shards');
  });

  it('does not break a fragile thing put into a container', async () => {
    const b = await boot();
    await b.engine.executeTurn('take jar');
    await b.engine.executeTurn('put jar in crate');
    expect(b.at('specimen jar')).toBe(b.byName('crate').id);
    expect(b.breakable('specimen jar')?.broken).toBe(false);
    expect(b.state('specimen-jar')).toBe('intact-shelf');
  });

  it('does not break a breakable thing that is not fragile when dropped', async () => {
    const b = await boot();
    await b.engine.executeTurn('take pot');
    await b.engine.executeTurn('drop pot');
    expect(b.breakable('clay pot')?.broken).toBe(false);
  });

  it('breaks a breakable thing attacked, firing the body once', async () => {
    const b = await boot();
    await b.engine.executeTurn('attack jar');
    expect(b.breakable('specimen jar')?.broken).toBe(true);
    expect(b.state('specimen-jar')).toBe('swept');
    await b.engine.executeTurn('take jar');
    await b.engine.executeTurn('drop jar');
    expect(b.state('specimen-jar')).toBe('swept');
  });

  it('reads `is broken` from the trait', async () => {
    const b = await boot();
    await b.engine.executeTurn('examine lamp');
    expect(b.state('signal-lamp')).toBe('dim');
    await b.engine.executeTurn('attack jar');
    await b.engine.executeTurn('examine lamp');
    expect(b.state('signal-lamp')).toBe('flagged');
  });
});

describe('tying (ADR-373 D6)', () => {
  it('ties the held line to the anchor, runs the tailed clause, and taking then refuses', async () => {
    const b = await boot();
    await b.engine.executeTurn('take line');
    const result = await b.engine.executeTurn('tie line to machine');
    expect(b.attached('mooring line')?.attachedTo).toBe(b.byName('sorting machine').id);
    expect(ids(result)).toContain('line-made-fast');
    expect(b.at('mooring line')).toBe(b.byName('Specimen Room').id);
    const take = await b.engine.executeTurn('take line');
    expect(ids(take).join(' ')).toContain('attached');
    expect(b.at('mooring line')).toBe(b.byName('Specimen Room').id);
  });

  it('unties it again', async () => {
    const b = await boot();
    await b.engine.executeTurn('take line');
    await b.engine.executeTurn('tie line to machine');
    await b.engine.executeTurn('untie line');
    expect(b.attached('mooring line')?.attachedTo).toBeUndefined();
    await b.engine.executeTurn('take line');
    expect(b.at('mooring line')).toBe(b.player.id);
  });
});
