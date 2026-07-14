/**
 * Unit tests for the declarative slot-entry registry (ADR-212 §1–§4).
 *
 * Covers the Phase 1 acceptance criteria of `chord-212-213-seams`:
 * AC-2 (owner absent → nothing), AC-3 (owner removed → nothing, no throw),
 * AC-4 (Choice counter keyed `(owner, counterKey)`, save-file-shaped
 * persistence across a fresh pipeline + re-registration), AC-5 (predicate
 * gate; nothing gate-shaped serialized), AC-7 (last-wins re-registration),
 * plus the platform-entries-before-story-contributors ordering contract.
 *
 * Contributions are observed through a probe `SlotContributor` reading the
 * shared staging store — entries stage before ALL contributors, so the probe
 * always sees them. The AC-4 suite drives the real `EnglishLanguageProvider`
 * end to end (template `{slot:here}` → Assembler `selectChoice`) because the
 * counter only advances at realize time, not at staging time.
 *
 * @see ADR-212, docs/work/chord-212-213-seams/plan.md Phase 1
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import type { IEntity } from '@sharpee/core';
import type { Choice, Phrase } from '@sharpee/if-domain';
import type { ITextBlock, TextContent } from '@sharpee/text-blocks';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { ProsePipeline } from '../../src/prose-pipeline/pipeline';
import type { SlotEntry } from '../../src/prose-pipeline/types';
import type { WorldModelLike } from '../../src/prose-pipeline/render-context';
import { makeEvent, makeProvider } from './test-helpers';

/** Literal phrase shorthand. */
const lit = (text: string): Phrase => ({ kind: 'literal', text });

/** A slot entry with overridable fields; defaults to npc1 feeding 'here'. */
function entry(overrides: Partial<SlotEntry> = {}): SlotEntry {
  return { slotKey: 'here', owner: 'npc1', content: lit('Npc is here.'), ...overrides };
}

interface FixtureWorld {
  world: WorldModelLike;
  /** The live capability maps — `capabilities.textState` is the persisted counter store. */
  capabilities: Record<string, Record<string, unknown>>;
}

/**
 * Minimal capability-bearing world: `containing` maps entity id → room id
 * (absent id = no containing room, exactly what a removed entity resolves to),
 * and the `textState` capability round-trips through plain JSON like a save
 * file. Player id is always 'player'.
 */
function fixtureWorld(opts: {
  playerRoom?: string | null;
  occupantRooms?: Record<string, string>;
  textState?: Record<string, unknown>;
} = {}): FixtureWorld {
  const capabilities: Record<string, Record<string, unknown>> = {
    textState: (opts.textState ?? {}) as Record<string, unknown>,
  };
  const containing: Record<string, string> = { ...(opts.occupantRooms ?? {}) };
  if (opts.playerRoom !== null) {
    containing['player'] = opts.playerRoom ?? 'r1';
  }
  const world: WorldModelLike = {
    getEntity: (id) => ({ id } as IEntity),
    getContents: () => [],
    getContainingRoom: (id) => {
      const roomId = containing[id];
      return roomId ? ({ id: roomId } as IEntity) : undefined;
    },
    getPlayer: () => ({ id: 'player' } as IEntity),
    getCapability: (name) => capabilities[name],
    updateCapability: (name, updates) => {
      capabilities[name] = { ...(capabilities[name] ?? {}), ...updates };
    },
    hasCapability: (name) => name in capabilities,
    registerCapability: (name, reg) => {
      if (!(name in capabilities)) capabilities[name] = reg?.initialData ?? {};
    },
  };
  return { world, capabilities };
}

/**
 * Observe the staging store through a story contributor: records what
 * `slotContributions(slotKey)` holds at the moment story closures run —
 * i.e. after every platform entry has staged.
 */
function probeSlot(pipeline: ProsePipeline, slotKey = 'here'): { texts: () => string[] } {
  const seen: Phrase[] = [];
  pipeline.registerSlotContributor((ctx) => {
    seen.length = 0;
    seen.push(...(ctx.slotContributions?.(slotKey) ?? []));
  });
  return {
    texts: () => seen.map((p) => (p.kind === 'literal' ? p.text : `<${p.kind}>`)),
  };
}

/** Flatten realized blocks to one plain string. */
function blockText(blocks: ITextBlock[]): string {
  const textOf = (n: TextContent): string =>
    typeof n === 'string' ? n : (n.content ?? []).map(textOf).join('');
  return blocks.map((b) => b.content.map(textOf).join('')).join('\n');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ProsePipeline slot entries (ADR-212) — gating', () => {
  it('contributes while the owner shares the player\'s room (default owner-present gate)', () => {
    const fw = fixtureWorld({ occupantRooms: { npc1: 'r1' } });
    const pipeline = new ProsePipeline(makeProvider({}), fw.world);
    pipeline.registerSlotEntry(entry());
    const probe = probeSlot(pipeline);

    pipeline.processTurn([]);

    expect(probe.texts()).toEqual(['Npc is here.']);
  });

  it('AC-2: contributes nothing while the owner is in another room', () => {
    const fw = fixtureWorld({ occupantRooms: { npc1: 'r2' } });
    const pipeline = new ProsePipeline(makeProvider({}), fw.world);
    pipeline.registerSlotEntry(entry());
    const probe = probeSlot(pipeline);

    pipeline.processTurn([]);

    expect(probe.texts()).toEqual([]);
  });

  it('AC-3: an owner missing from the world contributes nothing and does not throw', () => {
    const fw = fixtureWorld(); // npc1 has no containing room — the removed-entity shape
    const pipeline = new ProsePipeline(makeProvider({}), fw.world);
    pipeline.registerSlotEntry(entry());
    const probe = probeSlot(pipeline);

    expect(() => pipeline.processTurn([])).not.toThrow();
    expect(probe.texts()).toEqual([]);
  });

  it('a roomless player gates every owner-present entry out (no undefined === undefined match)', () => {
    const fw = fixtureWorld({ playerRoom: null }); // neither player nor npc1 has a room
    const pipeline = new ProsePipeline(makeProvider({}), fw.world);
    pipeline.registerSlotEntry(entry());
    const probe = probeSlot(pipeline);

    pipeline.processTurn([]);

    expect(probe.texts()).toEqual([]);
  });

  it('AC-5: a predicate-gated entry contributes iff the predicate holds, and receives the raw world', () => {
    const fw = fixtureWorld();
    const pipeline = new ProsePipeline(makeProvider({}), fw.world);
    let gateOpen = false;
    const seenWorlds: unknown[] = [];
    pipeline.registerSlotEntry(
      entry({
        gate: {
          kind: 'predicate',
          holds: (world) => {
            seenWorlds.push(world);
            return gateOpen;
          },
        },
      }),
    );
    const probe = probeSlot(pipeline);

    pipeline.processTurn([]);
    expect(probe.texts()).toEqual([]);

    gateOpen = true;
    pipeline.processTurn([]);
    expect(probe.texts()).toEqual(['Npc is here.']);

    // The predicate is called against the pipeline's own world instance.
    expect(seenWorlds[0]).toBe(fw.world);
    // Nothing gate-shaped is serialized: the predicate lives only in the
    // in-memory registry; the persistent capability store is untouched.
    expect(fw.capabilities.textState).toEqual({});
  });

  it('AC-5: a throwing predicate is warned, contributes nothing, and other entries still stage', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fw = fixtureWorld({ occupantRooms: { npc2: 'r1' } });
    const pipeline = new ProsePipeline(makeProvider({}), fw.world);
    pipeline.registerSlotEntry(
      entry({
        order: 0,
        gate: {
          kind: 'predicate',
          holds: () => {
            throw new Error('story bug');
          },
        },
      }),
    );
    pipeline.registerSlotEntry(entry({ owner: 'npc2', order: 1, content: lit('Npc2 is here.') }));
    const probe = probeSlot(pipeline);

    expect(() => pipeline.processTurn([])).not.toThrow();
    expect(probe.texts()).toEqual(['Npc2 is here.']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('predicate gate'));
  });
});

describe('ProsePipeline slot entries (ADR-212) — registration and ordering', () => {
  it('AC-7: re-registering the same (slotKey, owner) replaces — one contribution, the latest', () => {
    const fw = fixtureWorld({ occupantRooms: { npc1: 'r1' } });
    const pipeline = new ProsePipeline(makeProvider({}), fw.world);
    pipeline.registerSlotEntry(entry({ content: lit('First registration.') }));
    pipeline.registerSlotEntry(entry({ content: lit('Second registration.') }));
    const probe = probeSlot(pipeline);

    pipeline.processTurn([]);

    expect(probe.texts()).toEqual(['Second registration.']);
  });

  it('distinct owners under one slot each contribute, ordered by `order`', () => {
    const fw = fixtureWorld({ occupantRooms: { npc1: 'r1', npc2: 'r1' } });
    const pipeline = new ProsePipeline(makeProvider({}), fw.world);
    // Registered out of order; the slot store sorts (order asc, insertion asc).
    pipeline.registerSlotEntry(entry({ owner: 'npc2', order: 1, content: lit('Second.') }));
    pipeline.registerSlotEntry(entry({ owner: 'npc1', order: 0, content: lit('First.') }));
    const probe = probeSlot(pipeline);

    pipeline.processTurn([]);

    expect(probe.texts()).toEqual(['First.', 'Second.']);
  });

  it('platform entries stage before story-registered contributors sharing the slot', () => {
    const fw = fixtureWorld({ occupantRooms: { npc1: 'r1' } });
    const pipeline = new ProsePipeline(makeProvider({}), fw.world);
    // The closure is registered BEFORE the entry — yet the entry must stage first.
    pipeline.registerSlotContributor((ctx) => {
      ctx.contribute('here', lit('Closure contribution.'));
    });
    pipeline.registerSlotEntry(entry({ content: lit('Entry contribution.') }));
    const probe = probeSlot(pipeline);

    pipeline.processTurn([]);

    expect(probe.texts()).toEqual(['Entry contribution.', 'Closure contribution.']);
  });

  it('does not stage entries on a world-less pipeline (no render factory)', () => {
    const pipeline = new ProsePipeline(makeProvider({})); // no world
    pipeline.registerSlotEntry(entry());

    // No-throw is the whole assertable surface here: without a world there is
    // no render-context factory, hence no staging store to probe at all.
    expect(() => pipeline.processTurn([])).not.toThrow();
  });

  it('warns on Choice content whose counter keys mismatch (owner, counterKey ?? slotKey)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fw = fixtureWorld();
    const pipeline = new ProsePipeline(makeProvider({}), fw.world);
    const misKeyed: Choice = {
      kind: 'choice',
      selector: 'cycling',
      entityId: 'someone-else',
      messageKey: 'wrong-key',
      alternatives: [lit('A.')],
    };
    pipeline.registerSlotEntry(entry({ content: misKeyed, counterKey: 'present' }));

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('counter-keyed'));
  });

  it('does not warn on Choice content keyed to the contract', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fw = fixtureWorld();
    const pipeline = new ProsePipeline(makeProvider({}), fw.world);
    const keyed: Choice = {
      kind: 'choice',
      selector: 'cycling',
      entityId: 'npc1',
      messageKey: 'present',
      alternatives: [lit('A.')],
    };
    pipeline.registerSlotEntry(entry({ content: keyed, counterKey: 'present' }));

    expect(warn).not.toHaveBeenCalled();
  });
});

describe('ProsePipeline slot entries (ADR-212) — AC-4 Choice counters', () => {
  /** The Choice fixture: cycling pair keyed (npc1, 'present') per the §4 contract. */
  const presenceChoice = (): Choice => ({
    kind: 'choice',
    selector: 'cycling',
    entityId: 'npc1',
    messageKey: 'present',
    alternatives: [lit(' Alpha stands here.'), lit(' Beta stands here.')],
  });

  /** Real provider with a `{slot:here}`-bearing template (the room-body shape). */
  function realProvider(): EnglishLanguageProvider {
    const provider = new EnglishLanguageProvider();
    provider.addMessage('test.slot_room', 'The hall.{slot:here}');
    return provider;
  }

  function renderTurn(pipeline: ProsePipeline): string {
    return blockText(
      pipeline.processTurn([makeEvent('if.event.custom', { messageId: 'test.slot_room' })]),
    );
  }

  it('advances the counter keyed (owner, counterKey) and persists it save-file-shaped', () => {
    const fw = fixtureWorld({ occupantRooms: { npc1: 'r1' } });
    const pipeline = new ProsePipeline(realProvider(), fw.world);
    pipeline.registerSlotEntry(entry({ content: presenceChoice(), counterKey: 'present' }));

    const text = renderTurn(pipeline);

    expect(text).toContain('Alpha stands here.');
    // Persisted into the textState capability under (owner, counterKey) —
    // the save-file keyspace, not any registry-side storage.
    expect(fw.capabilities.textState).toEqual({ npc1: { present: 1 } });
  });

  it('continues the cycle after a fresh pipeline re-registers against restored text state', () => {
    // Turn 1 in "process one": render once, then snapshot the capability the
    // way a save file would — plain JSON.
    const fw1 = fixtureWorld({ occupantRooms: { npc1: 'r1' } });
    const pipeline1 = new ProsePipeline(realProvider(), fw1.world);
    pipeline1.registerSlotEntry(entry({ content: presenceChoice(), counterKey: 'present' }));
    expect(renderTurn(pipeline1)).toContain('Alpha stands here.');
    const saved = JSON.parse(JSON.stringify(fw1.capabilities.textState)) as Record<string, unknown>;

    // "Process two": a FRESH pipeline over a world restored from that
    // snapshot, with the entry re-registered at load (the ADR-212 lifecycle
    // contract) — the cycle continues instead of restarting.
    const fw2 = fixtureWorld({ occupantRooms: { npc1: 'r1' }, textState: saved });
    const pipeline2 = new ProsePipeline(realProvider(), fw2.world);
    pipeline2.registerSlotEntry(entry({ content: presenceChoice(), counterKey: 'present' }));

    expect(renderTurn(pipeline2)).toContain('Beta stands here.');
    expect(fw2.capabilities.textState).toEqual({ npc1: { present: 2 } });
  });
});
