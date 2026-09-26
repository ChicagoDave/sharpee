/**
 * pin-forms.test.ts — `evaluateStateExpression` answers every pin form it
 * answered before recognition moved to the loader's `parsePin` (ADR-356
 * D2; the read direction of one grammar). Each case pins a verdict and,
 * on a miss, the exact details line the runners and the IDE surface show,
 * against a real `WorldModel` — no stub of the world.
 *
 * Owner context: transcript-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { IdentityTrait, OpenableTrait, WorldModel } from '@sharpee/world-model';
import { evaluateStateExpression } from '../src/index.js';
import type { StoryStateKeys } from '../src/index.js';

const KEYS: StoryStateKeys = {
  storyState: 'test.story.state',
  entityStatePrefix: 'test.state.',
  entityIdAttribute: 'testId',
};

/** A hall holding a player with a coin, a closed box, and a `dark` lamp with an alias; the story `calm`. */
function hall() {
  const w = new WorldModel();
  w.setStateValue(KEYS.storyState, 'calm');
  const room = w.createEntity('hall', 'room');
  const player = w.createEntity('player', 'actor');
  w.moveEntity(player.id, room.id);
  w.setPlayer(player.id);
  const coin = w.createEntity('coin', 'item');
  w.moveEntity(coin.id, player.id);
  const box = w.createEntity('box', 'container');
  box.add(new OpenableTrait({ isOpen: false }));
  w.moveEntity(box.id, room.id);
  const lamp = w.createEntity('brass lamp', 'item');
  lamp.add(new IdentityTrait({ name: 'brass lamp', aliases: ['lamp'] }));
  lamp.attributes[KEYS.entityIdAttribute] = 'brass-lamp';
  w.setStateValue(KEYS.entityStatePrefix + 'brass-lamp', 'dark');
  w.moveEntity(lamp.id, room.id);
  return { w, room, player, coin, box, lamp };
}

describe('story.state', () => {
  it('reads the phase with keys, and misses by name', () => {
    const { w } = hall();
    expect(evaluateStateExpression('story.state = calm', w, KEYS).matches).toBe(true);
    expect(evaluateStateExpression('story.state != calm', w, KEYS).matches).toBe(false);
    expect(evaluateStateExpression('story.state = hunted', w, KEYS)).toEqual({
      matches: false,
      details: 'story.state is "calm", expected "hunted"',
    });
    expect(evaluateStateExpression('story.state != calm', w, KEYS).details).toBe('story.state should not be "calm"');
  });

  it('names a story without phases', () => {
    const w = new WorldModel();
    expect(evaluateStateExpression('story.state = calm', w, KEYS).details).toBe('story.state: this story declares no states');
  });

  it('without keys is an entity named story, so it misses as one', () => {
    expect(evaluateStateExpression('story.state = calm', hall().w)).toEqual({ matches: false, details: 'Entity "story" not found' });
  });
});

describe('entity.property and entity.location', () => {
  it('reads a spatial property against a place name or id', () => {
    const { w, room } = hall();
    expect(evaluateStateExpression('player.location = hall', w).matches).toBe(true);
    expect(evaluateStateExpression(`player.location = ${room.id}`, w).matches).toBe(true);
    expect(evaluateStateExpression('player.location != hall', w).matches).toBe(false);
    expect(evaluateStateExpression('coin.location = hall', w).details).toBe(`coin.location is "${w.getPlayer()!.id}", expected "${room.id}"`);
  });

  it('reads a trait flag as a boolean', () => {
    const { w } = hall();
    expect(evaluateStateExpression('box.isOpen = false', w).matches).toBe(true);
    expect(evaluateStateExpression('box.isOpen = true', w)).toEqual({ matches: false, details: 'box.isOpen is "false", expected "true"' });
    expect(evaluateStateExpression('box.isOpen != true', w).matches).toBe(true);
  });

  it('misses a missing entity by name', () => {
    expect(evaluateStateExpression('ghost.location = hall', hall().w).details).toBe('Entity "ghost" not found');
  });

  it('accepts an IR-style hyphenated head', () => {
    const { w, room } = hall();
    const shears = w.createEntity('garden-shears', 'item');
    w.moveEntity(shears.id, room.id);
    expect(evaluateStateExpression('garden-shears.location = hall', w).matches).toBe(true);
  });
});

describe('entity.collection contains item', () => {
  it('reads inventory and contents, both ways', () => {
    const { w } = hall();
    expect(evaluateStateExpression('player.inventory contains coin', w).matches).toBe(true);
    expect(evaluateStateExpression('player.inventory not-contains coin', w).matches).toBe(false);
    expect(evaluateStateExpression('box.contents contains coin', w)).toEqual({
      matches: false,
      details: 'box.contents does not contain "coin"',
    });
    expect(evaluateStateExpression('player.inventory not-contains coin', w).details).toBe('player.inventory should not contain "coin"');
  });

  it('names a property that is not a collection', () => {
    expect(evaluateStateExpression('box.isOpen contains coin', hall().w).details).toBe('box.isOpen is not a collection');
  });
});

describe('[the] name is state', () => {
  it('reads a declared state by name, alias, and negation', () => {
    const { w } = hall();
    expect(evaluateStateExpression('the brass lamp is dark', w, KEYS).matches).toBe(true);
    expect(evaluateStateExpression('lamp is dark', w, KEYS).matches).toBe(true);
    expect(evaluateStateExpression('the lamp is not lit', w, KEYS).matches).toBe(true);
    expect(evaluateStateExpression('the lamp is lit', w, KEYS)).toEqual({ matches: false, details: 'the lamp is "dark", expected "lit"' });
    expect(evaluateStateExpression('the story is calm', w, KEYS).matches).toBe(true);
  });

  it('names an entity without states, and is not a claim without keys', () => {
    const { w } = hall();
    expect(evaluateStateExpression('the coin is shiny', w, KEYS).details).toBe('the coin: not a Chord entity (no IR id), so it has no states');
    expect(evaluateStateExpression('the lamp is dark', w).details).toBe('Could not parse expression: the lamp is dark');
  });
});

describe('what is not a claim', () => {
  it.each([
    'prune the vine',
    'first partner.location = anywhere',
    'vine.pruning occurrence = 2',
    'the weather asked once',
    'player.bell has expired',
    'player.bell at dusk',
  ])('%s — could not parse, never a pass', (expression) => {
    expect(evaluateStateExpression(expression, hall().w, KEYS)).toEqual({
      matches: false,
      details: `Could not parse expression: ${expression}`,
    });
  });
});
