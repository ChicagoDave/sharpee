/**
 * Puzzle-Specific Grammar
 *
 * Patterns for puzzle mechanics: Royal Puzzle walls, Inside Mirror panels,
 * mirror pole, dial controls, dam mechanics, coal machine, tiny room, etc.
 */

import { GrammarBuilder } from '@sharpee/if-domain';
import {
  PUSH_WALL_ACTION_ID,
  PUSH_PANEL_ACTION_ID,
  LIFT_ACTION_ID,
  LOWER_ACTION_ID,
  SET_DIAL_ACTION_ID,
  PUSH_DIAL_BUTTON_ACTION_ID,
  PRESS_BUTTON_ACTION_ID,
  TURN_BOLT_ACTION_ID,
  TURN_SWITCH_ACTION_ID,
  PUT_UNDER_ACTION_ID,
  PUSH_KEY_ACTION_ID,
  DIG_ACTION_ID,
  SEND_ACTION_ID,
  WALK_THROUGH_ACTION_ID,
  MELT_ACTION_ID
} from '../actions';

/**
 * Register puzzle-specific grammar patterns
 */
export function registerPuzzleGrammar(grammar: GrammarBuilder): void {
  // ============================================================
  // Walk through action (Bank of Zork puzzle)
  // ============================================================
  grammar
    .define('walk through :target')
    .mapsTo(WALK_THROUGH_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('go through :target')
    .mapsTo(WALK_THROUGH_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('pass through :target')
    .mapsTo(WALK_THROUGH_ACTION_ID)
    .withPriority(150)
    .build();

  // Explicit patterns for walls (higher priority)
  grammar
    .define('walk through south wall')
    .mapsTo(WALK_THROUGH_ACTION_ID)
    .withPriority(155)
    .build();

  grammar
    .define('walk through north wall')
    .mapsTo(WALK_THROUGH_ACTION_ID)
    .withPriority(155)
    .build();

  grammar
    .define('go through south wall')
    .mapsTo(WALK_THROUGH_ACTION_ID)
    .withPriority(155)
    .build();

  grammar
    .define('go through north wall')
    .mapsTo(WALK_THROUGH_ACTION_ID)
    .withPriority(155)
    .build();

  // ============================================================
  // Push wall action (Royal Puzzle) - uses direction slot type
  // ============================================================
  grammar
    .define('push :direction wall')
    .direction('direction')
    .mapsTo(PUSH_WALL_ACTION_ID)
    .withPriority(160)
    .build();

  grammar
    .define('push the :direction wall')
    .direction('direction')
    .mapsTo(PUSH_WALL_ACTION_ID)
    .withPriority(160)
    .build();

  // ============================================================
  // Push panel action (Inside Mirror wall panels)
  // Higher priority than stdlib push to bypass scenery check
  // ============================================================
  grammar
    .define('push red panel')
    .mapsTo(PUSH_PANEL_ACTION_ID)
    .withPriority(170)
    .build();

  grammar
    .define('push red wall')
    .mapsTo(PUSH_PANEL_ACTION_ID)
    .withPriority(170)
    .build();

  grammar
    .define('push red')
    .mapsTo(PUSH_PANEL_ACTION_ID)
    .withPriority(170)
    .build();

  grammar
    .define('push yellow panel')
    .mapsTo(PUSH_PANEL_ACTION_ID)
    .withPriority(170)
    .build();

  grammar
    .define('push yellow wall')
    .mapsTo(PUSH_PANEL_ACTION_ID)
    .withPriority(170)
    .build();

  grammar
    .define('push yellow')
    .mapsTo(PUSH_PANEL_ACTION_ID)
    .withPriority(170)
    .build();

  grammar
    .define('push mahogany panel')
    .mapsTo(PUSH_PANEL_ACTION_ID)
    .withPriority(170)
    .build();

  grammar
    .define('push mahogany wall')
    .mapsTo(PUSH_PANEL_ACTION_ID)
    .withPriority(170)
    .build();

  grammar
    .define('push mahogany')
    .mapsTo(PUSH_PANEL_ACTION_ID)
    .withPriority(170)
    .build();

  grammar
    .define('push pine panel')
    .mapsTo(PUSH_PANEL_ACTION_ID)
    .withPriority(170)
    .build();

  grammar
    .define('push pine wall')
    .mapsTo(PUSH_PANEL_ACTION_ID)
    .withPriority(170)
    .build();

  grammar
    .define('push pine')
    .mapsTo(PUSH_PANEL_ACTION_ID)
    .withPriority(170)
    .build();

  // ============================================================
  // Lift/Lower pole actions (Inside Mirror puzzle)
  // ============================================================
  grammar
    .define('lift pole')
    .mapsTo(LIFT_ACTION_ID)
    .withPriority(155)
    .build();

  grammar
    .define('raise pole')
    .mapsTo(LIFT_ACTION_ID)
    .withPriority(155)
    .build();

  grammar
    .define('lift short pole')
    .mapsTo(LIFT_ACTION_ID)
    .withPriority(156)
    .build();

  grammar
    .define('raise short pole')
    .mapsTo(LIFT_ACTION_ID)
    .withPriority(156)
    .build();

  grammar
    .define('lower pole')
    .mapsTo(LOWER_ACTION_ID)
    .withPriority(155)
    .build();

  grammar
    .define('lower short pole')
    .mapsTo(LOWER_ACTION_ID)
    .withPriority(156)
    .build();

  // ============================================================
  // Set dial / Push dial button (Parapet dial puzzle)
  // ============================================================
  grammar
    .define('set dial to :number')
    .text('number')
    .mapsTo(SET_DIAL_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('turn dial to :number')
    .text('number')
    .mapsTo(SET_DIAL_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('set indicator to :number')
    .text('number')
    .mapsTo(SET_DIAL_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('turn indicator to :number')
    .text('number')
    .mapsTo(SET_DIAL_ACTION_ID)
    .withPriority(150)
    .build();

  // Push dial button - only specific patterns to avoid laser puzzle button conflict
  grammar
    .define('push dial button')
    .mapsTo(PUSH_DIAL_BUTTON_ACTION_ID)
    .withPriority(165)
    .build();

  grammar
    .define('press dial button')
    .mapsTo(PUSH_DIAL_BUTTON_ACTION_ID)
    .withPriority(165)
    .build();

  grammar
    .define('push the dial button')
    .mapsTo(PUSH_DIAL_BUTTON_ACTION_ID)
    .withPriority(165)
    .build();

  grammar
    .define('press the dial button')
    .mapsTo(PUSH_DIAL_BUTTON_ACTION_ID)
    .withPriority(165)
    .build();

  grammar
    .define('push sundial button')
    .mapsTo(PUSH_DIAL_BUTTON_ACTION_ID)
    .withPriority(165)
    .build();

  grammar
    .define('press sundial button')
    .mapsTo(PUSH_DIAL_BUTTON_ACTION_ID)
    .withPriority(165)
    .build();

  // ============================================================
  // Press button (dam maintenance room)
  // ============================================================
  grammar
    .define('press :target')
    .mapsTo(PRESS_BUTTON_ACTION_ID)
    .withPriority(150)
    .build();

  // ============================================================
  // Turn bolt (dam)
  // ============================================================
  grammar
    .define('turn bolt')
    .mapsTo(TURN_BOLT_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('turn the bolt')
    .mapsTo(TURN_BOLT_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('turn bolt with :instrument')
    .instrument('instrument')
    .mapsTo(TURN_BOLT_ACTION_ID)
    .withPriority(155)
    .build();

  // ============================================================
  // Turn switch (coal machine)
  // ============================================================
  grammar
    .define('turn switch')
    .mapsTo(TURN_SWITCH_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('turn the switch')
    .mapsTo(TURN_SWITCH_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('flip switch')
    .mapsTo(TURN_SWITCH_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('flip the switch')
    .mapsTo(TURN_SWITCH_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('activate machine')
    .mapsTo(TURN_SWITCH_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('activate the machine')
    .mapsTo(TURN_SWITCH_ACTION_ID)
    .withPriority(150)
    .build();

  // ============================================================
  // Tiny Room puzzle - PUT UNDER and PUSH KEY
  // ============================================================
  grammar
    .define('put :item under :target')
    .mapsTo(PUT_UNDER_ACTION_ID)
    .withPriority(160)
    .build();

  grammar
    .define('slide :item under :target')
    .mapsTo(PUT_UNDER_ACTION_ID)
    .withPriority(160)
    .build();

  grammar
    .define('put mat under door')
    .mapsTo(PUT_UNDER_ACTION_ID)
    .withPriority(165)
    .build();

  grammar
    .define('slide mat under door')
    .mapsTo(PUT_UNDER_ACTION_ID)
    .withPriority(165)
    .build();

  grammar
    .define('push key with :tool')
    .mapsTo(PUSH_KEY_ACTION_ID)
    .withPriority(160)
    .build();

  grammar
    .define('push key with screwdriver')
    .mapsTo(PUSH_KEY_ACTION_ID)
    .withPriority(165)
    .build();

  grammar
    .define('use :tool on keyhole')
    .mapsTo(PUSH_KEY_ACTION_ID)
    .withPriority(160)
    .build();

  grammar
    .define('use screwdriver on keyhole')
    .mapsTo(PUSH_KEY_ACTION_ID)
    .withPriority(165)
    .build();

  grammar
    .define('poke key with :tool')
    .mapsTo(PUSH_KEY_ACTION_ID)
    .withPriority(160)
    .build();

  grammar
    .define('push key through keyhole')
    .mapsTo(PUSH_KEY_ACTION_ID)
    .withPriority(165)
    .build();

  // ============================================================
  // Dig action (buried treasure)
  // ============================================================
  grammar
    .define('dig')
    .mapsTo(DIG_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('dig with :tool')
    .mapsTo(DIG_ACTION_ID)
    .withPriority(155)
    .build();

  grammar
    .define('dig :target')
    .mapsTo(DIG_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('dig in :target')
    .mapsTo(DIG_ACTION_ID)
    .withPriority(150)
    .build();

  // ============================================================
  // Send action (mail order puzzle)
  // ============================================================
  grammar
    .define('send for brochure')
    .mapsTo(SEND_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('send for free brochure')
    .mapsTo(SEND_ACTION_ID)
    .withPriority(155)
    .build();

  grammar
    .define('order brochure')
    .mapsTo(SEND_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('mail order')
    .mapsTo(SEND_ACTION_ID)
    .withPriority(145)
    .build();

  // ============================================================
  // Melt action (Glacier puzzle - MDL act1.mud:389-398)
  // Literal target patterns to avoid two-slot ambiguity
  // ============================================================
  grammar
    .define('melt glacier with :instrument')
    .instrument('instrument')
    .mapsTo(MELT_ACTION_ID)
    .withPriority(160)
    .build();

  grammar
    .define('melt ice with :instrument')
    .instrument('instrument')
    .mapsTo(MELT_ACTION_ID)
    .withPriority(160)
    .build();

  grammar
    .define('melt glacier')
    .mapsTo(MELT_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('melt ice')
    .mapsTo(MELT_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('melt :target')
    .mapsTo(MELT_ACTION_ID)
    .withPriority(145)
    .build();
}
