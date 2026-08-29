/**
 * going-witnessed.test.ts — a non-player actor's move is narrated by what
 * the PLAYER sees of it, never by what the mover sees (ADR-328 D3/D5).
 *
 * The going action emits `actor_exited` located at the origin and
 * `actor_entered` located at the destination, each carrying a witnessed
 * message when the non-player mover announces its movement
 * (`NpcTrait.announcesMovement`, opt-in — the thief slips by unremarked);
 * the mover's own arrival perception (the
 * room description, the contents list, the darkness line) is the
 * protagonist's alone. Presence tagging then renders whichever room the
 * player is in.
 *
 * REAL-PATH: real WorldModel, the real context factory with a non-player
 * actor, the real going action. Assertions are on world state and on the
 * emitted events' locations and messages.
 */
import { describe, it, expect } from 'vitest';
import {
  WorldModel,
  EntityType,
  ActorTrait,
  ContainerTrait,
  RoomTrait,
  Direction,
  NpcTrait,
} from '@sharpee/world-model';
import { goingAction } from '../../../src/actions/standard/going';
import { IFActions } from '../../../src/actions/constants';
import { createActionContext } from '../../../src/actions/enhanced-context';
import { createCommand } from '../../test-utils';
import { createFixtureRandomService } from '../../test-utils/fixture-random-service';

function buildWorld() {
  const world = new WorldModel();
  const hall = world.createEntity('Hall', EntityType.ROOM);
  const cellar = world.createEntity('Cellar', EntityType.ROOM);
  hall.add(new RoomTrait({ exits: { [Direction.NORTH]: { destination: cellar.id } } }));
  cellar.add(new RoomTrait({ exits: { [Direction.SOUTH]: { destination: hall.id } } }));

  const player = world.createEntity('You', EntityType.ACTOR);
  player.add(new ActorTrait({ isPlayer: true }));
  player.add(new ContainerTrait());
  world.moveEntity(player.id, hall.id);
  world.setPlayer(player.id);

  const npc = world.createEntity('mercenary', EntityType.ACTOR);
  npc.add(new ActorTrait());
  npc.add(new ContainerTrait());
  // Opt-in: only a mover that announces its movement is narrated (the
  // thief slips by unremarked).
  npc.add(new NpcTrait({ announcesMovement: true }));
  world.moveEntity(npc.id, hall.id);

  return { world, hall, cellar, player, npc };
}

function goNorth(world: WorldModel, player: ReturnType<typeof buildWorld>['player'], actor?: ReturnType<typeof buildWorld>['npc']) {
  const command = createCommand(IFActions.GOING);
  command.parsed.extras = { direction: Direction.NORTH };
  const context = createActionContext(world, player, goingAction, command, createFixtureRandomService(1), undefined, actor);
  expect(goingAction.validate(context).valid).toBe(true);
  goingAction.execute(context);
  return goingAction.report(context);
}

describe('a witnessed mover (ADR-328 D3/D5)', () => {
  it('an NPC going north moves, and its exit and entry are narrated where each happened', () => {
    const { world, hall, cellar, player, npc } = buildWorld();

    const events = goNorth(world, player, npc);

    expect(world.getLocation(npc.id)).toBe(cellar.id);

    const exited = events.find(e => e.type === 'if.event.actor_exited')!;
    const entered = events.find(e => e.type === 'if.event.actor_entered')!;
    expect(exited.entities).toMatchObject({ actor: npc.id, location: hall.id });
    expect(exited.data).toMatchObject({ messageId: 'if.action.going.departs', params: { direction: 'north' } });
    expect(entered.entities).toMatchObject({ actor: npc.id, location: cellar.id });
    expect(entered.data).toMatchObject({ messageId: 'if.action.going.arrives', params: { direction: 'south' } });
  });

  it('a mover that does not announce its movement moves unremarked — the events carry no messages', () => {
    const { world, cellar, player, npc } = buildWorld();
    (npc.get(NpcTrait) as NpcTrait).announcesMovement = false;

    const events = goNorth(world, player, npc);

    expect(world.getLocation(npc.id)).toBe(cellar.id);
    const exited = events.find(e => e.type === 'if.event.actor_exited')!;
    const entered = events.find(e => e.type === 'if.event.actor_entered')!;
    expect((exited.data as { messageId?: string }).messageId).toBeUndefined();
    expect((entered.data as { messageId?: string }).messageId).toBeUndefined();
    // Still located where it happened, for handlers and presence.
    expect(entered.entities.location).toBe(cellar.id);
  });

  it("an NPC's move emits no room description — the arrival perception is the protagonist's", () => {
    const { world, player, npc } = buildWorld();

    const types = goNorth(world, player, npc).map(e => e.type);

    expect(types).toContain('if.event.actor_moved');
    expect(types).not.toContain('if.event.room.description');
    expect(types).not.toContain('if.event.list.contents');
  });

  it("the player's own move keeps its arrival description and carries no witnessed messages", () => {
    const { world, cellar, player } = buildWorld();

    const events = goNorth(world, player);

    expect(world.getLocation(player.id)).toBe(cellar.id);
    expect(events.map(e => e.type)).toContain('if.event.room.description');
    const exited = events.find(e => e.type === 'if.event.actor_exited')!;
    const entered = events.find(e => e.type === 'if.event.actor_entered')!;
    expect((exited.data as { messageId?: string }).messageId).toBeUndefined();
    expect((entered.data as { messageId?: string }).messageId).toBeUndefined();
  });
});
