/**
 * places-runtime.test.ts — ADR-325 D1–D2 (GH #306) loader half, against a
 * real WorldModel and the real runtime's clause path: `move … to <owner>'s
 * location` / `… here` / `… offstage`, `location` as the containing room,
 * `is in <owner>'s location` on an offstage owner, the witnessed
 * `disappeared` row on going offstage, and the named diagnostic when the
 * owner is offstage.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';

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

/** Fire the Stall's `after entering it` clause with the player already there. */
function enterStall(booted: Booted): ISemanticEvent[] {
  const roomId = booted.story.entityId('stall')!;
  booted.world.moveEntity(booted.playerId, roomId);
  return booted.story.runtime.fireEventClauses(booted.world, {
    id: 'm1',
    type: 'if.event.actor_moved',
    timestamp: 0,
    entities: { actor: booted.playerId },
    data: { toRoom: roomId },
  });
}

const SOURCE = (stallClause: string) => `story
  title: Places
  authors:
    N
  id: places
  story-version: 0.0.1

create the Stall
  a room

  A stall.

  after entering it
    ${stallClause}
  end after

create the Alley
  a room

  An alley.

create the crate
  a container
  in the Alley

  A crate.

create Teisha
  a person
  in the crate

  Teisha.

create the monkey
  in the Stall

  A monkey.

  phrase disappeared:
    The monkey is gone.

create the player
  starts in the Stall

  You.
`;

describe("move … to <owner>'s location (D1)", () => {
  it("moves to the owner's containing room, not its immediate holder", () => {
    const b = boot(SOURCE("move the monkey to Teisha's location"));
    const monkey = b.story.entityId('monkey')!;
    expect(b.world.getLocation(monkey)).toBe(b.story.entityId('stall'));
    enterStall(b);
    // Teisha is in the crate in the Alley; her location is the Alley.
    expect(b.world.getLocation(monkey)).toBe(b.story.entityId('alley'));
  });

  it("`move … here` lands in the player's room", () => {
    const b = boot(SOURCE('move Teisha here'));
    const teisha = b.story.entityId('teisha')!;
    enterStall(b);
    expect(b.world.getLocation(teisha)).toBe(b.story.entityId('stall'));
  });

  it('refuses with a diagnostic naming the owner when the owner is offstage', () => {
    const b = boot(SOURCE("move the monkey to Teisha's location"));
    b.world.moveEntity(b.story.entityId('teisha')!, null);
    expect(() => enterStall(b)).toThrow(/Cannot move to Teisha's location — Teisha is offstage/);
    // Nothing moved.
    expect(b.world.getLocation(b.story.entityId('monkey')!)).toBe(b.story.entityId('stall'));
  });
});

describe('move … offstage (D2)', () => {
  it('detaches the entity, keeps it in the world, and narrates the witnessed disappearance', () => {
    const b = boot(SOURCE('move the monkey offstage'));
    const monkey = b.story.entityId('monkey')!;
    const events = enterStall(b);
    expect(b.world.hasEntity(monkey)).toBe(true);
    expect(b.world.getLocation(monkey)).toBeUndefined();
    expect(messageIdsOf(events)).toContain('monkey.disappeared');
  });

  it('an unwitnessed offstage move narrates nothing', () => {
    const b = boot(SOURCE('move Teisha offstage'));
    const teisha = b.story.entityId('teisha')!;
    const events = enterStall(b);
    expect(b.world.getLocation(teisha)).toBeUndefined();
    expect(messageIdsOf(events)).not.toContain('teisha.disappeared');
  });

  it('a later move reattaches it', () => {
    const b = boot(SOURCE('move the monkey offstage'));
    const monkey = b.story.entityId('monkey')!;
    enterStall(b);
    b.world.moveEntity(monkey, b.story.entityId('alley')!);
    expect(b.world.getLocation(monkey)).toBe(b.story.entityId('alley'));
  });
});

describe("is in <owner>'s location (D1)", () => {
  const COND = (cond: string) => SOURCE(`move the monkey to the Alley when ${cond}`);

  it('is true when the subject shares the owner\'s containing room', () => {
    // The player is in the Stall with the monkey.
    const b = boot(COND("the monkey is in the player's location"));
    enterStall(b);
    expect(b.world.getLocation(b.story.entityId('monkey')!)).toBe(b.story.entityId('alley'));
  });

  it('is false, not an error, when the owner is offstage', () => {
    const b = boot(COND("the monkey is in Teisha's location"));
    b.world.moveEntity(b.story.entityId('teisha')!, null);
    expect(() => enterStall(b)).not.toThrow();
    expect(b.world.getLocation(b.story.entityId('monkey')!)).toBe(b.story.entityId('stall'));
  });
});
