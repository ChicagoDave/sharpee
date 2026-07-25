## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.drinking`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/drinking/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: drinking" by "Sharpee (generated)"
  id: stdlib-chord-drinking
  version: 1.0.0
  reference-only: true

## Action  : if.action.drinking
## Group   : interaction
## Verbs   : drink, drink from, sip, sip from, quaff, imbibe, swallow
## Objects : direct object required
## Slots   : item   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.drunk, if.event.taken
## Summary : DRINK - Drink liquids to quench thirst or gain effects. Example: DRINK WATER

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   drinking-no-item                  no_item                                 Drink what?
##   drinking-not-visible              not_visible                             {You} {can't} see {the item}.
##   drinking-not-reachable            not_reachable                           {You} {can't} reach {the item}.
##   drinking-not-drinkable            not_drinkable                           That's not something {you} can drink.
##   drinking-already-consumed         already_consumed                        There's nothing left to drink.
##   drinking-container-closed         container_closed                        {You} {need} to open {the item} first.
##   drinking-drunk                    drunk                                   {You} {drink} {the item}.
##   drinking-drunk-all                drunk_all                               {You} {drink} all of {the item}.
##   drinking-drunk-some               drunk_some                              {You} {drink} some of {the item}.
##   drinking-drunk-from               drunk_from                              {You} {drink} from {the item}.
##   drinking-refreshing               refreshing                              {You} {drink} {the item}. How refreshing!
##   drinking-satisfying               satisfying                              {You} {drink} {the item}. That hits the spot.
##   drinking-bitter                   bitter                                  {You} {drink} {the item}. It's quite bitter.
##   drinking-sweet                    sweet                                   {You} {drink} {the item}. It's sweet.
##   drinking-strong                   strong                                  {You} {drink} {the item}. It's strong!
##   drinking-thirst-quenched          thirst_quenched                         {You} {drink} {the item}. {Your} thirst is quenched.
##   drinking-still-thirsty            still_thirsty                           {You} {drink} {the item}, but {you're} still thirsty.
##   drinking-magical-effects          magical_effects                         {You} {drink} {the item}. {You} {feel} strange...
##   drinking-healing                  healing                                 {You} {drink} {the item}. {You} {feel} better!
##   drinking-from-container           from_container                          {You} {drink} the {liquidType} from {the item}.
##   drinking-empty-now                empty_now                               {You} {drink} the last of the {liquidType}.
##   drinking-some-remains             some_remains                            {You} {drink} some {liquidType}. Some remains.
##   drinking-sipped                   sipped                                  {You} {take} a sip of {the item}.
##   drinking-quaffed                  quaffed                                 {You} {quaff} {the item} heartily.
##   drinking-gulped                   gulped                                  {You} {gulp} down {the item}.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.drunk (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
