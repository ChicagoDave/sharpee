/**
 * runtime.test.ts — Phase 5 gate, ownership-package grammar: entity event
 * clauses (`after entering it`), ordinals, derived darkness, the on-reading
 * interceptor, and seeded determinism (AC-5/AC-6 groundwork).
 *
 * Event clauses are driven through `fireEventClauses` (the same handler the
 * registered chains call); the full chain path is exercised end-to-end by
 * the Phase 6 golden transcripts.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { STORY_ENDING_FLAG } from '@sharpee/if-domain';
import { RoomTrait, TraitType, WearableTrait, WorldModel } from '@sharpee/world-model';
import { CHORD_STATE_PREFIX, ChordStory, createStory } from '../src';

const CHORD_FIXTURES = join(__dirname, '..', '..', 'chord', 'tests', 'fixtures');

function compileFixture(name: string): StoryIR {
  const result = compile(readFileSync(join(CHORD_FIXTURES, name), 'utf8'));
  if (!result.ok) throw new Error(`fixture ${name} failed to compile`);
  return result.ir;
}

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => d.message).join('; '));
  return result.ir;
}

const garbled = () => ({ kind: 'literal', text: 'swept aside' });
const CLOAK_MODULES = { './extras.ts': { garbled } };

interface CloakWorld {
  story: ChordStory;
  world: WorldModel;
  playerId: string;
}

function loadCloak(): CloakWorld {
  const story = createStory(compileFixture('cloak.story'), { hatchModules: CLOAK_MODULES, seed: 42 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, playerId: player.id };
}

function enterBar({ story, world, playerId }: CloakWorld): ISemanticEvent[] {
  const barId = story.entityId('foyer-bar')!;
  world.moveEntity(playerId, barId);
  return story.runtime.fireEventClauses(world, {
    id: `move-${Math.random()}`,
    type: 'if.event.actor_moved',
    timestamp: 0,
    entities: { actor: playerId },
    data: { toRoom: barId, fromRoom: story.entityId('foyer-of-the-opera-house'), direction: 'SOUTH' },
  });
}

function hangCloak({ story, world }: CloakWorld): void {
  const cloakId = story.entityId('velvet-cloak')!;
  world.moveEntity(cloakId, story.entityId('brass-hook')!);
  const wearable = world.getEntity(cloakId)!.get(TraitType.WEARABLE) as WearableTrait;
  wearable.worn = false;
  wearable.wornBy = undefined;
  story.runtime.recomputeDerived(world);
}

describe('derived darkness (dark while the player has the velvet cloak)', () => {
  it('starts dark, lightens when the cloak is shed, re-darkens on retrieval', () => {
    const cw = loadCloak();
    const bar = cw.world.getEntity(cw.story.entityId('foyer-bar')!)!;
    const room = bar.get(TraitType.ROOM) as RoomTrait;

    expect(room.isDark).toBe(true); // initial evaluation: player wears the cloak

    hangCloak(cw);
    expect(room.isDark).toBe(false);

    cw.world.moveEntity(cw.story.entityId('velvet-cloak')!, cw.playerId);
    cw.story.runtime.recomputeDerived(cw.world);
    expect(room.isDark).toBe(true);
  });
});

describe('the stumble clause (the Foyer Bar\'s `after entering it while in-darkness`)', () => {
  it('fires the stumble phrase and advances message state on the 1st and 3rd dark entries', () => {
    const cw = loadCloak();
    const stateKey = CHORD_STATE_PREFIX + 'message-in-the-sawdust';

    const first = enterBar(cw);
    expect(first.map((e) => [e.type, (e.data as any).messageId])).toEqual([['chord.phrase', 'stumble']]);
    expect(cw.world.getStateValue(stateKey)).toBe('trampled');

    const second = enterBar(cw);
    expect(second.map((e) => (e.data as any).messageId)).toEqual(['stumble']);
    expect(cw.world.getStateValue(stateKey)).toBe('trampled'); // 2nd entry: no change

    const third = enterBar(cw);
    expect(third.map((e) => (e.data as any).messageId)).toEqual(['stumble']);
    expect(cw.world.getStateValue(stateKey)).toBe('obliterated');
  });

  it('does not fire when the bar is lit', () => {
    const cw = loadCloak();
    hangCloak(cw);
    expect(enterBar(cw)).toEqual([]);
    expect(cw.world.getStateValue(CHORD_STATE_PREFIX + 'message-in-the-sawdust')).toBe('intact');
  });
});

describe('the on-reading interceptor (ActionInterceptor slice of §5.4)', () => {
  function readMessage(cw: CloakWorld) {
    const message = cw.world.getEntity(cw.story.entityId('message-in-the-sawdust')!)!;
    const lookup = cw.world.getInterceptorForAction(message, 'if.action.reading');
    expect(lookup, 'interceptor bound for reading').toBeDefined();
    const data = {};
    expect(lookup!.interceptor.preValidate!(message, cw.world, cw.playerId, data)).toBeNull();
    expect(lookup!.interceptor.postValidate!(message, cw.world, cw.playerId, data)).toBeNull();
    lookup!.interceptor.postExecute!(message, cw.world, cw.playerId, data);
    return lookup!.interceptor.postReport!(message, cw.world, cw.playerId, data);
  }

  it('gives the message a ReadableTrait so the reading action validates', () => {
    const cw = loadCloak();
    const message = cw.world.getEntity(cw.story.entityId('message-in-the-sawdust')!)!;
    expect(message.has(TraitType.READABLE)).toBe(true);
  });

  it('intact: overrides with message-intact and wins', () => {
    const cw = loadCloak();
    hangCloak(cw);
    const result = readMessage(cw);
    expect(result.override).toMatchObject({ messageId: 'message-intact' });
    expect(result.emit).toMatchObject([{ type: 'story.victory' }]);
    expect(cw.world.getStateValue(STORY_ENDING_FLAG)).toBe('victory');
    expect(cw.story.isComplete()).toBe(true);
  });

  it('trampled: overrides with message-trampled, binds the garbled producer, no ending', () => {
    const cw = loadCloak();
    enterBar(cw); // tramples
    hangCloak(cw);
    const result = readMessage(cw);
    expect(result.override).toMatchObject({ messageId: 'message-trampled' });
    // Producers are INVOKED at staging — params carry the returned atom,
    // never the function (the template binder string-coerces non-Phrases).
    expect((result.override!.params as any).garbled).toEqual({ kind: 'literal', text: 'swept aside' });
    expect(result.emit).toBeUndefined();
    expect(cw.world.getStateValue(STORY_ENDING_FLAG)).toBeUndefined();
  });

  it('obliterated: overrides with message-obliterated and loses', () => {
    const cw = loadCloak();
    enterBar(cw);
    enterBar(cw);
    enterBar(cw); // obliterates
    hangCloak(cw);
    const result = readMessage(cw);
    expect(result.override).toMatchObject({ messageId: 'message-obliterated' });
    expect(result.emit).toMatchObject([{ type: 'story.defeat' }]);
    expect(cw.world.getStateValue(STORY_ENDING_FLAG)).toBe('defeat');
  });
});

describe('§5.4 phase routing: decisions snapshot before mutations', () => {
  const BOX_STORY = `story "Box" by "Nobody"
  id: box
  version: 0.0.1

create the Room
  a room

  A room.

create the box
  in the Room
  states: shut, ajar

  on reading it
    select on its state
      when shut
        change the box to ajar
        phrase box-opened
      when ajar
        phrase box-already
    end select
  end on

create the player
  starts in the Room

  You.

define phrases en-US
  box-opened:
    It creaks open.
  box-already:
    Already open.
`;

  it('reports along the branch the mutation was decided on, not the post-mutation state', () => {
    const story = createStory(compileSource(BOX_STORY));
    const world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    world.setPlayer(player.id);
    const box = world.getEntity(story.entityId('box')!)!;
    const lookup = world.getInterceptorForAction(box, 'if.action.reading')!;

    const first = {};
    lookup.interceptor.postValidate!(box, world, player.id, first);
    lookup.interceptor.postExecute!(box, world, player.id, first);
    expect(world.getStateValue(CHORD_STATE_PREFIX + 'box')).toBe('ajar'); // mutation happened
    const report1 = lookup.interceptor.postReport!(box, world, player.id, first);
    expect(report1.override).toMatchObject({ messageId: 'box-opened' }); // NOT box-already

    const second = {};
    lookup.interceptor.postValidate!(box, world, player.id, second);
    lookup.interceptor.postExecute!(box, world, player.id, second);
    const report2 = lookup.interceptor.postReport!(box, world, player.id, second);
    expect(report2.override).toMatchObject({ messageId: 'box-already' });
  });
});

describe('AC-5 groundwork: seeded determinism', () => {
  function run(seed: number): string[] {
    const story = createStory(compileFixture('ac5-random.story'), { seed });
    const world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    world.setPlayer(player.id);
    const east = story.entityId('east-room')!;
    const west = story.entityId('west-room')!;

    const emitted: string[] = [];
    for (let i = 0; i < 10; i++) {
      const to = i % 2 === 0 ? west : east;
      world.moveEntity(player.id, to);
      const events = story.runtime.fireEventClauses(world, {
        id: `m${i}`,
        type: 'if.event.actor_moved',
        timestamp: 0,
        entities: { actor: player.id },
        data: { toRoom: to, fromRoom: i % 2 === 0 ? east : west },
      });
      emitted.push(...events.map((e) => String((e.data as any).messageId)));
    }
    return emitted;
  }

  it('two runs with the same seed emit an identical event sequence', () => {
    const a = run(7);
    const b = run(7);
    expect(a).toEqual(b);
    // The strategy phrase fired on every crossing…
    expect(a.filter((m) => m === 'crossing-mutter')).toHaveLength(10);
    // …and the chance-gated clause fired on a strict, non-empty subset of
    // the five west entries (the stream actually varies).
    const draughts = a.filter((m) => m === 'lucky-draught').length;
    expect(draughts).toBeGreaterThan(0);
    expect(draughts).toBeLessThan(5);
  });

  it('the strategy phrase event carries a persistent Choice atom', () => {
    const story = createStory(compileFixture('ac5-random.story'), { seed: 7 });
    const world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    world.setPlayer(player.id);
    const west = story.entityId('west-room')!;
    world.moveEntity(player.id, west);
    const [event] = story.runtime.fireEventClauses(world, {
      id: 'm0',
      type: 'if.event.actor_moved',
      timestamp: 0,
      entities: { actor: player.id },
      data: { toRoom: west },
    });
    const variants = (event.data as any).params.variants;
    expect(variants).toMatchObject({
      kind: 'choice',
      selector: 'random',
      messageKey: 'crossing-mutter',
    });
    expect(variants.alternatives).toHaveLength(3);
  });
});

describe('select stopping (occurrence-ordered alternatives, sticks on last — Z5 rename of `ordered`)', () => {
  it('advances through alternatives per firing and sticks on the last', () => {
    const ir = compileSource(`story "Ordered" by "Nobody"
  id: ordered
  version: 0.0.1

create the Hall
  a room

  A hall.

  after entering it
    select stopping
      phrase step-one
    or
      phrase step-two
    end select
  end after

create the player
  starts in the Hall

  You.

define phrases en-US
  step-one:
    First.
  step-two:
    Then, always.
`);
    const story = createStory(ir);
    const world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    world.setPlayer(player.id);
    const hall = story.entityId('hall')!;

    const fire = () =>
      story.runtime
        .fireEventClauses(world, {
          id: `m${Math.random()}`,
          type: 'if.event.actor_moved',
          timestamp: 0,
          entities: { actor: player.id },
          data: { toRoom: hall },
        })
        .map((e) => String((e.data as any).messageId));

    expect(fire()).toEqual(['step-one']);
    expect(fire()).toEqual(['step-two']);
    expect(fire()).toEqual(['step-two']); // sticks on last
  });
});

describe('compile-time rejections', () => {
  it('refuse inside an `after` clause is a parse error (reactions cannot refuse, D3)', () => {
    const result = compile(`story "Bad" by "Nobody"
  id: bad
  version: 0.0.1

create the Room
  a room

  A room.

  after entering it
    refuse nope
  end after

create the player
  starts in the Room

  You.

define phrases en-US
  nope:
    No.
`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics.map((d) => d.code)).toContain('parse.react-refusal');
    }
  });
});
