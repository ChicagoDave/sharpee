/**
 * Landing page — the public entry point at `/`.
 *
 * Public interface: {@link Landing} default export, {@link LandingProps}.
 *
 * Bounded context: client landing page (ADR-153 frontend). Responsibilities:
 *   1. Fetch `/api/stories` and `/api/rooms` on mount.
 *   2. Render both lists with empty-state copy when arrays come back empty.
 *   3. Own the Create Room modal; bubble the created room id to the parent
 *      via `onRoomCreated` so App can navigate to `/room/:id`.
 *   4. Bubble Enter-on-a-listed-room clicks via `onEnter`; the passcode
 *      modal that accepts those lands in Phase 5.
 *
 * The data fetches run in parallel and the whole page enters a loading state
 * until both settle; any failure renders an inline retryable error.
 */

import { useCallback, useEffect, useState } from 'react';
import ActiveRoomsList from '../components/ActiveRoomsList';
import Button from '../components/Button';
import CreateRoomModal from '../components/CreateRoomModal';
import StoriesList from '../components/StoriesList';
import { listRooms, listStories, createRoom as apiCreateRoom } from '../api/http';
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  RoomSummary,
  StorySummary,
} from '../types/api';
import type { SharpeeClientConfig } from '../config';

export interface LandingProps {
  /** Called after a room is successfully created, with the new room_id. */
  onRoomCreated: (room_id: string) => void;
  /** Called when the user clicks Enter on a listed room. */
  onEnter: (room_id: string) => void;
  /**
   * Fetch overrides for tests. Each defaults to the real endpoint helper.
   * Kept as injectable so unit tests do not need global fetch mocks.
   */
  fetchStories?: () => Promise<{ stories: StorySummary[] }>;
  fetchRooms?: () => Promise<{ rooms: RoomSummary[] }>;
  /** Test override: replaces the POST /api/rooms call. */
  createRoomFn?: (body: CreateRoomRequest) => Promise<CreateRoomResponse>;
  /** Test override: forces a specific captcha config for the modal. */
  captchaConfig?: SharpeeClientConfig;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; stories: StorySummary[]; rooms: RoomSummary[] }
  | { status: 'error'; detail: string };

export default function Landing({
  onRoomCreated,
  onEnter,
  fetchStories = listStories,
  fetchRooms = listRooms,
  createRoomFn = apiCreateRoom,
  captchaConfig,
}: LandingProps): JSX.Element {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const [storiesRes, roomsRes] = await Promise.all([fetchStories(), fetchRooms()]);
      setState({
        status: 'ready',
        stories: storiesRes.stories,
        rooms: roomsRes.rooms,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'failed to load';
      setState({ status: 'error', detail });
    }
  }, [fetchStories, fetchRooms]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreated = useCallback(
    (res: CreateRoomResponse) => {
      setCreateOpen(false);
      onRoomCreated(res.room_id);
    },
    [onRoomCreated],
  );

  const stories = state.status === 'ready' ? state.stories : [];

  return (
    <section
      aria-label="Landing"
      style={{
        display: 'grid',
        gap: 'var(--sharpee-spacing-xl)',
        maxWidth: 960,
        margin: '0 auto',
        padding: 'var(--sharpee-spacing-lg)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--sharpee-spacing-md)',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Sharpee multi-user</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--sharpee-text-muted)' }}>
            Host an interactive fiction session for up to eight people.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setCreateOpen(true)}
          aria-label="Create a new room"
          disabled={state.status === 'loading'}
          style={{ whiteSpace: 'nowrap' }}
        >
          Create room
        </Button>
      </header>

      {state.status === 'loading' && (
        <p
          role="status"
          aria-live="polite"
          style={{ color: 'var(--sharpee-text-muted)' }}
        >
          Loading…
        </p>
      )}

      {state.status === 'error' && (
        <div
          role="alert"
          style={{
            border: '1px solid var(--sharpee-error)',
            color: 'var(--sharpee-error)',
            padding: 'var(--sharpee-spacing-md)',
            borderRadius: 'var(--sharpee-border-radius)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--sharpee-spacing-md)',
          }}
        >
          <span>Couldn&rsquo;t load landing data: {state.detail}</span>
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      {state.status === 'ready' && (
        <>
          <section aria-labelledby="active-rooms-heading">
            <h2 id="active-rooms-heading" style={{ marginBottom: 'var(--sharpee-spacing-sm)' }}>
              Active rooms
            </h2>
            <ActiveRoomsList rooms={state.rooms} stories={state.stories} onEnter={onEnter} />
          </section>

          <section aria-labelledby="stories-heading">
            <h2 id="stories-heading" style={{ marginBottom: 'var(--sharpee-spacing-sm)' }}>
              Stories
            </h2>
            <StoriesList stories={state.stories} />
          </section>
        </>
      )}

      <CreateRoomModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        stories={stories}
        onCreated={handleCreated}
        createRoomFn={createRoomFn}
        captchaConfig={captchaConfig}
      />
    </section>
  );
}
