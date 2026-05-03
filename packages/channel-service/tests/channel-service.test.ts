/**
 * Tests for the `ChannelService` class (ADR-163 §6, §11, §13, §14 —
 * closure-per-channel model, R1 rewrite).
 *
 * Covers manifest production, capability gating, and per-turn build
 * semantics for each channel mode (`replace`, `append`, `event`) under
 * each emit policy (`always`, `sparse`).
 *
 * No registry instance from stdlib is used here — tests construct a
 * minimal in-memory `IChannelRegistry` to exercise the service in
 * isolation. Real-path tests against a populated registry land in R3
 * (engine integration).
 */

import { describe, expect, it, beforeEach } from 'vitest';
import type {
  IOChannel,
  IChannelRegistry,
  ClientCapabilities,
  ChannelProduceContext,
} from '@sharpee/if-domain';
import { ChannelService, PROTOCOL_VERSION, type BuildInput } from '../src';
import { FULL_CAPABILITIES, TEXT_ONLY_CAPABILITIES } from './test-helpers/capabilities';

class InMemoryRegistry implements IChannelRegistry {
  private readonly channels = new Map<string, IOChannel>();
  add(channel: IOChannel): void {
    this.channels.set(channel.id, channel);
  }
  get(id: string): IOChannel | undefined {
    return this.channels.get(id);
  }
  all(): readonly IOChannel[] {
    return [...this.channels.values()];
  }
}

function makeBuildInput(turn: number): BuildInput {
  return {
    world: {} as unknown,
    events: [],
    blocks: [],
    turn,
  };
}

// ────────────────────────────────────────────────────────────────────
//  Manifest
// ────────────────────────────────────────────────────────────────────

describe('ChannelService.buildManifest', () => {
  let registry: InMemoryRegistry;
  beforeEach(() => {
    registry = new InMemoryRegistry();
  });

  it('returns a CmgtPacket carrying the protocol version', () => {
    const svc = new ChannelService(registry, FULL_CAPABILITIES);
    const cmgt = svc.buildManifest();
    expect(cmgt.kind).toBe('cmgt');
    expect(cmgt.protocol_version).toBe(PROTOCOL_VERSION);
    expect(cmgt.protocol_version).toBe(1);
  });

  it('lists every registered, non-gated channel', () => {
    registry.add(makeChannel({ id: 'a', mode: 'replace' }));
    registry.add(makeChannel({ id: 'b', mode: 'append' }));
    registry.add(makeChannel({ id: 'c', mode: 'event' }));
    const svc = new ChannelService(registry, FULL_CAPABILITIES);
    const cmgt = svc.buildManifest();
    const ids = cmgt.channels.map((c) => c.id).sort();
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('preserves channel descriptor fields (id, contentType, mode, emit)', () => {
    registry.add(makeChannel({
      id: 'score',
      contentType: 'number',
      mode: 'replace',
      emit: 'always',
    }));
    const svc = new ChannelService(registry, FULL_CAPABILITIES);
    const cmgt = svc.buildManifest();
    expect(cmgt.channels[0]).toEqual({
      id: 'score',
      contentType: 'number',
      mode: 'replace',
      emit: 'always',
    });
  });

  it('includes a gated channel when its capability is declared true', () => {
    registry.add(makeChannel({ id: 'image:portrait', gatedBy: 'images' }));
    const svc = new ChannelService(registry, FULL_CAPABILITIES);
    const cmgt = svc.buildManifest();
    expect(cmgt.channels.map((c) => c.id)).toContain('image:portrait');
  });

  it('filters out a gated channel when its capability is false', () => {
    registry.add(makeChannel({ id: 'image:portrait', gatedBy: 'images' }));
    registry.add(makeChannel({ id: 'main' }));
    const svc = new ChannelService(registry, TEXT_ONLY_CAPABILITIES);
    const cmgt = svc.buildManifest();
    const ids = cmgt.channels.map((c) => c.id);
    expect(ids).toContain('main');
    expect(ids).not.toContain('image:portrait');
  });
});

// ────────────────────────────────────────────────────────────────────
//  build — replace mode
// ────────────────────────────────────────────────────────────────────

describe('ChannelService.build — replace mode, sparse emit', () => {
  it('emits the value on first turn', () => {
    const reg = new InMemoryRegistry();
    reg.add(makeChannel({
      id: 'score',
      mode: 'replace',
      emit: 'sparse',
      produce: () => 42,
    }));
    const svc = new ChannelService(reg, FULL_CAPABILITIES);
    const t1 = svc.build(makeBuildInput(1));
    expect(t1.payload).toEqual({ score: 42 });
    expect(t1.turn_id).toBe('turn-1');
  });

  it('skips emission on the second turn when value is unchanged', () => {
    const reg = new InMemoryRegistry();
    reg.add(makeChannel({
      id: 'score',
      mode: 'replace',
      emit: 'sparse',
      produce: () => 42,
    }));
    const svc = new ChannelService(reg, FULL_CAPABILITIES);
    svc.build(makeBuildInput(1));
    const t2 = svc.build(makeBuildInput(2));
    expect(t2.payload).toEqual({});
  });

  it('emits again when the value changes', () => {
    const reg = new InMemoryRegistry();
    let value = 42;
    reg.add(makeChannel({
      id: 'score',
      mode: 'replace',
      emit: 'sparse',
      produce: () => value,
    }));
    const svc = new ChannelService(reg, FULL_CAPABILITIES);
    svc.build(makeBuildInput(1));
    value = 50;
    const t2 = svc.build(makeBuildInput(2));
    expect(t2.payload).toEqual({ score: 50 });
  });

  it('skips when closure returns undefined (no current value)', () => {
    const reg = new InMemoryRegistry();
    reg.add(makeChannel({
      id: 'transient',
      mode: 'replace',
      emit: 'sparse',
      produce: () => undefined,
    }));
    const svc = new ChannelService(reg, FULL_CAPABILITIES);
    const t1 = svc.build(makeBuildInput(1));
    expect(t1.payload).toEqual({});
  });

  it('emits null (hide signal) and caches null as new prev', () => {
    const reg = new InMemoryRegistry();
    let value: string | null = 'visible';
    reg.add(makeChannel({
      id: 'image:portrait',
      contentType: 'json',
      mode: 'replace',
      emit: 'sparse',
      produce: () => value,
    }));
    const svc = new ChannelService(reg, FULL_CAPABILITIES);
    svc.build(makeBuildInput(1));
    value = null;
    const t2 = svc.build(makeBuildInput(2));
    expect(t2.payload).toEqual({ 'image:portrait': null });
    // Caching null as prev: re-running with null again should NOT re-emit.
    const t3 = svc.build(makeBuildInput(3));
    expect(t3.payload).toEqual({});
  });
});

describe('ChannelService.build — replace mode, always emit', () => {
  it('emits the value every turn even when unchanged', () => {
    const reg = new InMemoryRegistry();
    reg.add(makeChannel({
      id: 'score',
      mode: 'replace',
      emit: 'always',
      produce: () => 42,
    }));
    const svc = new ChannelService(reg, FULL_CAPABILITIES);
    const t1 = svc.build(makeBuildInput(1));
    const t2 = svc.build(makeBuildInput(2));
    expect(t1.payload).toEqual({ score: 42 });
    expect(t2.payload).toEqual({ score: 42 });
  });

  it('re-emits prevValue when closure returns undefined on idle turn', () => {
    const reg = new InMemoryRegistry();
    let value: number | undefined = 42;
    reg.add(makeChannel({
      id: 'score',
      mode: 'replace',
      emit: 'always',
      produce: () => value,
    }));
    const svc = new ChannelService(reg, FULL_CAPABILITIES);
    svc.build(makeBuildInput(1));
    value = undefined; // closure now skips
    const t2 = svc.build(makeBuildInput(2));
    expect(t2.payload).toEqual({ score: 42 });
  });
});

// ────────────────────────────────────────────────────────────────────
//  build — append mode
// ────────────────────────────────────────────────────────────────────

describe('ChannelService.build — append mode', () => {
  it('emits an array of new entries (sparse)', () => {
    const reg = new InMemoryRegistry();
    reg.add(makeChannel({
      id: 'main',
      mode: 'append',
      emit: 'sparse',
      produce: () => ['line one', 'line two'],
    }));
    const svc = new ChannelService(reg, FULL_CAPABILITIES);
    const t1 = svc.build(makeBuildInput(1));
    expect(t1.payload).toEqual({ main: ['line one', 'line two'] });
  });

  it('skips an empty entry array when sparse', () => {
    const reg = new InMemoryRegistry();
    reg.add(makeChannel({
      id: 'main',
      mode: 'append',
      emit: 'sparse',
      produce: () => [],
    }));
    const svc = new ChannelService(reg, FULL_CAPABILITIES);
    const t1 = svc.build(makeBuildInput(1));
    expect(t1.payload).toEqual({});
  });

  it('emits an empty entry array when always', () => {
    const reg = new InMemoryRegistry();
    reg.add(makeChannel({
      id: 'main',
      mode: 'append',
      emit: 'always',
      produce: () => [],
    }));
    const svc = new ChannelService(reg, FULL_CAPABILITIES);
    const t1 = svc.build(makeBuildInput(1));
    expect(t1.payload).toEqual({ main: [] });
  });

  it('wraps a scalar return into a single-element array', () => {
    const reg = new InMemoryRegistry();
    reg.add(makeChannel({
      id: 'main',
      mode: 'append',
      emit: 'sparse',
      produce: () => 'one line',
    }));
    const svc = new ChannelService(reg, FULL_CAPABILITIES);
    const t1 = svc.build(makeBuildInput(1));
    expect(t1.payload).toEqual({ main: ['one line'] });
  });

  it('skips when closure returns undefined (no new entries)', () => {
    const reg = new InMemoryRegistry();
    reg.add(makeChannel({
      id: 'main',
      mode: 'append',
      emit: 'sparse',
      produce: () => undefined,
    }));
    const svc = new ChannelService(reg, FULL_CAPABILITIES);
    const t1 = svc.build(makeBuildInput(1));
    expect(t1.payload).toEqual({});
  });
});

// ────────────────────────────────────────────────────────────────────
//  build — event mode
// ────────────────────────────────────────────────────────────────────

describe('ChannelService.build — event mode', () => {
  it('emits when closure returns a value', () => {
    const reg = new InMemoryRegistry();
    reg.add(makeChannel({
      id: 'death',
      contentType: 'json',
      mode: 'event',
      emit: 'sparse',
      produce: () => ({ cause: 'troll' }),
    }));
    const svc = new ChannelService(reg, FULL_CAPABILITIES);
    const t1 = svc.build(makeBuildInput(1));
    expect(t1.payload).toEqual({ death: { cause: 'troll' } });
  });

  it('skips when closure returns undefined', () => {
    const reg = new InMemoryRegistry();
    reg.add(makeChannel({
      id: 'death',
      mode: 'event',
      produce: () => undefined,
    }));
    const svc = new ChannelService(reg, FULL_CAPABILITIES);
    const t1 = svc.build(makeBuildInput(1));
    expect(t1.payload).toEqual({});
  });

  it('skips when closure returns null', () => {
    const reg = new InMemoryRegistry();
    reg.add(makeChannel({
      id: 'death',
      mode: 'event',
      produce: () => null,
    }));
    const svc = new ChannelService(reg, FULL_CAPABILITIES);
    const t1 = svc.build(makeBuildInput(1));
    expect(t1.payload).toEqual({});
  });
});

// ────────────────────────────────────────────────────────────────────
//  build — capability gating
// ────────────────────────────────────────────────────────────────────

describe('ChannelService.build — gated channels', () => {
  it('does not appear in the payload when its capability is false', () => {
    const reg = new InMemoryRegistry();
    reg.add(makeChannel({
      id: 'image:portrait',
      contentType: 'json',
      mode: 'replace',
      emit: 'always',
      gatedBy: 'images',
      produce: () => ({ src: 'pic.png' }),
    }));
    reg.add(makeChannel({
      id: 'main',
      mode: 'append',
      emit: 'always',
      produce: () => ['narrative'],
    }));
    const svc = new ChannelService(reg, TEXT_ONLY_CAPABILITIES);
    const t1 = svc.build(makeBuildInput(1));
    expect(Object.keys(t1.payload)).toContain('main');
    expect(Object.keys(t1.payload)).not.toContain('image:portrait');
  });

  it('appears in the payload when its capability is true', () => {
    const reg = new InMemoryRegistry();
    reg.add(makeChannel({
      id: 'image:portrait',
      contentType: 'json',
      mode: 'replace',
      emit: 'sparse',
      gatedBy: 'images',
      produce: () => ({ src: 'pic.png' }),
    }));
    const svc = new ChannelService(reg, FULL_CAPABILITIES);
    const t1 = svc.build(makeBuildInput(1));
    expect(t1.payload).toEqual({ 'image:portrait': { src: 'pic.png' } });
  });

  it('never calls produce on a gated-out channel', () => {
    let called = false;
    const reg = new InMemoryRegistry();
    reg.add(makeChannel({
      id: 'image:portrait',
      gatedBy: 'images',
      produce: () => {
        called = true;
        return { src: 'pic.png' };
      },
    }));
    const svc = new ChannelService(reg, TEXT_ONLY_CAPABILITIES);
    svc.build(makeBuildInput(1));
    expect(called).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────
//  build — context plumbing
// ────────────────────────────────────────────────────────────────────

describe('ChannelService.build — produce context', () => {
  it('passes world, events, blocks, turn, prevValue to the closure', () => {
    let received: ChannelProduceContext | undefined;
    const reg = new InMemoryRegistry();
    reg.add(makeChannel({
      id: 'inspect',
      mode: 'replace',
      emit: 'always',
      produce: (ctx) => {
        received = ctx;
        return 'ok';
      },
    }));
    const svc = new ChannelService(reg, FULL_CAPABILITIES);
    const world = { kind: 'world' };
    const events = [{ id: 'e1', type: 'test', timestamp: 0, entities: {}, data: {} }] as never;
    const blocks = [] as never;
    svc.build({ world, events, blocks, turn: 5 });
    expect(received).toBeDefined();
    expect(received!.world).toBe(world);
    expect(received!.events).toBe(events);
    expect(received!.blocks).toBe(blocks);
    expect(received!.turn).toBe(5);
    expect(received!.prevValue).toBeUndefined();
  });

  it('feeds prevValue from the previous emission into the next call', () => {
    const observed: unknown[] = [];
    let counter = 0;
    const reg = new InMemoryRegistry();
    reg.add(makeChannel({
      id: 'counter',
      contentType: 'number',
      mode: 'replace',
      emit: 'always',
      produce: (ctx) => {
        observed.push(ctx.prevValue);
        counter += 1;
        return counter;
      },
    }));
    const svc = new ChannelService(reg, FULL_CAPABILITIES);
    svc.build(makeBuildInput(1));
    svc.build(makeBuildInput(2));
    svc.build(makeBuildInput(3));
    expect(observed).toEqual([undefined, 1, 2]);
  });

  it('uses ctx.turn to derive turn_id', () => {
    const reg = new InMemoryRegistry();
    const svc = new ChannelService(reg, FULL_CAPABILITIES);
    expect(svc.build(makeBuildInput(7)).turn_id).toBe('turn-7');
    expect(svc.build(makeBuildInput(99)).turn_id).toBe('turn-99');
  });
});

// ────────────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────────────

interface ChannelOpts {
  id: string;
  contentType?: 'text' | 'number' | 'json';
  mode?: 'replace' | 'append' | 'event';
  emit?: 'always' | 'sparse';
  gatedBy?: import('@sharpee/if-domain').CapabilityFlag;
  produce?: (ctx: ChannelProduceContext) => unknown;
}

function makeChannel(opts: ChannelOpts): IOChannel {
  return {
    id: opts.id,
    contentType: opts.contentType ?? 'text',
    mode: opts.mode ?? 'replace',
    emit: opts.emit ?? 'sparse',
    gatedBy: opts.gatedBy,
    produce: opts.produce ?? (() => undefined),
  };
}
