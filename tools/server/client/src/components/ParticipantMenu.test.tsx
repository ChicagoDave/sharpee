/**
 * ParticipantMenu behaviour tests.
 *
 * Behavior Statement — ParticipantMenu
 *   DOES: renders a ⋮ trigger and, when open, a `role=menu` dropdown with
 *         either "Mute" or "Unmute" based on the target's current muted flag;
 *         selecting an item dispatches the corresponding ClientMsg via
 *         `send` and closes the menu; outside-click and Esc close the menu.
 *   WHEN: the roster renders a row the viewer has authority over.
 *   BECAUSE: Co-Host+ mute control (ADR-153 Decision 9).
 *   REJECTS WHEN: N/A — gating is done by the roster (canModerate) before
 *                 the component is rendered.
 *
 * Behavior Statement — canModerate
 *   DOES: returns true iff the viewer may mute/unmute the target per
 *         ADR-153 Decision 4 (PH→anyone-but-self; CH→CE+Participant only).
 *   REJECTS WHEN: viewer is null, viewer === target, or viewer tier is
 *                 below co-host.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ParticipantMenu from './ParticipantMenu';
import { canDemoteTo, canModerate, canPromoteTo } from '../state/authority';
import type { ClientMsg, ParticipantSummary, Tier } from '../types/wire';

function makeTarget(overrides: Partial<ParticipantSummary> = {}): ParticipantSummary {
  return {
    participant_id: 'p-target',
    handle: 'Bob',
    tier: 'participant',
    connected: true,
    muted: false,
    ...overrides,
  };
}

const PH_VIEWER = { participant_id: 'p-viewer', tier: 'primary_host' as Tier };
const CH_VIEWER = { participant_id: 'p-viewer', tier: 'co_host' as Tier };

describe('canModerate — ADR-153 authority matrix', () => {
  type Case = {
    viewerTier: Tier;
    targetTier: Tier;
    expected: boolean;
    why: string;
  };
  const cases: Case[] = [
    // PH
    { viewerTier: 'primary_host', targetTier: 'co_host', expected: true, why: 'PH over CH' },
    { viewerTier: 'primary_host', targetTier: 'command_entrant', expected: true, why: 'PH over CE' },
    { viewerTier: 'primary_host', targetTier: 'participant', expected: true, why: 'PH over Participant' },
    // CH
    { viewerTier: 'co_host', targetTier: 'primary_host', expected: false, why: 'CH cannot touch PH' },
    { viewerTier: 'co_host', targetTier: 'co_host', expected: false, why: 'CH cannot touch other CH' },
    { viewerTier: 'co_host', targetTier: 'command_entrant', expected: true, why: 'CH can moderate CE' },
    { viewerTier: 'co_host', targetTier: 'participant', expected: true, why: 'CH can moderate Participant' },
    // CE
    { viewerTier: 'command_entrant', targetTier: 'participant', expected: false, why: 'CE has no authority' },
    { viewerTier: 'command_entrant', targetTier: 'command_entrant', expected: false, why: 'CE has no authority' },
    // Participant
    { viewerTier: 'participant', targetTier: 'participant', expected: false, why: 'Participant has no authority' },
  ];
  it.each(cases)('$why', ({ viewerTier, targetTier, expected }) => {
    const result = canModerate(
      { participant_id: 'p-viewer', tier: viewerTier },
      { participant_id: 'p-target', tier: targetTier },
    );
    expect(result).toBe(expected);
  });

  it('viewer cannot moderate themselves', () => {
    expect(
      canModerate(
        { participant_id: 'p-me', tier: 'primary_host' },
        { participant_id: 'p-me', tier: 'primary_host' },
      ),
    ).toBe(false);
  });

  it('null viewer means no authority', () => {
    expect(
      canModerate(null, { participant_id: 'p-x', tier: 'participant' }),
    ).toBe(false);
  });
});

describe('<ParticipantMenu>', () => {
  it('clicking ⋮ opens a dropdown showing Mute for an unmuted target', async () => {
    const send = vi.fn<(msg: ClientMsg) => void>();
    render(<ParticipantMenu viewer={PH_VIEWER} target={makeTarget()} send={send} />);
    await userEvent.click(screen.getByRole('button', { name: /actions for bob/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /^mute$/i })).toBeInTheDocument();
  });

  it('shows Unmute for a muted target', async () => {
    const send = vi.fn<(msg: ClientMsg) => void>();
    render(
      <ParticipantMenu viewer={PH_VIEWER} target={makeTarget({ muted: true })} send={send} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /actions for bob/i }));
    expect(screen.getByRole('menuitem', { name: /^unmute$/i })).toBeInTheDocument();
    // Exact match — "Unmute" would otherwise match /mute/i.
    expect(screen.queryByRole('menuitem', { name: 'Mute' })).toBeNull();
  });

  it('selecting Mute emits a ClientMsg kind=mute with the target id and closes the menu', async () => {
    const send = vi.fn<(msg: ClientMsg) => void>();
    render(<ParticipantMenu viewer={PH_VIEWER} target={makeTarget()} send={send} />);
    await userEvent.click(screen.getByRole('button', { name: /actions for bob/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Mute' }));
    expect(send).toHaveBeenCalledWith({ kind: 'mute', target_participant_id: 'p-target' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('selecting Unmute emits kind=unmute and closes the menu', async () => {
    const send = vi.fn<(msg: ClientMsg) => void>();
    render(
      <ParticipantMenu viewer={PH_VIEWER} target={makeTarget({ muted: true })} send={send} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /actions for bob/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /^unmute$/i }));
    expect(send).toHaveBeenCalledWith({ kind: 'unmute', target_participant_id: 'p-target' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Escape closes the menu without dispatching', async () => {
    const send = vi.fn<(msg: ClientMsg) => void>();
    render(<ParticipantMenu viewer={PH_VIEWER} target={makeTarget()} send={send} />);
    await userEvent.click(screen.getByRole('button', { name: /actions for bob/i }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  it('click outside the menu closes it', async () => {
    const send = vi.fn<(msg: ClientMsg) => void>();
    render(
      <div>
        <span data-testid="outside">outside</span>
        <ParticipantMenu viewer={PH_VIEWER} target={makeTarget()} send={send} />
      </div>,
    );
    await userEvent.click(screen.getByRole('button', { name: /actions for bob/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('outside'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('PH over Participant: menu offers Promote to Command Entrant and Promote to Co-Host', async () => {
    const send = vi.fn<(msg: ClientMsg) => void>();
    render(<ParticipantMenu viewer={PH_VIEWER} target={makeTarget()} send={send} />);
    await userEvent.click(screen.getByRole('button', { name: /actions for bob/i }));
    expect(
      screen.getByRole('menuitem', { name: /promote to command entrant/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /promote to co-host/i }),
    ).toBeInTheDocument();
  });

  it('PH over Co-Host: menu offers Demote to Command Entrant and Demote to Participant — no Promote', async () => {
    const send = vi.fn<(msg: ClientMsg) => void>();
    render(
      <ParticipantMenu
        viewer={PH_VIEWER}
        target={makeTarget({ tier: 'co_host' })}
        send={send}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /actions for bob/i }));
    expect(
      screen.getByRole('menuitem', { name: /demote to command entrant/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /demote to participant/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /^promote/i })).toBeNull();
  });

  it('CH over Participant: offers only Promote to Command Entrant', async () => {
    const send = vi.fn<(msg: ClientMsg) => void>();
    render(<ParticipantMenu viewer={CH_VIEWER} target={makeTarget()} send={send} />);
    await userEvent.click(screen.getByRole('button', { name: /actions for bob/i }));
    expect(
      screen.getByRole('menuitem', { name: /promote to command entrant/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /promote to co-host/i })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: /^demote/i })).toBeNull();
  });

  it('CH over Command Entrant: offers only Demote to Participant', async () => {
    const send = vi.fn<(msg: ClientMsg) => void>();
    render(
      <ParticipantMenu
        viewer={CH_VIEWER}
        target={makeTarget({ tier: 'command_entrant' })}
        send={send}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /actions for bob/i }));
    expect(
      screen.getByRole('menuitem', { name: /demote to participant/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /^promote/i })).toBeNull();
    expect(
      screen.queryByRole('menuitem', { name: /demote to command entrant/i }),
    ).toBeNull();
  });

  it('selecting Promote to Co-Host emits kind=promote with to_tier=co_host', async () => {
    const send = vi.fn<(msg: ClientMsg) => void>();
    render(<ParticipantMenu viewer={PH_VIEWER} target={makeTarget()} send={send} />);
    await userEvent.click(screen.getByRole('button', { name: /actions for bob/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /promote to co-host/i }));
    expect(send).toHaveBeenCalledWith({
      kind: 'promote',
      target_participant_id: 'p-target',
      to_tier: 'co_host',
    });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('PH → Co-Host target with onOpenDm: menu shows "DM {name}" and selecting it invokes onOpenDm(peer_id)', async () => {
    const onOpenDm = vi.fn();
    render(
      <ParticipantMenu
        viewer={PH_VIEWER}
        target={makeTarget({ tier: 'co_host' })}
        send={vi.fn()}
        onOpenDm={onOpenDm}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /actions for bob/i }));
    const dmItem = screen.getByRole('menuitem', { name: /^dm bob$/i });
    await userEvent.click(dmItem);
    expect(onOpenDm).toHaveBeenCalledWith('p-target');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Co-Host viewer: no DM item appears (DM axis is PH→CH only)', async () => {
    render(
      <ParticipantMenu
        viewer={CH_VIEWER}
        target={makeTarget({ tier: 'co_host' })}
        send={vi.fn()}
        onOpenDm={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /actions for bob/i }));
    expect(screen.queryByRole('menuitem', { name: /^dm bob$/i })).toBeNull();
  });

  it('PH → Participant target: no DM item (only PH→Co-Host axis renders)', async () => {
    render(
      <ParticipantMenu
        viewer={PH_VIEWER}
        target={makeTarget()}
        send={vi.fn()}
        onOpenDm={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /actions for bob/i }));
    expect(screen.queryByRole('menuitem', { name: /^dm bob$/i })).toBeNull();
  });

  it('selecting Demote to Participant emits kind=demote with to_tier=participant', async () => {
    const send = vi.fn<(msg: ClientMsg) => void>();
    render(
      <ParticipantMenu
        viewer={PH_VIEWER}
        target={makeTarget({ tier: 'co_host' })}
        send={send}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /actions for bob/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /demote to participant/i }));
    expect(send).toHaveBeenCalledWith({
      kind: 'demote',
      target_participant_id: 'p-target',
      to_tier: 'participant',
    });
  });
});

describe('canPromoteTo / canDemoteTo', () => {
  const PH = { participant_id: 'v', tier: 'primary_host' as Tier };
  const CH = { participant_id: 'v', tier: 'co_host' as Tier };
  const CE = { participant_id: 'v', tier: 'command_entrant' as Tier };

  const part = (tier: Tier) => ({ participant_id: 't', tier });

  it('PH can promote Participant to CE', () => {
    expect(canPromoteTo(PH, part('participant'), 'command_entrant')).toBe(true);
  });
  it('PH can promote Participant to CH', () => {
    expect(canPromoteTo(PH, part('participant'), 'co_host')).toBe(true);
  });
  it('CH cannot promote CE to CH', () => {
    expect(canPromoteTo(CH, part('command_entrant'), 'co_host')).toBe(false);
  });
  it('CH can promote Participant to CE', () => {
    expect(canPromoteTo(CH, part('participant'), 'command_entrant')).toBe(true);
  });
  it('CE cannot promote anyone', () => {
    expect(canPromoteTo(CE, part('participant'), 'command_entrant')).toBe(false);
  });
  it('promote to the same or lower tier is rejected (no-op)', () => {
    expect(canPromoteTo(PH, part('command_entrant'), 'command_entrant')).toBe(false);
    expect(canPromoteTo(PH, part('co_host'), 'command_entrant')).toBe(false);
  });
  it('PH can demote CH to Participant', () => {
    expect(canDemoteTo(PH, part('co_host'), 'participant')).toBe(true);
  });
  it('CH can demote CE to Participant', () => {
    expect(canDemoteTo(CH, part('command_entrant'), 'participant')).toBe(true);
  });
  it('CH cannot demote CH', () => {
    expect(canDemoteTo(CH, part('co_host'), 'participant')).toBe(false);
  });
  it('demote to a higher tier is rejected', () => {
    expect(canDemoteTo(PH, part('participant'), 'command_entrant')).toBe(false);
  });
});
