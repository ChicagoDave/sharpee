/**
 * Pure reducer that folds server pushes into a `RoomState`.
 *
 * Public interface: {@link roomReducer}.
 *
 * Bounded context: client state layer (ADR-153 Interface Contracts).
 *
 * Coverage rule: every `ServerMsg` kind has an explicit case so `switch`
 * exhaustiveness is enforced by TypeScript. Kinds that belong to features
 * landing in later plans (chat → Plan 02, DMs → Plan 04, saves → Plan 03,
 * etc.) are handled as no-ops with a pointer comment. This keeps a Phase 6
 * client alive when a Phase 7+ server starts emitting those kinds during
 * development, instead of crashing on an unhandled message.
 */

import type { ServerMsg } from '../types/wire';
import { dmPeerFor } from './authority';
import { CHAT_IN_MEMORY_LIMIT, type RoomState } from './types';

export function roomReducer(state: RoomState, msg: ServerMsg): RoomState {
  switch (msg.kind) {
    case 'welcome':
      return {
        hydrated: true,
        selfId: msg.participant_id,
        room: msg.room,
        recordingNotice: msg.recording_notice,
        participants: msg.participants,
        lockHolderId: msg.room.lock_holder_id,
        draft: null,
        // Welcome snapshot does not carry the designated successor — the
        // server pushes `successor` separately (auto-nomination runs on
        // hello, so it typically arrives right after).
        designatedSuccessorId: null,
        // Fresh welcome resets any dangling PH-grace banner; if a grace is
        // in progress, the next `presence` push on this socket will
        // re-populate it.
        phGraceDeadline: null,
        transcript: [],
        // The server bounds chat_backlog server-side, but respect the local
        // cap too in case a future server change ever exceeds it.
        chatMessages: msg.chat_backlog.slice(-CHAT_IN_MEMORY_LIMIT),
        // Welcome does not (yet) carry dm_threads; Plan 04 Phase 4 will
        // add that server-side. Reset to empty on every welcome.
        dmThreads: {},
        lastError: null,
        closed: null,
        sandboxCrashed: false,
      };

    case 'presence': {
      let changed = false;
      const target = state.participants.find(
        (p) => p.participant_id === msg.participant_id,
      );
      const participants = state.participants.map((p) => {
        if (p.participant_id !== msg.participant_id) return p;
        if (p.connected === msg.connected) return p;
        changed = true;
        return { ...p, connected: msg.connected };
      });
      // PH-grace banner edge detection. We only track the deadline for the
      // current PH; any other participant's grace_deadline (should not
      // occur in practice, server guards for it) is ignored.
      let phGraceDeadline = state.phGraceDeadline;
      if (target?.tier === 'primary_host') {
        if (msg.connected === false) {
          phGraceDeadline = msg.grace_deadline;
        } else if (msg.connected === true) {
          phGraceDeadline = null;
        }
      }
      if (!changed && phGraceDeadline === state.phGraceDeadline) return state;
      return { ...state, participants, phGraceDeadline };
    }

    case 'lock_state': {
      // Any holder transition invalidates the previous holder's draft. A
      // same-holder push (e.g., server re-emits on reconnect) is a no-op so
      // we don't churn the state reference.
      if (state.lockHolderId === msg.holder_id) return state;
      return { ...state, lockHolderId: msg.holder_id, draft: null };
    }

    case 'draft_frame': {
      // Drop stale frames so out-of-order arrivals can't briefly show an
      // older keystroke. Seq is monotonic per typist.
      if (
        state.draft &&
        state.draft.typist_id === msg.typist_id &&
        msg.seq <= state.draft.seq
      ) {
        return state;
      }
      return {
        ...state,
        draft: { typist_id: msg.typist_id, seq: msg.seq, text: msg.text },
      };
    }

    case 'story_output':
      return {
        ...state,
        transcript: [
          ...state.transcript,
          {
            turn_id: msg.turn_id,
            text_blocks: msg.text_blocks,
            events: msg.events,
          },
        ],
        draft: null,
      };

    case 'error': {
      const next: RoomState = {
        ...state,
        lastError: {
          code: msg.code,
          detail: msg.detail,
          ...(msg.turn_id !== undefined && { turn_id: msg.turn_id }),
        },
      };
      // ADR-153 AC7 — the story subprocess exited unexpectedly. Surface
      // the crash recovery modal by flipping the dedicated flag so the
      // UI doesn't have to introspect `lastError.code`.
      if (msg.code === 'runtime_crash') next.sandboxCrashed = true;
      return next;
    }

    case 'room_closed':
      return {
        ...state,
        closed: {
          reason: msg.reason,
          ...(msg.message !== undefined && { message: msg.message }),
        },
      };

    case 'mute_state': {
      let changed = false;
      const participants = state.participants.map((p) => {
        if (p.participant_id !== msg.participant_id) return p;
        if (p.muted === msg.muted) return p;
        changed = true;
        return { ...p, muted: msg.muted };
      });
      return changed ? { ...state, participants } : state;
    }

    case 'role_change': {
      let changed = false;
      const participants = state.participants.map((p) => {
        if (p.participant_id !== msg.participant_id) return p;
        if (p.tier === msg.tier) return p;
        changed = true;
        return { ...p, tier: msg.tier };
      });
      // Promoting a new PH concludes the grace window — clear any pending
      // banner deadline. The old-PH → participant demotion that follows
      // succession is handled by its own role_change; either arrives here
      // with the same effect.
      const phGraceDeadline =
        msg.tier === 'primary_host' ? null : state.phGraceDeadline;
      if (!changed && phGraceDeadline === state.phGraceDeadline) return state;
      return { ...state, participants, phGraceDeadline };
    }

    case 'chat': {
      // Ignore stale duplicates: if this event_id is already in the list
      // (e.g., a welcome backlog overlapped with a buffered push), don't
      // double-render. Linear scan is fine — the list is capped at 500.
      if (state.chatMessages.some((m) => m.event_id === msg.event_id)) {
        return state;
      }
      const entry = {
        event_id: msg.event_id,
        from: msg.from,
        text: msg.text,
        ts: msg.ts,
      };
      const next = [...state.chatMessages, entry];
      return {
        ...state,
        chatMessages:
          next.length > CHAT_IN_MEMORY_LIMIT
            ? next.slice(next.length - CHAT_IN_MEMORY_LIMIT)
            : next,
      };
    }

    // ---------- deferred to later plans ----------
    case 'dm': {
      const peer = dmPeerFor(state.selfId, state.participants, msg);
      if (peer === null) return state;
      const existing = state.dmThreads[peer] ?? [];
      if (existing.some((e) => e.event_id === msg.event_id)) return state;
      const entry = {
        event_id: msg.event_id,
        from: msg.from,
        to: msg.to,
        text: msg.text,
        ts: msg.ts,
      };
      return {
        ...state,
        dmThreads: { ...state.dmThreads, [peer]: [...existing, entry] },
      };
    }
    case 'room_state': {
      if (!state.room) return state;
      const { pinned, last_activity_at, title } = msg;
      if (
        state.room.pinned === pinned &&
        state.room.last_activity_at === last_activity_at &&
        state.room.title === title
      ) {
        return state;
      }
      return {
        ...state,
        room: { ...state.room, pinned, last_activity_at, title },
      };
    }

    case 'successor':
      if (state.designatedSuccessorId === msg.participant_id) return state;
      return { ...state, designatedSuccessorId: msg.participant_id };

    case 'save_created': {
      if (!state.room) return state;
      // Dedupe on save_id in case of overlapping welcome/broadcast delivery.
      if (state.room.saves.some((s) => s.save_id === msg.save_id)) return state;
      return {
        ...state,
        room: {
          ...state.room,
          saves: [
            ...state.room.saves,
            { save_id: msg.save_id, name: msg.name, created_at: msg.ts },
          ],
        },
      };
    }
    case 'restored': {
      const save = state.room?.saves.find((s) => s.save_id === msg.save_id);
      const save_name = save?.name ?? '(unknown)';
      const entry = {
        turn_id: `restore-${msg.save_id}`,
        text_blocks: msg.text_blocks,
        events: [],
        restored: { save_id: msg.save_id, save_name },
      };
      return {
        ...state,
        transcript: [...state.transcript, entry],
        // A restore resets the floor to a prior snapshot; any pending draft
        // belongs to the pre-restore session and would be confusing to keep.
        draft: null,
        // Server re-initialized the sandbox with the save blob; whatever
        // crash triggered this restore is now recovered.
        sandboxCrashed: false,
      };
    }

    default: {
      // Exhaustiveness guard — compile-time error if a new ServerMsg kind is
      // added upstream without a case here.
      const _exhaustive: never = msg;
      return _exhaustive;
    }
  }
}
