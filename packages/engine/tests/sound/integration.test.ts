/**
 * @file ADR-172 Phase 6 Step 6.4 — End-to-end integration test.
 *
 * The §End-to-end scenario from ADR-172 condensed into a self-contained
 * engine test:
 *
 *   - Three rooms (Parlor, Hall, Library).
 *   - Open exit Parlor ↔ Hall (cost 1 in each direction).
 *   - Thin wall Hall ↔ Library (cost 2) with a tapestry obstructor on
 *     the Hall side carrying `AcousticDampenerTrait({ contribution: +3 })`.
 *   - Thick wall Parlor ↔ Library (cost 6).
 *
 *   - Player in Library (auto-attached `ListenerTrait` per Phase 4).
 *   - Bystander NPC in Parlor with manually-attached `ListenerTrait`.
 *   - Tapestry portable entity in Hall (the obstructor).
 *
 *   - Player runs a `shout` action with `volumeTier: 'raised'` (budget 7).
 *
 * Pins:
 *   - AC-2 (content-bearing sound, correct tier delivered to listener)
 *   - AC-4 (multiple listeners, per-listener tiers in one turn)
 *   - AC-7 (obstructor removal causes cost to drop; subsequent emissions
 *     reflect the change without any extra wiring)
 *
 * Math (volume budget 7):
 *   Tapestry present:
 *     Path A: Library →[thin+tapestry=5]→ Hall →[exit=1, +1 room]→ Parlor = 7   → silent
 *     Path B: Library →[thick=6]→ Parlor                                     = 6   → presence-only
 *     Best = presence-only.
 *   Tapestry removed (moved to player inventory, no longer in Hall):
 *     Path A: Library →[thin=2]→ Hall →[exit=1, +1 room]→ Parlor             = 4   → muffled
 *     Path B: Library →[thick=6]→ Parlor                                     = 6   → presence-only
 *     Best = muffled.
 *
 * Owner context: `@sharpee/engine` — sound subsystem tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AcousticDampenerTrait,
  AcousticTrait,
  ActorTrait,
  ContainerTrait,
  IdentityTrait,
  IFEntity,
  ListenerTrait,
  RoomBehavior,
  RoomTrait,
  WorldModel,
} from '@sharpee/world-model';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import type { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import type { ISemanticEvent } from '@sharpee/core';

import { GameEngine } from '../../src/game-engine';
import type { Story, StoryConfig } from '../../src/story';

// =============================================================================
// Test action — player shouts at volume 'raised'.
// =============================================================================

const SHOUT_ACTION_ID = 'test.action.shout';

const shoutAction: Action = {
  id: SHOUT_ACTION_ID,
  validate(_ctx: ActionContext): ValidationResult {
    return { valid: true };
  },
  execute(_ctx: ActionContext): void {
    // No mutations — pure sound emission.
  },
  report(ctx: ActionContext): ISemanticEvent[] {
    ctx.emitSound({
      kind: 'speech',
      volumeTier: 'raised',
      content: { messageId: 'test.shout.line' },
    });
    return [
      ctx.event('test.event.shouted', {
        actionId: SHOUT_ACTION_ID,
        messageId: 'shouted',
      }),
    ];
  },
};

// =============================================================================
// Test story — three rooms with the tapestry topology.
// =============================================================================

interface IRoomRefs {
  parlor: IFEntity;
  hall: IFEntity;
  library: IFEntity;
}

interface IActorRefs {
  player: IFEntity;
  bystander: IFEntity;
}

interface IPropRefs {
  tapestry: IFEntity;
}

class TapestryStory implements Story {
  config: StoryConfig = {
    id: 'tapestry-test',
    title: 'Tapestry Test',
    author: 'test',
    version: '1.0.0',
  };

  private _rooms?: IRoomRefs;
  private _actors?: IActorRefs;
  private _props?: IPropRefs;

  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('yourself', 'actor');
    player.add(new ActorTrait());
    player.add(new ContainerTrait());
    player.add(new IdentityTrait({ name: 'yourself', article: '' }));
    if (!this._actors) this._actors = { player, bystander: null as any };
    else this._actors.player = player;
    return player;
  }

  initializeWorld(world: WorldModel): void {
    // Rooms.
    const parlor = world.createEntity('Parlor', 'room');
    parlor.add(new RoomTrait());
    parlor.add(new IdentityTrait({ name: 'Parlor', article: 'the' }));

    const hall = world.createEntity('Hall', 'room');
    hall.add(new RoomTrait());
    hall.add(new IdentityTrait({ name: 'Hall', article: 'the' }));

    const library = world.createEntity('Library', 'room');
    library.add(new RoomTrait());
    library.add(new IdentityTrait({ name: 'Library', article: 'the' }));

    this._rooms = { parlor, hall, library };

    // Open exit Parlor ↔ Hall (no door → exit cost 1).
    RoomBehavior.setExit(parlor, 'north', hall.id);
    RoomBehavior.setExit(hall, 'south', parlor.id);

    // Tapestry — placed in Hall before the wall references it as an
    // obstructor (createWall validates the obstructor is located in the
    // referenced side's room at world-load time).
    const tapestry = world.createEntity('tapestry', 'object');
    tapestry.add(new IdentityTrait({ name: 'tapestry', article: 'the' }));
    tapestry.add(new AcousticDampenerTrait(3));
    world.moveEntity(tapestry.id, hall.id);

    if (!this._props) this._props = { tapestry };
    else this._props.tapestry = tapestry;

    // Thin wall Hall ↔ Library; tapestry is the Hall-side obstructor.
    world.createWall({
      between: [hall, library],
      whole: [new AcousticTrait('thin')],
      sides: {
        [hall.id]: { adjective: 'tapestried', obstructedBy: tapestry.id },
        [library.id]: { adjective: 'paneled' },
      },
    });

    // Thick wall Parlor ↔ Library; no obstructor on either side.
    world.createWall({
      between: [parlor, library],
      whole: [new AcousticTrait('thick')],
      sides: {
        [parlor.id]: { adjective: 'plastered' },
        [library.id]: { adjective: 'oak' },
      },
    });

    // Place the player in Library (where the shout originates).
    if (this._actors?.player) {
      world.moveEntity(this._actors.player.id, library.id);
    }

    // Bystander NPC in Parlor, with an explicit ListenerTrait so the
    // dispatcher reaches them. (Phase 4's auto-attach only covers the
    // player.)
    const bystander = world.createEntity('bystander', 'actor');
    bystander.add(new ActorTrait());
    bystander.add(new ContainerTrait());
    bystander.add(new IdentityTrait({ name: 'bystander', article: 'the' }));
    bystander.add(new ListenerTrait());
    world.moveEntity(bystander.id, parlor.id);
    if (this._actors) this._actors.bystander = bystander;
  }

  getCustomActions(): Action[] {
    return [shoutAction];
  }

  getRooms(): IRoomRefs {
    if (!this._rooms) throw new Error('rooms not initialized');
    return this._rooms;
  }

  getActors(): IActorRefs {
    if (!this._actors?.bystander) throw new Error('actors not initialized');
    return this._actors as IActorRefs;
  }

  getProps(): IPropRefs {
    if (!this._props) throw new Error('props not initialized');
    return this._props;
  }
}

// =============================================================================
// Tests
// =============================================================================

function audibilityEventsFor(
  result: { events: ISemanticEvent[] },
  listenerId: string,
): ISemanticEvent[] {
  return result.events.filter(
    (e) => e.type === 'sound.audibility.heard' && e.entities.target === listenerId,
  );
}

describe('ADR-172 Phase 6 Step 6.4 — Tapestry integration scenario', () => {
  let engine: GameEngine;
  let story: TapestryStory;

  beforeEach(async () => {
    const world = new WorldModel();
    const language = new EnglishLanguageProvider();
    const parser = new EnglishParser(language, { world });

    const placeholder = world.createEntity('yourself-placeholder', 'actor');
    world.setPlayer(placeholder.id);

    engine = new GameEngine({ world, player: placeholder, parser, language });
    parser.addVerb(SHOUT_ACTION_ID, ['shout'], 'VERB_ONLY');

    story = new TapestryStory();
    engine.setStory(story);
    await engine.start();
  });

  it('delivers per-listener audibility tiers in one turn (player=full same-room, bystander=presence-only through tapestried wall)', async () => {
    const { player, bystander } = story.getActors();

    const result = await engine.executeTurn('shout');
    expect(result.success).toBe(true);

    const playerEvents = audibilityEventsFor(result, player.id);
    const bystanderEvents = audibilityEventsFor(result, bystander.id);

    expect(playerEvents).toHaveLength(1);
    expect((playerEvents[0].data as any).audibilityTier).toBe('full');
    expect((playerEvents[0].data as any).kind).toBe('speech');
    expect((playerEvents[0].data as any).volumeTier).toBe('raised');

    expect(bystanderEvents).toHaveLength(1);
    // Tapestry path is silent; thick-wall direct path delivers presence-only.
    expect((bystanderEvents[0].data as any).audibilityTier).toBe('presence-only');
  });

  it('AC-7: bystander tier upgrades when the tapestry obstructor leaves the Hall (between turns)', async () => {
    const { player, bystander } = story.getActors();
    const { tapestry } = story.getProps();

    // Turn 1 — tapestry present.
    const t1 = await engine.executeTurn('shout');
    const t1Bystander = audibilityEventsFor(t1, bystander.id);
    expect(t1Bystander).toHaveLength(1);
    expect((t1Bystander[0].data as any).audibilityTier).toBe('presence-only');

    // Move the tapestry out of Hall (player picks it up; the obstructor
    // protocol's runtime-location check lifts the dampener contribution
    // because tapestry is no longer in the Hall).
    const moved = engine.getWorld().moveEntity(tapestry.id, player.id);
    expect(moved).toBe(true);

    // Turn 2 — tapestry no longer in Hall.
    const t2 = await engine.executeTurn('shout');
    const t2Bystander = audibilityEventsFor(t2, bystander.id);
    expect(t2Bystander).toHaveLength(1);
    expect((t2Bystander[0].data as any).audibilityTier).toBe('muffled');

    // Player remains same-room: full both turns.
    expect((audibilityEventsFor(t1, player.id)[0].data as any).audibilityTier).toBe('full');
    expect((audibilityEventsFor(t2, player.id)[0].data as any).audibilityTier).toBe('full');
  });

  it('passes content payload through to every listener that hears the sound', async () => {
    const { player, bystander } = story.getActors();
    const r = await engine.executeTurn('shout');

    for (const target of [player, bystander]) {
      const events = audibilityEventsFor(r, target.id);
      expect(events).toHaveLength(1);
      expect((events[0].data as any).content).toEqual({ messageId: 'test.shout.line' });
    }
  });

  it('records the crossed wall id on the bystander event when the path is single-wall (thick wall direct)', async () => {
    const { bystander } = story.getActors();
    const r = await engine.executeTurn('shout');
    const ev = audibilityEventsFor(r, bystander.id)[0];

    // The thick-wall direct path is the chosen one (lower cost than the
    // tapestried-wall + exit path). The wallId should be present.
    expect((ev.data as any).wallId).toBeDefined();
    expect(typeof (ev.data as any).wallId).toBe('string');
  });
});
