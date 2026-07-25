## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.looking`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/looking/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: looking" by "Sharpee (generated)"
  id: stdlib-chord-looking
  version: 1.0.0
  reference-only: true

## Action  : if.action.looking
## Group   : observation
## Verbs   : look, l, look around, look at, examine, x
## Emits   : if.event.looked
## Summary : LOOK/L - Look around the current location to see what is there. Example: LOOK

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   looking-room-description          room_description                        {name} {verbatim:description}
##   looking-room-dark                 room_dark                               It's pitch dark, and {you} {can't} see a thing.
##   looking-exits                     exits                                   Exits: {exits}
##   looking-you-see                   you_see                                 {You} can {see} {items} here.
##   looking-contents-list             contents_list                           {You} can {see} {items} here.
##   looking-nothing-special           nothing_special                         {You} {see} nothing special.
##   looking-container-contents        container_contents                      In {the container} {you} {see} {items}.
##   looking-surface-contents          surface_contents                        On {the surface} {you} {see} {items}.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.looked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
