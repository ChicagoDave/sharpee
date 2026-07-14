/**
 * dispatch.test.ts — Phase B plan phase 4 + Phase C ownership package:
 * `define action` → four-phase dispatch actions; `define trait` dispatch
 * clauses → CapabilityBehaviors; trait-declared states (D8); owner-attached
 * scores (D12, dedup by identity); `after` reactions in the report phase.
 *
 * Behavior Statements verified here: petting/feeding mutate and report
 * through the capability path (the feedable state flips hungry → content
 * in world state, owner-qualified scores awarded exactly once, refusals
 * fire per the `must` ladder), asserting on WORLD STATE, not just
 * returned events.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { CHORD_STATE_PREFIX, ChordStory, createStory } from '../src';

const CHORD_FIXTURES = join(__dirname, '..', '..', 'chord', 'tests', 'fixtures');

function compileFixture(name: string): StoryIR {
  const result = compile(readFileSync(join(CHORD_FIXTURES, name), 'utf8'));
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

/** Minimal structural stand-in for the engine's ActionContext. */
interface FakeContext {
  world: WorldModel;
  player: IFEntity;
  command: { directObject?: { entity?: IFEntity } };
  sharedData: Record<string, unknown>;
  event(type: string, data: Record<string, unknown>): ISemanticEvent;
}

interface DispatchAction {
  id: string;
  validate(ctx: FakeContext): { valid: boolean; error?: string };
  execute(ctx: FakeContext): void;
  report(ctx: FakeContext): ISemanticEvent[];
  blocked(ctx: FakeContext, result: { error?: string }): ISemanticEvent[];
}

describe('zoo-actions dispatch (petting/feeding)', () => {
  let story: ChordStory;
  let world: WorldModel;
  let player: IFEntity;
  let actions: Map<string, DispatchAction>;

  const entity = (irId: string) => world.getEntity(story.entityId(irId)!)!;
  const context = (target?: IFEntity): FakeContext => ({
    world,
    player,
    command: { directObject: target ? { entity: target } : undefined },
    sharedData: {},
    event: (type, data) => ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }),
  });
  const run = (action: DispatchAction, target?: IFEntity) => {
    const ctx = context(target);
    const validation = action.validate(ctx);
    if (!validation.valid) return { validation, events: action.blocked(ctx, validation) };
    action.execute(ctx);
    return { validation, events: action.report(ctx) };
  };

  beforeEach(() => {
    story = createStory(compileFixture('zoo-actions.story'));
    world = new WorldModel();
    story.initializeWorld(world);
    player = story.createPlayer(world);
    world.setPlayer(player.id);
    actions = new Map(
      (story.getCustomActions() as DispatchAction[]).map((a) => [a.id, a]),
    );
  });

  it('registers dispatch actions and sets the score ceiling', () => {
    expect([...actions.keys()].sort()).toEqual(['chord.action.feeding', 'chord.action.petting']);
    expect(world.getMaxScore()).toBe(15);
  });

  it('pet goats: species phrase reported, petted emitted, rule awards once', () => {
    const petting = actions.get('chord.action.petting')!;
    const { validation, events } = run(petting, entity('pygmy-goats'));
    expect(validation.valid).toBe(true);
    const types = events.map((e) => e.type);
    expect(types).toContain('petted');
    const phrase = events.find((e) => (e.data as { messageId?: string })?.messageId === 'pet-goats');
    expect(phrase, 'species phrase from select-on kind').toBeDefined();
    // The trait clause's `award petted` resolved owner-qualified
    // (`trait.pettable.petted`, worth 5 — ratchet D12) during the
    // capability execute phase.
    expect(world.getScore()).toBe(5);

    // Award dedups by identity — a second pet does not double-score.
    run(petting, entity('pygmy-goats'));
    expect(world.getScore()).toBe(5);
  });

  it('pet the snake: refused with the glass-way phrase, nothing mutated', () => {
    const petting = actions.get('chord.action.petting')!;
    const { validation, events } = run(petting, entity('garden-snake'));
    expect(validation).toEqual({ valid: false, error: 'glass-way' });
    expect((events[0].data as { messageId?: string }).messageId).toBe('glass-way');
    expect(world.getScore()).toBe(0);
  });

  it('pet a non-pettable thing: the otherwise refusal (dispatch miss)', () => {
    const petting = actions.get('chord.action.petting')!;
    const { validation } = run(petting, entity('handful-of-feed'));
    expect(validation).toEqual({ valid: false, error: 'cant-pet' });
  });

  it('pet nothing: refuse without animal', () => {
    const petting = actions.get('chord.action.petting')!;
    const { validation } = run(petting, undefined);
    expect(validation).toEqual({ valid: false, error: 'pet-what' });
  });

  it('feeding: no-food refusal, then success flips hungry → content and scores once', () => {
    const feeding = actions.get('chord.action.feeding')!;
    const goats = entity('pygmy-goats');

    // Composer entities START in the first declared trait state (D8).
    expect(world.getStateValue(CHORD_STATE_PREFIX + 'pygmy-goats')).toBe('hungry');

    // The player does not hold the feed yet: `the actor must have its food`.
    const first = run(feeding, goats);
    expect(first.validation).toEqual({ valid: false, error: 'no-food' });
    expect(world.getStateValue(CHORD_STATE_PREFIX + 'pygmy-goats')).toBe('hungry');

    // Pick up the feed: the feedable clause's `must` requirements hold.
    world.moveEntity(story.entityId('handful-of-feed')!, player.id);
    const second = run(feeding, goats);
    expect(second.validation.valid).toBe(true);

    // State assertions: `change it to content` mutated world state; the
    // goats' `after feeding it / award fed` reaction awarded the
    // owner-qualified `pygmy-goats.fed` (worth 10) in the report phase.
    expect(world.getStateValue(CHORD_STATE_PREFIX + 'pygmy-goats')).toBe('content');
    expect(world.getScore()).toBe(10);
    // Per-entity override: the goats' own `phrase fed:` wins over the trait's.
    const phrase = second.events.find((e) => (e.data as { messageId?: string })?.messageId === 'pygmy-goats.fed');
    expect(phrase, 'goats override of the fed phrase').toBeDefined();

    // Content now: `it must be hungry` fails, and the score stays put.
    const third = run(feeding, goats);
    expect(third.validation).toEqual({ valid: false, error: 'already-fed' });
    expect(world.getScore()).toBe(10);
  });
});
