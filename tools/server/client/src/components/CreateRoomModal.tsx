/**
 * CreateRoomModal — collects title and story, reads the stored identity
 * for `(handle, passcode)` credentials, and posts `POST /api/rooms`. On
 * success, persists the returned Primary Host token under
 * `sharpee.token.<room_id>` and hands the new room id to the parent via
 * {@link CreateRoomModalProps.onCreated}.
 *
 * Public interface: {@link CreateRoomModal} default export,
 * {@link CreateRoomModalProps}.
 *
 * Bounded context: client create-room flow (ADR-153 Decision 3, Decision 5,
 * ADR-161 identity model).
 *
 * Identity coupling: per ADR-161, the Handle replaces the historical
 * display name, and the room create call requires `(handle, passcode)`.
 * App.tsx ensures the Create button is disabled until an identity exists,
 * so this modal only opens with a valid identity. As a defensive
 * fallback, the submit handler bails to a form-level alert if
 * `getStoredIdentity()` returns null at submit (e.g., another tab erased
 * mid-form).
 *
 * Error handling: server validation errors (`code: missing_field`,
 * `invalid_title`, `unknown_story`, `unknown_handle`, `bad_passcode`) are
 * surfaced inline on the offending field. Any other non-2xx response is
 * shown as a form-level alert.
 */

import { useCallback, useState } from 'react';
import Button from './Button';
import CaptchaWidget from './CaptchaWidget';
import Modal from './Modal';
import { ApiError, createRoom as apiCreateRoom } from '../api/http';
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  StorySummary,
} from '../types/api';
import type { SharpeeClientConfig } from '../config';
import { writeCode } from '../storage/room-code';
import { writeToken } from '../storage/token';
import { getStoredIdentity } from '../identity/identity-store';

export interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  stories: StorySummary[];
  /** Invoked after a successful POST /api/rooms with the created response. */
  onCreated: (result: CreateRoomResponse) => void;
  /** Test override: replaces the real API call. */
  createRoomFn?: (body: CreateRoomRequest) => Promise<CreateRoomResponse>;
  /** Test override: replaces the captcha config so tests can skip real provider logic. */
  captchaConfig?: SharpeeClientConfig;
}

type FieldErrors = Partial<{ title: string; story_slug: string }>;

const TITLE_MAX = 80;

export default function CreateRoomModal({
  open,
  onClose,
  stories,
  onCreated,
  createRoomFn = apiCreateRoom,
  captchaConfig,
}: CreateRoomModalProps): JSX.Element | null {
  const [title, setTitle] = useState('');
  const [storySlug, setStorySlug] = useState<string>(stories[0]?.slug ?? '');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const close = useCallback(() => {
    if (submitting) return;
    onClose();
  }, [submitting, onClose]);

  const submit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const errs: FieldErrors = {};
      const trimmedTitle = title.trim();
      if (!trimmedTitle) errs.title = 'Title is required.';
      else if (trimmedTitle.length > TITLE_MAX)
        errs.title = `Title must be ${TITLE_MAX} characters or fewer.`;
      if (!storySlug) errs.story_slug = 'Pick a story.';
      setFieldErrors(errs);
      if (Object.keys(errs).length > 0) return;

      // Identity must be present at submit. App.tsx already gates the
      // Create button on identity-existence, but a cross-tab erase could
      // land between open and submit; bail with a form-level alert.
      const identity = getStoredIdentity();
      if (!identity) {
        setFormError('Identity unavailable — reload to set up your identity.');
        return;
      }

      setFormError(null);
      setSubmitting(true);
      try {
        const result = await createRoomFn({
          story_slug: storySlug,
          title: trimmedTitle,
          handle: identity.handle,
          passcode: identity.passcode,
          captcha_token: captchaToken ?? undefined,
        });
        writeToken(result.room_id, result.token);
        writeCode(result.room_id, result.join_code);
        onCreated(result);
      } catch (err) {
        if (err instanceof ApiError) {
          // Server-side field validation — map known codes onto fields.
          if (err.code === 'missing_field') {
            const low = err.detail.toLowerCase();
            if (low.includes('title')) setFieldErrors({ title: err.detail });
            else if (low.includes('story_slug')) setFieldErrors({ story_slug: err.detail });
            else setFormError(err.detail);
          } else if (err.code === 'invalid_title') {
            setFieldErrors({ title: err.detail });
          } else if (err.code === 'unknown_story') {
            setFieldErrors({ story_slug: err.detail });
          } else if (err.code === 'unknown_handle' || err.code === 'bad_passcode') {
            // Stored identity is no longer valid on this server (server
            // erased it, or identity was forged). Tell the user to reset.
            setFormError(
              'Your identity is no longer valid. Reload and set up a new identity.',
            );
          } else {
            setFormError(err.detail);
          }
        } else {
          setFormError('Network error — please try again.');
        }
      } finally {
        setSubmitting(false);
      }
    },
    [title, storySlug, captchaToken, createRoomFn, onCreated],
  );

  if (!open) return null;

  return (
    <Modal
      title="Create a room"
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="create-room-form"
            disabled={submitting}
          >
            {submitting ? 'Creating…' : 'Create room'}
          </Button>
        </>
      }
    >
      <form id="create-room-form" onSubmit={submit} noValidate>
        {formError && (
          <div
            role="alert"
            style={{
              marginBottom: 'var(--sharpee-spacing-md)',
              padding: 'var(--sharpee-spacing-sm) var(--sharpee-spacing-md)',
              border: '1px solid var(--sharpee-error)',
              color: 'var(--sharpee-error)',
              borderRadius: 'var(--sharpee-border-radius)',
            }}
          >
            {formError}
          </div>
        )}

        <FormField
          label="Title"
          hint={`Shown on the landing page. Up to ${TITLE_MAX} characters.`}
          error={fieldErrors.title}
          htmlFor="field-title"
        >
          <input
            id="field-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX + 10}
            required
            aria-invalid={fieldErrors.title ? 'true' : undefined}
            style={fieldInputStyle}
          />
        </FormField>

        <FormField label="Story" error={fieldErrors.story_slug} htmlFor="field-story">
          <select
            id="field-story"
            value={storySlug}
            onChange={(e) => setStorySlug(e.target.value)}
            required
            aria-invalid={fieldErrors.story_slug ? 'true' : undefined}
            style={fieldInputStyle}
          >
            <option value="" disabled>
              {stories.length === 0 ? 'No stories configured' : 'Pick a story'}
            </option>
            {stories.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.title}
              </option>
            ))}
          </select>
        </FormField>

        <div style={{ marginTop: 'var(--sharpee-spacing-md)' }}>
          <CaptchaWidget onToken={setCaptchaToken} config={captchaConfig} />
        </div>
      </form>
    </Modal>
  );
}

// ---------- local helpers ----------

const fieldInputStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--sharpee-spacing-xs) var(--sharpee-spacing-sm)',
  border: '1px solid var(--sharpee-border)',
  borderRadius: 'var(--sharpee-border-radius)',
  background: 'var(--sharpee-bg-secondary)',
  color: 'var(--sharpee-text)',
  font: 'inherit',
};

interface FormFieldProps {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}

function FormField({ label, hint, error, htmlFor, children }: FormFieldProps): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 4, marginBottom: 'var(--sharpee-spacing-md)' }}>
      <label htmlFor={htmlFor} style={{ fontWeight: 600, fontSize: '0.9em' }}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <div style={{ fontSize: '0.8em', color: 'var(--sharpee-text-muted)' }}>{hint}</div>
      )}
      {error && (
        <div style={{ fontSize: '0.85em', color: 'var(--sharpee-error)' }}>{error}</div>
      )}
    </div>
  );
}

