## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.examining`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/examining/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: examining" by "Sharpee (generated)"
  id: stdlib-chord-examining
  version: 1.0.0
  reference-only: true

## Action  : if.action.examining
## Group   : observation
## Verbs   : examine, x, look at, inspect, study, read
## Objects : direct object required
## Slots   : target   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.examined
## Summary : EXAMINE/X/LOOK AT - Look closely at objects to see detailed descriptions. Example: X BOOK

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   examining-no-target               no_target                               Examine what?
##   examining-not-visible             not_visible                             {You} {can't} see {the item} here.
##   examining-cant-see                cant_see                                {You} {can't} see {the item} here.
##   examining-examined                examined                                {verbatim:description}{slot:detail}
##   examining-examined-self           examined_self                           {verbatim:description}
##   examining-examined-container      examined_container                      {verbatim:description}{slot:detail}
##   examining-examined-supporter      examined_supporter                      {verbatim:description}{slot:detail}
##   examining-examined-readable       examined_readable                       {verbatim:description}{slot:detail}
##   examining-examined-switchable     examined_switchable                     {verbatim:description}{slot:detail}
##   examining-examined-wearable       examined_wearable                       {verbatim:description}{slot:detail}
##   examining-examined-door           examined_door                           {verbatim:description}{slot:detail}
##   examining-examined-wall           examined_wall                           {verbatim:description}{slot:detail}
##   examining-nothing-special         nothing_special                         {You} {see} nothing special about {the item}.
##   examining-default-description     default_description                     {capitalize the item} {verb:is item} just {a item}.{slot:detail}
##   examining-default-description-selfdefault_description_self                As good-looking as ever.
##   examining-description             description                             {verbatim:description}{slot:detail}
##   examining-brief-description       brief_description                       {verbatim:description}
##   examining-no-description          no_description                          {You} {see} nothing special about {the item}.
##   examining-container-open          container_open                          {capitalize the item} {verb:is item} open.
##   examining-container-closed        container_closed                        {capitalize the item} {verb:is item} closed.
##   examining-container-empty         container_empty                         {capitalize the item} {verb:is item} empty.
##   examining-container-contents      container_contents                      In {the container} {you} {see} {items}.
##   examining-surface-contents        surface_contents                        On {the surface} {you} {see} {items}.
##   examining-worn-by-you             worn_by_you                             {You} {are} wearing {the item}.
##   examining-worn-by-other           worn_by_other                           {actor} {verb:is actor} wearing {the item}.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.examined (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
