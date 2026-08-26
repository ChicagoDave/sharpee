/**
 * landing-runtime.test.ts — ADR-325 D5 (GH #309) loader half against a
 * real WorldModel and the runtime's own clause path: `move … to <region>`
 * lands in the landing, `<region>'s location` reads as the landing, the
 * three strategies draw deterministically (`randomly` on a per-region
 * seeded stream, `cycling` and `stopping` on a persisted cursor), and
 * `set … landing to <room>` replaces the list.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';
import { landingKey } from '../src/state-keys';

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

function boot(source: string, seed = 5): Booted {
  const story = createStory(compileSource(source), { seed });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, playerId: player.id };
}

/** Fire the Alley's `after the player entering` clause with the player there. */
function enterAlley(b: Booted) {
  const roomId = b.story.entityId('alley')!;
  b.world.moveEntity(b.playerId, roomId);
  return b.story.runtime.fireEventClauses(b.world, {
    id: 'm1',
    type: 'if.event.actor_moved',
    timestamp: 0,
    entities: { actor: b.playerId },
    data: { toRoom: roomId },
  });
}

const SOURCE = (landing: string, clause: string) => `story
  title: Landing
  authors:
    N
  id: landing
  story-version: 0.0.1

create the Market
  a region
  containing the East Gate, the Stalls
  ${landing}

create the Stalls
  a region
  containing the Hat Stall, the Grocery Stall

create the East Gate
  a room

  A gate.

create the Hat Stall
  a room

  Hats.

create the Grocery Stall
  a room

  Groceries.

create the Alley
  a room

  An alley.

  after the player entering
    ${clause}
  end after

create the monkey
  in the Alley

  A monkey.

create the player
  starts in the Alley

  You.
`;

const roomOf = (b: Booted, irId: string) => b.story.entityId(irId)!;
const monkeyRoom = (b: Booted) => b.world.getLocation(b.story.entityId('monkey')!);

describe('a region with a landing is a place (D5)', () => {
  it('`move … to <region>` lands in the single landing room', () => {
    const b = boot(SOURCE('landing the East Gate', 'move the monkey to the Market'));
    enterAlley(b);
    expect(monkeyRoom(b)).toBe(roomOf(b, 'east-gate'));
  });

  it("`<region>'s location` reads as the landing, through a nested region", () => {
    const b = boot(SOURCE('landing the Hat Stall', "move the monkey to the Market's location"));
    enterAlley(b);
    expect(monkeyRoom(b)).toBe(roomOf(b, 'hat-stall'));
  });
});

describe('landing strategies draw deterministically (D5, ADR-293)', () => {
  const LIST = (strategy: string) => `landing, ${strategy}: the East Gate, the Hat Stall, the Grocery Stall`;
  const draws = (b: Booted, n: number) => {
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      enterAlley(b);
      out.push(b.story.irIdOf(monkeyRoom(b)!)!);
    }
    return out;
  };

  it('`cycling` walks the list and wraps', () => {
    const b = boot(SOURCE(LIST('cycling'), 'move the monkey to the Market'));
    expect(draws(b, 4)).toEqual(['east-gate', 'hat-stall', 'grocery-stall', 'east-gate']);
    expect(b.world.getStateValue(landingKey('market'))).toMatchObject({ cursor: 4 });
  });

  it('`stopping` walks the list and holds on the last', () => {
    const b = boot(SOURCE(LIST('stopping'), 'move the monkey to the Market'));
    expect(draws(b, 4)).toEqual(['east-gate', 'hat-stall', 'grocery-stall', 'grocery-stall']);
  });

  it('`randomly` is pinned by the seed and varies across seeds', () => {
    const a = draws(boot(SOURCE(LIST('randomly'), 'move the monkey to the Market'), 11), 8);
    const again = draws(boot(SOURCE(LIST('randomly'), 'move the monkey to the Market'), 11), 8);
    expect(again).toEqual(a);
    expect(new Set(a).size).toBeGreaterThan(1);
    const other = draws(boot(SOURCE(LIST('randomly'), 'move the monkey to the Market'), 12), 8);
    expect(other).not.toEqual(a);
    // The stream is the region's own, persisted in world state.
    const record = boot(SOURCE(LIST('randomly'), 'move the monkey to the Market'), 11);
    enterAlley(record);
    expect(record.world.getStateValue(landingKey('market'))).toMatchObject({ rooms: expect.any(Array), seed: expect.any(Number) });
  });
});

describe('set … landing to <room> (D5)', () => {
  it('replaces the whole list with one room and rewinds', () => {
    const b = boot(SOURCE(
      'landing, cycling: the East Gate, the Hat Stall',
      "set the Market's landing to the Grocery Stall\n    move the monkey to the Market",
    ));
    enterAlley(b);
    expect(monkeyRoom(b)).toBe(roomOf(b, 'grocery-stall'));
    expect(b.world.getStateValue(landingKey('market'))).toMatchObject({ rooms: [roomOf(b, 'grocery-stall')], cursor: 0 });
    enterAlley(b);
    expect(monkeyRoom(b)).toBe(roomOf(b, 'grocery-stall'));
  });
});
