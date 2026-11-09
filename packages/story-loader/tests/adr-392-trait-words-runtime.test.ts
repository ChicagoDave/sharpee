/**
 * ADR-392 D2, D4, D6 on the REAL path: a compiled Chord story, loaded
 * through the loader and driven by `GameEngine.executeTurn`. `wearable on
 * the <part>` lowers to a placed WearableTrait and the second thing on one
 * part is refused; `opens when unlocked` and `closes when switched off`
 * lower to the openable trait's flags, and the unlock opens and the
 * switch-off closes; `smelly` and `loud` lower to ScentTrait at `strong`
 * and SoundingTrait at `raised`. Assertions read the world's traits.
 *
 * Behavior Statements:
 *   wearable on   DOES build WearableTrait.placement = { bodyPart, layer 1 };
 *                 a bare `wearable` builds no placement. Wearing a second
 *                 placed thing on a worn part leaves it unworn (the refusal
 *                 is `already_wearing_there`); another part is worn.
 *   opens when    DOES set OpenableTrait.autoOpenOnUnlock; unlocking the
 *                 door leaves it unlocked AND open. REJECTS (stays closed):
 *                 a lockable without the line.
 *   closes when   DOES set OpenableTrait.autoCloseOnOff; switching the case
 *                 off leaves it off AND closed.
 *   smelly, loud  DO build ScentTrait { strength: 'strong' } and
 *                 SoundingTrait { tier: 'raised' }; a thing without the word
 *                 has neither trait.
 *
 * Owner context: story-loader tests (rule 13a real-path gate).
 */
import { describe, expect, it } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import {
  LockableTrait,
  OpenableTrait,
  ScentTrait,
  SoundingTrait,
  SwitchableTrait,
  TraitType,
  WearableTrait,
} from '@sharpee/world-model';
import { bootEngine } from './helpers/boot-engine';

const SOURCE = `story
  title: Trait Words
  authors:
    T
  id: trait-words
  story-version: 0.0.1

before the game starts
  change the player to Alex
end before

create the Hall
  a room
  north to the Cellar through the cellar door

  A hall.

create the Cellar
  a room

  A cellar.

create Alex
  a person
  playable
  starts in the Hall

  You.

create the straw hat
  a thing, wearable on the head
  in the Hall
  aka hat

  A hat.

create the felt cap
  a thing, wearable on the head
  in the Hall
  aka cap

  A cap.

create the wool scarf
  a thing, wearable on the neck
  in the Hall
  aka scarf

  A scarf.

create the iron ring
  a thing, wearable
  in the Hall
  aka ring

  A ring.

create the iron key
  a thing
  in the Hall
  aka key

  A key.

create the cellar door
  a door, lockable with the iron key
  opens when unlocked
  aka door

  A door.

create the display case
  a container, openable, switchable, starts open, starts on
  closes when switched off
  in the Hall
  aka case

  A case.

create the plain chest
  a container, openable, lockable with the iron key
  in the Hall
  aka chest

  A chest.

create the tin box
  a container, openable
  in the Hall
  aka box

  A box.

create the ripe cheese
  a thing, edible, smelly
  in the tin box
  aka cheese

  Cheese.

create the brass chime
  a thing, loud
  in the Cellar
  aka chime

  A chime.
`;

async function boot() {
  const b = bootEngine(SOURCE, 7);
  await b.engine.start();
  const trait = <T>(id: string, type: TraitType) => b.world.getEntity(id)!.get(type) as T;
  return { ...b, trait };
}

const messageIds = (result: { events: ISemanticEvent[] }) =>
  result.events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter((id): id is string => id !== undefined);

describe('wearable on the <part> lowers and wears (ADR-392 D2)', () => {
  it('builds the placement pair at layer 1; a bare `wearable` builds none', async () => {
    const b = await boot();
    expect(b.trait<WearableTrait>('straw-hat', TraitType.WEARABLE).placement).toEqual({ bodyPart: 'head', layer: 1 });
    expect(b.trait<WearableTrait>('felt-cap', TraitType.WEARABLE).placement).toEqual({ bodyPart: 'head', layer: 1 });
    expect(b.trait<WearableTrait>('wool-scarf', TraitType.WEARABLE).placement).toEqual({ bodyPart: 'neck', layer: 1 });
    expect(b.trait<WearableTrait>('iron-ring', TraitType.WEARABLE).placement).toBeUndefined();
  });

  it('two hats, one head: the second is refused and stays unworn; another part is worn', async () => {
    const b = await boot();
    await b.engine.executeTurn('take hat');
    await b.engine.executeTurn('wear hat');
    expect(b.trait<WearableTrait>('straw-hat', TraitType.WEARABLE).worn).toBe(true);

    await b.engine.executeTurn('take cap');
    const refused = await b.engine.executeTurn('wear cap');
    expect(b.trait<WearableTrait>('felt-cap', TraitType.WEARABLE).worn).toBe(false);
    expect(b.trait<WearableTrait>('straw-hat', TraitType.WEARABLE).worn).toBe(true);
    expect(messageIds(refused).some((id) => id.endsWith('already_wearing_there'))).toBe(true);

    await b.engine.executeTurn('take scarf');
    await b.engine.executeTurn('wear scarf');
    expect(b.trait<WearableTrait>('wool-scarf', TraitType.WEARABLE).worn).toBe(true);
  });
});

describe('opens when unlocked and closes when switched off lower and act (ADR-392 D4)', () => {
  it('sets exactly the flag each line names', async () => {
    const b = await boot();
    const door = b.trait<OpenableTrait>('cellar-door', TraitType.OPENABLE);
    expect(door.autoOpenOnUnlock).toBe(true);
    expect(door.autoCloseOnOff).toBe(false);
    const kase = b.trait<OpenableTrait>('display-case', TraitType.OPENABLE);
    expect(kase.autoCloseOnOff).toBe(true);
    expect(kase.autoOpenOnUnlock).toBe(false);
    const chest = b.trait<OpenableTrait>('plain-chest', TraitType.OPENABLE);
    expect(chest.autoOpenOnUnlock).toBe(false);
    expect(chest.autoCloseOnOff).toBe(false);
  });

  it('unlocking the door opens it; unlocking the chest without the line leaves it closed', async () => {
    const b = await boot();
    expect(b.trait<LockableTrait>('cellar-door', TraitType.LOCKABLE).isLocked).toBe(true);
    expect(b.trait<OpenableTrait>('cellar-door', TraitType.OPENABLE).isOpen).toBe(false);
    await b.engine.executeTurn('take key');
    await b.engine.executeTurn('unlock door with key');
    expect(b.trait<LockableTrait>('cellar-door', TraitType.LOCKABLE).isLocked).toBe(false);
    expect(b.trait<OpenableTrait>('cellar-door', TraitType.OPENABLE).isOpen).toBe(true);

    await b.engine.executeTurn('unlock chest with key');
    expect(b.trait<LockableTrait>('plain-chest', TraitType.LOCKABLE).isLocked).toBe(false);
    expect(b.trait<OpenableTrait>('plain-chest', TraitType.OPENABLE).isOpen).toBe(false);
  });

  it('switching the case off closes it', async () => {
    const b = await boot();
    expect(b.trait<SwitchableTrait>('display-case', TraitType.SWITCHABLE).isOn).toBe(true);
    expect(b.trait<OpenableTrait>('display-case', TraitType.OPENABLE).isOpen).toBe(true);
    await b.engine.executeTurn('turn off case');
    expect(b.trait<SwitchableTrait>('display-case', TraitType.SWITCHABLE).isOn).toBe(false);
    expect(b.trait<OpenableTrait>('display-case', TraitType.OPENABLE).isOpen).toBe(false);
  });
});

describe('smelly and loud lower to the sensory traits (ADR-392 D6)', () => {
  it('smelly is a strong scent, loud a raised sound, and a plain thing has neither', async () => {
    const b = await boot();
    expect(b.trait<ScentTrait>('ripe-cheese', TraitType.SCENT).strength).toBe('strong');
    expect(b.trait<SoundingTrait>('brass-chime', TraitType.SOUNDING).tier).toBe('raised');
    const box = b.world.getEntity('tin-box')!;
    expect(box.has(TraitType.SCENT)).toBe(false);
    expect(box.has(TraitType.SOUNDING)).toBe(false);
  });
});
