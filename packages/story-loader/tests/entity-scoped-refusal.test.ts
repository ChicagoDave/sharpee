/**
 * entity-scoped-refusal.test.ts — ADR-231 D1: a bare `refuse <key>` written
 * inside an entity's `on the player taking` clause, where the entity also declares a
 * per-entity `phrase <key>:` block, must travel as the ENTITY-SCOPED message
 * id `<irId>.<key>` (runtime.refusalOf), cross into stdlib's blocked()
 * marked errorQualified, and land on the blocked event verbatim — never as
 * the bare key. REAL-PATH pin for the shipped iron-ring doc example: real
 * compiler, real loader, real registered interceptor, stdlib takingAction.
 *
 * Also the pin for GH #304: a refusal keyed to a STRATEGY phrase must carry
 * the phrase's variants as a Choice in the veto's params — selected exactly
 * as a `phrase <key>` statement selects — never render the registered
 * `{variants}` template's placeholder literally.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { takingAction } from '@sharpee/stdlib';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

function loadStory(source: string): { story: ChordStory; world: WorldModel; player: IFEntity } {
  const story = createStory(compileSource(source), { seed: 11 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, player };
}

// The iron-ring doc example: an entity-local refusal key with an
// entity-local phrase override.
const RING_STORY = `story
  title: Ring
  authors:
    T
  id: ring
  story-version: 0.0.1

create the Vault
  a room

  A vault.

create Alex
  a person
  playable
  starts in the Vault

  You.

before the game starts
  change the player to Alex
end before

create the iron ring
  in the Vault
  phrase stuck-fast:
    The ring is fused to the stone; it will not budge.

  An iron ring set into the flagstones.

  on the player taking
    refuse stuck-fast
  end on
`;

describe('entity-scoped refusal key resolution (ADR-231 D1)', () => {
  it('registers the per-entity phrase under the SCOPED id, not the bare key', () => {
    const { story } = loadStory(RING_STORY);
    const registered = new Map<string, string>();
    story.extendLanguage({ addMessage: (id: string, t: string) => registered.set(id, t) } as never);

    // The per-entity `phrase stuck-fast:` block registers entity-scoped.
    expect(registered.get('iron-ring.stuck-fast')).toContain('will not budge');
    // No bare-key registration to collide with other entities' locals.
    expect(registered.has('stuck-fast')).toBe(false);
  });

  it('REAL-PATH: `refuse stuck-fast` reaches takingAction blocked() as `iron-ring.stuck-fast`', () => {
    const { story, world, player } = loadStory(RING_STORY);
    const ring = world.getEntity(story.entityId('iron-ring')!)!;
    const vaultId = story.entityId('vault')!;

    // Structural ActionContext (cuttable.test.ts precedent) over the REAL
    // loader-built world — the interceptor consulted is the one the loader
    // registered from the story source.
    const context: any = {
      world,
      player,
      action: takingAction,
      command: {
        directObject: { entity: ring },
        parsed: { structure: { directObject: { isAll: false, isList: false } } },
      },
      sharedData: {},
      requireScope: () => ({ ok: true }),
      event: (type: string, data: Record<string, unknown>): ISemanticEvent =>
        ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }) as ISemanticEvent,
    };

    const validation = takingAction.validate(context);

    expect(validation.valid).toBe(false);
    // resolvePhraseKey found the entity-local phrase, so the refusal
    // travels scoped — and the lifecycle engine stamps the veto qualified.
    expect(validation.error).toBe('iron-ring.stuck-fast');
    expect(validation.errorQualified).toBe(true);

    const events = takingAction.blocked(context, validation);
    const blocked = events.find((e) => e.type === 'if.event.take_blocked')!;
    expect(blocked).toBeDefined();
    // THE pin: the entity-scoped id verbatim — never the bare key, never
    // an 'if.action.taking.'-prefixed reshape.
    expect((blocked.data as any).messageId).toBe('iron-ring.stuck-fast');
    expect((blocked.data as any).messageId).not.toBe('stuck-fast');

    // State: the refusal really blocked the take — the ring never moved.
    expect(world.getLocation(ring.id)).toBe(vaultId);

    // GH #304 regression guard: a single-variant, no-strategy phrase stages
    // no render params — the veto travels as the bare scoped id, as before.
    expect(validation.params).toBeUndefined();
  });
});

// GH #304: a `refuse <key>` on a strategy phrase. The statue carries the
// refusal on its own `on` clause; the bench carries it through a composed
// trait — the two interceptor paths that discarded the phrase's Choice.
const GUARD_STORY = `story
  title: Guard
  authors:
    T
  id: guard
  story-version: 0.0.1

define phrase held-fast, randomly
  The first arm.
or
  The second arm.
end phrase

define trait bolted
  on the player taking
    refuse held-fast
  end on
end trait

create the Yard
  a room

  A yard.

create Alex
  a person
  playable
  starts in the Yard

  You.

before the game starts
  change the player to Alex
end before

create the statue
  in the Yard

  A statue.

  on the player taking
    refuse held-fast
  end on

create the bench
  bolted
  in the Yard

  A bench.
`;

function takeContextFor(world: WorldModel, player: IFEntity, target: IFEntity): any {
  return {
    world,
    player,
    action: takingAction,
    command: {
      directObject: { entity: target },
      parsed: { structure: { directObject: { isAll: false, isList: false } } },
    },
    sharedData: {},
    requireScope: () => ({ ok: true }),
    event: (type: string, data: Record<string, unknown>): ISemanticEvent =>
      ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }) as ISemanticEvent,
  };
}

/** The veto must carry the phrase's arms as a Choice — never nothing (which renders the literal `{variants}` placeholder). */
function expectHeldFastChoice(validation: { valid: boolean; error?: string; params?: Record<string, unknown> }): void {
  expect(validation.valid).toBe(false);
  expect(validation.error).toBe('held-fast');
  const choice = validation.params?.variants as
    | { kind: string; selector: string; messageKey: string; entityId: string; alternatives: Array<{ kind: string; text: string }> }
    | undefined;
  expect(choice).toBeDefined();
  expect(choice!.kind).toBe('choice');
  expect(choice!.selector).toBe('random'); // STRATEGY_SELECTOR['randomly']
  // Same Choice keying as a `phrase held-fast` statement — shared selection state.
  expect(choice!.entityId).toBe('chord');
  expect(choice!.messageKey).toBe('held-fast');
  expect(choice!.alternatives.map((a) => a.text)).toEqual(['The first arm.', 'The second arm.']);
}

describe('refusal on a strategy phrase carries the Choice (GH #304)', () => {
  it('entity `on` clause: the veto params hold the arms and reach blocked()', () => {
    const { story, world, player } = loadStory(GUARD_STORY);
    const statue = world.getEntity(story.entityId('statue')!)!;
    const yardId = story.entityId('yard')!;

    const context = takeContextFor(world, player, statue);
    const validation = takingAction.validate(context);
    expectHeldFastChoice(validation);

    // The Choice must survive into the blocked event the prose pipeline
    // renders — params on the veto alone would still print the placeholder.
    const events = takingAction.blocked(context, validation);
    const blocked = events.find((e) => e.type === 'if.event.take_blocked')!;
    expect(blocked).toBeDefined();
    expect((blocked.data as any).messageId).toBe('held-fast');
    expect(((blocked.data as any).params as any)?.variants).toEqual(validation.params!.variants);

    // State: the refusal really blocked the take.
    expect(world.getLocation(statue.id)).toBe(yardId);
  });

  it('trait clause: the composed-trait interceptor path carries the same Choice', () => {
    const { story, world, player } = loadStory(GUARD_STORY);
    const bench = world.getEntity(story.entityId('bench')!)!;
    const yardId = story.entityId('yard')!;

    const context = takeContextFor(world, player, bench);
    const validation = takingAction.validate(context);
    expectHeldFastChoice(validation);

    // State: the refusal really blocked the take.
    expect(world.getLocation(bench.id)).toBe(yardId);
  });
});
