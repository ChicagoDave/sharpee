/**
 * hatch-context.test.ts — the §5.6 wall (hatch-context proposal,
 * 2026-07-12): producers are invoked with the narrow staging context
 * (construction), a producer that reaches outside it fails loud and named,
 * and the bind-time `'chord.'` lint refuses honest-but-wrong hatches.
 * Re-enacts the historical gateStatus leak and proves it reads nothing.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { TraitType, WorldModel } from '@sharpee/world-model';
import type { PhraseProducer } from '@sharpee/if-domain';
import {
  ChordStory,
  createStory,
  findChordLiteral,
  HATCH_CONTEXT_VERSION,
  LoadError,
  stagingRenderContext,
} from '../src';

const CHORD_FIXTURES = join(__dirname, '..', '..', 'chord', 'tests', 'fixtures');

function compileFixture(name: string): StoryIR {
  const result = compile(readFileSync(join(CHORD_FIXTURES, name), 'utf8'));
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

/** The loader-private key, assembled WITHOUT a quoted `chord.` literal so the
 * bind lint cannot reject the test hatch — the documented evasion the facade
 * exists to stop. */
const PRIVATE_KEY = ['ch', 'ord'].join('') + '.flag.gate-closed';

interface CloakWorld {
  story: ChordStory;
  world: WorldModel;
  playerId: string;
}

function loadCloak(garbled: PhraseProducer): CloakWorld {
  const story = createStory(compileFixture('cloak.story'), {
    hatchModules: { './extras.ts': { garbled } },
    seed: 42,
  });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, playerId: player.id };
}

/** Trample the message (dark entry), shed the cloak, and read it — drives the
 * real staging path (`phraseEvent` for `message-trampled`, which carries the
 * `{garbled}` marker). */
function trampleAndRead(cw: CloakWorld) {
  const barId = cw.story.entityId('foyer-bar')!;
  cw.world.moveEntity(cw.playerId, barId);
  cw.story.runtime.fireEventClauses(cw.world, {
    id: 'move-1',
    type: 'if.event.actor_moved',
    timestamp: 0,
    entities: { actor: cw.playerId },
    data: { toRoom: barId, fromRoom: cw.story.entityId('foyer-of-the-opera-house'), direction: 'SOUTH' },
  });
  const cloakId = cw.story.entityId('velvet-cloak')!;
  cw.world.moveEntity(cloakId, cw.story.entityId('brass-hook')!);
  const wearable = cw.world.getEntity(cloakId)!.get(TraitType.WEARABLE) as { worn: boolean; wornBy?: string };
  wearable.worn = false;
  wearable.wornBy = undefined;
  cw.story.runtime.recomputeDerived(cw.world);

  const message = cw.world.getEntity(cw.story.entityId('message-in-the-sawdust')!)!;
  const lookup = cw.world.getInterceptorForAction(message, 'if.action.reading')!;
  const data = {};
  lookup.interceptor.postExecute!(message, cw.world, cw.playerId, data);
  return lookup.interceptor.postReport!(message, cw.world, cw.playerId, data);
}

describe('stagingRenderContext (the wall)', () => {
  it('delegates the three RenderWorld reads to the live world and nothing else', () => {
    const cw = loadCloak(() => ({ kind: 'literal', text: 'x' }));
    const ctx = stagingRenderContext(cw.world);

    const hookId = cw.story.entityId('brass-hook')!;
    expect(ctx.world.getEntity(hookId)?.id).toBe(hookId);
    expect(ctx.world.getContainingRoom(hookId)?.id).toBe(cw.story.entityId('cloakroom'));
    expect(Array.isArray(ctx.world.getEntityContents(hookId))).toBe(true);

    // The facade IS the surface: no state access, no mutation, no nounPhraseFor.
    expect(Object.keys(ctx.world).sort()).toEqual(['getContainingRoom', 'getEntity', 'getEntityContents']);
    expect((ctx.world as Record<string, unknown>).getStateValue).toBeUndefined();
    expect((ctx.world as Record<string, unknown>).setStateValue).toBeUndefined();
    expect((ctx.world as Record<string, unknown>).moveEntity).toBeUndefined();

    // Inert seams, honestly present.
    expect(ctx.params).toEqual({});
    expect(ctx.textState.get('e', 'k')).toBeUndefined();
    expect(ctx.reference.lastMentioned()).toBeUndefined();
    expect(() => ctx.contribute('slot', { kind: 'empty' } as never)).not.toThrow();
  });

  it('re-enacts the gateStatus leak: the cast reads undefined through the real staging path', () => {
    let observed: unknown = 'unset';
    const cw = loadCloak((ctx) => {
      // The historical hatch shape (chord-extras.ts pre-P5), key assembled
      // dynamically to slip past the bind lint — construction must stop it.
      const world = (ctx as unknown as { world?: { getStateValue?(key: string): unknown } }).world;
      observed = world?.getStateValue?.(PRIVATE_KEY);
      return { kind: 'literal', text: observed === undefined ? 'clean' : 'leaked' };
    });

    const result = trampleAndRead(cw);
    expect((result.override!.params as Record<string, unknown>).garbled).toEqual({ kind: 'literal', text: 'clean' });
    expect(observed).toBeUndefined();
  });

  it('surfaces a producer that CALLS a facade-absent method as a LoadError naming hatch and phrase', () => {
    const cw = loadCloak((ctx) => {
      // Non-optional call — legacy code that assumed the wide world.
      const world = (ctx as unknown as { world: { getStateValue(key: string): unknown } }).world;
      return { kind: 'literal', text: String(world.getStateValue(PRIVATE_KEY)) };
    });

    expect(() => trampleAndRead(cw)).toThrow(LoadError);
    const cw2 = loadCloak((ctx) => {
      const world = (ctx as unknown as { world: { getStateValue(key: string): unknown } }).world;
      return { kind: 'literal', text: String(world.getStateValue(PRIVATE_KEY)) };
    });
    expect(() => trampleAndRead(cw2)).toThrow(/Hatch `garbled` threw while staging phrase `message-trampled`/);
  });
});

describe("bind-time 'chord.' lint (the backstop)", () => {
  it('refuses a text producer whose source carries a quoted chord. literal', () => {
    const leaky = () => ({ kind: 'literal', text: 'chord.private-key' });
    expect(() => createStory(compileFixture('cloak.story'), { hatchModules: { './extras.ts': { garbled: leaky } } }))
      .toThrow(LoadError);
    expect(() => createStory(compileFixture('cloak.story'), { hatchModules: { './extras.ts': { garbled: leaky } } }))
      .toThrow(/`garbled`.*loader-private `chord\.\*` state namespace/);
  });

  it('refuses an object hatch (action) whose function member carries the literal', () => {
    const juggling = {
      id: 'chord.hatch.juggling', // object property, not a function body — not scanned
      validate: () => ({ valid: true, note: 'chord.private-key' }),
      execute: () => {},
      report: () => [],
      blocked: () => [],
    };
    expect(() =>
      createStory(compileFixture('traits-basic.story'), {
        hatchModules: { './stunts.ts': { juggling } },
      })
    ).toThrow(/`juggling`.*loader-private/);
  });

  it('binds clean producers untouched (identity preserved for the bind, wrap happens at staging)', () => {
    const clean: PhraseProducer = () => ({ kind: 'literal', text: 'swept aside' });
    const story = createStory(compileFixture('cloak.story'), { hatchModules: { './extras.ts': { garbled: clean } } });
    expect(story.producers.get('garbled')).toBe(clean);
  });

  it('findChordLiteral returns the offending line and null for clean input', () => {
    const leaky = () => 'chord.private-key';
    expect(findChordLiteral(leaky)).toContain('chord.private-key');
    expect(findChordLiteral(() => 'clean')).toBeNull();
    expect(findChordLiteral(42)).toBeNull();
  });
});

describe('HATCH_CONTEXT_VERSION', () => {
  it('is version 1 of the staging surface', () => {
    expect(HATCH_CONTEXT_VERSION).toBe(1);
  });
});
