/**
 * Push Panel Action Types
 *
 * Story-specific action for pushing wall panels in the Inside Mirror puzzle.
 * Bypasses stdlib push validation which rejects scenery objects.
 */

export const PUSH_PANEL_ACTION_ID = 'dungeo.action.push_panel';

export const PushPanelMessages = {
  // Success messages
  BOX_ROTATES: 'dungeo.mirror.box_rotates',
  BOX_MOVES: 'dungeo.mirror.box_moves',

  // Error messages
  NOT_IN_MIRROR: 'dungeo.push_panel.not_in_mirror',
  NO_TARGET: 'dungeo.push_panel.no_target',
  NOT_VISIBLE: 'dungeo.push_panel.not_visible',
  NOT_A_PANEL: 'dungeo.push_panel.not_a_panel',
  BOX_CANT_ROTATE: 'dungeo.mirror.box_cant_rotate',
  BOX_CANT_MOVE_UNLOCKED: 'dungeo.mirror.box_cant_move_unlocked',
  BOX_CANT_MOVE_ORIENTATION: 'dungeo.mirror.box_cant_move_orientation',
  BOX_AT_END: 'dungeo.mirror.box_at_end',
} as const;
