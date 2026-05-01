/**
 * Reference renderer for channel-service Phase 2 tests.
 *
 * Owner context: test infrastructure for `@sharpee/channel-service`.
 * Implements the canonical client-side state model from ADR-163 §5,
 * §10, §14:
 *   - replace-mode channels store the latest value
 *   - append-mode channels accumulate entries across turns; `clear`
 *     events truncate them
 *   - event-mode channels record fires in arrival order so tests can
 *     assert on signal sequences
 *
 * Used by AC-3 (round-trip), AC-8 (clear truncation), and AC-12
 * (persist-and-repaint identity). Not part of the package's public API.
 */

import type { ChannelDefinition, CmgtPacket, TurnPacket } from '../../src/wire';

export interface RendererState {
  /** Channel definitions from the CMGT packet. */
  channels: Map<string, ChannelDefinition>;
  /** Latest value per replace-mode channel. */
  replace: Map<string, unknown>;
  /** Accumulated entries per append-mode channel. */
  append: Map<string, unknown[]>;
  /** Last fired value per event-mode channel (most recent only). */
  events: Map<string, unknown>;
  /** Most recent applied turn id, for ordering assertions. */
  lastTurnId: string | null;
}

/**
 * Construct a fresh renderer. Pre-CMGT — applying a turn packet before
 * `applyCmgt` is a programming error; the renderer cannot route values
 * to channel buckets without knowing channel modes.
 */
export function createRenderer(): RendererState {
  return {
    channels: new Map(),
    replace: new Map(),
    append: new Map(),
    events: new Map(),
    lastTurnId: null,
  };
}

/**
 * Install the CMGT manifest. Establishes the channel directory used
 * to bucket subsequent turn-packet values by mode. Replaces any prior
 * manifest; the renderer's accumulated replace/append/event state is
 * preserved (per ADR-163 §14 the manifest is re-derivable but state
 * survives restore).
 */
export function applyCmgt(state: RendererState, packet: CmgtPacket): void {
  state.channels.clear();
  for (const def of packet.channels) {
    state.channels.set(def.id, def);
  }
}

/**
 * Apply a turn packet's channel-keyed payload to the renderer state.
 *
 * Per-channel handling:
 *  - `replace` — latest value supersedes prior. `null` is a valid
 *    replacement (signaling hide/stop per §7).
 *  - `append` — entries are arrays of new entries this turn (§5);
 *    the renderer concatenates onto the running list.
 *  - `event` — last fire wins within a turn; renderer records it.
 *
 * The `clear` channel is special-cased: when present, its payload's
 * `target` truncates an append-mode channel (§10). `target: 'all'`
 * truncates every append-mode channel.
 */
export function applyTurnPacket(state: RendererState, packet: TurnPacket): void {
  state.lastTurnId = packet.turn_id;

  // Step 1: route every channel-keyed value to its bucket. Skip `clear`
  // here — we handle it in step 2 because its semantics affect other
  // channels' state, not its own.
  for (const [channelId, value] of Object.entries(packet.payload)) {
    if (channelId === 'clear') continue;
    const def = state.channels.get(channelId);
    if (!def) continue; // unknown channel — drop
    switch (def.mode) {
      case 'replace':
        state.replace.set(channelId, value);
        break;
      case 'append': {
        // Append-mode payload value is the array of new entries this turn (§5).
        const existing = state.append.get(channelId) ?? [];
        const newEntries = Array.isArray(value) ? value : [value];
        state.append.set(channelId, [...existing, ...newEntries]);
        break;
      }
      case 'event':
        state.events.set(channelId, value);
        break;
    }
  }

  // Step 2: handle clear events (§10). Process AFTER step 1 so a turn
  // that emits to main and clears in the same packet drops both — the
  // truncation includes the just-added entries, matching renderer
  // behavior on a real session.
  const clearPayload = packet.payload['clear'] as { target?: string } | undefined;
  if (clearPayload && typeof clearPayload === 'object') {
    const target = clearPayload.target;
    if (target === 'all') {
      for (const channelId of state.append.keys()) {
        state.append.set(channelId, []);
      }
    } else if (typeof target === 'string') {
      if (state.append.has(target)) {
        state.append.set(target, []);
      }
    }
    // Record the clear itself as an event-mode signal.
    state.events.set('clear', clearPayload);
  }
}

/**
 * Snapshot the renderer state into a plain object suitable for deep
 * equality assertions. Maps become objects; arrays are copied to
 * decouple from internal mutation. Used by AC-12's identity proof.
 */
export function snapshotRenderer(state: RendererState): {
  channels: string[];
  replace: Record<string, unknown>;
  append: Record<string, unknown[]>;
  events: Record<string, unknown>;
  lastTurnId: string | null;
} {
  return {
    channels: Array.from(state.channels.keys()).sort(),
    replace: Object.fromEntries(state.replace),
    append: Object.fromEntries(
      Array.from(state.append.entries()).map(([k, v]) => [k, [...v]]),
    ),
    events: Object.fromEntries(state.events),
    lastTurnId: state.lastTurnId,
  };
}
