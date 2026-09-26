/**
 * claim-kinds.test.ts — the two claim kinds ADR-356 D3 adds to the
 * assertion core, `is gone` and `emitted <message-id>`, plus the runtime-id
 * lookup that lets a derived claim name an entity by its IR id. Each test
 * drives the real evaluator against a real `WorldModel` and real event
 * records; the verdicts and the details lines are pinned.
 *
 * Owner context: transcript-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { IdentityTrait, WorldModel } from '@sharpee/world-model';
import { checkAssertion, evaluateEmittedClaim, evaluateStateExpression, findEntity } from '../src/index.js';
import type { Assertion, StoryStateKeys, TestEventInfo } from '../src/index.js';

const KEYS: StoryStateKeys = {
  storyState: 'test.story.state',
  entityStatePrefix: 'test.state.',
  entityIdAttribute: 'testId',
  entityGonePrefix: 'test.gone.',
};

/** A hall with a stamped locket (gone) and a stamped lamp (present). */
function hall() {
  const w = new WorldModel();
  const room = w.createEntity('hall', 'room');
  const locket = w.createEntity('silver locket', 'item');
  locket.add(new IdentityTrait({ name: 'silver locket', aliases: ['locket'] }));
  locket.attributes[KEYS.entityIdAttribute] = 'silver-locket';
  w.setStateValue(KEYS.entityGonePrefix + 'silver-locket', true);
  const lamp = w.createEntity('brass lamp', 'item');
  lamp.attributes[KEYS.entityIdAttribute] = 'brass-lamp';
  w.moveEntity(lamp.id, room.id);
  const pebble = w.createEntity('pebble', 'item');
  w.moveEntity(pebble.id, room.id);
  return { w, room, locket, lamp, pebble };
}

describe('is gone', () => {
  it('holds for a removed entity, by name, alias, or IR id', () => {
    const { w } = hall();
    expect(evaluateStateExpression('the silver locket is gone', w, KEYS).matches).toBe(true);
    expect(evaluateStateExpression('locket is gone', w, KEYS).matches).toBe(true);
    expect(evaluateStateExpression('silver-locket is gone', w, KEYS).matches).toBe(true);
  });

  it('fails, by name, for an entity still in play; the negated form reverses it', () => {
    const { w } = hall();
    expect(evaluateStateExpression('the brass lamp is gone', w, KEYS)).toEqual({ matches: false, details: 'the brass lamp is not gone' });
    expect(evaluateStateExpression('the brass lamp is not gone', w, KEYS).matches).toBe(true);
    expect(evaluateStateExpression('the silver locket is not gone', w, KEYS)).toEqual({ matches: false, details: 'the silver locket should not be gone' });
  });

  it('names a missing entity and a non-Chord entity', () => {
    const { w } = hall();
    expect(evaluateStateExpression('the ghost is gone', w, KEYS).details).toBe('Entity "ghost" not found');
    expect(evaluateStateExpression('the pebble is gone', w, KEYS).details).toBe('the pebble: not a Chord entity (no IR id), so it cannot be gone');
  });

  it('is not a claim without a gone prefix', () => {
    const { w } = hall();
    const { entityGonePrefix: _gone, ...withoutGone } = KEYS;
    expect(evaluateStateExpression('the silver locket is gone', w, withoutGone).details).toBe('Could not parse expression: the silver locket is gone');
  });
});

describe('the runtime-id lookup', () => {
  it('resolves an IR id as an entity head and as a value when keys are supplied', () => {
    const { w, room, lamp } = hall();
    expect(findEntity('brass-lamp', w, KEYS.entityIdAttribute)?.id).toBe(lamp.id);
    expect(findEntity('brass-lamp', w)).toBeNull();
    expect(evaluateStateExpression('brass-lamp.location = hall', w, KEYS).matches).toBe(true);
    expect(evaluateStateExpression(`brass-lamp.location = ${room.id}`, w, KEYS).matches).toBe(true);
    expect(evaluateStateExpression('brass-lamp.location = hall', w).details).toBe('Entity "brass-lamp" not found');
  });
});

describe('emitted <message-id>', () => {
  const events: TestEventInfo[] = [
    { type: 'chord.phrase', data: { messageId: 'need-shears', params: {} } },
    { type: 'if.event.examined', data: { messageId: 'jars-seen' } },
    { type: 'vine-fruits', data: {} },
  ];
  const claim = (stateExpression: string, assertTrue = true): Assertion => ({ type: 'state-assert', assertTrue, stateExpression });

  it('matches a phrase by its messageId and an author event by its type', () => {
    expect(evaluateEmittedClaim('need-shears', events)).toEqual({ matches: true });
    expect(evaluateEmittedClaim('jars-seen', events)).toEqual({ matches: true });
    expect(evaluateEmittedClaim('vine-fruits', events)).toEqual({ matches: true });
  });

  it('matches a bare phrase key against its owner-qualified emission', () => {
    const qualified: TestEventInfo[] = [{ type: 'if.event.read', data: { messageId: "solicitor's-letter.summons-text" } }];
    expect(evaluateEmittedClaim('summons-text', qualified)).toEqual({ matches: true });
    expect(evaluateEmittedClaim('text', qualified).matches).toBe(false);
    expect(evaluateEmittedClaim('letter.summons-text', qualified).matches).toBe(false);
  });

  it('misses, listing what was emitted instead', () => {
    expect(evaluateEmittedClaim('vine-done', events)).toEqual({
      matches: false,
      details: '"vine-done" was not emitted. Emitted: chord.phrase (need-shears), if.event.examined (jars-seen), vine-fruits',
    });
    expect(evaluateEmittedClaim('vine-done', []).details).toBe('"vine-done" was not emitted. Emitted: (nothing)');
  });

  it('is routed through checkAssertion as a state pin, read against the events', () => {
    const { w } = hall();
    expect(checkAssertion(claim('emitted need-shears'), '', '', events, w, undefined, KEYS).passed).toBe(true);
    const miss = checkAssertion(claim('emitted vine-done'), '', '', events, w, undefined, KEYS);
    expect(miss.passed).toBe(false);
    expect(miss.message).toBe('Emitted assertion failed: emitted vine-done. "vine-done" was not emitted. Emitted: chord.phrase (need-shears), if.event.examined (jars-seen), vine-fruits');
    const negated = checkAssertion(claim('emitted need-shears', false), '', '', events, w, undefined, KEYS);
    expect(negated.passed).toBe(false);
    expect(negated.message).toBe('"need-shears" should not have been emitted but was');
  });

  it('is not a world claim', () => {
    expect(evaluateStateExpression('emitted need-shears', hall().w, KEYS).details).toBe('Could not parse expression: emitted need-shears');
  });
});
