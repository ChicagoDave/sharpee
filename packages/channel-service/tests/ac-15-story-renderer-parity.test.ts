/**
 * AC-15 — Story-renderer parity (ADR-163, ADR-165 §3, AC-12 mirror).
 *
 * Validates that the `channel-service-test` story's `debug-stats`
 * channel + renderer behave identically across CLI and browser
 * surfaces:
 *
 *  1. **Wire equivalence** — the channel's `produce(ctx)` closure
 *     returns the same payload regardless of host. Driven through
 *     `ChannelService` directly so the assertion is at the wire
 *     boundary, before any renderer.
 *  2. **Renderer parity** — the story-supplied renderer projects the
 *     payload identically whether the sink is a CLI line buffer
 *     (`(line) => buffer.push(line)`) or a DOM slot (the
 *     `createDebugStatsDomRenderer` factory mounting `<p>` elements).
 *  3. **Sparse-emit suppression** — repeating an action that doesn't
 *     change the world produces NO new wire emission, NO renderer
 *     invocation, and NO new DOM mutation.
 *
 * Real-path bundle validation is delegated to the walkthrough test
 * (`AC-13`-style) at
 * `stories/channel-service-test/walkthroughs/wt-stat.transcript`.
 * This test is the AC-15-specific gate.
 */

import { describe, it, expect } from 'vitest';
import { Window } from 'happy-dom';
import { ChannelService } from '../src';
import {
  debugStatsChannel,
  formatDebugStats,
  createDebugStatsRenderer,
  createDebugStatsDomRenderer,
  type DebugStatsPayload,
} from '@sharpee/story-channel-service-test';
import type { ClientCapabilities, IChannelRegistry, IOChannel } from '@sharpee/if-domain';

// ────────────────────────────────────────────────────────────────────
//  Test helpers
// ────────────────────────────────────────────────────────────────────

const FULL_CAPS: ClientCapabilities = {
  text: true,
  images: true,
  animations: true,
  video: true,
  sound: true,
  music: true,
  speech: true,
  splitPane: true,
  statusBar: true,
  sidebar: true,
  clickableText: true,
  clickableImage: true,
  dragDrop: true,
  transitions: true,
  layers: true,
  customFonts: true,
};

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

/**
 * Drive a fake world through a turn sequence and capture the
 * `debug-stats` channel's wire payloads.
 *
 * `inventoryByTurn[i]` is the inventory size for turn `i+1`. Each
 * entry simulates one engine turn: the channel-service runs the
 * channel's `produce` closure against a world stub whose `getContents`
 * returns the indicated number of items.
 */
function captureDebugStatsPayloads(
  inventoryByTurn: readonly number[],
): Array<DebugStatsPayload | undefined> {
  const registry = new InMemoryRegistry();
  registry.add(debugStatsChannel);
  const svc = new ChannelService(registry, FULL_CAPS);

  const captured: Array<DebugStatsPayload | undefined> = [];
  for (let i = 0; i < inventoryByTurn.length; i += 1) {
    const inv = inventoryByTurn[i];
    const world = makeWorldStub(inv);
    const packet = svc.build({ world, events: [], blocks: [], turn: i + 1 });
    const payload = packet.payload['debug-stats'] as DebugStatsPayload | undefined;
    captured.push(payload);
  }
  return captured;
}

function makeWorldStub(inventoryCount: number) {
  const playerId = 'player';
  const items = Array.from({ length: inventoryCount }, (_, i) => ({ id: `item-${i}` }));
  return {
    getPlayer: () => ({ id: playerId }),
    getContents: (id: string) => (id === playerId ? items : []),
    getCapability: () => undefined,
  };
}

// ────────────────────────────────────────────────────────────────────
//  AC-15 — wire equivalence
// ────────────────────────────────────────────────────────────────────

describe('AC-15 — wire equivalence (debug-stats payloads)', () => {
  it('emits inventoryCount on the first turn', () => {
    const payloads = captureDebugStatsPayloads([0]);
    expect(payloads).toEqual([{ inventoryCount: 0 }]);
  });

  it('suppresses emission on a repeat turn with unchanged inventory', () => {
    // Turn 1: inv 0 → emits. Turn 2: inv 0 unchanged → SUPPRESSED.
    const payloads = captureDebugStatsPayloads([0, 0]);
    expect(payloads[0]).toEqual({ inventoryCount: 0 });
    expect(payloads[1]).toBeUndefined();
  });

  it('re-emits when inventory grows', () => {
    const payloads = captureDebugStatsPayloads([0, 0, 1]);
    expect(payloads[0]).toEqual({ inventoryCount: 0 });
    expect(payloads[1]).toBeUndefined();
    expect(payloads[2]).toEqual({ inventoryCount: 1 });
  });

  it('re-emits when inventory shrinks', () => {
    const payloads = captureDebugStatsPayloads([0, 1, 1, 0]);
    expect(payloads[0]).toEqual({ inventoryCount: 0 });
    expect(payloads[1]).toEqual({ inventoryCount: 1 });
    expect(payloads[2]).toBeUndefined();
    expect(payloads[3]).toEqual({ inventoryCount: 0 });
  });
});

// ────────────────────────────────────────────────────────────────────
//  AC-15 — renderer parity
// ────────────────────────────────────────────────────────────────────

describe('AC-15 — renderer parity (CLI sink vs DOM sink)', () => {
  it('formatDebugStats projects the payload to a one-line string', () => {
    expect(formatDebugStats({ inventoryCount: 0 })).toBe('[debug-stats inv=0]');
    expect(formatDebugStats({ inventoryCount: 3 })).toBe('[debug-stats inv=3]');
  });

  it('returns empty string for malformed payloads', () => {
    expect(formatDebugStats(null)).toBe('');
    expect(formatDebugStats(undefined)).toBe('');
    expect(formatDebugStats({ inventoryCount: 'three' } as never)).toBe('');
    expect(formatDebugStats({})).toBe('');
  });

  it('CLI and DOM sinks receive identical projected lines', () => {
    const payloads = captureDebugStatsPayloads([0, 0, 1, 1, 0]);
    const meaningful = payloads.filter((p): p is DebugStatsPayload => p !== undefined);
    // Sparse-suppression — turns 2 and 4 dropped; expect 3 emissions.
    expect(meaningful.length).toBe(3);

    // CLI sink — push lines into a string array.
    const cliLines: string[] = [];
    const cliRenderer = createDebugStatsRenderer((line) => cliLines.push(line));

    // DOM sink — happy-dom slot, append a <p> per emission.
    const window = new Window();
    const document = window.document;
    const slot = document.createElement('div');
    document.body.appendChild(slot);
    const domRenderer = createDebugStatsDomRenderer(slot as unknown as HTMLElement);

    // Drive both with the same payload sequence.
    const channelDef = {
      id: 'debug-stats',
      contentType: 'json' as const,
      mode: 'replace' as const,
      emit: 'sparse' as const,
    };
    for (const payload of meaningful) {
      cliRenderer.onValue(payload, channelDef);
      domRenderer.onValue(payload, channelDef);
    }

    // CLI captured the projected lines.
    expect(cliLines).toEqual([
      '[debug-stats inv=0]',
      '[debug-stats inv=1]',
      '[debug-stats inv=0]',
    ]);

    // DOM captured the same lines as <p> textContents.
    const domLines = Array.from(slot.querySelectorAll('p.debug-stats-line')).map(
      (p) => (p as unknown as { textContent: string }).textContent,
    );
    expect(domLines).toEqual(cliLines);
  });

  it('renderers do not fire on suppressed turns (verified via Renderer integration)', async () => {
    const { Renderer } = await import('../src');
    const r = new Renderer({ fallbackWarn: () => undefined });
    const cliLines: string[] = [];
    r.registerRenderer(
      'debug-stats',
      createDebugStatsRenderer((line) => cliLines.push(line)),
    );
    r.applyCmgt({
      kind: 'cmgt',
      protocol_version: 1,
      channels: [
        { id: 'debug-stats', contentType: 'json', mode: 'replace', emit: 'sparse' },
      ],
    });

    // Walk the same turn sequence — but feed the renderer the SUPPRESSED
    // packets too (i.e., empty payload). The renderer must not fire
    // `onValue` for suppressed turns.
    const payloads = captureDebugStatsPayloads([0, 0, 1, 1, 0]);
    for (let i = 0; i < payloads.length; i += 1) {
      const payload = payloads[i];
      // ChannelService omits the channel from `payload` when sparse and
      // unchanged — so the turn packet's `payload` simply lacks the key.
      const turnPayload: Record<string, unknown> = {};
      if (payload !== undefined) turnPayload['debug-stats'] = payload;
      r.applyTurnPacket({
        kind: 'turn',
        turn_id: `turn-${i + 1}`,
        payload: turnPayload,
      });
    }

    expect(cliLines).toEqual([
      '[debug-stats inv=0]',
      '[debug-stats inv=1]',
      '[debug-stats inv=0]',
    ]);
  });
});
