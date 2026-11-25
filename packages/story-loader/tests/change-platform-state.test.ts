/**
 * change-platform-state.test.ts — `change <thing> to <platform state word>`
 * writes the paired trait (GH #707). A lamp a story's own clause lights
 * gives light; a lens is mended; a strongbox is unlocked and opened; each
 * candle `the match` names is lit. No story state of the word's name is
 * stored, so a condition and the world cannot disagree. A thing that
 * declares the word on its own `states:` line keeps a story state. Run
 * through real engine turns: the real parser, the standard actions, the
 * loader's own binding.
 *
 * Public interface: none (test file).
 * Owner context: @sharpee/story-loader, statement runtime.
 */
import { describe, expect, it } from 'vitest';
import { CHANGE_STATE_PAIRINGS } from '@sharpee/chord';
import {
  BreakableTrait,
  LightSourceTrait,
  LockableTrait,
  OpenableTrait,
  SwitchableTrait,
  TraitType,
  VisibilityBehavior,
  WorldModel,
} from '@sharpee/world-model';
import { PLATFORM_STATE_WRITES } from '../src/platform-state-writes';
import { CHORD_STATE_PREFIX } from '../src/state-keys';
import { bootTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: Lamp Room
  authors:
    T
  id: lamp-room
  story-version: 0.0.1

define condition cold-candle: it is light-source and it is in the Lamp Room and it is not lit

define condition any-candle: it is light-source and it is in the Lamp Room

define action kindling
  grammar
    kindle the target
  change the target to lit
  phrase kindled

  phrases en-US
    kindled:
      It catches.

define trait banked
  states: cold, lit

  on the player pushing
    change it to lit
    phrase flame-wakes
  end on
end trait

define trait wick
  on the player touching
    refuse when it is lit: already-burning
    change it to lit
    phrase flame-wakes
  end on
end trait

create the Lamp Room
  a room, dark

  A room of unlit lamps.

create the hand lamp
  aka lamp
  a thing, singular, light-source, wick, starts unlit

  A lamp.

create the cracked lens
  aka lens
  a thing, singular, breakable, starts broken
  in the Lamp Room

  A lens.

  on the player pulling
    change the cracked lens to whole
    phrase lens-mends
  end on

create the brass key
  a thing, singular

  A key.

create the strongbox
  aka box
  a container, singular, openable, lockable with the brass key, starts locked
  in the Lamp Room

  A strongbox.

  on the player pulling
    change the strongbox to unlocked
    change the strongbox to open
    phrase box-springs
  end on

create the tall candle
  a thing, singular, light-source, starts unlit
  in the Lamp Room

  A candle.

create the short candle
  a thing, singular, light-source, starts unlit
  in the Lamp Room

  A candle.

create the taper
  a thing, singular
  in the Lamp Room

  A taper.

  on the player pulling
    each cold-candle
      change the match to lit
    end each
    phrase tapers-round
  end on

create the gong
  a thing, singular
  in the Lamp Room

  A gong.

  on the player pulling
    each any-candle
      change the match to open
    end each
    phrase tapers-round
  end on

create the brazier
  a thing, singular, banked
  in the Lamp Room

  A brazier.

create the electric torch
  aka torch
  a thing, singular, light-source, switchable, starts unlit
  in the Lamp Room

  A torch.

create the striker
  a thing, singular
  in the Lamp Room

  A striker.

  on the player pulling
    change the electric torch to lit
    phrase flame-wakes
  end on

  on the player pushing
    change the electric torch to on
    phrase flame-wakes
  end on

create the fuse
  a thing, singular
  states: coiled, lit
  in the Lamp Room

  A fuse.

  on the player pulling
    change the fuse to lit
    phrase fuse-catches
  end on

create Alex
  a person
  playable
  starts in the Lamp Room
  carries the hand lamp

  You.

before the game starts
  change the player to Alex
end before

define phrase already-burning
  It is already burning.
end phrase

define phrase flame-wakes
  The flame wakes.
end phrase

define phrase lens-mends
  The crack closes.
end phrase

define phrase box-springs
  The strongbox springs open.
end phrase

define phrase tapers-round
  You take the taper round.
end phrase

define phrase fuse-catches
  The fuse catches.
end phrase
`;

describe('change to a platform state word writes the trait (GH #707)', () => {
  it('a trait clause lights its carrier: the trait is lit, the room is no longer dark, and no story state is stored', async () => {
    const b = await bootTurns(SOURCE);
    const lamp = b.world.getEntity(b.id('hand-lamp'))!;
    const room = b.world.getEntity(b.id('lamp-room'))!;
    const light = () => (lamp.get(TraitType.LIGHT_SOURCE) as LightSourceTrait).isLit;

    expect(light()).toBe(false);
    expect(VisibilityBehavior.isDark(room, b.world)).toBe(true);

    const first = await b.turnText('touch lamp');
    expect(first.text).toContain('The flame wakes.');
    expect(light()).toBe(true);
    expect(VisibilityBehavior.isDark(room, b.world)).toBe(false);
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'hand-lamp')).toBeUndefined();

    // The condition reads the same trait the statement wrote.
    const second = await b.turnText('touch lamp');
    expect(second.text).toContain('It is already burning.');
  });

  it('`whole` mends a broken thing', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('touch lamp');
    const lens = b.world.getEntity(b.id('cracked-lens'))!;
    const broken = () => (lens.get(TraitType.BREAKABLE) as BreakableTrait).broken;
    expect(broken()).toBe(true);

    const mended = await b.turnText('pull lens');
    expect(mended.text).toContain('The crack closes.');
    expect(broken()).toBe(false);
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'cracked-lens')).toBeUndefined();
  });

  it('two changes in one body write two traits, with no key', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('touch lamp');
    const box = b.world.getEntity(b.id('strongbox'))!;
    expect((box.get(TraitType.LOCKABLE) as LockableTrait).isLocked).toBe(true);
    expect((box.get(TraitType.OPENABLE) as OpenableTrait).isOpen).toBe(false);

    await b.turn('pull box');
    expect((box.get(TraitType.LOCKABLE) as LockableTrait).isLocked).toBe(false);
    expect((box.get(TraitType.OPENABLE) as OpenableTrait).isOpen).toBe(true);
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'strongbox')).toBeUndefined();
  });

  it('`change the match` lights every thing the each block visits', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('touch lamp');
    const lit = (irId: string) => (b.world.getEntity(b.id(irId))!.get(TraitType.LIGHT_SOURCE) as LightSourceTrait).isLit;
    expect([lit('tall-candle'), lit('short-candle')]).toEqual([false, false]);

    await b.turn('pull taper');
    expect([lit('tall-candle'), lit('short-candle')]).toEqual([true, true]);
  });

  it('a state the thing declares itself wins the word: it is stored as story state', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('touch lamp');
    const fuse = b.world.getEntity(b.id('fuse'))!;
    expect(fuse.has(TraitType.LIGHT_SOURCE)).toBe(false);
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'fuse')).not.toBe('lit');

    await b.turn('pull fuse');
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'fuse')).toBe('lit');
  });
});

describe('change to a platform state word on a thing without the trait (GH #707)', () => {
  it('stops with an error naming the trait, and stores no story state, when the thing is only known at run time', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('touch lamp');

    // A story-rule error ends the turn as a failed command, not a throw.
    const events = await b.turn('pull gong');
    const failed = events.filter((e) => e.type === 'command.failed');
    expect(failed).toHaveLength(1);
    expect((failed[0].data as { reason: string }).reason).toContain('needs `openable` composed on');
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'hand-lamp')).toBeUndefined();
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'tall-candle')).toBeUndefined();
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'short-candle')).toBeUndefined();
  });
});

describe('change on a slot, and on a state a trait declares (GH #707)', () => {
  it('a story action lights the thing its slot names, and fails by name on one that is no light source', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('touch lamp');
    const candle = b.world.getEntity(b.id('tall-candle'))!;
    expect((candle.get(TraitType.LIGHT_SOURCE) as LightSourceTrait).isLit).toBe(false);

    await b.turn('kindle tall candle');
    expect((candle.get(TraitType.LIGHT_SOURCE) as LightSourceTrait).isLit).toBe(true);

    const events = await b.turn('kindle taper');
    const failed = events.filter((e) => e.type === 'command.failed');
    expect(failed).toHaveLength(1);
    expect((failed[0].data as { reason: string }).reason).toContain('needs `light-source` composed on taper');
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'taper')).toBeUndefined();
  });

  it('a state its trait declares wins the word: story state, and no trait to write', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('touch lamp');
    const brazier = b.world.getEntity(b.id('brazier'))!;
    expect(brazier.has(TraitType.LIGHT_SOURCE)).toBe(false);
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'brazier')).not.toBe('lit');

    await b.turn('push brazier');
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'brazier')).toBe('lit');
  });
});

describe('the switch and the flame of a switchable light move together (GH #707)', () => {
  const torchFields = (b: Awaited<ReturnType<typeof bootTurns>>) => {
    const torch = b.world.getEntity(b.id('electric-torch'))!;
    return {
      on: (torch.get(TraitType.SWITCHABLE) as SwitchableTrait).isOn,
      lit: (torch.get(TraitType.LIGHT_SOURCE) as LightSourceTrait).isLit,
    };
  };

  it('`change … to lit` sets the switch too, so the player can switch the torch off', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('touch lamp');
    expect(torchFields(b)).toEqual({ on: false, lit: false });

    await b.turn('pull striker');
    expect(torchFields(b)).toEqual({ on: true, lit: true });

    await b.turn('switch off torch');
    expect(torchFields(b)).toEqual({ on: false, lit: false });
  });

  it('`change … to on` lights a torch that started unlit', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('touch lamp');

    await b.turn('push striker');
    expect(torchFields(b)).toEqual({ on: true, lit: true });
  });

  it('a plain flame gains no switch and a plain switch no flame', () => {
    const world = new WorldModel();
    const candle = world.createEntity('candle', 'item');
    candle.add(new LightSourceTrait({ isLit: false }));
    PLATFORM_STATE_WRITES.get('lit')!.set(candle);
    expect((candle.get(TraitType.LIGHT_SOURCE) as LightSourceTrait).isLit).toBe(true);
    expect(candle.has(TraitType.SWITCHABLE)).toBe(false);

    const lever = world.createEntity('lever', 'item');
    lever.add(new SwitchableTrait({ isOn: false }));
    PLATFORM_STATE_WRITES.get('on')!.set(lever);
    expect((lever.get(TraitType.SWITCHABLE) as SwitchableTrait).isOn).toBe(true);
    expect(lever.has(TraitType.LIGHT_SOURCE)).toBe(false);
  });
});

describe('the two halves of the platform state table agree (GH #707)', () => {
  it('every word the compiler pairs has a field write under the same trait name', () => {
    expect([...PLATFORM_STATE_WRITES.keys()].sort()).toEqual([...CHANGE_STATE_PAIRINGS.keys()].sort());
    for (const [word, trait] of CHANGE_STATE_PAIRINGS) {
      expect(PLATFORM_STATE_WRITES.get(word)!.traitName).toBe(trait);
    }
  });
});

describe('each row of the platform state table writes its own field (GH #707)', () => {
  const rows: Array<{ word: string; read: (thing: ReturnType<WorldModel['createEntity']>) => boolean | undefined; expected: boolean }> = [
    { word: 'locked', read: (t) => (t.get(TraitType.LOCKABLE) as LockableTrait).isLocked, expected: true },
    { word: 'unlocked', read: (t) => (t.get(TraitType.LOCKABLE) as LockableTrait).isLocked, expected: false },
    { word: 'open', read: (t) => (t.get(TraitType.OPENABLE) as OpenableTrait).isOpen, expected: true },
    { word: 'closed', read: (t) => (t.get(TraitType.OPENABLE) as OpenableTrait).isOpen, expected: false },
    { word: 'on', read: (t) => (t.get(TraitType.SWITCHABLE) as SwitchableTrait).isOn, expected: true },
    { word: 'off', read: (t) => (t.get(TraitType.SWITCHABLE) as SwitchableTrait).isOn, expected: false },
    { word: 'broken', read: (t) => (t.get(TraitType.BREAKABLE) as BreakableTrait).broken, expected: true },
    { word: 'whole', read: (t) => (t.get(TraitType.BREAKABLE) as BreakableTrait).broken, expected: false },
    { word: 'lit', read: (t) => (t.get(TraitType.LIGHT_SOURCE) as LightSourceTrait).isLit, expected: true },
    { word: 'unlit', read: (t) => (t.get(TraitType.LIGHT_SOURCE) as LightSourceTrait).isLit, expected: false },
  ];

  it('covers every row', () => {
    expect(rows.map((r) => r.word).sort()).toEqual([...PLATFORM_STATE_WRITES.keys()].sort());
  });

  it.each(rows)('`$word` moves the field from the opposite value', ({ word, read, expected }) => {
    const world = new WorldModel();
    const thing = world.createEntity('thing', 'item');
    thing.add(new LockableTrait({ isLocked: !expected }));
    thing.add(new OpenableTrait({ isOpen: !expected }));
    thing.add(new SwitchableTrait({ isOn: !expected }));
    thing.add(new BreakableTrait({ broken: !expected }));
    thing.add(new LightSourceTrait({ isLit: !expected }));
    expect(read(thing)).toBe(!expected);

    PLATFORM_STATE_WRITES.get(word)!.set(thing);
    expect(read(thing)).toBe(expected);
  });
});
