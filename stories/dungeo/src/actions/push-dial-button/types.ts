/**
 * PUSH DIAL BUTTON Action Types
 *
 * Action for pushing the button on the sundial at the Parapet
 */

export const PUSH_DIAL_BUTTON_ACTION_ID = 'dungeo.push-dial-button';

export const PushDialButtonMessages = {
  PUSH_BUTTON: 'dungeo.dial.push_button',
  MACHINERY_SOUNDS: 'dungeo.dial.machinery_sounds',
  CELL_ROTATES: 'dungeo.dial.cell_rotates',
  NOT_AT_PARAPET: 'dungeo.dial.not_at_parapet',
  NO_BUTTON: 'dungeo.dial.no_button'
} as const;

export type PushDialButtonMessageId = typeof PushDialButtonMessages[keyof typeof PushDialButtonMessages];
