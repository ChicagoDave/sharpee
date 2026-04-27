/**
 * Room page — the `/room/:room_id` view. Mounts the WebSocket hook, reads
 * token and join-code from durable storage, and wires the live room state
 * into the presentational {@link RoomView}.
 *
 * Public interface: {@link Room} default export (container),
 * {@link RoomView} (presentational — for tests), {@link RoomProps},
 * {@link RoomViewProps}.
 *
 * Bounded context: client room view (ADR-153 frontend). This file owns the
 * container/presentational split: `Room` wires side effects (storage, the
 * hook, routing fallbacks); `RoomView` renders the layout purely from
 * props so tests don't have to mock a WebSocket.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Button from '../components/Button';
import ChatPanel from '../components/ChatPanel';
import CommandInput from '../components/CommandInput';
import GraceBanner from '../components/GraceBanner';
import ParticipantRoster from '../components/ParticipantRoster';
import CrashNoticeModal from '../components/CrashNoticeModal';
import DmPanel from '../components/DmPanel';
import RestoreConfirmDialog from '../components/RestoreConfirmDialog';
import RoomClosedOverlay from '../components/RoomClosedOverlay';
import RoomHeader from '../components/RoomHeader';
import SavePanel from '../components/SavePanel';
import SettingsPanel from '../components/SettingsPanel';
import SidePanelTabs, { type TabDescriptor } from '../components/SidePanelTabs';
import Toast, { type ToastEntry } from '../components/Toast';
import Transcript from '../components/Transcript';
import { sendRestore } from '../api/ws';
import { useWebSocket, type WsConnectionState } from '../hooks/useWebSocket';
import { getStoredIdentity } from '../identity/identity-store';
import { navigate } from '../router';
import { selectDmUnread } from '../state/selectors';
import type { RoomState } from '../state/types';
import { clearCode, readCode } from '../storage/room-code';
import { clearToken, readToken } from '../storage/token';
import type { ClientMsg } from '../types/wire';

/** Noop send used when RoomView is rendered standalone (e.g., in tests). */
const NOOP_SEND: (msg: ClientMsg) => void = () => {
  /* noop */
};

/** Noop markDmRead used when RoomView is rendered standalone (e.g., in tests). */
const NOOP_MARK_DM_READ: (peerId: string, upToEventId: number) => void = () => {
  /* noop */
};

export interface RoomProps {
  roomId: string;
}

export interface RoomViewProps {
  roomId: string;
  code: string | null;
  state: RoomState;
  connection: WsConnectionState;
  /** Send a client intent. Defaults to a noop when unwired (tests). */
  send?: (msg: ClientMsg) => void;
  /**
   * Acknowledge DM read up to an event_id. Defaults to a noop when unwired
   * (tests). In production this is the `useWebSocket` hook's `markDmRead`.
   */
  markDmRead?: (peerId: string, upToEventId: number) => void;
  /**
   * PH-only Bearer token used by the settings panel for PATCH /api/rooms/:id.
   * When omitted, the gear icon is hidden even for PH viewers — the settings
   * panel cannot function without it.
   */
  token?: string | null;
}

export default function Room({ roomId }: RoomProps): JSX.Element {
  const token = readToken(roomId);
  const code = readCode(roomId);
  if (!token) return <RoomNoToken roomId={roomId} />;
  return <RoomLive roomId={roomId} token={token} code={code} />;
}

interface RoomLiveProps {
  roomId: string;
  token: string;
  code: string | null;
}

function RoomLive({ roomId, token, code }: RoomLiveProps): JSX.Element {
  const identity = getStoredIdentity();
  if (!identity) return <RoomNoIdentity roomId={roomId} />;
  return <RoomLiveWithIdentity roomId={roomId} token={token} code={code} identity={identity} />;
}

function RoomLiveWithIdentity({
  roomId,
  token,
  code,
  identity,
}: RoomLiveProps & { identity: { handle: string; passcode: string } }): JSX.Element {
  const { state, connection, send, markDmRead } = useWebSocket({
    roomId,
    handle: identity.handle,
    passcode: identity.passcode,
  });
  return (
    <RoomView
      roomId={roomId}
      code={code}
      state={state}
      connection={connection}
      send={send}
      markDmRead={markDmRead}
      token={token}
    />
  );
}

/**
 * Purely presentational room layout. Exported for testability — a test can
 * render this with a fixture RoomState rather than stubbing the hook.
 */
export function RoomView({
  roomId,
  code,
  state,
  connection,
  send = NOOP_SEND,
  markDmRead = NOOP_MARK_DM_READ,
  token = null,
}: RoomViewProps): JSX.Element {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savesOpen, setSavesOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<{
    save_id: string;
    save_name: string;
  } | null>(null);
  // Right-side-panel tabs. Phase 1 ships with just "Room"; Phase 2 adds
  // DM threads. Tab list is the union of `state.dmThreads` keys and any
  // tabs the viewer has explicitly opened (e.g. PH clicked "DM Alice"
  // before any message was sent — the thread doesn't exist yet).
  //
  // Active-tab and opened-tabs state lives HERE (component-local), not in
  // RoomState. Per Plan 04 Phase 3 design and CLAUDE.md rule 7a: which
  // tab the user is looking at is per-browser UI affordance, not part of
  // the projection of server-shared truth. The reducer owns only the
  // unread cursors that are derived from the message stream.
  const [activeTabId, setActiveTabId] = useState<string>('room');
  const [openedDmPeers, setOpenedDmPeers] = useState<Set<string>>(new Set());
  // Acknowledge a DM tab as read by advancing the cursor to the latest
  // event_id currently in that thread. Called whenever the user activates
  // (or opens) a `dm:<peerId>` tab — the latest event_id in `dmThreads`
  // is "everything the user could have seen at this moment."
  const ackDmRead = useCallback(
    (peerId: string) => {
      const thread = state.dmThreads[peerId];
      if (!thread || thread.length === 0) return;
      const latest = thread[thread.length - 1]!.event_id;
      markDmRead(peerId, latest);
    },
    [state.dmThreads, markDmRead],
  );
  const selectTab = useCallback(
    (id: string) => {
      setActiveTabId(id);
      if (id.startsWith('dm:')) ackDmRead(id.slice(3));
    },
    [ackDmRead],
  );
  const openDm = useCallback(
    (peer_participant_id: string) => {
      setOpenedDmPeers((prev) => {
        if (prev.has(peer_participant_id)) return prev;
        const next = new Set(prev);
        next.add(peer_participant_id);
        return next;
      });
      setActiveTabId(`dm:${peer_participant_id}`);
      ackDmRead(peer_participant_id);
    },
    [ackDmRead],
  );

  // Toast stack (auto-promotion announcements). Declared before the early
  // returns below so React sees the same hook count every render — otherwise
  // unhydrated → hydrated transitions trip React error #310.
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const pushToast = useCallback((text: string) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, text }]);
  }, []);

  // Track the current PH across renders so we can detect transitions.
  // Derived from state.participants — safe to compute before hydration
  // (participants is [] pre-hydration, so currentPhId is null and the
  // effect's null-guard short-circuits until hydration lands).
  const currentPh = state.participants.find((p) => p.tier === 'primary_host');
  const currentPhId = currentPh?.participant_id ?? null;
  const prevPhIdRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevPhIdRef.current;
    prevPhIdRef.current = currentPhId;
    if (prev === null || prev === currentPhId) return;
    if (state.selfId && prev === state.selfId) {
      pushToast('You are now a Participant.');
    } else if (currentPh) {
      pushToast(`${currentPh.display_name} is now the Primary Host.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhId]);

  if (state.closed) {
    return (
      <RoomClosedOverlay
        reason={state.closed.reason}
        message={state.closed.message}
        onRedirect={() => {
          // Clear the stored credentials for this closed room so a stale
          // token never haunts a future create/join on the same id.
          clearToken(roomId);
          clearCode(roomId);
          navigate('/');
        }}
      />
    );
  }

  if (!state.hydrated) {
    return (
      <section
        aria-label="Connecting"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          color: 'var(--sharpee-text-muted)',
          padding: 'var(--sharpee-spacing-lg)',
        }}
      >
        <p role="status" aria-live="polite">
          {connection === 'connecting'
            ? 'Connecting to room…'
            : connection === 'closed'
              ? 'Disconnected. Trying to reconnect…'
              : 'Loading room state…'}
        </p>
      </section>
    );
  }

  const title = state.room?.title ?? roomId;
  const selfParticipant = state.participants.find(
    (p) => p.participant_id === state.selfId,
  );
  const selfTier = selfParticipant?.tier ?? null;
  const selfMuted = selfParticipant?.muted ?? false;
  const remoteDraft =
    state.draft && state.draft.typist_id !== state.selfId ? state.draft.text : '';

  return (
    <section
      aria-label="Room"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 280px)',
        gridTemplateRows: 'auto auto auto 1fr auto',
        gridTemplateAreas: `
          "header header"
          "banner banner"
          "transcript roster"
          "transcript chat"
          "input chat"
        `,
        flex: 1,
        minHeight: 0,
        background: 'var(--sharpee-bg)',
      }}
    >
      <div style={{ gridArea: 'header' }}>
        <RoomHeader
          title={title}
          code={code}
          pinned={state.room?.pinned ?? false}
          onOpenSaves={() => setSavesOpen(true)}
          onOpenSettings={
            selfTier === 'primary_host' && token
              ? () => setSettingsOpen(true)
              : undefined
          }
        />
      </div>
      {state.phGraceDeadline && (
        <div style={{ gridArea: 'banner' }}>
          <GraceBanner
            deadline={state.phGraceDeadline}
            participants={state.participants}
            designatedSuccessorId={state.designatedSuccessorId}
          />
        </div>
      )}
      <main
        style={{
          gridArea: 'transcript',
          overflowY: 'auto',
          minHeight: 0,
        }}
      >
        <Transcript entries={state.transcript} participants={state.participants} />
      </main>
      <aside
        aria-label="Roster"
        style={{
          gridArea: 'roster',
          borderLeft: '1px solid var(--sharpee-border)',
          borderBottom: '1px solid var(--sharpee-border)',
          background: 'var(--sharpee-bg-secondary)',
          overflowY: 'auto',
          minHeight: 0,
        }}
      >
        <ParticipantRoster
          participants={state.participants}
          lockHolderId={state.lockHolderId}
          selfId={state.selfId}
          selfTier={selfTier}
          send={send}
          onOpenDm={selfTier === 'primary_host' ? openDm : undefined}
        />
      </aside>
      <aside
        style={{
          gridArea: 'chat',
          borderLeft: '1px solid var(--sharpee-border)',
          background: 'var(--sharpee-bg-secondary)',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {(() => {
          // Gather the DM peer ids the viewer should see a tab for.
          const dmPeerIds = new Set<string>([
            ...Object.keys(state.dmThreads),
            ...openedDmPeers,
          ]);
          const dmTabs: TabDescriptor[] = Array.from(dmPeerIds)
            .map((peerId) => {
              const peer = state.participants.find(
                (p) => p.participant_id === peerId,
              );
              return {
                id: `dm:${peerId}`,
                label: peer?.display_name ?? peerId,
                unread: selectDmUnread(state, peerId),
              };
            })
            // Stable ordering by label so tabs don't jitter between renders.
            .sort((a, b) => a.label.localeCompare(b.label));
          const tabs: TabDescriptor[] = [
            { id: 'room', label: 'Room' },
            ...dmTabs,
          ];
          // If the active tab was removed (e.g. peer demoted out of
          // visibility), fall back to Room.
          const safeActive = tabs.some((t) => t.id === activeTabId)
            ? activeTabId
            : 'room';
          return (
            <SidePanelTabs
              tabs={tabs}
              activeId={safeActive}
              onSelect={selectTab}
              renderBody={(id) => {
                if (id === 'room') {
                  return (
                    <ChatPanel
                      messages={state.chatMessages}
                      participants={state.participants}
                      selfId={state.selfId}
                      muted={selfMuted}
                      send={send}
                    />
                  );
                }
                if (id.startsWith('dm:')) {
                  const peerId = id.slice(3);
                  const peer = state.participants.find(
                    (p) => p.participant_id === peerId,
                  );
                  return (
                    <DmPanel
                      peerId={peerId}
                      peerName={peer?.display_name ?? peerId}
                      entries={state.dmThreads[peerId] ?? []}
                      participants={state.participants}
                      selfId={state.selfId}
                      send={send}
                    />
                  );
                }
                return null;
              }}
            />
          );
        })()}
      </aside>
      <div style={{ gridArea: 'input' }}>
        <CommandInput
          selfId={state.selfId}
          selfTier={selfTier}
          lockHolderId={state.lockHolderId}
          remoteDraft={remoteDraft}
          send={send}
        />
      </div>
      <SavePanel
        open={savesOpen}
        onClose={() => setSavesOpen(false)}
        saves={state.room?.saves ?? []}
        selfTier={selfTier}
        send={send}
        onRestore={(save_id) => {
          const save = state.room?.saves.find((s) => s.save_id === save_id);
          setRestoreTarget({
            save_id,
            save_name: save?.name ?? '(unnamed)',
          });
        }}
      />
      {restoreTarget && (
        <RestoreConfirmDialog
          saveName={restoreTarget.save_name}
          onCancel={() => setRestoreTarget(null)}
          onConfirm={() => {
            sendRestore(send, restoreTarget.save_id);
            setRestoreTarget(null);
            setSavesOpen(false);
          }}
        />
      )}
      {state.sandboxCrashed &&
        (() => {
          const saves = state.room?.saves ?? [];
          const latest =
            saves.length === 0
              ? null
              : [...saves].sort((a, b) =>
                  a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
                )[0]!;
          return (
            <CrashNoticeModal
              latestSave={latest}
              onRestoreLatest={() => {
                if (!latest) return;
                setRestoreTarget({
                  save_id: latest.save_id,
                  save_name: latest.name,
                });
              }}
            />
          );
        })()}
      {selfTier === 'primary_host' && token && (
        <SettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          roomId={roomId}
          title={title}
          pinned={state.room?.pinned ?? false}
          participants={state.participants}
          designatedSuccessorId={state.designatedSuccessorId}
          token={token}
          send={send}
        />
      )}
      <Toast entries={toasts} onDismiss={dismissToast} />
    </section>
  );
}

function RoomNoIdentity({ roomId }: { roomId: string }): JSX.Element {
  return (
    <section
      aria-label="No identity"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sharpee-spacing-md)',
        maxWidth: 640,
        margin: '0 auto',
        padding: 'var(--sharpee-spacing-lg)',
      }}
    >
      <h1 style={{ margin: 0 }}>Identity required</h1>
      <p style={{ color: 'var(--sharpee-text-muted)' }}>
        You don&rsquo;t have an identity set up. Return to the landing page to
        create or upload one before joining <code>{roomId}</code>.
      </p>
      <Button
        variant="primary"
        onClick={() => navigate('/')}
        style={{ alignSelf: 'start' }}
      >
        Back to landing
      </Button>
    </section>
  );
}

function RoomNoToken({ roomId }: { roomId: string }): JSX.Element {
  return (
    <section
      aria-label="No session"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sharpee-spacing-md)',
        maxWidth: 640,
        margin: '0 auto',
        padding: 'var(--sharpee-spacing-lg)',
      }}
    >
      <h1 style={{ margin: 0 }}>Join required</h1>
      <p style={{ color: 'var(--sharpee-text-muted)' }}>
        You don&rsquo;t have a session for <code>{roomId}</code>. Return to the
        landing page and join via a passcode.
      </p>
      <Button
        variant="primary"
        onClick={() => navigate('/')}
        style={{ alignSelf: 'start' }}
      >
        Back to landing
      </Button>
    </section>
  );
}

