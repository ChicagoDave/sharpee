/**
 * trait-classification-runtime.test.ts — a story trait classifies at run
 * time: `is a <trait>` and `must be a <trait>` hold exactly for the things
 * whose blocks compose the trait, in a plain condition, inside `each`, `any`
 * and `no` open conditions, and at the character arbiter's kind scopes.
 *
 * REAL-PATH: the chord fixture `trait-classification.story` through
 * `compile`, loaded by `createStory` into a real WorldModel, actions run
 * through stdlib's four phases. Asserts on WORLD STATE (locations) and on
 * refusal keys, as each-runtime.test.ts does.
 *
 * References:
 * - ADR-394 D1 — a story trait classifies; a conditional composition classifies by declaration.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { type IFEntity, WorldModel, ActorTrait } from '@sharpee/world-model';
import { runValidatePhase, runExecutePhase, runReportPhase, runBlockedPhase } from '@sharpee/stdlib';
import { createStory, Evaluator, type ChordStory } from '../src';
import { storyOracle } from '../src/build/characters';

const FIXTURE = join(__dirname, '..', '..', 'chord', 'tests', 'fixtures', 'trait-classification.story');

/** Minimal structural stand-in for the engine's ActionContext (each-runtime.test.ts shape). */
interface FakeContext {
  world: WorldModel;
  player: IFEntity;
  command: { directObject?: { entity?: IFEntity } };
  sharedData: Record<string, string | number | boolean | object | undefined>;
  event(type: string, data: Record<string, string | number | boolean | object | undefined>): ISemanticEvent;
}

interface DispatchAction {
  id: string;
  validate(ctx: FakeContext): { valid: boolean; error?: string };
  execute(ctx: FakeContext): void;
  report(ctx: FakeContext): ISemanticEvent[];
  blocked(ctx: FakeContext, result: { error?: string }): ISemanticEvent[];
}

interface Loaded {
  ir: StoryIR;
  story: ChordStory;
  world: WorldModel;
  player: IFEntity;
  actions: Map<string, DispatchAction>;
}

function load(): Loaded {
  const result = compile(readFileSync(FIXTURE, 'utf8'));
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  const story = createStory(result.ir, { seed: 7 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  player.add(new ActorTrait({ isPlayable: true }));
  world.setPlayer(player.id);
  const actions = new Map((story.getCustomActions() as DispatchAction[]).map((a) => [a.id, a]));
  return { ir: result.ir, story, world, player, actions };
}

function runAction(l: Loaded, actionId: string, targetIrId: string) {
  const ctx: FakeContext = {
    world: l.world,
    player: l.player,
    command: { directObject: { entity: l.world.getEntity(targetIrId)! } },
    sharedData: {},
    event: (type, data) => ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }),
  };
  const action = l.actions.get(actionId)!;
  const validation = runValidatePhase(action, ctx);
  if (!validation.valid) return { validation, events: runBlockedPhase(action, ctx, validation) };
  runExecutePhase(action, ctx);
  return { validation, events: runReportPhase(action, ctx) };
}

const messageIds = (events: ISemanticEvent[]) =>
  events.filter((e) => e.type === 'chord.phrase').map((e) => (e.data as { messageId?: string }).messageId);

describe('`is a <story trait>` at the evaluator', () => {
  const l = load();
  const ev = new Evaluator(l.ir, 7);
  const isA = (id: string, name: string, negated = false) =>
    ev.evalCondition(
      { kind: 'predicate', pred: 'is-a', negated, subject: { kind: 'entity', id }, object: { kind: 'symbol', name } },
      { world: l.world },
    );

  it('holds for the things that compose the trait, whatever their kind', () => {
    expect(isA('gold-coin', 'treasure')).toBe(true);
    expect(isA('jewel-box', 'treasure')).toBe(true);
    expect(isA('jewel-box', 'container')).toBe(true);
  });

  it('fails for a thing of the same kind that does not compose it, and the negation holds', () => {
    expect(isA('clay-pot', 'treasure')).toBe(false);
    expect(isA('clay-pot', 'treasure', true)).toBe(true);
    expect(isA('gold-coin', 'treasure', true)).toBe(false);
  });

  it('classifies a conditional composition by declaration, while its condition is false', () => {
    // `cursed while the idol is in the vault`, and the idol starts in the hall.
    expect(l.world.getLocation('idol')).toBe('hall');
    expect(isA('idol', 'cursed')).toBe(true);
    expect(isA('gold-coin', 'cursed')).toBe(false);
  });

  it('enumerates trait-based open conditions in creation order, `is not a` included', () => {
    expect(ev.matchesOf('loose-treasure', { world: l.world })).toEqual(['gold-coin', 'jewel-box', 'idol']);
    // A person is a thing too (`thing` widens every kind but room and region).
    expect(ev.matchesOf('plain-thing', { world: l.world })).toEqual(['alex', 'clay-pot']);
    expect(ev.evalCondition({ kind: 'any-of', condition: 'loose-treasure' }, { world: l.world })).toBe(true);
    expect(ev.evalCondition({ kind: 'none-of', condition: 'loose-treasure' }, { world: l.world })).toBe(false);
  });
});

describe('a trait-owned clause runs `each` over a trait-based condition', () => {
  it('sweeping the hall moves every treasure to the vault and leaves the clay pot', () => {
    const l = load();
    const { validation, events } = runAction(l, 'chord.action.sweeping', 'hall');
    expect(validation.valid).toBe(true);
    expect(l.world.getLocation('gold-coin')).toBe('vault');
    expect(l.world.getLocation('jewel-box')).toBe('vault');
    expect(l.world.getLocation('idol')).toBe('vault');
    expect(l.world.getLocation('clay-pot')).toBe('hall');
    expect(messageIds(events)).toContain('swept');
  });

  it('a second sweep is refused by `refuse when no loose-treasure`, moving nothing', () => {
    const l = load();
    runAction(l, 'chord.action.sweeping', 'hall');
    l.world.moveEntity('clay-pot', 'vault');
    const { validation } = runAction(l, 'chord.action.sweeping', 'hall');
    expect(validation).toEqual({ valid: false, error: 'nothing-loose' });
    expect(l.world.getLocation('clay-pot')).toBe('vault');
  });
});

describe('`must be a <story trait>` on an action slot', () => {
  it('refuses a thing that does not compose the trait', () => {
    const l = load();
    const { validation } = runAction(l, 'chord.action.appraising', 'clay-pot');
    expect(validation).toEqual({ valid: false, error: 'worthless' });
  });

  it('accepts a thing that composes it', () => {
    const l = load();
    const { validation, events } = runAction(l, 'chord.action.appraising', 'gold-coin');
    expect(validation.valid).toBe(true);
    expect(messageIds(events)).toContain('priceless');
  });
});

describe('`it must be any <trait-based condition>` in the trait\'s own clause', () => {
  it('passes for a treasure still in the hall', () => {
    const l = load();
    const { validation, events } = runAction(l, 'chord.action.polishing', 'gold-coin');
    expect(validation.valid).toBe(true);
    expect(messageIds(events)).toContain('polished');
  });

  it('refuses once that treasure is in the vault', () => {
    const l = load();
    l.world.moveEntity('gold-coin', 'vault');
    const { validation } = runAction(l, 'chord.action.polishing', 'gold-coin');
    expect(validation.valid).toBe(false);
    expect(validation.error).toMatch(/already-safe$/);
  });
});

describe('the character arbiter\'s kind scopes follow the same rule', () => {
  const l = load();
  const oracle = storyOracle(l.story['build']);

  it('a story trait is a scope classifier, agreeing with the evaluator row for row', () => {
    expect(oracle.isKindMember('gold-coin', 'treasure')).toBe(true);
    expect(oracle.isKindMember('jewel-box', 'treasure')).toBe(true);
    expect(oracle.isKindMember('clay-pot', 'treasure')).toBe(false);
    expect(oracle.isKindMember('idol', 'cursed')).toBe(true);
    expect(oracle.isKindMember('jewel-box', 'container')).toBe(true);
  });
});
