/**
 * adr-289-d8.test.ts — ADR-289 Phase 6, the loader/evaluator half of D8's
 * shipping list.
 *
 *   L5 — `applyTraitAdjectives` guarded some trait adds against a double-add
 *        and not others. `IFEntity.add` is a `Map.set`, so an unguarded second
 *        add REPLACES the first — discarding its configuration.
 *   L8 — `registerPresentEntries`' gate compared `getContainingRoom(owner)`,
 *        which walks UPWARD and is undefined when the owner IS the room, so a
 *        room's own conditional `present` entry could never fire.
 *   isWithin — a visited-set guard so rogue containment cycles terminate.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { AuthorModel, IFEntity, TraitType, WorldModel } from '@sharpee/world-model';
import type { ReadableTrait } from '@sharpee/world-model';
import { ChordStory, createStory, Evaluator } from '../src';

const HEADER = 'story "T" by "N"\n  id: t\n  version: 0.0.1\n\n';

const ROOMS = `create the Hall
  a room

  A hall.

create the player
  in the Hall

  You.
`;

function compileClean(source: string): StoryIR {
  const result = compile(source);
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  expect(errors, errors.map((e) => `${e.span.line} ${e.code} ${e.message}`).join(' | ')).toEqual([]);
  return result.ir;
}

interface Loaded {
  story: ChordStory;
  world: WorldModel;
  player: IFEntity;
}

function load(source: string): Loaded {
  const story = createStory(compileClean(source), { seed: 42 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, player };
}

describe('L5 — trait double-add guards are consistent', () => {
  it('a second bare `readable` does not discard the first one’s text', () => {
    // Duplicate compositions compile (nothing gates them), so both reach
    // applyTraitAdjectives. Unguarded, the second `readable` — which carries
    // no text — replaced the configured one and the plaque read as empty.
    const l = load(`${HEADER}${ROOMS}
create the plaque
  readable with text "Est. 1897.", readable
  in the Hall

  A brass plaque.
`);
    const plaque = l.world.getEntity(l.story.entityId('plaque')!)!;
    const readable = plaque.get(TraitType.READABLE) as ReadableTrait;
    expect(readable.text).toBe('Est. 1897.');
  });

  it('a doubly-declared `wearable` still yields exactly one wearable entity', () => {
    const l = load(`${HEADER}${ROOMS}
create the cloak
  wearable, wearable
  in the Hall

  A cloak.
`);
    const cloak = l.world.getEntity(l.story.entityId('cloak')!)!;
    expect(cloak.has(TraitType.WEARABLE)).toBe(true);
  });
});

describe('L8 — a room owns its own `present` entry', () => {
  it('a room’s conditional `present` gate holds when the player is in that room', () => {
    const source = `${HEADER}define condition lamp-lit: the brass lamp is in the Hall

create the Hall
  a room

  A hall.

  phrase present while lamp-lit:
    A lamp burns in the corner.

create the brass lamp
  in the Hall

  A brass lamp.

create the player
  in the Hall

  You.
`;
    const l = load(source);
    const entries: Array<{ owner: string; gate?: { kind: string; holds(w: WorldModel): boolean } }> = [];
    l.story.onEngineReady({
      getPluginRegistry: () => ({ register: () => {} }),
      registerSlotEntry: (entry: { owner: string; gate?: { kind: string; holds(w: WorldModel): boolean } }) =>
        entries.push(entry),
    } as never);

    const hallId = l.story.entityId('hall')!;
    const hallEntry = entries.find((e) => e.owner === hallId);
    expect(hallEntry, 'the room’s `present` entry is registered').toBeTruthy();
    expect(hallEntry!.gate, 'it carries a condition gate').toBeTruthy();
    // The player is in the Hall and the lamp is there — the gate must hold.
    expect(hallEntry!.gate!.holds(l.world)).toBe(true);
  });
});

describe('Evaluator.isWithin — a containment cycle terminates', () => {
  const CYCLE_SOURCE = `${HEADER}define condition in-the-hall: it is in the Hall

create the Hall
  a room

  A hall.

create the crate
  a container
  in the Hall

  A crate.

create the box
  a container
  in the Hall

  A box.

create the player
  in the Hall

  You.
`;

  it('rogue containment resolves instead of looping forever', { timeout: 5000 }, () => {
    const ir = compileClean(CYCLE_SOURCE);
    const story = createStory(ir, { seed: 42 });
    const world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    world.setPlayer(player.id);

    // AuthorModel.moveEntity writes the spatial index directly with no cycle
    // check — the same door world construction goes through, and the only way
    // this rogue state can arise. crate → box → crate.
    const author = new AuthorModel(world.getDataStore(), world);
    author.moveEntity(story.entityId('crate')!, story.entityId('box')!);
    author.moveEntity(story.entityId('box')!, story.entityId('crate')!);

    const ev = new Evaluator(ir, story, 42);
    // Without the visited-set guard this walk never terminates: isWithin
    // follows crate → box → crate → box … and the test times out.
    expect(() => ev.matchesOf('in-the-hall', { world })).not.toThrow();
    expect(ev.matchesOf('in-the-hall', { world })).not.toContain('crate');
  });
});
