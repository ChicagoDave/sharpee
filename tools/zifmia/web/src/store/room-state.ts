/**
 * Client-side room-state store — observable mirror of the room.
 *
 * Public interface: {@link RoomStateStore}, {@link createRoomStateStore}.
 * Owner: web client. In-memory only.
 *
 * Holds the union of:
 *   - the initial `RoomStateResponse` from `GET /state`
 *   - WS frames received after hello:ack
 *   - locally-derived state (own participant id, terminal close code)
 *
 * Subscribers register `subscribe(listener)` and are notified on any
 * mutation. View code reads via `snapshot()`.
 */

import type {
  ServerFrame,
  ChatMessageFrame,
  DmMessageFrame,
  RoleChangeFrame,
  PresenceFrame,
  RoomRestoredFrame,
  MuteStateFrame,
  LockStateFrame,
  TurnFrame
} from '../../../src/ws/types.js';
import type { Tier } from '../../../src/rooms/types.js';
import type { RoomStateResponse, RosterRow, RoomDetail } from '../http-client.js';

export interface ChatLine {
  readonly id: string;
  readonly fromId: string;
  readonly fromHandle: string;
  readonly text: string;
  readonly ts: number;
}

export interface DmLine extends ChatLine {}

export interface TurnLine {
  readonly turnId: string;
  readonly submitter?: { id: string; handle: string };
  readonly channels: Record<string, unknown[]>;
}

export interface RoomStateSnapshot {
  readonly room: RoomDetail | null;
  readonly ownParticipantId: string | null;
  readonly ownTier: Tier | null;
  readonly roster: ReadonlyArray<RosterRow>;
  readonly lock: { readonly holder: string | null; readonly expiresAt: number | null };
  readonly gracePending: boolean;
  readonly graceDeadline: number | null;
  readonly chat: ReadonlyArray<ChatLine>;
  readonly dms: ReadonlyArray<DmLine>;
  readonly transcript: ReadonlyArray<TurnLine>;
  readonly cmgt: unknown;
  /** Set on terminal WS close (4001..4007); the UI renders the closed overlay. */
  readonly terminalClose: { code: number; reason: string } | null;
}

export type RoomStateListener = (snapshot: RoomStateSnapshot) => void;

export interface RoomStateStore {
  snapshot(): RoomStateSnapshot;
  subscribe(listener: RoomStateListener): () => void;
  /** Replace state from a fresh GET /state response. */
  hydrate(response: RoomStateResponse): void;
  /** Apply an inbound WS frame. */
  applyFrame(frame: ServerFrame): void;
  /** Record the post-hello participant id + tier. */
  setOwnParticipant(input: { participantId: string; tier: Tier }): void;
  /** Mark terminal close (4001..4007). */
  setTerminalClose(close: { code: number; reason: string }): void;
  /** Replace the local lock state (e.g., after force-release HTTP). */
  setLockState(state: { holder: string | null; expiresAt: number | null }): void;
}

const EMPTY: RoomStateSnapshot = Object.freeze({
  room: null,
  ownParticipantId: null,
  ownTier: null,
  roster: [],
  lock: { holder: null, expiresAt: null },
  gracePending: false,
  graceDeadline: null,
  chat: [],
  dms: [],
  transcript: [],
  cmgt: null,
  terminalClose: null
});

export function createRoomStateStore(): RoomStateStore {
  let state: RoomStateSnapshot = EMPTY;
  const listeners = new Set<RoomStateListener>();

  function update(next: Partial<RoomStateSnapshot>): void {
    state = { ...state, ...next };
    for (const listener of listeners) listener(state);
  }

  function patchRoster(participantId: string, patch: Partial<RosterRow>): void {
    update({
      roster: state.roster.map((r) => (r.participant_id === participantId ? { ...r, ...patch } : r))
    });
  }

  function patchRosterByIdentity(identityId: string, patch: Partial<RosterRow>): void {
    update({
      roster: state.roster.map((r) => (r.identity_id === identityId ? { ...r, ...patch } : r))
    });
  }

  function handleChat(frame: ChatMessageFrame): void {
    const line: ChatLine = {
      id: frame.id,
      fromId: frame.fromId,
      fromHandle: frame.fromHandle,
      text: frame.text,
      ts: frame.ts
    };
    update({ chat: [...state.chat, line] });
  }

  function handleDm(frame: DmMessageFrame): void {
    const line: DmLine = {
      id: frame.id,
      fromId: frame.fromId,
      fromHandle: frame.fromHandle,
      text: frame.text,
      ts: frame.ts
    };
    update({ dms: [...state.dms, line] });
  }

  function handleTurn(frame: TurnFrame): void {
    const line: TurnLine = {
      turnId: frame.turnId,
      submitter: frame.submitter,
      channels: frame.packet.channels
    };
    update({ transcript: [...state.transcript, line] });
  }

  function handleLock(frame: LockStateFrame): void {
    update({ lock: { holder: frame.holder, expiresAt: frame.expiresAt } });
  }

  function handleRoleChange(frame: RoleChangeFrame): void {
    patchRoster(frame.participantId, { tier: frame.tier });
    // Own-tier tracking: update if it's me.
    if (state.ownParticipantId === frame.participantId) {
      update({ ownTier: frame.tier });
    }
  }

  function handlePresence(frame: PresenceFrame): void {
    patchRoster(frame.participantId, { connected: frame.connected });
    if (frame.graceDeadline !== undefined) {
      update({ gracePending: true, graceDeadline: frame.graceDeadline });
    } else if (frame.connected) {
      // Reconnect cancels grace.
      update({ gracePending: false, graceDeadline: null });
    }
  }

  function handleMute(frame: MuteStateFrame): void {
    patchRoster(frame.participantId, { muted: frame.muted });
  }

  function handleRoomRestored(_frame: RoomRestoredFrame): void {
    // The route caller will re-fetch GET /state; reset transcript so
    // it's not double-rendered while the fetch is in flight.
    update({ transcript: [], chat: [], dms: [], gracePending: false, graceDeadline: null });
  }

  return {
    snapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    hydrate(response) {
      const transcript: TurnLine[] = response.transcript_backlog.map((t) => ({
        turnId: t.turnId,
        channels: t.channels
      }));
      update({
        room: response.room,
        roster: response.roster.slice(),
        lock: { holder: response.lock.holder, expiresAt: response.lock.expiresAt },
        gracePending: response.grace?.pending ?? false,
        graceDeadline: null,
        transcript,
        cmgt: response.cmgt,
        // chat + dms are NOT in /state's response (transcript backlog
        // captures `output` rows only); they start empty and only the
        // live WS stream contributes.
        chat: [],
        dms: []
      });
    },
    applyFrame(frame) {
      switch (frame.type) {
        case 'chat:message': return handleChat(frame);
        case 'dm:message': return handleDm(frame);
        case 'turn': return handleTurn(frame);
        case 'lock:state': return handleLock(frame);
        case 'role_change': return handleRoleChange(frame);
        case 'presence': return handlePresence(frame);
        case 'mute_state': return handleMute(frame);
        case 'room_restored': return handleRoomRestored(frame);
        case 'hello:ack': return; // handled out-of-band by main
      }
    },
    setOwnParticipant({ participantId, tier }) {
      update({ ownParticipantId: participantId, ownTier: tier });
      patchRoster(participantId, { connected: true });
      void patchRosterByIdentity;
    },
    setTerminalClose(close) {
      update({ terminalClose: close });
    },
    setLockState(lock) {
      update({ lock });
    }
  };
}
