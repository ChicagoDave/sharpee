/**
 * SettingsTitleEdit — PH-only form for renaming the room via
 * PATCH /api/rooms/:id.
 *
 * Public interface: {@link SettingsTitleEdit} default export.
 *
 * Bounded context: client room settings (Plan 02 Phase 4). Validation
 * mirrors create-room: trim, non-empty, ≤80 chars. Server errors surface
 * inline under the input. On success the server broadcasts `room_state`
 * so the header updates on its own — no imperative DOM update here.
 */

import { useCallback, useState } from 'react';
import Button from './Button';
import {
  ApiError,
  renameRoom as apiRenameRoom,
  type RenameRoomResponse,
} from '../api/http';

const TITLE_MAX = 80;

export interface SettingsTitleEditProps {
  roomId: string;
  currentTitle: string;
  /** Host token persisted at create-room time; required for the PATCH auth. */
  token: string;
  /** Test override. */
  renameRoomFn?: (
    room_id: string,
    title: string,
    token: string,
  ) => Promise<RenameRoomResponse>;
}

export default function SettingsTitleEdit({
  roomId,
  currentTitle,
  token,
  renameRoomFn = apiRenameRoom,
}: SettingsTitleEditProps): JSX.Element {
  const [draft, setDraft] = useState(currentTitle);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const trimmed = draft.trim();
  const unchanged = trimmed === currentTitle.trim();

  const submit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!trimmed) {
        setError('Title is required.');
        return;
      }
      if (trimmed.length > TITLE_MAX) {
        setError(`Title must be ${TITLE_MAX} characters or fewer.`);
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        await renameRoomFn(roomId, trimmed, token);
        // Success: no local state to clear — server broadcast will
        // update state.room.title and re-render via reducer.
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.detail);
        } else {
          setError('Network error — please try again.');
        }
      } finally {
        setSubmitting(false);
      }
    },
    [roomId, trimmed, token, renameRoomFn],
  );

  return (
    <section
      aria-labelledby="settings-title-heading"
      style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
    >
      <h3 id="settings-title-heading" style={{ margin: 0, fontSize: '0.95rem' }}>
        Title
      </h3>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label
          htmlFor="settings-title-input"
          style={{ color: 'var(--sharpee-text-muted)', fontSize: '0.8rem' }}
        >
          Shown on the landing page and the room header.
        </label>
        <input
          id="settings-title-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={TITLE_MAX + 10}
          aria-invalid={error ? 'true' : undefined}
          style={{
            width: '100%',
            padding: 'var(--sharpee-spacing-xs) var(--sharpee-spacing-sm)',
            border: '1px solid var(--sharpee-border)',
            borderRadius: 'var(--sharpee-border-radius)',
            background: 'var(--sharpee-bg-secondary)',
            color: 'var(--sharpee-text)',
            font: 'inherit',
          }}
        />
        {error && (
          <div role="alert" style={{ color: 'var(--sharpee-error)', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={submitting || unchanged || !trimmed}
          style={{ alignSelf: 'start' }}
        >
          {submitting ? 'Saving…' : 'Save title'}
        </Button>
      </form>
    </section>
  );
}
