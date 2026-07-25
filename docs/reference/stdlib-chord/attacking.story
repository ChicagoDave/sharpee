## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.attacking`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/attacking/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: attacking" by "Sharpee (generated)"
  id: stdlib-chord-attacking
  version: 1.0.0
  reference-only: true

## Action  : if.action.attacking
## Group   : interaction
## Verbs   : attack, attack  with, hit, hit  with, strike, strike  with, fight, kill, break, destroy, smash
## Objects : direct object required
## Slots   : target, weapon   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.attacked, if.event.death, if.event.dropped, if.event.exit_revealed, if.event.knocked_out
## Summary : ATTACK/HIT/FIGHT - Attack creatures or attempt to break objects. Example: ATTACK TROLL

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   attacking-no-target               no_target                               Attack what?
##   attacking-not-visible             not_visible                             {You} {can't} see {the target}.
##   attacking-not-reachable           not_reachable                           {You} {can't} reach {the target}.
##   attacking-self                    self                                    Violence against {yourself} isn't the answer.
##   attacking-not-holding-weapon      not_holding_weapon                      {You} aren't holding {the weapon}.
##   attacking-indestructible          indestructible                          {capitalize the target} {verb:is target} far too solid to damage.
##   attacking-need-weapon-to-damage   need_weapon_to_damage                   {capitalize the target} requires a weapon to damage.
##   attacking-wrong-weapon-type       wrong_weapon_type                       {capitalize the target} can't be damaged with that type of weapon.
##   attacking-attack-ineffective      attack_ineffective                      {Your} attack has no effect on {the target}.
##   attacking-attack-requires-weapon  attack_requires_weapon                  {You} {need} a weapon to damage {the target}.
##   attacking-attack-wrong-weapon-typeattack_wrong_weapon_type                That weapon won't work on {the target}.
##   attacking-attack-invulnerable     attack_invulnerable                     {capitalize the target} cannot be damaged.
##   attacking-already-dead            already_dead                            {capitalize the target} {verb:is target} already dead.
##   attacking-violence-not-the-answer violence_not_the_answer                 Violence is not the answer.
##   attacking-combat-cannot-attack    combat.cannot_attack                    {You} {can't} attack {the target}.
##   attacking-combat-already-dead     combat.already_dead                     {capitalize the target} {verb:is target} already dead.
##   attacking-combat-not-hostile      combat.not_hostile                      {capitalize the target} isn't hostile.
##   attacking-combat-no-target        combat.no_target                        Attack what?
##   attacking-combat-target-unconscioucombat.target_unconscious               {capitalize the target} {verb:is target} already unconscious.
##   attacking-combat-need-weapon      combat.need_weapon                      {You} {need} a weapon to attack effectively.
##   attacking-combat-attack-missed    combat.attack.missed                    {You} {swing} at {the target} but miss!
##   attacking-combat-attack-hit       combat.attack.hit                       {You} {hit} {the target} for {damage} damage.
##   attacking-combat-attack-hit-light combat.attack.hit_light                 {You} {graze} {the target}, doing {damage} damage.
##   attacking-combat-attack-hit-heavy combat.attack.hit_heavy                 {You} {land} a solid blow on {the target}, dealing {damage} damage!
##   attacking-combat-attack-knocked-oucombat.attack.knocked_out               {capitalize the target} collapses, unconscious!
##   attacking-combat-attack-killed    combat.attack.killed                    {You} {have} slain {the target}!
##   attacking-combat-defend-blocked   combat.defend.blocked                   {capitalize the target} blocks {your} attack!
##   attacking-combat-defend-parried   combat.defend.parried                   {capitalize the target} parries {your} attack!
##   attacking-combat-defend-dodged    combat.defend.dodged                    {capitalize the target} dodges out of the way!
##   attacking-combat-health-healthy   combat.health.healthy                   {capitalize the target} appears uninjured.
##   attacking-combat-health-wounded   combat.health.wounded                   {capitalize the target} {verb:has target} been wounded.
##   attacking-combat-health-badly-wouncombat.health.badly_wounded             {capitalize the target} {verb:is target} badly wounded.
##   attacking-combat-health-near-deathcombat.health.near_death                {capitalize the target} {verb:is target} barely clinging to life!
##   attacking-combat-health-unconscioucombat.health.unconscious               {capitalize the target} lies unconscious.
##   attacking-combat-health-dead      combat.health.dead                      {capitalize the target} {verb:is target} dead.
##   attacking-combat-special-sword-glocombat.special.sword_glows              {Your} sword glows brightly!
##   attacking-combat-special-sword-stocombat.special.sword_stops_glowing      {Your} sword's glow fades.
##   attacking-combat-special-blessed-wcombat.special.blessed_weapon           {Your} blessed weapon burns the undead!
##   attacking-combat-started          combat.started                          Combat has begun!
##   attacking-combat-ended            combat.ended                            The battle is over.
##   attacking-combat-player-died      combat.player_died                      {You} {have} been slain!
##   attacking-combat-player-resurrectecombat.player_resurrected               {You} {feel} life return to {your} body.
##   attacking-attacked                attacked                                {You} {attack} {the target}.
##   attacking-attacked-with           attacked_with                           {You} {attack} {the target} with {the weapon}.
##   attacking-hit-target              hit_target                              {You} {hit} {the target}.
##   attacking-hit-blindly             hit_blindly                             {You} {swing} wildly, hitting nothing.
##   attacking-hit-with                hit_with                                {You} {hit} {the target} with {the weapon}.
##   attacking-struck                  struck                                  {You} {strike} {the target}!
##   attacking-struck-with             struck_with                             {You} {strike} {the target} with {the weapon}!
##   attacking-punched                 punched                                 {You} {punch} {the target}.
##   attacking-kicked                  kicked                                  {You} {kick} {the target}.
##   attacking-unarmed-attack          unarmed_attack                          {You} {attack} {the target} with {your} bare hands.
##   attacking-target-broke            target_broke                            {capitalize the target} breaks!
##   attacking-target-shattered        target_shattered                        {capitalize the target} shatters into pieces!
##   attacking-broke                   broke                                   {You} {break} {the target}!
##   attacking-smashed                 smashed                                 {You} {smash} {the target} to pieces!
##   attacking-target-destroyed        target_destroyed                        {capitalize the target} {verb:is target} utterly destroyed!
##   attacking-destroyed               destroyed                               {You} {destroy} {the target}!
##   attacking-shattered               shattered                               {capitalize the target} shatters!
##   attacking-target-damaged          target_damaged                          {capitalize the target} shows signs of damage. ({damage} damage dealt)
##   attacking-killed-target           killed_target                           {You} {have} defeated {the target}!
##   attacking-killed-blindly          killed_blindly                          Something dies in the darkness.
##   attacking-items-spilled           items_spilled                           {capitalize the target}'s possessions spill onto the ground.
##   attacking-passage-revealed        passage_revealed                        A hidden passage is revealed!
##   attacking-debris-created          debris_created                          Debris from {the target} litters the area.
##   attacking-defends                 defends                                 {capitalize the target} defends against {your} attack.
##   attacking-dodges                  dodges                                  {capitalize the target} dodges {your} attack.
##   attacking-retaliates              retaliates                              {capitalize the target} fights back!
##   attacking-flees                   flees                                   {capitalize the target} flees from {you}!
##   attacking-peaceful-solution       peaceful_solution                       Violence isn't necessary here.
##   attacking-no-fighting             no_fighting                             Fighting won't solve this problem.
##   attacking-unnecessary-violence    unnecessary_violence                    That seems unnecessarily violent.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.attacked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
