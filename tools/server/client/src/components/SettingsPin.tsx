/**
 * SettingsPin — PH-only toggle for pin / unpin. Pinning exempts the room
 * from the idle-recycle sweep (ADR-153 Decision 12).
 *
 * Public interface: {@link SettingsPin} default export.
 *
 * Bounded context: client room settings (Plan 02 Phase 4). Display-only
 * authority check lives here as a belt-and-braces; the SettingsPanel is
 * only rendered for the PH so non-PH viewers should never see this.
 */

import Button from './Button';
import { sendPin, sendUnpin, type Sender } from '../api/ws';

export interface SettingsPinProps {
  pinned: boolean;
  send: Sender;
}

export default function SettingsPin({ pinned, send }: SettingsPinProps): JSX.Element {
  return (
    <section
      aria-labelledby="settings-pin-heading"
      style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
    >
      <h3
        id="settings-pin-heading"
        style={{ margin: 0, fontSize: '0.95rem' }}
      >
        Pin
      </h3>
      <p style={{ margin: 0, color: 'var(--sharpee-text-muted)', fontSize: '0.85rem' }}>
        {pinned
          ? 'Pinned rooms are exempt from idle recycling.'
          : 'Pin to keep this room alive through long idle periods.'}
      </p>
      <Button
        variant={pinned ? 'secondary' : 'primary'}
        onClick={() => (pinned ? sendUnpin(send) : sendPin(send))}
        aria-pressed={pinned}
        style={{ alignSelf: 'start' }}
      >
        {pinned ? 'Unpin room' : 'Pin room'}
      </Button>
    </section>
  );
}
