## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.inventory`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/inventory/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: inventory" by "Sharpee (generated)"
  id: stdlib-chord-inventory
  version: 1.0.0
  reference-only: true

## Action  : if.action.inventory
## Group   : meta
## Verbs   : inventory, i, inv, take inventory, check inventory
## Emits   : if.event.inventory
## Summary : INVENTORY/I - Check what you are carrying and wearing. Example: I

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   inventory-empty                   empty                                   {You} aren't carrying anything.
##   inventory-inventory-empty         inventory_empty                         {You} aren't carrying anything.
##   inventory-nothing-at-all          nothing_at_all                          {You} aren't carrying anything at all.
##   inventory-hands-empty             hands_empty                             {Your} hands are empty.
##   inventory-pockets-empty           pockets_empty                           {Your} pockets are empty.
##   inventory-carrying                carrying                                {You} {be} carrying:
##   inventory-wearing                 wearing                                 {You} {be} wearing:
##   inventory-carrying-and-wearing    carrying_and_wearing                    {You} {be} carrying and wearing:
##   inventory-item-list               item_list                               {item}
##   inventory-holding-list            holding_list                            {items}
##   inventory-worn-list               worn_list                               {items} (worn)
##   inventory-inventory-header        inventory_header                        {You} {be} carrying:
##   inventory-carrying-count          carrying_count                          {You} {be} carrying {holdingCount} item(s).
##   inventory-wearing-count           wearing_count                           {You} {be} wearing {wearingCount} item(s).
##   inventory-burden-light            burden_light                            {You're} traveling light.
##   inventory-burden-heavy            burden_heavy                            {You're} carrying quite a load.
##   inventory-burden-overloaded       burden_overloaded                       {You're} weighed down with everything {you're} carrying.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.inventory (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
