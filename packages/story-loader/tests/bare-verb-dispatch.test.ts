/**
 * bare-verb-dispatch.test.ts — what a define-action registers for its verb
 * alone, and the `'cant'` default. Platform-issue-sweep Phase 8 #13 added a
 * bare rule per pattern prefix so a targetless verb reached the action's
 * no-target arm; ADR-384 D5 retired them, because such a rule took over a
 * standard verb typed alone, and the parser's failure classifier now asks
 * for the missing seat by the matched verb. A story that wants its action to
 * answer the bare verb writes the bare line. The `'cant'` default (an action
 * with no authored otherwise) renders the platform's generic refusal
 * instead of throwing phraseEvent's missing-phrase LoadError.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';
import { captureGrammarRules } from './helpers/grammar-harness';

const CHORD_FIXTURES = join(__dirname, '..', '..', 'chord', 'tests', 'fixtures');

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

function compileFixture(name: string): StoryIR {
  return compileSource(readFileSync(join(CHORD_FIXTURES, name), 'utf8'));
}

/**
 * Captures grammar registrations against a real if-domain GrammarEngine
 * (the loader registers each lowered rule through rule(spec), ADR-382 D2).
 */
function captureGrammar(story: ChordStory): Array<{ pattern: string; action: string; tier: string }> {
  return captureGrammarRules(story).map((r) => ({ pattern: r.pattern, action: r.action, tier: r.tier }));
}

describe('a define-action registers only its written lines (ADR-384 D5, superseding Phase 8 #13)', () => {
  it('registers the slotted forms and no rule for a verb alone', () => {
    const story = createStory(compileFixture('zoo-actions.story'));
    const rules = captureGrammar(story);

    expect(rules).toContainEqual({ pattern: 'pet :animal', action: 'chord.action.petting', tier: 'story' });
    expect(rules).toContainEqual({ pattern: 'pat :animal', action: 'chord.action.petting', tier: 'story' });
    expect(rules).toContainEqual({ pattern: 'feed :animal', action: 'chord.action.feeding', tier: 'story' });

    // A targetless `pet` fails `pet :animal` with its verb matched, and the
    // parser asks for the missing seat; no bare rule reaches the action.
    for (const pattern of ['pet', 'pat', 'feed']) {
      expect(rules.some((r) => r.pattern === pattern)).toBe(false);
    }
  });
});

describe("the 'cant' default renders a real refusal (Phase 8 #13)", () => {
  const SOURCE = `story
  title: Waves
  authors:
    T
  id: waves
  story-version: 0.0.1

create the Beach
  a room

  A beach.

create the sea
  a thing
  in the Beach

  The sea.

create Alex
  a person
  playable
  starts in the Beach

  You.

before the game starts
  change the player to Alex
end before

define action waving
  grammar
    wave the thing
  phrase waved

define phrase waved
  You wave it about.
end phrase
`;

  interface DispatchAction {
    id: string;
    validate(ctx: unknown): { valid: boolean; error?: string };
    blocked(ctx: unknown, result: { error?: string }): ISemanticEvent[];
  }

  it('no-target with no authored otherwise → scope.out_of_scope, never a LoadError', () => {
    const story = createStory(compileSource(SOURCE));
    const world = new WorldModel();
    story.initializeWorld(world);
    const player: IFEntity = story.createPlayer(world);
    world.setPlayer(player.id);

    const waving = (story.getCustomActions() as DispatchAction[])
      .find((a) => a.id === 'chord.action.waving')!;
    const ctx = {
      world,
      player,
      command: {},
      sharedData: {},
      event: (type: string, data: Record<string, unknown>): ISemanticEvent =>
        ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }),
    };

    const validation = waving.validate(ctx);
    expect(validation).toEqual({ valid: false, error: 'cant' });

    const events = waving.blocked(ctx, validation);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('action.blocked');
    expect((events[0].data as { messageId?: string }).messageId).toBe('scope.out_of_scope');
  });
});
