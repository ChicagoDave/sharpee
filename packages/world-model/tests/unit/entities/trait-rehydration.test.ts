/**
 * Trait rehydration across serialization (platform-issue-sweep Phase 5).
 *
 * Serialized traits carry own enumerable fields only; prototype accessors
 * (WearableTrait.isWorn) and methods (ConcealmentTrait.supportsPosition)
 * live on the class prototype. The old raw-JSON rehydration lost them, so
 * after save/restore/undo a worn item escaped getContents' worn filter
 * (which reads .isWorn) and trait methods threw. fromJSON now routes every
 * trait through the registry-backed rehydrator.
 */

import { describe, it, expect } from 'vitest';
import { IFEntity } from '../../../src/entities/if-entity';
import { WorldModel } from '../../../src/world/WorldModel';
import { TraitType } from '../../../src/traits/trait-types';
import { WearableTrait } from '../../../src/traits/wearable/wearableTrait';
import { ConcealmentTrait } from '../../../src/traits/concealment/concealmentTrait';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
// The rehydrator registry lives in implementations.ts, loaded via the package
// barrel in production; import it explicitly so the hook is installed here.
import '../../../src/traits/implementations';

describe('trait rehydration (Phase 5)', () => {
  it('restores the isWorn prototype getter on a WearableTrait roundtrip', () => {
    const vest = new IFEntity('vest', 'object');
    vest.add(new WearableTrait({ isWorn: true, wornBy: 'player' }));

    const restored = IFEntity.fromJSON(vest.toJSON());
    const wearable = restored.get(WearableTrait)!;

    expect(wearable).toBeInstanceOf(WearableTrait);
    expect(wearable.worn).toBe(true);
    // THE regression: raw-JSON rehydration made this undefined
    expect(wearable.isWorn).toBe(true);
  });

  it('restores prototype methods (ConcealmentTrait.supportsPosition)', () => {
    const curtain = new IFEntity('curtain', 'object');
    curtain.add(new ConcealmentTrait({ positions: ['behind'], quality: 'good' }));

    const restored = IFEntity.fromJSON(curtain.toJSON());
    const concealment = restored.get(ConcealmentTrait)!;

    expect(concealment).toBeInstanceOf(ConcealmentTrait);
    expect(typeof concealment.supportsPosition).toBe('function');
    expect(concealment.supportsPosition('behind')).toBe(true);
    expect(concealment.supportsPosition('under')).toBe(false);
  });

  it('keeps unknown (story-defined) trait types as raw data, as before', () => {
    const relic = new IFEntity('relic', 'object');
    relic.add({ type: 'story.trait.cursed', curseLevel: 3 } as any);

    const restored = IFEntity.fromJSON(relic.toJSON());
    const trait = restored.getTrait('story.trait.cursed' as TraitType) as any;

    expect(trait).toBeDefined();
    expect(trait.curseLevel).toBe(3);
  });

  it('getCarriedAndWorn partitions a worn item correctly across a save/restore roundtrip (ADR-247)', () => {
    // ADR-247: getContents now INCLUDES worn items; getCarriedAndWorn is the
    // partition. The rehydration invariant this guards: after a roundtrip the
    // restored trait still answers isWorn, so `.worn` stays correct (pre-fix,
    // the lost getter would misclassify the vest as carried).
    const world = new WorldModel();
    const room = world.createEntity('Test Room', 'room');
    room.add({ type: TraitType.ROOM });
    const player = world.createEntity('player', 'actor');
    player.add(new ActorTrait());
    player.add(new ContainerTrait());
    world.setPlayer(player.id);
    world.moveEntity(player.id, room.id);

    const vest = world.createEntity('leather vest', 'object');
    vest.add(new WearableTrait({ isWorn: true, wornBy: player.id }));
    world.moveEntity(vest.id, player.id);

    // Pre-roundtrip: getContents includes the worn vest; the partition puts
    // it in `.worn`, not `.carried`.
    expect(world.getContents(player.id).map(e => e.id)).toContain(vest.id);
    let split = world.getCarriedAndWorn(player.id);
    expect(split.worn.map(e => e.id)).toContain(vest.id);
    expect(split.carried.map(e => e.id)).not.toContain(vest.id);

    const json = world.toJSON();
    const restoredWorld = new WorldModel();
    restoredWorld.loadJSON(json);

    // Post-roundtrip: IDENTICAL — the restored trait still answers isWorn.
    const restoredPlayer = restoredWorld.getPlayer()!;
    expect(restoredWorld.getContents(restoredPlayer.id).map(e => e.id)).toContain(vest.id);
    split = restoredWorld.getCarriedAndWorn(restoredPlayer.id);
    expect(split.worn.map(e => e.id)).toContain(vest.id);
    expect(split.carried.map(e => e.id)).not.toContain(vest.id);
  });
});
