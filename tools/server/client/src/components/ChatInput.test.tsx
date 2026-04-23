/**
 * ChatInput behaviour tests.
 *
 * Behavior Statement — ChatInput
 *   DOES: on Enter with non-empty trimmed text, emits a ClientMsg of kind
 *         `chat` carrying the trimmed text via `send` and clears local
 *         state; shows a muted notice + disables the input when `muted`.
 *   WHEN: the viewer focuses the chat input and presses Enter.
 *   BECAUSE: room chat is the primary communication channel between
 *            participants (ADR-153 Decision 8).
 *   REJECTS WHEN: input is empty/whitespace; viewer is muted;
 *                 Shift+Enter is interpreted as a newline (not a submit).
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInput from './ChatInput';

describe('<ChatInput>', () => {
  it('Enter on non-empty text emits a chat ClientMsg and clears the field', async () => {
    const send = vi.fn();
    render(<ChatInput send={send} />);
    const input = screen.getByLabelText('Chat message') as HTMLInputElement;
    await userEvent.type(input, 'hello{Enter}');
    expect(send).toHaveBeenCalledWith({ kind: 'chat', text: 'hello' });
    expect(input.value).toBe('');
  });

  it('trims surrounding whitespace on send', async () => {
    const send = vi.fn();
    render(<ChatInput send={send} />);
    await userEvent.type(screen.getByLabelText('Chat message'), '   hi   {Enter}');
    expect(send).toHaveBeenCalledWith({ kind: 'chat', text: 'hi' });
  });

  it('empty or whitespace-only input is not sent', async () => {
    const send = vi.fn();
    render(<ChatInput send={send} />);
    await userEvent.type(screen.getByLabelText('Chat message'), '    {Enter}');
    expect(send).not.toHaveBeenCalled();
  });

  it('Shift+Enter does not submit', async () => {
    const send = vi.fn();
    render(<ChatInput send={send} />);
    const input = screen.getByLabelText('Chat message');
    await userEvent.type(input, 'line one');
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    expect(send).not.toHaveBeenCalled();
  });

  it('muted disables the input and surfaces a muted notice', async () => {
    const send = vi.fn();
    render(<ChatInput send={send} muted />);
    const input = screen.getByLabelText('Chat message') as HTMLInputElement;
    expect(input).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/you have been muted/i);
    // Even if a test harness forced typing, muted submit is a no-op.
  });
});
