/**
 * assertion-core.test.ts — the seams the assertion core gained when it took
 * one owner (ADR-340 D1): the story-state forms are a parameter, the channel
 * evaluator falls back to a flattened capture, and the `.transcript` writer
 * names the tree-only claim kinds it cannot express.
 *
 * Derived from the Behavior Statements for `runCommand` and
 * `evaluateStateExpression`: each test asserts on the returned result, never
 * on a mock.
 *
 * Owner context: transcript-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { WorldModel } from '@sharpee/world-model';
import { evaluateStateExpression, runCommand, serializeTranscript } from '../src/index.js';
import type { Assertion, StoryStateKeys, Transcript, TranscriptCommand } from '../src/index.js';

const KEYS: StoryStateKeys = {
  storyState: 'test.story.state',
  entityStatePrefix: 'test.state.',
  entityIdAttribute: 'testId',
};

/** A world whose story is `calm` and whose lamp is `dark`, under KEYS. */
function world(): WorldModel {
  const w = new WorldModel();
  w.setStateValue(KEYS.storyState, 'calm');
  const lamp = w.createEntity('lamp', 'item');
  lamp.attributes[KEYS.entityIdAttribute] = 'lamp';
  w.setStateValue(KEYS.entityStatePrefix + 'lamp', 'dark');
  return w;
}

describe('story-state forms are a parameter (ADR-340 D1)', () => {
  it('reads the story phase and an entity state when keys are supplied', () => {
    expect(evaluateStateExpression('story.state = calm', world(), KEYS).matches).toBe(true);
    expect(evaluateStateExpression('the lamp is dark', world(), KEYS).matches).toBe(true);
  });

  it('falls through to the entity forms when no keys are supplied', () => {
    const storyState = evaluateStateExpression('story.state = calm', world());
    expect(storyState.matches).toBe(false);
    expect(storyState.details).toBe('Entity "story" not found');

    const chord = evaluateStateExpression('the lamp is dark', world());
    expect(chord.matches).toBe(false);
    expect(chord.details).toBe('Could not parse expression: the lamp is dark');
  });
});

describe('runCommand evaluates channel claims over the structured capture', () => {
  function command(assertion: Assertion): TranscriptCommand {
    return { lineNumber: 1, input: 'look', expectedOutput: [], assertions: [assertion] };
  }

  it('falls back to a flattened capture when a seam carries only lastChannels', async () => {
    const engine = {
      executeCommand: () => 'You look.',
      lastChannels: { banner: ['DUNGEON', 'v1'] },
    };
    const hit = await runCommand(command({ type: 'channel-contains', channelId: 'banner', value: 'dungeon' }), engine, {});
    expect(hit.passed).toBe(true);
    expect(hit.assertionResults[0].passed).toBe(true);

    const miss = await runCommand(command({ type: 'channel-contains', channelId: 'banner', value: 'cellar' }), engine, {});
    expect(miss.passed).toBe(false);
    expect(miss.assertionResults[0].message).toContain('does not contain "cellar"');
  });

  it('prefers the structured capture when both are present', async () => {
    const engine = {
      executeCommand: () => 'You look.',
      lastChannels: { info: ['{"title":"Flat"}'] },
      lastChannelValues: { info: [{ title: 'Structured' }] },
    };
    const result = await runCommand(
      command({ type: 'channel-is', channelId: 'info', channelPath: ['title'], channelExpected: 'Structured' }),
      engine,
      {}
    );
    expect(result.passed).toBe(true);
  });
});

describe('the .transcript writer names the claim kinds its grammar lacks', () => {
  function transcriptWith(assertion: Assertion): Transcript {
    const command: TranscriptCommand = { lineNumber: 1, input: 'look', expectedOutput: [], assertions: [assertion] };
    return { filePath: '', header: {}, commands: [command], items: [{ type: 'command', command }], comments: [] };
  }

  it.each(['channel-is', 'channel-is-not', 'channel-absent', 'channel-present'] as const)(
    'throws for %s',
    (type) => {
      expect(() => serializeTranscript(transcriptWith({ type, channelId: 'info', channelPath: ['title'], channelExpected: 'x' })))
        .toThrow(`cannot serialize a "${type}" claim: the .transcript grammar has no form for it`);
    }
  );

  it('still writes the two channel kinds the grammar has', () => {
    const text = serializeTranscript(transcriptWith({ type: 'channel-contains', channelId: 'banner', value: 'DUNGEON' }));
    expect(text).toContain('[CHANNEL: banner, contains "DUNGEON"]');
  });
});
