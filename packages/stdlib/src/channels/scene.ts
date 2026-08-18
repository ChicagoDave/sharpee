/**
 * The `scene` and `exchange-affordances` author channels (ADR-320 D12).
 *
 * The presentation-agnostic conversation wire, carried as channel data
 * under the ADR-163 discipline (data only, clients render):
 *
 *  - `scene` projects the turn's scene wire events — `character.scene.*`
 *    (the `SceneWireEvent` kinds plus dispatch diagnostics like
 *    `intrusion_blocked` / `exit_refused`) and `character.exchange.*` —
 *    into per-turn rows, the same projection idiom as the `character`
 *    channel.
 *  - `exchange-affordances` projects every live scene's open exchange
 *    advertised-response set (`ExchangeAffordances`) from the scene
 *    store — pure state projection, so a mid-exchange restore
 *    re-advertises correctly.
 *  - `thread-affordances` projects every live scene's active-thread
 *    continuability (`ThreadContinuability`, ADR-320 D14 — "Kemp has
 *    more to say") from the same store under the same pure-projection
 *    discipline, so a mid-beat restore re-advertises correctly.
 *
 * Isolation is the point (ADR-320 AC11, the ADR-310 D12/AC8 discipline):
 * both channels are gated by the `authorChannels` capability, so a
 * published player-facing story stream provably cannot carry scene
 * internals — the player sees rendered prose alone. A chat-style client
 * that renders the stream itself is a future, deliberate ungating
 * decision, not this channel's.
 *
 * Public interface: sceneChannel, SceneChannelRow,
 * exchangeAffordancesChannel, threadAffordancesChannel.
 * Owner context: stdlib / channels
 */

import type { IOChannel } from '@sharpee/if-domain';
import type {
  ConversationSceneState,
  ExchangeAffordances,
  SceneStoreState,
  ThreadContinuability,
} from '@sharpee/world-model';
import { CHARACTER_SCENES_KEY } from '@sharpee/world-model';
import { asWorld } from './world-helpers.js';

/** One scene-wire row: one `character.scene.*`/`character.exchange.*` event. */
export interface SceneChannelRow {
  /** Turn the event fired on. */
  turn: number;
  /** The event type, e.g. 'character.scene.utterance'. */
  kind: string;
  /** The event's payload, verbatim — a `SceneWireEvent` for wire kinds. */
  data: Record<string, unknown>;
}

/** Event-type prefixes the `scene` channel projects. */
const SCENE_PREFIXES = ['character.scene.', 'character.exchange.'];

/**
 * `scene` — append-mode scene wire stream (ADR-320 D12). Carries, per
 * turn: scene opens/closes, utterances with manner beats, floor changes,
 * interruptions, rendered silences (dispatch and NPC↔NPC alike), and
 * exchange lifecycle diagnostics. Sparse: turns with no scene activity
 * emit nothing.
 */
export const sceneChannel: IOChannel<SceneChannelRow> = {
  id: 'scene',
  contentType: 'json',
  mode: 'append',
  emit: 'sparse',
  // ADR-320 AC11: scene internals never reach a player surface — the
  // channel layer gates them, so a published story's stream provably
  // cannot carry them.
  gatedBy: 'authorChannels',
  produce: (ctx) => {
    const rows: SceneChannelRow[] = [];
    for (const event of ctx.events) {
      if (!SCENE_PREFIXES.some(p => event.type.startsWith(p))) continue;
      rows.push({
        turn: ctx.turn,
        kind: event.type,
        data: (event.data ?? {}) as Record<string, unknown>,
      });
    }
    return rows.length > 0 ? rows : undefined;
  },
};

/**
 * `exchange-affordances` — replace-mode advertised-response sets (ADR-320
 * D12): one `ExchangeAffordances` per live scene with an open exchange,
 * in scene-store order; the empty array when no exchange is open. Emits
 * every turn so a consumer never renders a closed exchange's stale
 * choices. Reads the scene store (world state) rather than events — the
 * affordances are state of the open exchange, snapshotted onto
 * `ExchangeState.responses` at open time, so the projection survives
 * save/restore.
 */
export const exchangeAffordancesChannel: IOChannel<ExchangeAffordances[]> = {
  id: 'exchange-affordances',
  contentType: 'json',
  mode: 'replace',
  emit: 'always',
  // Same AC11 gate as `scene` — advertised responses are scene internals
  // until a client deliberately opts in to rendering them.
  gatedBy: 'authorChannels',
  produce: (ctx) => {
    const world = asWorld(ctx);
    if (!world || typeof world.getStateValue !== 'function') return undefined;
    const store = world.getStateValue(CHARACTER_SCENES_KEY) as SceneStoreState | undefined;
    const scenes: ConversationSceneState[] = store ? Object.values(store.scenes) : [];
    const advertised: ExchangeAffordances[] = [];
    for (const scene of scenes) {
      const exchange = scene.openExchange;
      if (!exchange) continue;
      advertised.push({
        sceneId: scene.id,
        exchangeId: exchange.exchangeId,
        responses: exchange.responses,
      });
    }
    return advertised;
  },
};

/**
 * `thread-affordances` — replace-mode active-thread continuability
 * (ADR-320 D14, additive to the D12 affordance surface): one
 * `ThreadContinuability` per live scene with an active thread, in
 * scene-store order; the empty array when none. Emits every turn so a
 * consumer never renders a parked or concluded thread's stale "more to
 * say". Reads the scene store — the snapshot is stamped at
 * open/beat/resume and cleared at park/conclude
 * (`stampThreadContinuability`), so the projection survives
 * save/restore exactly as `exchange-affordances` does.
 */
export const threadAffordancesChannel: IOChannel<ThreadContinuability[]> = {
  id: 'thread-affordances',
  contentType: 'json',
  mode: 'replace',
  emit: 'always',
  // Same AC11 gate as `scene` — thread state is a scene internal until a
  // client deliberately opts in to rendering it (a "continue" chip).
  gatedBy: 'authorChannels',
  produce: (ctx) => {
    const world = asWorld(ctx);
    if (!world || typeof world.getStateValue !== 'function') return undefined;
    const store = world.getStateValue(CHARACTER_SCENES_KEY) as SceneStoreState | undefined;
    const scenes: ConversationSceneState[] = store ? Object.values(store.scenes) : [];
    const advertised: ThreadContinuability[] = [];
    for (const scene of scenes) {
      if (scene.threadContinuability) advertised.push(scene.threadContinuability);
    }
    return advertised;
  },
};
