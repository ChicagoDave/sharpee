// packages/world-model/tests/unit/traits/room-snippets.test.ts
//
// ADR-209 Phase 2 — RoomTrait.snippets storage.
//
// Behavior Statement (RoomTrait constructor, snippets field):
//   DOES   store the author-supplied marker→snippet table on the trait,
//          verbatim plain data (no normalization, no counters).
//   WHEN   constructed with `snippets` in IRoomData — both via the helpers
//          builder and via direct-trait construction (dungeo style).
//   BECAUSE the splice pass (stdlib) and load-time validation (engine) read
//          the map from the trait; save/load must round-trip it unchanged.
//   REJECTS never — absent map stays undefined (room is never scanned, AC-7).

import { IFEntity } from '../../../src/entities/if-entity';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { TraitType } from '../../../src/traits/trait-types';
import type { SnippetMap } from '../../../src/traits/room';

describe('RoomTrait.snippets (ADR-209)', () => {
  const studyMap: SnippetMap = {
    cabinet: ', next to a cabinet',
    mantel: [
      ', the mantel holding sentimental items',
      ', its mantel crowded with keepsakes',
    ],
    trunk: { text: ', a battered trunk in the corner', mentions: 'i01' },
    motes: { selector: 'random', texts: [', dust motes drifting', ''], mentions: 'i02' },
  };

  it('defaults to undefined — a room without a map is never snippet-scanned (AC-7)', () => {
    expect(new RoomTrait().snippets).toBeUndefined();
  });

  it('stores the map verbatim on direct-trait construction (dungeo style)', () => {
    const trait = new RoomTrait({ snippets: studyMap });
    expect(trait.snippets).toEqual(studyMap);
    // All four SnippetEntry forms survive as plain data.
    expect(trait.snippets!.cabinet).toBe(', next to a cabinet');
    expect(trait.snippets!.mantel).toHaveLength(2);
    expect(trait.snippets!.trunk).toEqual({ text: ', a battered trunk in the corner', mentions: 'i01' });
    expect((trait.snippets!.motes as { selector: string }).selector).toBe('random');
  });

  it('is mutable at runtime — handlers may swap an entry to \'\' (resolution Q7)', () => {
    const trait = new RoomTrait({ snippets: { trunk: ', a battered trunk' } });
    trait.snippets!.trunk = '';
    expect(trait.snippets!.trunk).toBe('');
  });

  it('round-trips through entity toJSON/fromJSON unchanged', () => {
    const entity = new IFEntity('r01', 'room');
    entity.add(new RoomTrait({ snippets: studyMap }));

    const restored = IFEntity.fromJSON(JSON.parse(JSON.stringify(entity.toJSON())));
    const trait = restored.get(TraitType.ROOM) as RoomTrait;
    expect(trait.snippets).toEqual(studyMap);
  });
});
