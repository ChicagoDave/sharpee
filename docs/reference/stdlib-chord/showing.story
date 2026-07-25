## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.showing`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/showing/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: showing" by "Sharpee (generated)"
  id: stdlib-chord-showing
  version: 1.0.0
  reference-only: true

## Action  : if.action.showing
## Group   : social
## Verbs   : show  to, show, display  to, reveal  to, present  to
## Objects : direct object required; indirect object required
## Slots   : item, viewer   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.show_blocked, if.event.shown
## Summary : SHOW TO - Show objects to other characters. Example: SHOW BADGE TO GUARD

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   showing-no-item                   no_item                                 Show what?
##   showing-no-viewer                 no_viewer                               Show it to whom?
##   showing-not-carrying              not_carrying                            {You} aren't carrying {the item}.
##   showing-viewer-not-visible        viewer_not_visible                      {You} {can't} see {the viewer}.
##   showing-viewer-too-far            viewer_too_far                          {capitalize the viewer} {verb:is viewer} too far away to see clearly.
##   showing-not-actor                 not_actor                               {You} can only show things to people.
##   showing-self                      self                                    {You} {examine} {the item} closely.
##   showing-shown                     shown                                   {You} {show} {the item} to {the viewer}.
##   showing-viewer-examines           viewer_examines                         {capitalize the viewer} examines {the item} carefully.
##   showing-viewer-nods               viewer_nods                             {capitalize the viewer} nods.
##   showing-viewer-impressed          viewer_impressed                        {capitalize the viewer} looks impressed.
##   showing-viewer-unimpressed        viewer_unimpressed                      {capitalize the viewer} seems unimpressed.
##   showing-viewer-recognizes         viewer_recognizes                       {capitalize the viewer} recognizes {the item}!
##   showing-wearing-shown             wearing_shown                           {You} {show} {the viewer} that {you're} wearing {the item}.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.show_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
