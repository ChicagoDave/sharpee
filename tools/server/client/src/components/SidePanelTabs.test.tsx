/**
 * SidePanelTabs behaviour tests.
 *
 * Behavior Statement — SidePanelTabs
 *   DOES: renders a role=tablist with one role=tab per descriptor; marks
 *         the active tab with aria-selected=true and a 0 tabIndex; others
 *         get -1; clicking a tab invokes onSelect with its id; Left/Right
 *         arrows cycle through tabs with wrap-around; Home/End jump to
 *         first/last; renders the active panel via the renderBody
 *         callback; renders an unread badge when the descriptor has
 *         unread > 0.
 *   WHEN: the right-side panel mounts.
 *   BECAUSE: ADR-153 Decision 8 — DM tabs join the room chat on the same
 *            axis; the primitive is generic and reusable.
 *   REJECTS WHEN: N/A — presentational.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SidePanelTabs from './SidePanelTabs';

describe('<SidePanelTabs>', () => {
  it('single tab: renders the tab, marks it active, and renders its body', () => {
    render(
      <SidePanelTabs
        tabs={[{ id: 'room', label: 'Room' }]}
        activeId="room"
        onSelect={vi.fn()}
        renderBody={(id) => <div data-testid="body">{id}</div>}
      />,
    );
    const list = screen.getByRole('tablist', { name: /side panel/i });
    expect(within(list).getByRole('tab', { name: /^room$/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('body')).toHaveTextContent('room');
  });

  it('click: invokes onSelect with the clicked tab id', async () => {
    const onSelect = vi.fn();
    render(
      <SidePanelTabs
        tabs={[
          { id: 'room', label: 'Room' },
          { id: 'dm-a', label: 'Alice' },
        ]}
        activeId="room"
        onSelect={onSelect}
        renderBody={() => null}
      />,
    );
    await userEvent.click(screen.getByRole('tab', { name: /alice/i }));
    expect(onSelect).toHaveBeenCalledWith('dm-a');
  });

  it('arrow keys cycle and Home/End jump, each invoking onSelect', async () => {
    const onSelect = vi.fn();
    render(
      <SidePanelTabs
        tabs={[
          { id: 'room', label: 'Room' },
          { id: 'dm-a', label: 'Alice' },
          { id: 'dm-b', label: 'Bob' },
        ]}
        activeId="room"
        onSelect={onSelect}
        renderBody={() => null}
      />,
    );
    const roomTab = screen.getByRole('tab', { name: /^room$/i });
    roomTab.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onSelect).toHaveBeenLastCalledWith('dm-a');
    await userEvent.keyboard('{ArrowLeft}');
    expect(onSelect).toHaveBeenLastCalledWith('dm-b'); // wrap-around from room
    await userEvent.keyboard('{End}');
    expect(onSelect).toHaveBeenLastCalledWith('dm-b');
    await userEvent.keyboard('{Home}');
    expect(onSelect).toHaveBeenLastCalledWith('room');
  });

  it('renders an unread badge when unread > 0', () => {
    render(
      <SidePanelTabs
        tabs={[
          { id: 'room', label: 'Room' },
          { id: 'dm-a', label: 'Alice', unread: 3 },
        ]}
        activeId="room"
        onSelect={vi.fn()}
        renderBody={() => null}
      />,
    );
    const badge = screen.getByLabelText(/3 unread/);
    expect(badge).toHaveTextContent('3');
  });

  it('clamps unread badge display at 99+', () => {
    render(
      <SidePanelTabs
        tabs={[{ id: 'room', label: 'Room', unread: 1337 }]}
        activeId="room"
        onSelect={vi.fn()}
        renderBody={() => null}
      />,
    );
    expect(screen.getByLabelText(/1337 unread/)).toHaveTextContent('99+');
  });

  it('does not render a badge when unread is 0 or undefined', () => {
    render(
      <SidePanelTabs
        tabs={[
          { id: 'room', label: 'Room' },
          { id: 'dm-a', label: 'Alice', unread: 0 },
        ]}
        activeId="room"
        onSelect={vi.fn()}
        renderBody={() => null}
      />,
    );
    expect(screen.queryByLabelText(/unread/i)).toBeNull();
  });
});
