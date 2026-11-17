/**
 * platform-state-reads.test.ts — PLATFORM_STATE_READS, the platform state
 * words as trait fields (GH #735, GH #772). The table is pinned three ways:
 * against the compiler's word list, against the write table's rows, and by
 * writing each word with the `change` statement's own row and reading it
 * back off a real entity.
 *
 * Public interface: none (test file).
 * Owner context: @sharpee/story-loader test suite.
 */
import { describe, expect, it } from 'vitest';
import { CHANGE_STATE_PAIRINGS } from '@sharpee/chord';
import {
  BreakableTrait,
  LightSourceTrait,
  LockableTrait,
  OpenableTrait,
  SwitchableTrait,
  WorldModel,
  type IFEntity,
} from '@sharpee/world-model';
import { PLATFORM_STATE_READS, platformStateHolds, spelledPlatformState, type PlatformStateFields } from '../src/platform-state-reads';
import { PLATFORM_STATE_WRITES } from '../src/platform-state-writes';

/** A thing carrying every trait a platform state word reads, each field at the value no `set` leaves it. */
function everything(world: WorldModel): IFEntity {
  const thing = world.createEntity('everything', 'item');
  thing.add(new OpenableTrait({ isOpen: false }));
  thing.add(new LockableTrait({ isLocked: false }));
  thing.add(new SwitchableTrait({ isOn: false }));
  thing.add(new LightSourceTrait({ isLit: false }));
  thing.add(new BreakableTrait({ broken: false }));
  return thing;
}

const traitOf = (entity: IFEntity) => (traitType: string): PlatformStateFields | undefined =>
  entity.get(traitType) as PlatformStateFields | undefined;

describe('PLATFORM_STATE_READS — the structure', () => {
  it('has exactly the words `change` can write', () => {
    expect([...PLATFORM_STATE_READS.keys()].sort()).toEqual([...CHANGE_STATE_PAIRINGS.keys()].sort());
  });

  it('names each word\'s trait as the compiler pairs it and as the write table types it', () => {
    for (const [word, read] of PLATFORM_STATE_READS) {
      expect(read.traitName, word).toBe(CHANGE_STATE_PAIRINGS.get(word));
      expect(read.traitType, word).toBe(PLATFORM_STATE_WRITES.get(word)?.traitType);
    }
  });

  it('pairs every word with a complement on the same field at the opposite value', () => {
    for (const [word, read] of PLATFORM_STATE_READS) {
      const other = PLATFORM_STATE_READS.get(read.complement);
      expect(other, word).toBeDefined();
      expect(other?.complement, word).toBe(word);
      expect(other?.traitType, word).toBe(read.traitType);
      expect(other?.field, word).toBe(read.field);
      expect(other?.value, word).toBe(!read.value);
    }
  });
});

describe('PLATFORM_STATE_READS — a word written is the word read', () => {
  it('reads back every word the write table writes, and its complement stops holding', () => {
    for (const [word, write] of PLATFORM_STATE_WRITES) {
      const world = new WorldModel();
      const thing = everything(world);
      // Start from the opposite, so the read cannot pass on a default.
      PLATFORM_STATE_WRITES.get(PLATFORM_STATE_READS.get(word)!.complement)!.set(thing);
      expect(spelledPlatformState(word, traitOf(thing)), `${word} before`).toBe(PLATFORM_STATE_READS.get(word)!.complement);

      write.set(thing);

      expect(spelledPlatformState(word, traitOf(thing)), word).toBe(word);
      const read = PLATFORM_STATE_READS.get(word)!;
      expect(platformStateHolds(read, thing.get(read.traitType) as PlatformStateFields), word).toBe(true);
      const complement = PLATFORM_STATE_READS.get(read.complement)!;
      expect(platformStateHolds(complement, thing.get(complement.traitType) as PlatformStateFields), read.complement).toBe(false);
    }
  });

  it('reads an unset field as false: a breakable thing nothing broke is whole', () => {
    expect(platformStateHolds(PLATFORM_STATE_READS.get('whole')!, {})).toBe(true);
    expect(platformStateHolds(PLATFORM_STATE_READS.get('broken')!, {})).toBe(false);
  });
});

describe('spelledPlatformState — what it does not answer', () => {
  it('is undefined for a word that is no platform state word', () => {
    const world = new WorldModel();
    expect(spelledPlatformState('fruiting', traitOf(everything(world)))).toBeUndefined();
  });

  it('is undefined when the thing lacks the word\'s trait', () => {
    const world = new WorldModel();
    const pebble = world.createEntity('pebble', 'item');
    for (const word of PLATFORM_STATE_READS.keys()) {
      expect(spelledPlatformState(word, traitOf(pebble)), word).toBeUndefined();
    }
  });
});
