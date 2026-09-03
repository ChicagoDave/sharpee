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
import { IdentityTrait, WorldModel } from '@sharpee/world-model';
import { CHORD_IR_ID_ATTRIBUTE, CHORD_STATE_PREFIX, CHORD_STORY_STATE_KEY } from '@sharpee/story-loader';
import { evaluateStateExpression } from '../src/runner.js';

/** A world the loader could have built: a stamped lamp in `dark`, a stamped partner in `waiting`, the story `calm`. */
function ballroom(): WorldModel {
  const world = new WorldModel();
  const lamp = world.createEntity('brass lamp', 'scenery');
  lamp.add(new IdentityTrait({ name: 'brass lamp', aliases: ['lamp'] }));
  lamp.attributes[CHORD_IR_ID_ATTRIBUTE] = 'brass-lamp';
  world.setStateValue(CHORD_STATE_PREFIX + 'brass-lamp', 'dark');

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
    expect(evaluateStateExpression('the brass lamp is dark', world).matches).toBe(true);
    expect(evaluateStateExpression('brass lamp is dark', world).matches).toBe(true);
  });

  it('addresses a multi-word name the dotted head could not', () => {
    const world = ballroom();
    expect(evaluateStateExpression('the first partner is waiting', world).matches).toBe(true);
    expect(evaluateStateExpression('first partner.location = anywhere', world).details).toBe(
      'Could not parse expression: first partner.location = anywhere'
    );
  });

  it('resolves an alias', () => {
    expect(evaluateStateExpression('the lamp is dark', ballroom()).matches).toBe(true);
    expect(evaluateStateExpression('first is waiting', ballroom()).matches).toBe(true);
  });

  it('fails, naming the actual state, when the entity is elsewhere', () => {
    const result = evaluateStateExpression('the brass lamp is lit', ballroom());
    expect(result.matches).toBe(false);
    expect(result.details).toBe('the brass lamp is "dark", expected "lit"');
  });

  it('supports the negated form', () => {
    const world = ballroom();
    expect(evaluateStateExpression('the brass lamp is not lit', world).matches).toBe(true);
    const result = evaluateStateExpression('the brass lamp is not dark', world);
    expect(result.matches).toBe(false);
    expect(result.details).toBe('the brass lamp should not be "dark"');
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
    const result = evaluateStateExpression('the pebble is lit', ballroom());
    expect(result.matches).toBe(false);
    expect(result.details).toBe('the pebble: declares no states');
  });

  it('fails, not crashes, on an entity the loader did not create', () => {
    const result = evaluateStateExpression('the stranger is calm', ballroom());
    expect(result.matches).toBe(false);
    expect(result.details).toBe('the stranger: not a Chord entity (no IR id), so it has no states');
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
