/**
 * SaveButton — Command Entrant+ trigger for SAVE round-trip.
 *
 * Public interface: {@link SaveButton} default export.
 *
 * Bounded context: client save/restore (Plan 03 Phase 1; ADR-153 D10).
 *
 * The server auto-generates the save name (story slug / turn / timestamp)
 * on SAVE — there's no name parameter on the wire. A future extension can
 * add an authored name; for MVP a single click is enough.
 */

import Button from './Button';
import { sendSave, type Sender } from '../api/ws';

export interface SaveButtonProps {
  send: Sender;
  /** True while a save is in flight — disables the button to avoid double-taps. */
  disabled?: boolean;
}

export default function SaveButton({
  send,
  disabled = false,
}: SaveButtonProps): JSX.Element {
  return (
    <Button
      type="button"
      variant="primary"
      disabled={disabled}
      onClick={() => sendSave(send)}
      aria-label="Save game"
    >
      Save game
    </Button>
  );
}
