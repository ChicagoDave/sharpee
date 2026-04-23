/**
 * RoomHeader behaviour tests.
 *
 * Behavior Statement — RoomHeader
 *   DOES: renders the room title, the persistent REC indicator, a Copy URL
 *         button that writes `origin + /r/:code` to the clipboard, and a
 *         Copy code button that writes the raw code to the clipboard.
 *   WHEN: the room view is rendered.
 *   BECAUSE: share-out requires a copyable URL and code (ADR-153 Decision 3);
 *            REC is the persistent recording-transparency cue (Decision 8).
 *   REJECTS WHEN: no code → Copy-code button is not rendered; Copy-URL
 *                 falls back to `window.location.href`.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoomHeader from './RoomHeader';

describe('<RoomHeader>', () => {
  it('renders the title and REC indicator', () => {
    render(<RoomHeader title="Alpha Session" code="XYZ123" writeClipboard={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Alpha Session' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /recorded/i })).toBeInTheDocument();
  });

  it('Copy URL writes origin + /r/:code to the clipboard', async () => {
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    render(<RoomHeader title="Alpha" code="XYZ123" writeClipboard={writeClipboard} />);

    await userEvent.click(screen.getByRole('button', { name: /copy room url/i }));

    expect(writeClipboard).toHaveBeenCalledTimes(1);
    const copied = writeClipboard.mock.calls[0]![0] as string;
    expect(copied.endsWith('/r/XYZ123')).toBe(true);
    expect(copied.startsWith(window.location.origin)).toBe(true);
  });

  it('Copy code writes the raw code', async () => {
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    render(<RoomHeader title="Alpha" code="XYZ123" writeClipboard={writeClipboard} />);

    await userEvent.click(screen.getByRole('button', { name: /copy room code/i }));
    expect(writeClipboard).toHaveBeenCalledWith('XYZ123');
  });

  it('hides the Copy code button when no code is known', () => {
    render(<RoomHeader title="Alpha" code={null} writeClipboard={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /copy room code/i })).toBeNull();
    expect(screen.getByRole('button', { name: /copy room url/i })).toBeInTheDocument();
  });

  it('Copy URL with no code falls back to window.location.href', async () => {
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    render(<RoomHeader title="Alpha" code={null} writeClipboard={writeClipboard} />);

    await userEvent.click(screen.getByRole('button', { name: /copy room url/i }));
    expect(writeClipboard).toHaveBeenCalledWith(window.location.href);
  });
});
