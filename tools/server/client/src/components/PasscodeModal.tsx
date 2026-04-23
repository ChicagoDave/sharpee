/**
 * PasscodeModal — collects a room passcode, display name, and CAPTCHA, then
 * resolves the code via `GET /r/:code` and joins the resulting room via
 * `POST /api/rooms/:room_id/join`. On success, persists the participant token
 * under `sharpee.token.<room_id>` and hands the room id to the parent via
 * {@link PasscodeModalProps.onJoined}.
 *
 * Public interface: {@link PasscodeModal} default export,
 * {@link PasscodeModalProps}.
 *
 * Bounded context: client join flow (ADR-153 Decision 3, Decision 5).
 *
 * Two entry paths funnel through this modal:
 *   1. Deep-link from an invite at `/r/:code` — `prefillCode` is set and the
 *      field is shown pre-populated.
 *   2. Enter-click on a row in the Active Rooms list — `expectedRoomId` is
 *      passed, and a resolution that lands on a different room is rejected
 *      with the same "invalid passcode" copy as an unknown code.
 */

import { useCallback, useState } from 'react';
import Button from './Button';
import CaptchaWidget from './CaptchaWidget';
import Modal from './Modal';
import {
  ApiError,
  joinRoom as apiJoinRoom,
  resolveCode as apiResolveCode,
} from '../api/http';
import type {
  JoinRoomRequest,
  JoinRoomResponse,
  ResolveCodeResponse,
} from '../types/api';
import type { SharpeeClientConfig } from '../config';
import { writeCode } from '../storage/room-code';
import { writeToken } from '../storage/token';

export interface PasscodeModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-populated passcode when the user arrived via `/r/:code`. */
  prefillCode?: string;
  /**
   * When the modal was opened by clicking Enter on a listed room, the room_id
   * the passcode is expected to resolve to. A mismatch is treated as an
   * invalid passcode rather than silently joining a different room.
   */
  expectedRoomId?: string;
  /** Invoked after a successful join with the joined room_id. */
  onJoined: (room_id: string) => void;
  /** Test override: replaces GET /r/:code. */
  resolveCodeFn?: (code: string) => Promise<ResolveCodeResponse>;
  /** Test override: replaces POST /api/rooms/:id/join. */
  joinRoomFn?: (room_id: string, body: JoinRoomRequest) => Promise<JoinRoomResponse>;
  /** Test override: forces a specific captcha config. */
  captchaConfig?: SharpeeClientConfig;
}

type FieldErrors = Partial<{ code: string; display_name: string }>;

export default function PasscodeModal({
  open,
  onClose,
  prefillCode,
  expectedRoomId,
  onJoined,
  resolveCodeFn = apiResolveCode,
  joinRoomFn = apiJoinRoom,
  captchaConfig,
}: PasscodeModalProps): JSX.Element | null {
  const [code, setCode] = useState(prefillCode ?? '');
  const [displayName, setDisplayName] = useState('');
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
      const trimmedCode = code.trim();
      const trimmedName = displayName.trim();
      if (!trimmedCode) errs.code = 'Passcode is required.';
      if (!trimmedName) errs.display_name = 'Display name is required.';
      setFieldErrors(errs);
      if (Object.keys(errs).length > 0) return;

      setFormError(null);
      setSubmitting(true);
      try {
        const resolved = await resolveCodeFn(trimmedCode);
        if (expectedRoomId && resolved.room_id !== expectedRoomId) {
          setFieldErrors({ code: 'Invalid passcode.' });
          return;
        }
        const joined = await joinRoomFn(resolved.room_id, {
          display_name: trimmedName,
          captcha_token: captchaToken ?? undefined,
        });
        writeToken(resolved.room_id, joined.token);
        writeCode(resolved.room_id, trimmedCode);
        onJoined(resolved.room_id);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === 'room_not_found') {
            setFieldErrors({ code: 'Invalid passcode.' });
          } else if (err.code === 'missing_field') {
            const low = err.detail.toLowerCase();
            if (low.includes('display_name'))
              setFieldErrors({ display_name: err.detail });
            else setFormError(err.detail);
          } else if (err.code === 'captcha_failed') {
            setFormError('CAPTCHA failed. Please try again.');
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
    [code, displayName, captchaToken, expectedRoomId, resolveCodeFn, joinRoomFn, onJoined],
  );

  if (!open) return null;

  return (
    <Modal
      title="Enter passcode"
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="passcode-form"
            disabled={submitting}
          >
            {submitting ? 'Joining…' : 'Join room'}
          </Button>
        </>
      }
    >
      <form id="passcode-form" onSubmit={submit} noValidate>
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
          label="Passcode"
          hint="Shared with you by the room host."
          error={fieldErrors.code}
          htmlFor="field-code"
        >
          <input
            id="field-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            required
            aria-invalid={fieldErrors.code ? 'true' : undefined}
            style={fieldInputStyle}
          />
        </FormField>

        <FormField
          label="Your display name"
          error={fieldErrors.display_name}
          htmlFor="field-name"
        >
          <input
            id="field-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            aria-invalid={fieldErrors.display_name ? 'true' : undefined}
            style={fieldInputStyle}
          />
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
