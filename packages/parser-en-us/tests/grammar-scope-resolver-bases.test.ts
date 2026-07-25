/**
 * grammar-scope-resolver-bases.test.ts — ADR-273 acceptance 3: every scope
 * base exercised against a REAL WorldModel instance (not a mock of the old
 * fictional API), asserting on the returned entity sets. The `touchable`
 * base is the ReachabilityBehavior seam: contents of a closed transparent
 * jar are visible but NOT touchable.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorldModel,
  IFEntity,
  RoomTrait,
  ActorTrait,
  ContainerTrait,
  OpenableTrait,
  WearableTrait,
} from '@sharpee/world-model';
import type { GrammarContext, ScopeConstraint } from '@sharpee/if-domain';
import { GrammarScopeResolver } from '../src/grammar-scope-resolver';

function constraint(base: ScopeConstraint['base']): ScopeConstraint {
  return { base, filters: [], traitFilters: [], explicitEntities: [], includeRules: [] };
}

describe('GrammarScopeResolver scope bases against a real WorldModel (ADR-273)', () => {
  let world: WorldModel;
  let room: IFEntity;
  let player: IFEntity;
  let rock: IFEntity;
  let jar: IFEntity;
  let firefly: IFEntity;
  let key: IFEntity;
  let cloak: IFEntity;
  let context: GrammarContext;

  beforeEach(() => {
    world = new WorldModel();

    room = world.createEntity('Room', 'room');
    room.add(new RoomTrait());
    room.add(new ContainerTrait());

    player = world.createEntity('Player', 'actor');
    player.add(new ActorTrait());
    player.add(new ContainerTrait());

    rock = world.createEntity('Rock', 'item');

    // Closed transparent jar with a firefly — the visible/touchable divergence
    jar = world.createEntity('Jar', 'container');
    jar.add(new ContainerTrait({ isTransparent: true }));
    jar.add(new OpenableTrait({ isOpen: true }));
    firefly = world.createEntity('Firefly', 'item');

    key = world.createEntity('Key', 'item');
    cloak = world.createEntity('Cloak', 'item');
    cloak.add(new WearableTrait({ isWorn: true, wornBy: undefined }));

    world.moveEntity(player.id, room.id);
    world.moveEntity(rock.id, room.id);
    world.moveEntity(jar.id, room.id);
    world.moveEntity(firefly.id, jar.id);
    world.moveEntity(key.id, player.id);
    world.moveEntity(cloak.id, player.id);
    jar.getTrait(OpenableTrait)!.isOpen = false;

    context = {
      world,
      actorId: player.id,
      currentLocation: room.id,
      slots: new Map(),
    };
  });

  function idsInScope(base: ScopeConstraint['base']): Set<string> {
    return new Set(GrammarScopeResolver.getEntitiesInScope(constraint(base), context).map((e) => e.id));
  }

  it("base 'visible' → world.getVisible: sees through the closed glass jar", () => {
    const ids = idsInScope('visible');
    expect(ids.has(rock.id)).toBe(true);
    expect(ids.has(jar.id)).toBe(true);
    expect(ids.has(firefly.id)).toBe(true); // transparent: visible
    expect(ids.has(key.id)).toBe(true); // carried is visible
  });

  it("base 'touchable' → world.getReachable: cannot reach through the closed glass jar", () => {
    const ids = idsInScope('touchable');
    expect(ids.has(rock.id)).toBe(true);
    expect(ids.has(jar.id)).toBe(true);
    expect(ids.has(firefly.id)).toBe(false); // visible but NOT reachable
    expect(ids.has(key.id)).toBe(true); // carried is reachable
  });

  it("base 'carried' → world.getCarriedAndWorn: carried and worn both count as held", () => {
    const ids = idsInScope('carried');
    expect(ids.has(key.id)).toBe(true);
    expect(ids.has(cloak.id)).toBe(true); // worn counts as held
    expect(ids.has(rock.id)).toBe(false); // floor items are not held
  });

  it("base 'all' → world.getAllEntities: everything, reachable or not", () => {
    const ids = idsInScope('all');
    for (const e of [room, player, rock, jar, firefly, key, cloak]) {
      expect(ids.has(e.id), e.id).toBe(true);
    }
  });

  it("base 'nearby' falls back to visible", () => {
    expect(idsInScope('nearby')).toEqual(idsInScope('visible'));
  });

  it('findEntitiesByName resolves within the touchable base (the parse-time gate path)', () => {
    const matches = GrammarScopeResolver.findEntitiesByName('rock', constraint('touchable'), context);
    expect(matches.map((e) => e.id)).toEqual([rock.id]);

    // The firefly is findable by name in `visible` but not in `touchable`
    expect(GrammarScopeResolver.findEntitiesByName('firefly', constraint('visible'), context)).toHaveLength(1);
    expect(GrammarScopeResolver.findEntitiesByName('firefly', constraint('touchable'), context)).toHaveLength(0);
  });

  it('leading articles are stripped when the original text matches nothing', () => {
    expect(GrammarScopeResolver.findEntitiesByName('the rock', constraint('touchable'), context).map((e) => e.id)).toEqual([rock.id]);
    expect(GrammarScopeResolver.findEntitiesByName('a rock', constraint('touchable'), context).map((e) => e.id)).toEqual([rock.id]);
    // Stripping does not weaken the gate: the articled firefly still fails touchable
    expect(GrammarScopeResolver.findEntitiesByName('the firefly', constraint('touchable'), context)).toHaveLength(0);
  });

  it('an entity genuinely named with a leading article wins before stripping', () => {
    const grail = world.createEntity('The Grail', 'item');
    world.moveEntity(grail.id, room.id);

    const matches = GrammarScopeResolver.findEntitiesByName('the grail', constraint('touchable'), context);
    expect(matches.map((e) => e.id)).toEqual([grail.id]);
  });

  it('internal articles in names are never touched', () => {
    const top = world.createEntity('top of the ladder', 'item');
    world.moveEntity(top.id, room.id);

    expect(GrammarScopeResolver.findEntitiesByName('top of the ladder', constraint('touchable'), context).map((e) => e.id)).toEqual([top.id]);
  });

  it('missing world fails closed to zero candidates (D3), not a throw', () => {
    const bare = { ...context, world: null };
    expect(GrammarScopeResolver.getEntitiesInScope(constraint('touchable'), bare as GrammarContext)).toEqual([]);
  });
});
