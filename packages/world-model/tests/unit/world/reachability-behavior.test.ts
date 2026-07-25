/**
 * reachability-behavior.test.ts — ADR-273 D4: the platform's one physical
 * reachability definition (ReachabilityBehavior, sibling of
 * VisibilityBehavior), exposed as WorldModel.canReach / getReachable.
 * Rules ported unchanged from stdlib's ScopeResolver.canReach; every test
 * asserts on real WorldModel state per project convention.
 */
import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { OpenableTrait } from '../../../src/traits/openable/openableTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';
import { SupporterTrait } from '../../../src/traits/supporter/supporterTrait';
import { OpenInventoryTrait } from '../../../src/traits/open-inventory/openInventoryTrait';
import { RuleScopeEvaluator } from '../../../src/scope/scope-evaluator';
import { ScopeRegistry } from '../../../src/scope/scope-registry';

describe('ReachabilityBehavior (ADR-273 D4)', () => {
  let world: WorldModel;
  let room: IFEntity;
  let player: IFEntity;

  beforeEach(() => {
    world = new WorldModel();

    room = world.createEntity('Test Room', 'room');
    room.add(new RoomTrait());
    room.add(new ContainerTrait());

    player = world.createEntity('Player', 'actor');
    player.add(new ActorTrait());
    player.add(new ContainerTrait());

    world.moveEntity(player.id, room.id);
  });

  it('closed transparent container: contents visible but NOT reachable', () => {
    const jar = world.createEntity('Glass Jar', 'container');
    jar.add(new ContainerTrait({ isTransparent: true }));
    jar.add(new OpenableTrait({ isOpen: true }));
    const firefly = world.createEntity('Firefly', 'item');
    world.moveEntity(jar.id, room.id);
    world.moveEntity(firefly.id, jar.id);
    jar.getTrait(OpenableTrait)!.isOpen = false;

    // The divergence that defines reachability: see through glass, can't reach through it
    expect(world.canSee(player.id, firefly.id)).toBe(true);
    expect(world.canReach(player.id, firefly.id)).toBe(false);

    const reachable = world.getReachable(player.id);
    expect(reachable).toContainEqual(jar);
    expect(reachable).not.toContainEqual(firefly);
  });

  it('open container: contents reachable', () => {
    const box = world.createEntity('Box', 'container');
    box.add(new ContainerTrait({ isTransparent: false }));
    box.add(new OpenableTrait({ isOpen: true }));
    const coin = world.createEntity('Coin', 'item');
    world.moveEntity(box.id, room.id);
    world.moveEntity(coin.id, box.id);

    expect(world.canReach(player.id, coin.id)).toBe(true);
    expect(world.getReachable(player.id)).toContainEqual(coin);
  });

  it('carried item: reachable', () => {
    const key = world.createEntity('Brass Key', 'item');
    world.moveEntity(key.id, player.id);

    expect(world.getLocation(key.id)).toBe(player.id); // precondition: actually carried
    expect(world.canReach(player.id, key.id)).toBe(true);
    expect(world.getReachable(player.id)).toContainEqual(key);
  });

  it("another actor's inventory: blocked without OpenInventoryTrait, allowed with it", () => {
    const thief = world.createEntity('Thief', 'actor');
    thief.add(new ActorTrait());
    thief.add(new ContainerTrait());
    const knife = world.createEntity('Knife', 'item');
    world.moveEntity(thief.id, room.id);
    world.moveEntity(knife.id, thief.id);

    // Visible on the thief, not grabbable
    expect(world.canReach(player.id, thief.id)).toBe(true);
    expect(world.canReach(player.id, knife.id)).toBe(false);

    // OpenInventoryTrait opens the inventory (horse with saddlebags, dead NPC)
    thief.add(new OpenInventoryTrait());
    expect(world.canReach(player.id, knife.id)).toBe(true);
  });

  it('on a supporter: reachable', () => {
    const table = world.createEntity('Table', 'supporter');
    table.add(new SupporterTrait());
    const book = world.createEntity('Book', 'item');
    world.moveEntity(table.id, room.id);
    world.moveEntity(book.id, table.id);

    expect(world.canReach(player.id, book.id)).toBe(true);
  });

  it('same room, loose on the floor: reachable', () => {
    const rock = world.createEntity('Rock', 'item');
    world.moveEntity(rock.id, room.id);

    expect(world.canReach(player.id, rock.id)).toBe(true);
  });

  it('sight precondition: closed OPAQUE container contents neither visible nor reachable', () => {
    const safe = world.createEntity('Safe', 'container');
    safe.add(new ContainerTrait({ isTransparent: false }));
    safe.add(new OpenableTrait({ isOpen: true }));
    const gem = world.createEntity('Gem', 'item');
    world.moveEntity(safe.id, room.id);
    world.moveEntity(gem.id, safe.id);
    safe.getTrait(OpenableTrait)!.isOpen = false;

    expect(world.canSee(player.id, gem.id)).toBe(false);
    expect(world.canReach(player.id, gem.id)).toBe(false);
  });

  it('unknown ids: canReach false, getReachable empty', () => {
    expect(world.canReach('nope', player.id)).toBe(false);
    expect(world.canReach(player.id, 'nope')).toBe(false);
    expect(world.getReachable('nope')).toEqual([]);
  });

  it('getReachable is a subset of getVisible (sight precondition)', () => {
    const jar = world.createEntity('Jar', 'container');
    jar.add(new ContainerTrait({ isTransparent: true }));
    jar.add(new OpenableTrait({ isOpen: true }));
    const bug = world.createEntity('Bug', 'item');
    const stick = world.createEntity('Stick', 'item');
    world.moveEntity(jar.id, room.id);
    world.moveEntity(bug.id, jar.id);
    world.moveEntity(stick.id, room.id);
    jar.getTrait(OpenableTrait)!.isOpen = false;

    const visibleIds = new Set(world.getVisible(player.id).map((e) => e.id));
    for (const entity of world.getReachable(player.id)) {
      expect(visibleIds.has(entity.id), `${entity.id} reachable but not visible`).toBe(true);
    }
  });
});

describe('ScopeEvaluator.getTouchableEntities delegates to reachability (ADR-273 D4 one-definition)', () => {
  it('returns reachable ids, not merely visible ones', () => {
    const world = new WorldModel();
    const room = world.createEntity('Room', 'room');
    room.add(new RoomTrait());
    room.add(new ContainerTrait());
    const player = world.createEntity('Player', 'actor');
    player.add(new ActorTrait());
    player.add(new ContainerTrait());
    const jar = world.createEntity('Jar', 'container');
    jar.add(new ContainerTrait({ isTransparent: true }));
    jar.add(new OpenableTrait({ isOpen: true }));
    const firefly = world.createEntity('Firefly', 'item');
    world.moveEntity(player.id, room.id);
    world.moveEntity(jar.id, room.id);
    world.moveEntity(firefly.id, jar.id);
    jar.getTrait(OpenableTrait)!.isOpen = false;

    const evaluator = new RuleScopeEvaluator(new ScopeRegistry());
    const touchable = evaluator.getTouchableEntities({
      world,
      actorId: player.id,
      currentLocation: room.id,
    });

    expect(touchable).toContain(jar.id);
    expect(touchable).not.toContain(firefly.id); // visible through glass, not touchable
  });
});
