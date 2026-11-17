/**
 * chord-state-claim.test.ts — the Chord-spelled claim head (GH #355):
 * `[the] <name> is <state>` / `[the] <name> is not <state>`, reading a
 * Chord entity's own `states:` value from `chord.state.<ir-id>` through the
 * IR-id attribute the loader stamps on every entity, and `the story is
 * <state>` reading the story's phase.
 *
 * These tests drive the real evaluator against a real `WorldModel` carrying
 * the real keys and the real attribute — no stub of either side. The
 * loader→runner path end to end is the `./sharpee test` run against
 * `tests/fixtures/state-pins/` (rule 13a's real-path leg).
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { BreakableTrait, IdentityTrait, LightSourceTrait, WorldModel } from '@sharpee/world-model';
import { CHORD_IR_ID_ATTRIBUTE, CHORD_STATE_PREFIX, CHORD_STORY_STATE_KEY } from '@sharpee/story-loader';
import { evaluateStateExpression as evaluateCore } from '@sharpee/transcript-tester';
import { CHORD_STORY_STATE_KEYS } from '../src/runner.js';

/** The core evaluator under this package's keys — what the tree runner passes. */
const evaluateStateExpression = (expression: string, world: WorldModel) =>
  evaluateCore(expression, world, CHORD_STORY_STATE_KEYS);

/** A world the loader could have built: a stamped bell in `still`, a stamped partner in `waiting`, the story `calm`. */
function ballroom(): WorldModel {
  const world = new WorldModel();
  const bell = world.createEntity('brass bell', 'scenery');
  bell.add(new IdentityTrait({ name: 'brass bell', aliases: ['bell'] }));
  bell.attributes[CHORD_IR_ID_ATTRIBUTE] = 'brass-bell';
  world.setStateValue(CHORD_STATE_PREFIX + 'brass-bell', 'still');

  const partner = world.createEntity('first partner', 'actor');
  partner.add(new IdentityTrait({ name: 'first partner', aliases: ['first'] }));
  partner.attributes[CHORD_IR_ID_ATTRIBUTE] = 'first-partner';
  world.setStateValue(CHORD_STATE_PREFIX + 'first-partner', 'waiting');

  const pebble = world.createEntity('pebble', 'item');
  pebble.add(new IdentityTrait({ name: 'pebble' }));
  pebble.attributes[CHORD_IR_ID_ATTRIBUTE] = 'pebble';

  const stranger = world.createEntity('stranger', 'actor');
  stranger.add(new IdentityTrait({ name: 'stranger' }));

  world.setStateValue(CHORD_STORY_STATE_KEY, 'calm');
  return world;
}

describe('Chord-spelled state claims — `the <name> is <state>`', () => {
  it('holds when the entity is in the named state, article or not', () => {
    const world = ballroom();
    expect(evaluateStateExpression('the brass bell is still', world).matches).toBe(true);
    expect(evaluateStateExpression('brass bell is still', world).matches).toBe(true);
  });

  it('addresses a multi-word name', () => {
    const world = ballroom();
    expect(evaluateStateExpression('the first partner is waiting', world).matches).toBe(true);
  });

  it('resolves an alias', () => {
    expect(evaluateStateExpression('the bell is still', ballroom()).matches).toBe(true);
    expect(evaluateStateExpression('first is waiting', ballroom()).matches).toBe(true);
  });

  it('fails, naming the actual state, when the entity is elsewhere', () => {
    const result = evaluateStateExpression('the brass bell is ringing', ballroom());
    expect(result.matches).toBe(false);
    expect(result.details).toBe('the brass bell is "still", expected "ringing"');
  });

  it('supports the negated form', () => {
    const world = ballroom();
    expect(evaluateStateExpression('the brass bell is not ringing', world).matches).toBe(true);
    const result = evaluateStateExpression('the brass bell is not still', world);
    expect(result.matches).toBe(false);
    expect(result.details).toBe('the brass bell should not be "still"');
  });

  it('follows the state as it moves', () => {
    const world = ballroom();
    world.setStateValue(CHORD_STATE_PREFIX + 'first-partner', 'dancing');
    expect(evaluateStateExpression('the first partner is waiting', world).matches).toBe(false);
    expect(evaluateStateExpression('the first partner is dancing', world).matches).toBe(true);
  });

  it('fails, not crashes, on a name that resolves to nothing', () => {
    const result = evaluateStateExpression('the ghost is here', ballroom());
    expect(result.matches).toBe(false);
    expect(result.details).toBe('Entity "ghost" not found');
  });

  it('fails, not crashes, on a Chord entity that declares no states', () => {
    const result = evaluateStateExpression('the pebble is ringing', ballroom());
    expect(result.matches).toBe(false);
    expect(result.details).toBe('the pebble: declares no states');
  });

  it('fails, not crashes, on an entity the loader did not create', () => {
    const result = evaluateStateExpression('the stranger is calm', ballroom());
    expect(result.matches).toBe(false);
    expect(result.details).toBe('the stranger: not a Chord entity (no IR id), so it has no states');
  });
});

describe('Chord-spelled state claims — a platform state word reads the trait field (GH #735, GH #772)', () => {
  /** A stamped lamp and lens that declare no states, as `a thing, light-source` and `a thing, breakable` load. */
  function lampRoom(): { world: WorldModel; flame: LightSourceTrait; glass: BreakableTrait } {
    const world = new WorldModel();
    const lamp = world.createEntity('hand lamp', 'item');
    lamp.add(new IdentityTrait({ name: 'hand lamp', aliases: ['lamp'] }));
    const flame = new LightSourceTrait({ isLit: false });
    lamp.add(flame);
    lamp.attributes[CHORD_IR_ID_ATTRIBUTE] = 'hand-lamp';

    const lens = world.createEntity('cracked lens', 'item');
    lens.add(new IdentityTrait({ name: 'cracked lens', aliases: ['lens'] }));
    const glass = new BreakableTrait({ broken: true });
    lens.add(glass);
    lens.attributes[CHORD_IR_ID_ATTRIBUTE] = 'cracked-lens';

    const pebble = world.createEntity('pebble', 'item');
    pebble.add(new IdentityTrait({ name: 'pebble' }));
    pebble.attributes[CHORD_IR_ID_ATTRIBUTE] = 'pebble';
    return { world, flame, glass };
  }

  it('reads `lit` and `unlit` off the light source, and follows the flame as it changes', () => {
    const { world, flame } = lampRoom();
    expect(evaluateStateExpression('the hand lamp is unlit', world).matches).toBe(true);
    const cold = evaluateStateExpression('the hand lamp is lit', world);
    expect(cold.matches).toBe(false);
    expect(cold.details).toBe('the hand lamp is "unlit", expected "lit"');

    flame.isLit = true;

    expect(evaluateStateExpression('the hand lamp is lit', world).matches).toBe(true);
    expect(evaluateStateExpression('hand-lamp is lit', world).matches).toBe(true);
    expect(evaluateStateExpression('the hand lamp is unlit', world).matches).toBe(false);
    expect(evaluateStateExpression('the hand lamp is not unlit', world).matches).toBe(true);
    expect(evaluateStateExpression('the hand lamp is not lit', world).matches).toBe(false);
  });

  it('reads `broken` and `whole` off the breakable, and follows the mend', () => {
    const { world, glass } = lampRoom();
    expect(evaluateStateExpression('the cracked lens is broken', world).matches).toBe(true);
    const cracked = evaluateStateExpression('the cracked lens is whole', world);
    expect(cracked.matches).toBe(false);
    expect(cracked.details).toBe('the cracked lens is "broken", expected "whole"');

    glass.broken = false;

    expect(evaluateStateExpression('the cracked lens is whole', world).matches).toBe(true);
    expect(evaluateStateExpression('the cracked lens is not broken', world).matches).toBe(true);
  });

  it('still fails by name for a platform word on a thing without the trait', () => {
    const { world } = lampRoom();
    for (const word of ['lit', 'unlit', 'broken', 'whole']) {
      const result = evaluateStateExpression(`the pebble is ${word}`, world);
      expect(result.matches, word).toBe(false);
      expect(result.details, word).toBe('the pebble: declares no states');
    }
  });
});

describe('Chord-spelled state claims — `the story is <state>`', () => {
  it('reads the story phase, with the negated form', () => {
    const world = ballroom();
    expect(evaluateStateExpression('the story is calm', world).matches).toBe(true);
    expect(evaluateStateExpression('the story is not calm', world).matches).toBe(false);
    expect(evaluateStateExpression('story is alarmed', world).details).toBe('the story is "calm", expected "alarmed"');
  });

  it('fails, not crashes, against a story that declares no states', () => {
    const world = new WorldModel();
    const result = evaluateStateExpression('the story is calm', world);
    expect(result.matches).toBe(false);
    expect(result.details).toBe('the story: this story declares no states');
  });

  it('leaves the `story.state =` head exactly as it was', () => {
    const world = ballroom();
    expect(evaluateStateExpression('story.state = calm', world).matches).toBe(true);
    expect(evaluateStateExpression('story.state = alarmed', world).details).toBe('story.state is "calm", expected "alarmed"');
  });
});

describe('dotted claims — a multi-word or kebab-case head (GH #375)', () => {
  /** The ballroom with a room, the partner in it holding the bell. */
  function seated(): WorldModel {
    const world = ballroom();
    const hall = world.createEntity('Great Hall', 'room');
    hall.add(new IdentityTrait({ name: 'Great Hall' }));
    hall.attributes[CHORD_IR_ID_ATTRIBUTE] = 'great-hall';
    const partner = world.getAllEntities().find((e) => e.name === 'first partner')!;
    const bell = world.getAllEntities().find((e) => e.name === 'brass bell')!;
    world.moveEntity(partner.id, hall.id);
    world.moveEntity(bell.id, partner.id);
    return world;
  }

  it('reads a location claim whose head has spaces — the Chord spelling', () => {
    const world = seated();
    expect(evaluateStateExpression('first partner.location = Great Hall', world).matches).toBe(true);
    expect(evaluateStateExpression('brass bell.location = first partner', world).matches).toBe(true);
    const wrong = evaluateStateExpression('brass bell.location = Great Hall', world);
    expect(wrong.matches).toBe(false);
    expect(wrong.details).toContain('brass bell.location is');
  });

  it('reads the same claim through the kebab-case IR id the loader stamps', () => {
    const world = seated();
    expect(evaluateStateExpression('first-partner.location = great-hall', world).matches).toBe(true);
    expect(evaluateStateExpression('brass-bell.location = first-partner', world).matches).toBe(true);
    expect(evaluateStateExpression('brass-bell.location != great-hall', world).matches).toBe(true);
  });

  it('reads a contains claim with a multi-word head', () => {
    const world = seated();
    expect(evaluateStateExpression('first partner.inventory contains brass bell', world).matches).toBe(true);
    expect(evaluateStateExpression('first-partner.contents not-contains pebble', world).matches).toBe(true);
  });

  it('still fails by name when the head resolves to nothing', () => {
    const result = evaluateStateExpression('silver brooch.location = player', seated());
    expect(result.matches).toBe(false);
    expect(result.details).toBe('Entity "silver brooch" not found');
  });
});
