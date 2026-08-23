/**
 * story-state-claim.test.ts — the `story.state = <state>` claim head.
 *
 * A Chord story's phase (`states:` in the header, moved by `change the story
 * to`) is a world-state value under `CHORD_STORY_STATE_KEY`, not an entity
 * property, so the entity claim form cannot reach it. These tests drive the
 * real evaluator against a real `WorldModel` carrying the real key — no stub
 * of either side.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { WorldModel } from '@sharpee/world-model';
import { CHORD_STORY_STATE_KEY } from '@sharpee/story-loader';
import { evaluateStateExpression } from '../src/runner.js';

function worldInState(state: string | undefined): WorldModel {
  const world = new WorldModel();
  if (state !== undefined) world.setStateValue(CHORD_STORY_STATE_KEY, state);
  return world;
}

describe('story.state claims', () => {
  it('holds when the story is in the named state', () => {
    expect(evaluateStateExpression('story.state = hunted', worldInState('hunted')).matches).toBe(true);
  });

  it('fails, naming the actual state, when the story is elsewhere', () => {
    const result = evaluateStateExpression('story.state = hunted', worldInState('calm'));
    expect(result.matches).toBe(false);
    expect(result.details).toBe('story.state is "calm", expected "hunted"');
  });

  it('supports the negated form', () => {
    expect(evaluateStateExpression('story.state != calm', worldInState('hunted')).matches).toBe(true);
    expect(evaluateStateExpression('story.state != hunted', worldInState('hunted')).matches).toBe(false);
  });

  it('fails, not crashes, against a story that declares no states', () => {
    const result = evaluateStateExpression('story.state = calm', worldInState(undefined));
    expect(result.matches).toBe(false);
    expect(result.details).toBe('story.state: this story declares no states');
  });

  it('does not shadow an entity that happens to be named story', () => {
    const world = worldInState('calm');
    const entity = world.createEntity('story', 'item');
    const room = world.createEntity('attic', 'room');
    world.moveEntity(entity.id, room.id);
    expect(evaluateStateExpression(`story.location = ${room.id}`, world).matches).toBe(true);
  });
});
