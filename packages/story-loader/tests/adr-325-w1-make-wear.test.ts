/**
 * adr-325-w1-make-wear.test.ts — ADR-325 Amendment W1 on the REAL path
 * (`secret-letter-port-platform-defects` Phase 6, P-14; GH #360): bootTurns,
 * real compile, real engine, typed commands. `make <actor> wear <item>` puts
 * the garment on — from the floor (moving it first through the move
 * lifecycle), from the hand, off another wearer, and as a no-op when already
 * worn; `make <actor> take off <item>` takes it off and leaves it held, and
 * is a no-op when not worn by that actor.
 *
 * Assertions read `WearableTrait.worn` / `wornBy` and the item's location.
 */
import { describe, expect, it } from 'vitest';
import { TraitType, type WearableTrait } from '@sharpee/world-model';
import { bootTurns } from './helpers/boot-turns';

const STORY = `story
  title: Wear
  authors:
    T
  id: wear
  story-version: 0.0.1

create the Street
  a room
  north to the Yard

  A street.

create the Yard
  a room
  south to the Street

  A yard.

create the woolen cap
  wearable
  in the Yard

  A cap.

  phrase exited:
    The cap is snatched away.

  on the player touching
    make the player wear the woolen cap
  end on

  on the player smelling
    make the player take off the woolen cap
  end on

  on the player examining
    make Teisha wear the woolen cap
  end on

  on the player listening
    make Teisha take off the woolen cap
  end on

create Teisha
  a person
  in the Street

  Teisha.

create Jack
  a person
  playable
  starts in the Street

  You.

before the game starts
  change the player to Jack
end before
`;

async function boot() {
  const b = await bootTurns(STORY);
  const cap = b.world.getAllEntities().find((e) => e.name === 'woolen cap')!;
  const teisha = b.world.getAllEntities().find((e) => e.name === 'Teisha')!;
  const player = b.world.getPlayer()!;
  const wearable = () => cap.get(TraitType.WEARABLE) as WearableTrait;
  return { b, cap, teisha, player, wearable };
}

describe('ADR-325 W1: `make <actor> wear <item>` / `make <actor> take off <item>` (real path)', () => {
  it('`wear` from the floor moves the cap to the player and marks it worn by her (W1b)', async () => {
    const { b, cap, player, wearable } = await boot();
    await b.turnText('north');
    expect(b.world.getLocation(cap.id)).not.toBe(player.id);
    expect(wearable().worn).toBe(false);

    await b.turnText('touch cap');
    expect(b.world.getLocation(cap.id)).toBe(player.id);
    expect(wearable().worn).toBe(true);
    expect(wearable().wornBy).toBe(player.id);
  });

  it('`wear` when already worn by this actor is a no-op; `take off` leaves it held (W1b, W1c)', async () => {
    const { b, cap, player, wearable } = await boot();
    await b.turnText('north');
    await b.turnText('touch cap');
    await b.turnText('touch cap');
    expect(wearable().worn).toBe(true);
    expect(wearable().wornBy).toBe(player.id);

    await b.turnText('smell cap');
    expect(wearable().worn).toBe(false);
    expect(wearable().wornBy).toBeUndefined();
    expect(b.world.getLocation(cap.id)).toBe(player.id);

    // Not worn: `take off` is a no-op, the cap stays where it is.
    await b.turnText('smell cap');
    expect(wearable().worn).toBe(false);
    expect(b.world.getLocation(cap.id)).toBe(player.id);
  });

  it('`wear` for another person takes it off the current wearer first and moves it to them (W1b)', async () => {
    const { b, cap, teisha, player, wearable } = await boot();
    await b.turnText('north');
    await b.turnText('touch cap');
    expect(wearable().wornBy).toBe(player.id);

    // The garment crosses rooms through the move lifecycle, so the player,
    // holding it in the Yard, witnesses its `exited` row (W1b).
    const gone = await b.turnText('x cap');
    expect(gone.text).toContain('The cap is snatched away.');
    expect(b.world.getLocation(cap.id)).toBe(teisha.id);
    expect(wearable().worn).toBe(true);
    expect(wearable().wornBy).toBe(teisha.id);
  });

  it('`take off` for an actor who is not the wearer is a no-op (W1c)', async () => {
    const { b, cap, player, wearable } = await boot();
    await b.turnText('north');
    await b.turnText('touch cap');

    await b.turnText('listen to cap');
    expect(wearable().worn).toBe(true);
    expect(wearable().wornBy).toBe(player.id);
    expect(b.world.getLocation(cap.id)).toBe(player.id);
  });
});
