/**
 * CreateRoomModal behaviour tests.
 *
 * Behavior Statement — CreateRoomModal
 *   DOES: submits (story_slug, title, display_name, captcha_token) via the
 *         injected createRoomFn; on success, writes the returned token to
 *         localStorage under `sharpee.token.<room_id>` and calls
 *         onCreated(response). On a 400 with code=invalid_title /
 *         missing_field (title) / unknown_story, surfaces an inline field
 *         error. On other non-2xx, surfaces a form-level alert. Empty /
 *         whitespace-only title is caught client-side before POST.
 *   WHEN: the form submits.
 *   BECAUSE: the modal is the entry point for Primary Host sessions
 *            (ADR-153 Decision 3); token persistence is required for
 *            reconnect (ADR-153 Decision 5).
 *   REJECTS WHEN: title invalid, display name empty, story slug empty,
 *                 or server returns an error envelope.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateRoomModal from './CreateRoomModal';
import { ApiError } from '../api/http';
import type { CreateRoomResponse, StorySummary } from '../types/api';

const STORIES: StorySummary[] = [
  { slug: 'zork', title: 'Zork', path: '/s/zork.sharpee' },
  { slug: 'cloak', title: 'Cloak of Darkness', path: '/s/cloak.sharpee' },
];

const OK_RESPONSE: CreateRoomResponse = {
  room_id: 'room-99',
  join_code: 'XYZ123',
  join_url: '/r/XYZ123',
  token: 'tok-primary-host',
  tier: 'primary_host',
  participant_id: 'p-99',
};

function renderModal(overrides: {
  onCreated?: (r: CreateRoomResponse) => void;
  onClose?: () => void;
  createRoomFn?: Parameters<typeof CreateRoomModal>[0]['createRoomFn'];
} = {}) {
  return render(
    <CreateRoomModal
      open
      stories={STORIES}
      onClose={overrides.onClose ?? vi.fn()}
      onCreated={overrides.onCreated ?? vi.fn()}
      createRoomFn={overrides.createRoomFn}
      captchaConfig={{ captcha: { provider: 'none', siteKey: '' } }}
    />,
  );
}

async function fillValidForm(): Promise<void> {
  await userEvent.type(screen.getByLabelText(/title/i), 'Alpha');
  await userEvent.selectOptions(screen.getByLabelText(/story/i), 'zork');
  await userEvent.type(screen.getByLabelText(/display name/i), 'Alice');
}

describe('<CreateRoomModal>', () => {
  it('submits the form with valid input and persists the token', async () => {
    const createRoomFn = vi.fn().mockResolvedValue(OK_RESPONSE);
    const onCreated = vi.fn();
    renderModal({ createRoomFn, onCreated });

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /^create room$/i }));

    await waitFor(() => expect(createRoomFn).toHaveBeenCalledTimes(1));
    expect(createRoomFn).toHaveBeenCalledWith({
      story_slug: 'zork',
      title: 'Alpha',
      display_name: 'Alice',
      captcha_token: 'bypass',
    });
    expect(window.localStorage.getItem('sharpee.token.room-99')).toBe('tok-primary-host');
    expect(onCreated).toHaveBeenCalledWith(OK_RESPONSE);
  });

  it('client-side rejects empty title before posting', async () => {
    const createRoomFn = vi.fn();
    renderModal({ createRoomFn });

    await userEvent.selectOptions(screen.getByLabelText(/story/i), 'zork');
    await userEvent.type(screen.getByLabelText(/display name/i), 'Alice');
    await userEvent.click(screen.getByRole('button', { name: /^create room$/i }));

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
    expect(createRoomFn).not.toHaveBeenCalled();
  });

  it('server invalid_title → inline field error on Title', async () => {
    const createRoomFn = vi
      .fn()
      .mockRejectedValue(new ApiError(400, { code: 'invalid_title', detail: 'title must be 80 characters or fewer' }));
    renderModal({ createRoomFn });

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /^create room$/i }));

    expect(
      await screen.findByText(/title must be 80 characters or fewer/i),
    ).toBeInTheDocument();
  });

  it('server unknown_story → inline field error on Story', async () => {
    const createRoomFn = vi
      .fn()
      .mockRejectedValue(new ApiError(400, { code: 'unknown_story', detail: 'No story with slug zork' }));
    renderModal({ createRoomFn });

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /^create room$/i }));

    expect(await screen.findByText(/no story with slug zork/i)).toBeInTheDocument();
  });

  it('server 500 → form-level alert', async () => {
    const createRoomFn = vi
      .fn()
      .mockRejectedValue(new ApiError(500, { code: 'internal_error', detail: 'unexpected server error' }));
    renderModal({ createRoomFn });

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /^create room$/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/unexpected server error/i);
  });

  it('network error → generic form-level alert', async () => {
    const createRoomFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    renderModal({ createRoomFn });

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /^create room$/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/network error/i);
  });

  it('Esc dismisses the modal via onClose', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
