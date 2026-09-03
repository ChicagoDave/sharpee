/**
 * zoo-surfaces-phase3.test.ts — Z3/Z3b/Z6 loader half (chord-zoo-surfaces
 * Phase 3, 2026-07-14): `present` blocks → ADR-212 slot entries (order,
 * counter keys, predicate gate ANDed with presence), `entered`/`exited`
 * narration on the `move` statement (ADR-328 D3, 2026-08-28: both rows fire
 * on every transition, each located at its room for the engine's presence
 * tag — no longer witnessed-only), `disappeared` riding the ADR-213
 * observer (statement AND TS-initiated removals; orphaning never fires),
 * and `detail` compiling to the shipped
 * trait fields or the loader-owned state-clause provider.
 */
import { describe, expect, it, vi } from 'vitest';
import { createNpcService } from '@sharpee/stdlib';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import type { Choice } from '@sharpee/if-domain';
import {
  getStateClauses,
  LightSourceTrait,
  SwitchableTrait,
  TraitType,
  WorldModel,
} from '@sharpee/world-model';
import { ChordDetailTrait, ChordStory, createStory } from '../src';

const CHORD_STORY_STATE_KEY = 'chord.story.state';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

interface Booted {
  story: ChordStory;
  world: WorldModel;
  playerId: string;
}

function boot(source: string): Booted {
  const story = createStory(compileSource(source), { seed: 5 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, playerId: player.id };
}

const messageIdsOf = (events: ISemanticEvent[]) =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter(Boolean);

/** Fire a room's `after the player entering` clauses with the player already there. */
function enterRoom(booted: Booted, roomIrId: string): ISemanticEvent[] {
  const roomId = booted.story.entityId(roomIrId)!;
  booted.world.moveEntity(booted.playerId, roomId);
  return booted.story.runtime.fireEventClauses(booted.world, {
    id: `m${Math.random()}`,
    type: 'if.event.actor_moved',
    timestamp: 0,
    entities: { actor: booted.playerId },
    data: { toRoom: roomId },
  });
}

describe('Z3 present: ADR-212 slot entries', () => {
  const SOURCE = `story
  title: P3
  authors:
    N
  id: p3
  story-version: 0.0.1
  states: open, after-hours

create the Zoo
  a room

  A zoo.

create the keeper
  in the Zoo

  A keeper.

  phrase present:
    Sam is here.

create the parrot
  in the Zoo

  A parrot.

  phrase present, cycling:
    The parrot preens.
  or
    The parrot stares.

create the ghost
  in the Zoo

  A ghost.

  phrase present while after-hours:
    A translucent shape drifts by.

create Alex
  a person
  playable
  in the Zoo

  You.

before the game starts
  change the player to Alex
end before

`;

  function bootWithEngine() {
    const booted = boot(SOURCE);
    const registered: Array<Record<string, unknown>> = [];
    booted.story.onEngineReady({ getNpcService: () => createNpcService(),
      getPluginRegistry: () => ({ register: () => {} }),
      registerSlotEntry: (entry: Record<string, unknown>) => void registered.push(entry),
    } as never);
    return { ...booted, registered };
  }

  it('one entry per authoring entity: slotKey/owner/order/counterKey per ADR-212 §5', () => {
    const { story, registered } = bootWithEngine();
    expect(registered).toHaveLength(3);
    expect(registered.map((e) => e.slotKey)).toEqual(['here', 'here', 'here']);
    expect(registered.map((e) => e.order)).toEqual([0, 1, 2]);
    expect(registered.map((e) => e.counterKey)).toEqual(['present', 'present', 'present']);
    expect(registered.map((e) => e.owner)).toEqual([
      story.entityId('keeper'),
      story.entityId('parrot'),
      story.entityId('ghost'),
    ]);
  });

  it('a single plain variant compiles to a Literal; variants compile to a Choice keyed (owner, present)', () => {
    const { story, registered } = bootWithEngine();
    expect(registered[0].content).toEqual({ kind: 'literal', text: 'Sam is here.' });
    const choice = registered[1].content as Choice;
    expect(choice).toMatchObject({
      kind: 'choice',
      selector: 'cycling',
      entityId: story.entityId('parrot'),
      messageKey: 'present',
    });
    expect(choice.alternatives).toHaveLength(2);
  });

  it('a `while`-gated block uses the predicate seam, ANDed with owner presence', () => {
    const { story, world, registered } = bootWithEngine();
    const gate = (registered[2] as { gate?: { kind: string; holds: (w: WorldModel) => boolean } }).gate;
    expect(gate?.kind).toBe('predicate');
    // Co-located but not after-hours: the authored condition gates it out.
    expect(gate!.holds(world)).toBe(false);
    world.setStateValue(CHORD_STORY_STATE_KEY, 'after-hours');
    expect(gate!.holds(world)).toBe(true);
    // After-hours but absent: presence still gates (the channel's semantics).
    world.moveEntity(story.entityId('ghost')!, story.entityId('keeper')!); // into a non-room container
    world.moveEntity(story.entityId('ghost')!, null);
    expect(gate!.holds(world)).toBe(false);
    // Ungated entries carry no gate at all (platform owner-present default).
    expect((registered[0] as { gate?: unknown }).gate).toBeUndefined();
  });
});

describe('Z3 entered/exited on the move statement — located, not gated (ADR-328 D3)', () => {
  const SOURCE = `story
  title: P3
  authors:
    N
  id: p3
  story-version: 0.0.1

create the Lab
  a room

  A lab.

  after the player entering
    move the cat to the Annex when the cat is in the Lab
    move the cat to the Annex when the cat is in the Hall
  end after

create the Annex
  a room

  An annex.

create the Hall
  a room

  A hall.

  after the player entering
    move the cat to the Hall when the cat is in the Annex
  end after

create the cat
  in the Lab

  A cat.

  phrase exited, cycling:
    The cat slips away.
  or
    The cat pads off.

  phrase entered:
    The cat wanders in.

create Alex
  a person
  playable
  starts in the Lab

  You.

before the game starts
  change the player to Alex
end before

`;

  const eventFor = (events: ISemanticEvent[], messageId: string) =>
    events.find((e) => (e.data as { messageId?: string }).messageId === messageId)!;

  it('exited is located at the source room, with counters keyed (owner, exited)', () => {
    const booted = boot(SOURCE);
    const events = enterRoom(booted, 'lab'); // cat Lab → Annex, player in Lab
    expect(messageIdsOf(events)).toContain('cat.exited');
    const exited = eventFor(events, 'cat.exited');
    expect(exited.entities.location).toBe(booted.story.entityId('lab'));
    expect(exited.entities.actor).toBe(booted.story.entityId('cat'));
    const variants = (exited.data as { params: { variants: Choice } }).params.variants;
    expect(variants).toMatchObject({
      kind: 'choice',
      selector: 'cycling',
      entityId: booted.story.entityId('cat'),
      messageKey: 'exited',
    });
  });

  it('entered is located at the destination room — and the source row fires too, located at the source', () => {
    const booted = boot(SOURCE);
    enterRoom(booted, 'lab'); // cat → Annex
    const events = enterRoom(booted, 'hall'); // cat Annex → Hall = player's room
    expect(messageIdsOf(events)).toContain('cat.entered');
    expect(eventFor(events, 'cat.entered').entities.location).toBe(booted.story.entityId('hall'));
    // The source row is no longer dropped for being unwitnessed: it rides,
    // located at the Annex, for the engine to tag absent and the client to hide.
    expect(messageIdsOf(events)).toContain('cat.exited');
    expect(eventFor(events, 'cat.exited').entities.location).toBe(booted.story.entityId('annex'));
  });

  it('a transition between two rooms the player is in neither of still narrates both rows, located', () => {
    const booted = boot(SOURCE);
    enterRoom(booted, 'lab'); // cat → Annex
    enterRoom(booted, 'hall'); // cat → Hall
    const events = enterRoom(booted, 'lab'); // cat Hall → Annex; player in Lab
    expect(eventFor(events, 'cat.exited').entities.location).toBe(booted.story.entityId('hall'));
    expect(eventFor(events, 'cat.entered').entities.location).toBe(booted.story.entityId('annex'));
    expect(booted.world.getLocation(booted.story.entityId('cat')!)).toBe(booted.story.entityId('annex'));
  });
});

describe('Z3 disappeared + Z6 remove: the ADR-213 observer path', () => {
  const REMOVE_SOURCE = `story
  title: P3
  authors:
    N
  id: p3
  story-version: 0.0.1

create the Lab
  a room

  A lab.

  after the player entering
    remove the cat when the cat is here
  end after

create the Annex
  a room

  An annex.

create the cat
  in the Lab

  A cat.

  phrase disappeared:
    The cat is simply gone.

create Alex
  a person
  playable
  starts in the Lab

  You.

before the game starts
  change the player to Alex
end before

`;

  it('the remove statement marks the entity gone and narrates the witnessed disappearance (AC-6; ADR-325 Z6 as amended)', () => {
    const booted = boot(REMOVE_SOURCE);
    const catId = booted.story.entityId('cat')!;
    const events = enterRoom(booted, 'lab');
    expect(messageIdsOf(events)).toContain('cat.disappeared');
    // GH #345: `remove` no longer destroys — the cat stays in the world,
    // nowhere, flagged gone, so conditions naming it still evaluate.
    expect(booted.world.hasEntity(catId)).toBe(true);
    expect(booted.world.getLocation(catId)).toBeUndefined();
    expect(booted.story.runtime.isGone(catId, booted.world)).toBe(true);
  });

  it('an unwitnessed removal removes silently — nothing narrated, nothing consumed', () => {
    const booted = boot(REMOVE_SOURCE);
    const catId = booted.story.entityId('cat')!;
    // Park the cat elsewhere, then trigger the clause from the Lab: the
    // when-suffix `the cat is here` fails, so remove doesn't fire — instead
    // remove it directly, unwitnessed, via the world API.
    booted.world.moveEntity(catId, booted.story.entityId('annex')!);
    booted.world.removeEntity(catId);
    expect(booted.world.hasEntity(catId)).toBe(false);
    const daemons = booted.story.runtime.buildSchedulerDaemons();
    const drained = daemons.flatMap((d) => {
      const ctx = { world: booted.world, turn: 1 };
      return d.condition && !d.condition(ctx) ? [] : d.run(ctx);
    });
    expect(messageIdsOf(drained)).not.toContain('cat.disappeared');
  });

  it('a TS-initiated witnessed removal narrates via the drain daemon (AC-2)', () => {
    const booted = boot(REMOVE_SOURCE);
    const catId = booted.story.entityId('cat')!;
    // Player and cat share the Lab; remove through the world API directly —
    // no Chord statement involved (the zookeeper-daemon shape).
    booted.world.moveEntity(booted.playerId, booted.story.entityId('lab')!);
    booted.world.removeEntity(catId);
    const daemons = booted.story.runtime.buildSchedulerDaemons();
    expect(daemons.map((d) => d.id)).toContain('chord.channel-drain');
    const drained = daemons.flatMap((d) => {
      const ctx = { world: booted.world, turn: 1 };
      return d.condition && !d.condition(ctx) ? [] : d.run(ctx);
    });
    expect(messageIdsOf(drained)).toContain('cat.disappeared');
  });

  it('orphaning (moveEntity to null) never fires the channel (ADR-213 AC-7)', () => {
    const booted = boot(REMOVE_SOURCE);
    const catId = booted.story.entityId('cat')!;
    booted.world.moveEntity(booted.playerId, booted.story.entityId('lab')!);
    booted.world.moveEntity(catId, null);
    expect(booted.world.hasEntity(catId)).toBe(true); // orphaned, not gone
    const daemons = booted.story.runtime.buildSchedulerDaemons();
    const drained = daemons.flatMap((d) => {
      const ctx = { world: booted.world, turn: 1 };
      return d.condition && !d.condition(ctx) ? [] : d.run(ctx);
    });
    expect(messageIdsOf(drained)).not.toContain('cat.disappeared');
  });
});

describe('Z3b detail: trait fields and the loader-owned provider', () => {
  const SOURCE = `story
  title: P3
  authors:
    N
  id: p3
  story-version: 0.0.1

create the Lab
  a room

  A lab.

create the flashlight
  switchable
  in the Lab

  A flashlight.

  phrase detail while the flashlight is on:
    It clicks faintly.

create the lantern
  light-source
  in the Lab

  A lantern.

  phrase detail while the lantern is lit:
    Its glow steadies.

create the jar
  in the Lab

  A jar.

  phrase detail while the cat is here:
    The cat eyes it warily.

create the cat
  in the Lab

  A cat.

create Alex
  a person
  playable
  in the Lab

  You.

before the game starts
  change the player to Alex
end before

`;

  it('`while it is on` / `while it is lit` bind the shipped trait fields', () => {
    const booted = boot(SOURCE);
    const flashlight = booted.world.getEntity(booted.story.entityId('flashlight')!)!;
    const lantern = booted.world.getEntity(booted.story.entityId('lantern')!)!;
    expect((flashlight.get(TraitType.SWITCHABLE) as SwitchableTrait).detailWhenOn).toBe('It clicks faintly.');
    expect((lantern.get(TraitType.LIGHT_SOURCE) as LightSourceTrait).detailWhenLit).toBe('Its glow steadies.');
    // Trait-shaped gates use the field path, not the provider.
    expect(flashlight.has(ChordDetailTrait.type)).toBe(false);
  });

  it('any other condition rides the loader-owned state-clause provider, evaluated live', () => {
    const booted = boot(SOURCE);
    const jar = booted.world.getEntity(booted.story.entityId('jar')!)!;
    expect(jar.has(ChordDetailTrait.type)).toBe(true);

    expect(getStateClauses(jar)).toEqual(['The cat eyes it warily.']); // cat co-located
    booted.world.moveEntity(booted.story.entityId('cat')!, null);
    expect(getStateClauses(jar)).toEqual([]); // gate no longer holds
  });
});
