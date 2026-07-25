## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.help`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/help/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: help" by "Sharpee (generated)"
  id: stdlib-chord-help
  version: 1.0.0
  reference-only: true

## Action  : if.action.help
## Group   : meta
## Verbs   : help, ?, commands, h
## Emits   : if.event.help_displayed
## Summary : HELP - Get help on game commands and topics. Example: HELP MOVEMENT

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   help-general                      general                                 Welcome to Interactive Fiction! Basic commands: - LOOK (L): Examine your surroundings - INVENTORY (I): List what you're carrying - EXAMINE (X) [object]: Look at something closely - TAKE/DROP [object]: Pick up or put down items - GO [direction] or just [direction]: Move around For more help on a specific topic, type HELP [topic].
##   help-topic                        topic                                   Help on {verbatim:topic}:
##   help-unknown-topic                unknown_topic                           No help available on '{verbatim:topic}'. Type HELP for general help.
##   help-help-movement                help_movement                           Movement commands: - GO NORTH/SOUTH/EAST/WEST (or just N/S/E/W) - UP/DOWN (U/D) - IN/OUT - ENTER [place] - EXIT
##   help-help-objects                 help_objects                            Object commands: - TAKE/GET [object] - DROP [object] - EXAMINE/LOOK AT [object] - OPEN/CLOSE [object] - PUT [object] IN/ON [container] - WEAR/REMOVE [clothing]
##   help-help-special                 help_special                            Special commands: - SAVE/RESTORE: Save and load your game - SCORE: Check your progress - WAIT (Z): Let time pass - AGAIN (G): Repeat last command - QUIT: Exit the game
##   help-first-time                   first_time                              New to Interactive Fiction? Try these commands to get started: - LOOK to see where you are - INVENTORY to see what you're carrying - EXAMINE interesting objects - Go in compass directions (NORTH, SOUTH, etc.)
##   help-hints-available              hints_available                         Hints are available. Type HINTS to see them.
##   help-hints-disabled               hints_disabled                          Hints are not available in this game.
##   help-stuck-help                   stuck_help                              If you're stuck, try: - LOOK around carefully - EXAMINE everything - Check your INVENTORY - Try different verbs with objects
##   help-help-footer                  help_footer                             For a complete list of commands, consult the game documentation.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.help_displayed (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
