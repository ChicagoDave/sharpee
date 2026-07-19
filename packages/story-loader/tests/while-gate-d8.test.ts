/**
 * while-gate-d8.test.ts — ADR-228 D8: `while` gates gate the WHOLE clause,
 * refusals included, on all three lowering routes (entity interceptor,
 * trait interceptor, trait capability behavior), and `, once` is honored
 * uniformly (the trait paths previously ignored both).
 *
 * The gate's ruled evaluation point: once per firing, at validate time.
 * A false gate sets chordSkip; postExecute/postReport (and the capability
 * execute/report) sit the firing out.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { CHORD_OCCURRENCE_PREFIX, CHORD_STATE_PREFIX, ChordStory, createStory } from '../src';

/** The story-level state key (not exported via the package index). */
const CHORD_STORY_STATE_KEY = 'chord.story.state';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

function load(source: string): { story: ChordStory; world: WorldModel; playerId: string } {
  const story = createStory(compileSource(source), { seed: 11 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, playerId: player.id };
}

const messageIdsOf = (events: ISemanticEvent[]) =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter(Boolean);

// Story states: calm-day (initial) gates the `while wild-day` clauses OFF.
// Every gated clause carries a leading refusal that HOLDS (its target is
// tame) — under the pre-D8 lowering the refusal leaked through the false
// gate on the entity route and fired unconditionally on both trait routes.
const GATES_STORY = `story "Gates" by "T"
  id: gates
  version: 0.0.1
  states: calm-day, wild-day

define phrase taboo
  Hands off.
end phrase

define phrase taken-wild
  It snaps at you.
end phrase

define action prodding
  grammar
    prod :thing
  refuse without thing: prod-what
  otherwise refuse cant-prod

  phrases en-US
    prod-what:
      Prod what?
    cant-prod:
      Best not.

define trait skittish
  states, reversible: tame, feral

  on taking it while wild-day
    refuse when it is tame: taboo
    change it to feral
    phrase taken-wild
  end on
end trait

define trait shy
  on taking it, once
    phrase taken-wild
  end on
end trait

define trait poddable
  states, reversible: tame, feral

  on prodding it while wild-day
    refuse when it is tame: taboo
    change it to feral
    phrase taken-wild
  end on
end trait

define trait prickly
  states, reversible: tame, feral

  on prodding it, once
    change it to feral
    phrase taken-wild
  end on
end trait

define action waving
  grammar
    wave :thing
  refuse without thing: wave-what
  otherwise refuse cant-wave
  phrase waved

  phrases en-US
    wave-what:
      Wave what?
    cant-wave:
      Nothing to wave.
    waved:
      You wave it about.

define trait wavable
  on waving it while wild-day
    phrase taken-wild
  end on
end trait

define trait perky
  on prodding it
    phrase perked-up
  end on
end trait

define phrase perked-up
  It perks right up.
end phrase

create the Camp
  a room

  A camp.

create the badger
  in the Camp
  states, reversible: tame, feral

  A badger.

  on taking it while wild-day
    refuse when it is tame: taboo
    change it to feral
    phrase taken-wild
  end on

create the vole
  in the Camp

  A vole.

  on taking it, once
    phrase taken-wild
  end on

create the stoat
  skittish
  in the Camp

  A stoat.

create the weasel
  shy
  in the Camp

  A weasel.

create the ferret
  poddable
  in the Camp

  A ferret.

create the marten
  prickly
  in the Camp

  A marten.

create the shrew
  poddable
  perky
  in the Camp

  A shrew.

create the flag
  wavable
  in the Camp

  A flag.

create the player
  starts in the Camp

  You.
`;

type Loaded = ReturnType<typeof load>;

/** Drive one full interceptor firing the way a stdlib action does. */
function fireInterceptor(loaded: Loaded, irId: string, actionId = 'if.action.taking') {
  const entity = loaded.world.getEntity(loaded.story.entityId(irId)!)!;
  const lookup = loaded.world.getInterceptorForAction(entity, actionId);
  expect(lookup, `interceptor bound for ${actionId} on ${irId}`).toBeDefined();
  const data: Record<string, unknown> = {};
  const pre = lookup!.interceptor.preValidate?.(entity, loaded.world, loaded.playerId, data) ?? null;
  if (pre && pre.valid === false) return { pre, report: null, data };
  lookup!.interceptor.postValidate?.(entity, loaded.world, loaded.playerId, data);
  lookup!.interceptor.postExecute?.(entity, loaded.world, loaded.playerId, data);
  const report = lookup!.interceptor.postReport?.(entity, loaded.world, loaded.playerId, data) ?? {};
  return { pre, report, data };
}

/** Drive a dispatch action end-to-end (capability route). */
function dispatch(loaded: Loaded, verb: string, irId: string) {
  interface DispatchAction {
    id: string;
    validate(ctx: unknown): { valid: boolean; error?: string };
    execute(ctx: unknown): void;
    report(ctx: unknown): ISemanticEvent[];
    blocked(ctx: unknown, result: { error?: string }): ISemanticEvent[];
  }
  const action = (loaded.story.getCustomActions() as DispatchAction[]).find(
    (a) => a.id === `chord.action.${verb}`,
  )!;
  const target = loaded.world.getEntity(loaded.story.entityId(irId)!)!;
  const ctx = {
    world: loaded.world,
    player: loaded.world.getEntity(loaded.playerId)!,
    command: { directObject: { entity: target } },
    sharedData: {},
    event: (type: string, data: Record<string, unknown>): ISemanticEvent => ({
      id: `t-${type}`,
      type,
      timestamp: 0,
      entities: {},
      data,
    }),
  };
  const validation = action.validate(ctx);
  if (!validation.valid) return { validation, events: action.blocked(ctx, validation) };
  action.execute(ctx);
  return { validation, events: action.report(ctx) };
}

const stateOf = (loaded: Loaded, irId: string) =>
  loaded.world.getStateValue(CHORD_STATE_PREFIX + irId);

describe('D8: while-false gates out the leading refusal (entity route)', () => {
  it('sits the whole clause out when the gate is false — no refusal, no mutation, no report', () => {
    const loaded = load(GATES_STORY);
    const { pre, report } = fireInterceptor(loaded, 'badger');
    expect(pre).toBeNull();
    expect(report).toEqual({});
    expect(stateOf(loaded, 'badger')).toBe('tame');
  });

  it('refuses normally when the gate is true', () => {
    const loaded = load(GATES_STORY);
    loaded.world.setStateValue(CHORD_STORY_STATE_KEY, 'wild-day');
    const { pre } = fireInterceptor(loaded, 'badger');
    expect(pre).toEqual({ valid: false, error: 'taboo' });
    expect(stateOf(loaded, 'badger')).toBe('tame');
  });
});

describe('D8: while-false gates out the leading refusal (trait interceptor route)', () => {
  it('sits the whole clause out when the gate is false — no refusal, no mutation, no report', () => {
    const loaded = load(GATES_STORY);
    const { pre, report } = fireInterceptor(loaded, 'stoat');
    expect(pre).toBeNull();
    expect(report).toEqual({});
    expect(stateOf(loaded, 'stoat')).toBe('tame');
  });

  it('refuses normally when the gate is true', () => {
    const loaded = load(GATES_STORY);
    loaded.world.setStateValue(CHORD_STORY_STATE_KEY, 'wild-day');
    const { pre } = fireInterceptor(loaded, 'stoat');
    expect(pre).toEqual({ valid: false, error: 'taboo' });
    expect(stateOf(loaded, 'stoat')).toBe('tame');
  });
});

describe('D8: trait-clause `, once` behaves identically to the entity path', () => {
  it('trait route: fires once, then sits out with the counter frozen at 1', () => {
    const loaded = load(GATES_STORY);
    const counterKey = `${CHORD_OCCURRENCE_PREFIX}trait.shy.taking.on.0.weasel`; // namespaced per-clause (D3 pair fix)

    const first = fireInterceptor(loaded, 'weasel');
    expect(first.report!.override?.messageId).toBe('taken-wild');
    expect(loaded.world.getStateValue(counterKey)).toBe(1);

    const second = fireInterceptor(loaded, 'weasel');
    expect(second.pre).toBeNull();
    expect(second.report).toEqual({});
    expect(loaded.world.getStateValue(counterKey)).toBe(1);
  });

  it('entity route (the pre-existing behavior the trait path now mirrors)', () => {
    const loaded = load(GATES_STORY);
    const counterKey = `${CHORD_OCCURRENCE_PREFIX}on.vole.taking.on.0`; // namespaced per-clause (D3 pair fix)

    const first = fireInterceptor(loaded, 'vole');
    expect(first.report!.override?.messageId).toBe('taken-wild');
    expect(loaded.world.getStateValue(counterKey)).toBe(1);

    const second = fireInterceptor(loaded, 'vole');
    expect(second.pre).toBeNull();
    expect(second.report).toEqual({});
    expect(loaded.world.getStateValue(counterKey)).toBe(1);
  });
});

describe('D8/R5: while/once on the capability route (dispatch verb, trait clause)', () => {
  it('R5: a gated-out clause does not claim — the dispatch falls through to the miss, never a blank turn', () => {
    const loaded = load(GATES_STORY);
    const result = dispatch(loaded, 'prodding', 'ferret');
    expect(result.validation).toEqual({ valid: false, error: 'cant-prod' });
    expect(messageIdsOf(result.events)).toContain('cant-prod');
    expect(stateOf(loaded, 'ferret')).toBe('tame');
    // The gated-out probe left no trace: its occurrence counter was never written.
    expect(loaded.world.getStateValue(`${CHORD_OCCURRENCE_PREFIX}trait.poddable.prodding.ferret`)).toBeUndefined();
  });

  it('refuses normally when the gate is true, and runs the body once un-refused', () => {
    const loaded = load(GATES_STORY);
    loaded.world.setStateValue(CHORD_STORY_STATE_KEY, 'wild-day');

    const refused = dispatch(loaded, 'prodding', 'ferret');
    expect(refused.validation).toEqual({ valid: false, error: 'taboo' });
    expect(stateOf(loaded, 'ferret')).toBe('tame');

    loaded.world.setStateValue(CHORD_STATE_PREFIX + 'ferret', 'feral');
    const allowed = dispatch(loaded, 'prodding', 'ferret');
    expect(allowed.validation.valid).toBe(true);
    expect(messageIdsOf(allowed.events)).toContain('taken-wild');
  });

  it('R5: a `, once`-consumed clause falls through to the miss on its second firing, counter frozen at 1', () => {
    const loaded = load(GATES_STORY);
    // Capability occurrence keys end in the IR id (host.irIdOf) — 'marten'.
    const counterKey = `${CHORD_OCCURRENCE_PREFIX}trait.prickly.prodding.marten`;

    const first = dispatch(loaded, 'prodding', 'marten');
    expect(first.validation.valid).toBe(true);
    expect(stateOf(loaded, 'marten')).toBe('feral');
    expect(messageIdsOf(first.events)).toContain('taken-wild');
    expect(loaded.world.getStateValue(counterKey)).toBe(1);

    loaded.world.setStateValue(CHORD_STATE_PREFIX + 'marten', 'tame');
    const second = dispatch(loaded, 'prodding', 'marten');
    expect(second.validation).toEqual({ valid: false, error: 'cant-prod' });
    expect(messageIdsOf(second.events)).toContain('cant-prod');
    expect(stateOf(loaded, 'marten')).toBe('tame');
    expect(loaded.world.getStateValue(counterKey)).toBe(1);
  });

  it('R5: a gated-out clause falls through to the action body when one exists', () => {
    const loaded = load(GATES_STORY);
    const result = dispatch(loaded, 'waving', 'flag');
    expect(result.validation.valid).toBe(true);
    expect(messageIdsOf(result.events)).toContain('waved');
    expect(messageIdsOf(result.events)).not.toContain('taken-wild');
    expect(loaded.world.getStateValue(`${CHORD_OCCURRENCE_PREFIX}trait.wavable.waving.flag`)).toBeUndefined();
  });

  it("R5: a gated-out clause falls through to another trait's live behavior", () => {
    const loaded = load(GATES_STORY);
    // shrew composes poddable (gated off on calm-day) then perky (live):
    // perky must claim and run; poddable's states stay untouched.
    const result = dispatch(loaded, 'prodding', 'shrew');
    expect(result.validation.valid).toBe(true);
    expect(stateOf(loaded, 'shrew')).toBe('tame');
    expect(messageIdsOf(result.events)).toContain('perked-up');
    // The skipped poddable probe wrote nothing; the claiming perky one did.
    expect(loaded.world.getStateValue(`${CHORD_OCCURRENCE_PREFIX}trait.poddable.prodding.shrew`)).toBeUndefined();
    expect(loaded.world.getStateValue(`${CHORD_OCCURRENCE_PREFIX}trait.perky.prodding.shrew`)).toBe(1);
  });
});
