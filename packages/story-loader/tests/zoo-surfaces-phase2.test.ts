/**
 * zoo-surfaces-phase2.test.ts — Z2 loader half (chord-zoo-surfaces Phase 2,
 * 2026-07-14): the atomic per-room snippet compile onto ADR-209 storage.
 *
 * Covers AC-4 (presence gate → `mentions`), AC-11 (`is here` and
 * `is in <this room>` compile byte-identically), AC-12 (any other condition
 * registers on the ADR-211 gate seam keyed `(roomId, marker)`; nothing
 * gate-shaped serializes), AC-8 (the same phrase emitted via a `phrase`
 * statement keeps its own `('chord', key)` counter identity), the `nothing`
 * → `''` empty variant, the single-variant plain-string entry, the shared
 * entry across both description texts (Z1/Q6), and the atomic contract (a
 * LoadError mid-compile leaves the room untouched — never partial).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { Choice, SnippetEntry } from '@sharpee/if-domain';
import { clearSnippetGates, lookupSnippetGate } from '@sharpee/stdlib';
import { IdentityTrait, RoomTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory, LoadError } from '../src';

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

function boot(ir: StoryIR): Booted {
  const story = createStory(ir, { seed: 5 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, playerId: player.id };
}

/** The lab story, parameterized on the phrase header's `while` gate. */
function labSource(gate: string): string {
  return `story "Z2" by "N"
  id: z2
  version: 0.0.1

create the Lab
  a room

  Shelves line the walls{note}. A door leads north.

  after entering it
    phrase note
  end after

create the Annex
  a room

  An annex.

create the cat
  in the Lab

  A cat.

create the player
  in the Lab

  You.

define phrase note, cycling${gate}
  and a cat glares from the top shelf
or
  nothing
end phrase
`;
}

function roomBits(booted: Booted, irId = 'lab') {
  const entity = booted.world.getEntity(booted.story.entityId(irId)!)!;
  return {
    entity,
    identity: entity.get(TraitType.IDENTITY) as IdentityTrait,
    room: entity.get(TraitType.ROOM) as RoomTrait,
  };
}

afterEach(() => {
  clearSnippetGates();
});

describe('Z2 loader: marker rewrite + snippet-map population', () => {
  it('AC-4: a presence gate on the marker\'s own room compiles to `mentions`, not a seam gate', () => {
    const booted = boot(compileSource(labSource(' while the cat is in the Lab')));
    const { entity, identity, room } = roomBits(booted);

    expect(identity.description).toBe('Shelves line the walls{snippet:note}. A door leads north.');
    expect(room.snippets?.note).toEqual({
      selector: 'cycling',
      texts: ['and a cat glares from the top shelf', ''],
      mentions: booted.story.entityId('cat'),
    });
    expect(lookupSnippetGate(entity.id, 'note')).toBeUndefined();
  });

  it('AC-11: `is here` compiles byte-identically to `is in <this room>`', () => {
    const viaHere = boot(compileSource(labSource(' while the cat is here')));
    const viaIsIn = boot(compileSource(labSource(' while the cat is in the Lab')));
    const hereBits = roomBits(viaHere);
    const isInBits = roomBits(viaIsIn);

    expect(hereBits.identity.description).toBe(isInBits.identity.description);
    expect(JSON.stringify(hereBits.room.snippets)).toBe(JSON.stringify(isInBits.room.snippets));
  });

  it('AC-12: any other condition registers on the gate seam keyed (roomId, marker) — and nothing gate-shaped serializes', () => {
    // Presence in a DIFFERENT room than the marker's — not `mentions` material.
    const booted = boot(compileSource(labSource(' while the cat is in the Annex')));
    const { entity, room } = roomBits(booted);

    const entry = room.snippets?.note as Extract<SnippetEntry, { texts: unknown }>;
    expect(entry.mentions).toBeUndefined();
    // The entry is plain serializable data — the gate lives in the registry.
    expect(JSON.parse(JSON.stringify(entry))).toEqual(entry);

    const gate = lookupSnippetGate(entity.id, 'note');
    expect(typeof gate).toBe('function');
    // The thunk evaluates the LIVE world: cat in the Lab → not in the Annex.
    expect(gate!()).toBe(false);
    booted.world.moveEntity(booted.story.entityId('cat')!, booted.story.entityId('annex')!);
    expect(gate!()).toBe(true);
  });

  it('AC-8: the same phrase emitted via a `phrase` statement keeps its own (chord, key) counter identity', () => {
    const booted = boot(compileSource(labSource('')));
    const lab = booted.story.entityId('lab')!;
    const events = booted.story.runtime.fireEventClauses(booted.world, {
      id: 'm0',
      type: 'if.event.actor_moved',
      timestamp: 0,
      entities: { actor: booted.playerId },
      data: { toRoom: lab },
    });
    const phraseEvent = events.find((e) => e.type === 'chord.phrase')!;
    const variants = (phraseEvent.data as { params: { variants: Choice } }).params.variants;
    // The statement path's Choice keys ('chord', 'note') — independent of the
    // marker site's (roomId, 'note') counter the platform keys at render.
    expect(variants).toMatchObject({ kind: 'choice', entityId: 'chord', messageKey: 'note' });
    // And the marker entry coexists untouched on the room.
    expect(roomBits(booted).room.snippets?.note).toBeTruthy();
  });

  it('`nothing` compiles to the explicit empty variant, and both room texts share one entry (Z1/Q6)', () => {
    const source = `story "Z2" by "N"
  id: z2
  version: 0.0.1

create the Lab
  a room
  first time
    Morning light pools on the benches{note}. Quiet.

  Shelves line the walls{note}. A door leads north.

create the player
  in the Lab

  You.

define phrase note, cycling
  and a kettle whistles somewhere
or
  nothing
end phrase
`;
    const booted = boot(compileSource(source));
    const { identity, room } = roomBits(booted);

    expect(identity.description).toContain('{snippet:note}');
    expect(room.initialDescription).toContain('{snippet:note}');
    expect(room.snippets).toEqual({
      note: { selector: 'cycling', texts: ['and a kettle whistles somewhere', ''] },
    });
  });

  it('a single-variant plain phrase compiles to a plain string entry, never a Choice', () => {
    const source = `story "Z2" by "N"
  id: z2
  version: 0.0.1

create the Lab
  a room

  Shelves line the walls{note}. A door leads north.

create the player
  in the Lab

  You.

define phrase note
  and a lone plant wilts on the sill
end phrase
`;
    const booted = boot(compileSource(source));
    expect(roomBits(booted).room.snippets?.note).toBe('and a lone plant wilts on the sill');
  });

  it('atomic contract: a LoadError mid-compile leaves the room untouched — no rewrite, no entries, no gates', () => {
    const ir = compileSource(labSource(' while the cat is in the Annex'));
    // Sabotage the IR the way only a hand-built IR could be: a verbatim
    // phrase at a marker site (the analyzer rejects this at compile, so
    // reaching the loader requires the mutation — which is exactly what the
    // defensive half of the contract is for).
    ir.phrases.locales['en-US']['note'].verbatim = true;

    const story = createStory(ir, { seed: 5 });
    const world = new WorldModel();
    expect(() => story.initializeWorld(world)).toThrow(LoadError);

    // The Lab was mid-compile when the throw hit: nothing was applied.
    const labId = story.entityId('lab');
    expect(labId).toBeTruthy();
    const lab = world.getEntity(labId!)!;
    const identity = lab.get(TraitType.IDENTITY) as IdentityTrait;
    const room = lab.get(TraitType.ROOM) as RoomTrait;
    expect(identity.description).toContain('{note}'); // NOT rewritten
    expect(room.snippets).toBeUndefined();
    expect(lookupSnippetGate(labId!, 'note')).toBeUndefined();
  });
});
