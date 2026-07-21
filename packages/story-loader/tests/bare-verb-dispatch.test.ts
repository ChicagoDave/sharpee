/**
 * bare-verb-dispatch.test.ts — platform-issue-sweep Phase 8 #13 (David's
 * ruling: ALL dispatch actions). Dispatch validate always handled the
 * no-target case (`refuse without` arm, else the platform default), but
 * compiler-emitted grammar only carried slotted patterns, so a bare `pet` /
 * `feed` / `lower` never parsed far enough to reach it. extendParser now
 * registers each pattern's literal prefix as a bare rule below the slotted
 * forms; the `'cant'` default (an action with no authored otherwise) renders
 * the platform's generic refusal instead of throwing phraseEvent's
 * missing-phrase LoadError.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';

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

/** Captures grammar registrations the way the stdlib parser would receive them. */
function captureGrammar(story: ChordStory): Array<{ pattern: string; action: string; priority: number }> {
  const rules: Array<{ pattern: string; action: string; priority: number }> = [];
  const fakeParser = {
    getStoryGrammar: () => ({
      define: (pattern: string) => ({
        mapsTo: (action: string) => ({
          withPriority: (priority: number) => ({
            build: () => rules.push({ pattern, action, priority }),
          }),
        }),
      }),
    }),
  };
  story.extendParser(fakeParser as never);
  return rules;
}

describe('bare-verb grammar for every define-action (Phase 8 #13)', () => {
  it('registers each pattern literal prefix as a bare rule below the slotted forms', () => {
    const story = createStory(compileFixture('zoo-actions.story'));
    const rules = captureGrammar(story);

    // Slotted forms as before.
    expect(rules).toContainEqual({ pattern: 'pet :animal', action: 'chord.action.petting', priority: 150 });
    expect(rules).toContainEqual({ pattern: 'pat :animal', action: 'chord.action.petting', priority: 150 });
    expect(rules).toContainEqual({ pattern: 'feed :animal', action: 'chord.action.feeding', priority: 150 });

    // NEW: bare-verb forms — a targetless `pet` / `pat` / `feed` parses and
    // reaches dispatch validate's no-target arm (`refuse without` → pet-what).
    expect(rules).toContainEqual({ pattern: 'pet', action: 'chord.action.petting', priority: 140 });
    expect(rules).toContainEqual({ pattern: 'pat', action: 'chord.action.petting', priority: 140 });
    expect(rules).toContainEqual({ pattern: 'feed', action: 'chord.action.feeding', priority: 140 });
  });
});

describe("the 'cant' default renders a real refusal (Phase 8 #13)", () => {
  const SOURCE = `story "Waves" by "T"
  id: waves
  version: 0.0.1

create the Beach
  a room

  A beach.

create the sea
  in the Beach

  The sea.

create the player
  starts in the Beach

  You.

define action waving
  grammar
    wave :thing
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
