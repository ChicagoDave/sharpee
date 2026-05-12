/**
 * @module zifmia/web/managers/room-manager
 * @purpose Orchestrates the room-view lifecycle: builds the page
 *   layout (`RoomView`), constructs a channel-service `Renderer`
 *   wired with platform-browser channel renderers, fetches the room
 *   state, applies the CMGT manifest, replays the transcript, mounts
 *   the `CommandInputManager`, and opens a `WsClient` to receive
 *   other participants' turns.
 * @owner Zifmia web client.
 *
 * Phase 6c-client scope: turn rendering for one user (self + observer
 * via WS). Presence and chat panels are inert containers populated
 * in Phase 6d. Lock-on-typing and reconnect ship in Phase 6e.
 */

import { Renderer } from '@sharpee/channel-service';
import {
  registerDefaultBrowserRenderers,
  type BrowserDefaultLayout
} from '@sharpee/platform-browser';

import { getRoomState } from '../api/rooms';
import type { HttpClientOptions } from '../api/http';
import type {
  ChannelCmgtPacket,
  ChannelTurnPacket,
  RoomStateBody,
  TurnPacketResponse
} from '../api/types';
import { ChatManager } from './chat-manager';
import { CommandInputManager } from './command-input-manager';
import { LockManager } from './lock-manager';
import { PresenceManager } from './presence-manager';
import { SavesManager } from './saves-manager';
import { RoomView, type RoomViewSlots } from '../views/room';
import {
  WsClient,
  type ReconnectOptions,
  type RoomRestoredFrame,
  type TurnBroadcastFrame
} from '../ws-client';

export interface RoomManagerOptions {
  /** Mount target — RoomManager builds the `RoomView` inside. */
  root: HTMLElement;
  /** Active room id. */
  roomId: string;
  /** Caller's identity id — passed to PresenceManager and ChatManager
   * so they can apply ADR-176 `--self` modifiers. */
  selfIdentityId: string;
  /** Caller's handle — carried in-band on every HTTP request and
   * sent as the WS `hello` frame's `handle` field per ADR-161 amended
   * 2026-05-12. */
  handle: string;
  /** HTTP base URL. Defaults to page origin. */
  baseUrl?: string;
  /**
   * Override the WebSocket URL. Production derives `ws://host/ws` or
   * `wss://host/ws` from `location`; tests inject a full URL pointing
   * at a fixture server.
   */
  wsUrl?: string;
  /** Optional `fetch` override forwarded to API calls. */
  fetchImpl?: typeof fetch;
  /** Fired when the room can't be loaded (404 / 403). */
  onError?: (error: string) => void;
  /**
   * Reconnect override. Defaults to the Phase 6e schedule
   * `[500, 1000, 2000, 4000, 8000]` with `maxAttempts: 10`. Tests
   * pass a `{maxAttempts, scheduler}` pair to drive the backoff
   * synchronously.
   */
  reconnect?: Partial<ReconnectOptions>;
  /**
   * Fired when WsClient gives up reconnecting (after `maxAttempts`).
   * Wired here so the shell can surface a persistent banner; default
   * is a console warning.
   */
  onReconnectGiveUp?: () => void;
  /** Optional overrides for tests. */
  deps?: {
    getRoomState?: typeof getRoomState;
    rendererFactory?: () => Renderer;
    wsClientFactory?: (
      url: string,
      roomId: string,
      reconnect: ReconnectOptions
    ) => WsClient;
  };
}

/**
 * Minimal `AudioManagerLike` shim for the channel-renderer wiring.
 * Zifmia's text-first 6c-client surface does not play audio yet;
 * receiving a `sound`/`music` event is a no-op rather than a throw.
 */
const SILENT_AUDIO_MANAGER = {
  handleAudioEvent: (): void => {
    /* no-op */
  }
};

/**
 * RoomManager — room-view orchestrator.
 *
 * Public surface:
 * - `enter()` — fetch state, build view, wire renderer + WS + input.
 * - `unmount()` — tear everything down.
 */
export class RoomManager {
  private readonly options: RoomManagerOptions;
  private readonly api: { getRoomState: typeof getRoomState };
  private view: RoomView | null = null;
  private slots: RoomViewSlots | null = null;
  private renderer: Renderer | null = null;
  private inputManager: CommandInputManager | null = null;
  private presenceManager: PresenceManager | null = null;
  private chatManager: ChatManager | null = null;
  private savesManager: SavesManager | null = null;
  private lockManager: LockManager | null = null;
  private wsClient: WsClient | null = null;
  private gaveUpReconnect = false;

  constructor(options: RoomManagerOptions) {
    this.options = options;
    this.api = {
      getRoomState: options.deps?.getRoomState ?? getRoomState
    };
  }

  /**
   * Build the page, fetch state, apply CMGT, replay transcript, mount
   * the input manager, open the WS subscription.
   *
   * DOES: appends a `RoomView` frame to the root; registers channel
   *   renderers against the view's slots; dispatches every transcript
   *   `channelPacket` through the renderer (each main-channel entry
   *   becomes a `<p class="main-entry">` row in `.sharpee-prose-pane`).
   * WHEN: called once per RoomManager instance, after construction.
   *   The shell (main.ts hash-router) creates a fresh manager on every
   *   `#room/:id` navigation.
   * REJECTS WHEN: `GET /rooms/:id/state` returns non-2xx → calls
   *   `options.onError(code)` and leaves the view unpopulated. The
   *   shell is responsible for clearing the hash (drop back to lobby).
   */
  async enter(): Promise<void> {
    if (this.view) return;
    this.view = new RoomView({ root: this.options.root, roomId: this.options.roomId });
    const slots = this.view.mount();
    this.slots = slots;

    const result = await this.api.getRoomState(this.options.roomId, this.httpOptions());
    if (!result.ok) {
      this.options.onError?.(result.error);
      return;
    }
    const state = result.value;

    this.renderer = this.options.deps?.rendererFactory?.() ?? new Renderer();
    this.wireRenderer(this.renderer, slots);

    if (state.cmgt) {
      this.applyCmgt(this.renderer, state.cmgt);
    }
    this.replayTranscript(this.renderer, state);

    // WS subscription. The submitter (this user) does NOT receive
    // turn:broadcast for their own turns (server-side identity
    // exclusion), so the turn handler only fires for other participants.
    //
    // Reconnect: register a fresh state-fetch + replay on every
    // reconnect open. Give-up surfaces through onReconnectGiveUp so
    // the shell can render a persistent banner.
    const reconnect = this.buildReconnectOptions();
    this.wsClient =
      this.options.deps?.wsClientFactory?.(this.wsUrl(), this.options.roomId, reconnect) ??
      new WsClient({
        url: this.wsUrl(),
        roomId: this.options.roomId,
        handle: this.options.handle,
        reconnect
      });
    this.wsClient.on('turn:broadcast', (frame) => this.applyBroadcast(frame));

    // Phase 6d — presence + chat. Both managers attach their own WS
    // listeners and own their region of the room view. Order: register
    // listeners BEFORE ws.open() so the immediate `presence:roster`
    // frame the server sends to the joiner is captured.
    this.presenceManager = new PresenceManager({
      root: slots.presencePanel,
      ws: this.wsClient,
      selfIdentityId: this.options.selfIdentityId
    });
    this.presenceManager.mount();

    this.chatManager = new ChatManager({
      root: slots.chatPanel,
      roomId: this.options.roomId,
      ws: this.wsClient,
      selfIdentityId: this.options.selfIdentityId
    });
    this.chatManager.mount();

    // Phase 6e — lock-on-typing. LockManager owns `.sharpee-lock-banner`
    // toggling + `--locked`/`--locked-by-me` on the input bar.
    this.lockManager = new LockManager({
      root: slots.root,
      lockBanner: slots.lockBanner,
      ws: this.wsClient,
      roomId: this.options.roomId,
      selfIdentityId: this.options.selfIdentityId
    });
    this.lockManager.mount();

    // Phase 6f-saves — named saves panel. SavesManager owns the panel
    // DOM + dialogs and subscribes to its own `room:restored` for the
    // list refresh. We separately wire the prose-pane refresh below.
    this.savesManager = new SavesManager({
      root: slots.savesPanel,
      roomId: this.options.roomId,
      httpOptions: this.httpOptions(),
      ws: this.wsClient
    });
    void this.savesManager.mount();

    // Prose-pane refresh on restore: subscribe a SECOND handler on
    // `room:restored` here so the RoomManager itself re-fetches state
    // and replays the transcript. SavesManager's handler refreshes
    // the saves list independently — both are idempotent.
    this.wsClient.on('room:restored', (frame: RoomRestoredFrame) => {
      if (frame.roomId !== this.options.roomId) return;
      void this.refresh();
    });

    // Input manager — wired to the LockManager via the
    // `onFirstKey` / `onBlur` seams that Phase 6c carved out.
    this.inputManager = new CommandInputManager({
      root: slots.inputContainer,
      roomId: this.options.roomId,
      httpOptions: this.httpOptions(),
      onTurn: (packet) => this.applyOwnTurn(packet),
      onFirstKey: () => this.lockManager?.acquire(),
      onBlur: () => this.lockManager?.release()
    });
    this.inputManager.mount();
    this.inputManager.focus();

    this.wsClient.open();
  }

  /**
   * Re-fetch room state and re-replay the transcript through the
   * existing `Renderer`. Idempotent across multiple invocations:
   * clears the prose pane first, then re-applies CMGT (which resets
   * the renderer's channel state stores), then replays every
   * transcript `channelPacket`.
   *
   * Wired to `WsClient.onReconnect` so an idle drop + recovery does
   * not leak duplicate prose rows.
   */
  async refresh(): Promise<void> {
    if (!this.renderer || !this.slots) return;
    const result = await this.api.getRoomState(this.options.roomId, this.httpOptions());
    if (!result.ok) {
      this.options.onError?.(result.error);
      return;
    }
    const state = result.value;
    // Clearing the prose pane DOM is necessary because the main
    // channel renderer appends rows; applyCmgt resets the renderer's
    // own state store but does not touch the slot DOM. Without this
    // clear the user would see duplicated prose after a reconnect.
    this.slots.main.replaceChildren();
    if (state.cmgt) this.applyCmgt(this.renderer, state.cmgt);
    this.replayTranscript(this.renderer, state);
  }

  unmount(): void {
    this.lockManager?.unmount();
    this.lockManager = null;
    this.savesManager?.unmount();
    this.savesManager = null;
    this.chatManager?.unmount();
    this.chatManager = null;
    this.presenceManager?.unmount();
    this.presenceManager = null;
    this.wsClient?.close();
    this.wsClient = null;
    this.inputManager?.unmount();
    this.inputManager = null;
    this.renderer = null;
    this.slots = null;
    this.view?.unmount();
    this.view = null;
  }

  /** Whether the WsClient has given up reconnecting. The shell can
   * surface a persistent banner when this flips true. */
  get hasGivenUpReconnect(): boolean {
    return this.gaveUpReconnect;
  }

  private buildReconnectOptions(): ReconnectOptions {
    const supplied = this.options.reconnect;
    const defaults: ReconnectOptions = {
      backoffSchedule: [500, 1000, 2000, 4000, 8000],
      maxAttempts: 10
    };
    return {
      backoffSchedule: supplied?.backoffSchedule ?? defaults.backoffSchedule,
      maxAttempts: supplied?.maxAttempts ?? defaults.maxAttempts,
      onReconnect: supplied?.onReconnect ?? (() => {
        void this.refresh();
      }),
      onGiveUp: supplied?.onGiveUp ?? (() => {
        this.gaveUpReconnect = true;
        this.options.onReconnectGiveUp?.();
      }),
      scheduler: supplied?.scheduler,
      clearScheduler: supplied?.clearScheduler
    };
  }

  private httpOptions(): HttpClientOptions {
    return {
      handle: this.options.handle,
      baseUrl: this.options.baseUrl,
      fetchImpl: this.options.fetchImpl
    };
  }

  private wsUrl(): string {
    if (this.options.wsUrl) return this.options.wsUrl;
    // Per the 2026-05-12 ADR-161 amendment, the upgrade URL is bare
    // and auth happens via the first inbound frame (hello). The
    // WsClient sends `{type:'hello', handle}` on open.
    const loc = typeof window !== 'undefined' ? window.location : undefined;
    const scheme = loc?.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = loc?.host ?? 'localhost';
    return `${scheme}//${host}/ws`;
  }

  private wireRenderer(renderer: Renderer, slots: RoomViewSlots): void {
    const layout: BrowserDefaultLayout = {
      root: slots.root,
      status: slots.status,
      statusLocation: slots.statusLocation,
      statusScore: slots.statusScore,
      statusTurn: slots.statusTurn,
      main: slots.main,
      sidebar: slots.sidebar,
      input: slots.input,
      inputPromptLabel: slots.inputPromptLabel,
      media: slots.media,
      notify: slots.notify,
      meta: slots.meta
    };
    registerDefaultBrowserRenderers(renderer, layout, {
      audio: SILENT_AUDIO_MANAGER,
      onMainAfterAppend: (slot) => {
        // Keep the prose pane pinned to the bottom as turns stream in.
        // The slot is the `.sharpee-prose-pane` element.
        slot.scrollTop = slot.scrollHeight;
      }
    });
  }

  private applyCmgt(renderer: Renderer, cmgt: ChannelCmgtPacket): void {
    try {
      renderer.applyCmgt(cmgt);
    } catch (err) {
      // CMGT shape mismatch should never happen — the server runs the
      // same channel-service code — but we surface it as an error
      // rather than crashing the whole view.
      this.options.onError?.(
        `applyCmgt failed: ${err instanceof Error ? err.message : 'unknown'}`
      );
    }
  }

  private replayTranscript(renderer: Renderer, state: RoomStateBody): void {
    for (const entry of state.transcript) {
      if (entry.channelPacket) {
        try {
          renderer.applyTurnPacket(entry.channelPacket);
        } catch {
          // A bad packet in one entry must not block the rest of the
          // transcript from replaying.
        }
      }
    }
  }

  private applyOwnTurn(packet: TurnPacketResponse): void {
    if (!this.renderer) return;
    try {
      this.renderer.applyTurnPacket(packet.channelPacket);
    } catch {
      // Local turn render failure: keep the input alive so the user
      // can retry.
    }
  }

  private applyBroadcast(frame: TurnBroadcastFrame): void {
    if (!this.renderer) return;
    if (!frame.channelPacket) return;
    try {
      this.renderer.applyTurnPacket(frame.channelPacket);
    } catch {
      // Bad broadcast packet — drop it.
    }
  }
}
