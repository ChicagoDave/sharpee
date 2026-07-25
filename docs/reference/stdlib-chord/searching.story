## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.searching`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/searching/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: searching" by "Sharpee (generated)"
  id: stdlib-chord-searching
  version: 1.0.0
  reference-only: true

## Action  : if.action.searching
## Group   : sensory
## Verbs   : search, look in, look inside, look through, rummage, rummage in, rummage through, examine  closely
## Objects : direct object required
## Slots   : target   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.searched
## Summary : SEARCH/LOOK IN - Search objects or locations for hidden items or additional details. Example: SEARCH DESK

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   searching-not-visible             not_visible                             {You} {can't} see {the target} to search it.
##   searching-not-reachable           not_reachable                           {You} {can't} reach {the target} to search it.
##   searching-container-closed        container_closed                        {capitalize the target} {verb:is target} closed.
##   searching-nothing-special         nothing_special                         {You} {find} nothing of interest.
##   searching-found-items             found_items                             {You} {discover}: {items}.
##   searching-empty-container         empty_container                         {capitalize the target} {verb:is target} empty.
##   searching-container-contents      container_contents                      In {the target} {you} {see}: {items}.
##   searching-supporter-contents      supporter_contents                      On {the target} {you} {see}: {items}.
##   searching-searched-location       searched_location                       {You} {search} around carefully.
##   searching-searched-object         searched_object                         {You} {search} {the target} thoroughly.
##   searching-found-concealed-in-contafound_concealed_in_container            Hidden inside {the target}, {you} {discover}: {items}.
##   searching-found-concealed-on-suppofound_concealed_on_supporter            Hidden on {the target}, {you} {discover}: {items}.
##   searching-found-concealed-here    found_concealed_here                    Hidden here, {you} {discover}: {items}.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.searched (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
