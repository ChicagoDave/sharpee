# ADR-255 Appendix — Standard-action message override alias catalog

> Companion to [ADR-255](adr-255-message-override-acl.md) **D7**. The complete
> anti-corruption-layer alias set: one `<action>-<message-key>` alias for every
> standard-action message id in `@sharpee/lang-en-us`. The chord `catalog.ts`
> valid-alias set and the `@sharpee/story-loader` alias → `if.action.*` mapping
> are both pinned against this table by ADR-255 **D5**'s completeness test.

**Generated** 2026-07-22 (session 818d28), deterministically from the built
`packages/lang-en-us/dist/actions/*` modules (each action's `actionId` + the keys
of its `messages` object). **Coverage: 54 actions, 734 aliases, 0 cross-action
collisions** — the `<action>-` prefix guarantees uniqueness (D2).

**Derivation rule.** `alias = kebab(action) + "-" + kebab(message-key)`, where
`action` is the `if.action.<action>` segment and `kebab` replaces **both `_` and
`.`** with `-`. The dot-kebab matters because some message keys are themselves
internally dot-namespaced — `attacking`'s combat keys are
`combat.attack.hit_heavy` etc. — and an ACL alias must be a single dotless kebab
token (ADR-254). Example:
`if.action.attacking.combat.attack.hit_heavy` → `attacking-combat-attack-hit-heavy`;
`if.action.taking.fixed_in_place` → `taking-fixed-in-place`. This is the authored
baseline; per D2 a curator may polish a genuinely cryptic key, but the
`<action>` scope is invariant. D5 pins the catalog against the live message set,
so any drift fails the build — regenerate by re-applying the rule to the current
`lang-en-us` action messages, then re-curate.

---

### `if.action.about` (21)

| alias | platform message id |
|---|---|
| `about-about-compact` | `if.action.about.about_compact` |
| `about-about-footer` | `if.action.about.about_footer` |
| `about-about-header` | `if.action.about.about_header` |
| `about-acknowledgments` | `if.action.about.acknowledgments` |
| `about-contact` | `if.action.about.contact` |
| `about-copyright` | `if.action.about.copyright` |
| `about-credits-header` | `if.action.about.credits_header` |
| `about-credits-list` | `if.action.about.credits_list` |
| `about-dedication` | `if.action.about.dedication` |
| `about-description` | `if.action.about.description` |
| `about-engine-info` | `if.action.about.engine_info` |
| `about-enjoy-game` | `if.action.about.enjoy_game` |
| `about-game-info` | `if.action.about.game_info` |
| `about-game-info-simple` | `if.action.about.game_info_simple` |
| `about-license` | `if.action.about.license` |
| `about-play-stats` | `if.action.about.play_stats` |
| `about-session-info` | `if.action.about.session_info` |
| `about-special-thanks` | `if.action.about.special_thanks` |
| `about-success` | `if.action.about.success` |
| `about-technical-info` | `if.action.about.technical_info` |
| `about-website` | `if.action.about.website` |

### `if.action.again` (1)

| alias | platform message id |
|---|---|
| `again-nothing-to-repeat` | `if.action.again.nothing_to_repeat` |

### `if.action.answering` (14)

| alias | platform message id |
|---|---|
| `answering-accepted` | `if.action.answering.accepted` |
| `answering-answered` | `if.action.answering.answered` |
| `answering-answered-no` | `if.action.answering.answered_no` |
| `answering-answered-yes` | `if.action.answering.answered_yes` |
| `answering-confused-by-answer` | `if.action.answering.confused_by_answer` |
| `answering-gave-answer` | `if.action.answering.gave_answer` |
| `answering-invalid-response` | `if.action.answering.invalid_response` |
| `answering-needs-yes-or-no` | `if.action.answering.needs_yes_or_no` |
| `answering-no-one-asked` | `if.action.answering.no_one_asked` |
| `answering-no-question` | `if.action.answering.no_question` |
| `answering-noted` | `if.action.answering.noted` |
| `answering-rejected` | `if.action.answering.rejected` |
| `answering-too-late` | `if.action.answering.too_late` |
| `answering-unclear-answer` | `if.action.answering.unclear_answer` |

### `if.action.asking` (16)

| alias | platform message id |
|---|---|
| `asking-already-told` | `if.action.asking.already_told` |
| `asking-confused` | `if.action.asking.confused` |
| `asking-earned-trust` | `if.action.asking.earned_trust` |
| `asking-explains` | `if.action.asking.explains` |
| `asking-must-do-first` | `if.action.asking.must_do_first` |
| `asking-no-idea` | `if.action.asking.no_idea` |
| `asking-no-target` | `if.action.asking.no_target` |
| `asking-no-topic` | `if.action.asking.no_topic` |
| `asking-not-actor` | `if.action.asking.not_actor` |
| `asking-not-visible` | `if.action.asking.not_visible` |
| `asking-not-yet` | `if.action.asking.not_yet` |
| `asking-remembers` | `if.action.asking.remembers` |
| `asking-responds` | `if.action.asking.responds` |
| `asking-shrugs` | `if.action.asking.shrugs` |
| `asking-too-far` | `if.action.asking.too_far` |
| `asking-unknown-topic` | `if.action.asking.unknown_topic` |

### `if.action.attacking` (72)

| alias | platform message id |
|---|---|
| `attacking-already-dead` | `if.action.attacking.already_dead` |
| `attacking-attack-ineffective` | `if.action.attacking.attack_ineffective` |
| `attacking-attack-invulnerable` | `if.action.attacking.attack_invulnerable` |
| `attacking-attack-requires-weapon` | `if.action.attacking.attack_requires_weapon` |
| `attacking-attack-wrong-weapon-type` | `if.action.attacking.attack_wrong_weapon_type` |
| `attacking-attacked` | `if.action.attacking.attacked` |
| `attacking-attacked-with` | `if.action.attacking.attacked_with` |
| `attacking-broke` | `if.action.attacking.broke` |
| `attacking-combat-already-dead` | `if.action.attacking.combat.already_dead` |
| `attacking-combat-attack-hit` | `if.action.attacking.combat.attack.hit` |
| `attacking-combat-attack-hit-heavy` | `if.action.attacking.combat.attack.hit_heavy` |
| `attacking-combat-attack-hit-light` | `if.action.attacking.combat.attack.hit_light` |
| `attacking-combat-attack-killed` | `if.action.attacking.combat.attack.killed` |
| `attacking-combat-attack-knocked-out` | `if.action.attacking.combat.attack.knocked_out` |
| `attacking-combat-attack-missed` | `if.action.attacking.combat.attack.missed` |
| `attacking-combat-cannot-attack` | `if.action.attacking.combat.cannot_attack` |
| `attacking-combat-defend-blocked` | `if.action.attacking.combat.defend.blocked` |
| `attacking-combat-defend-dodged` | `if.action.attacking.combat.defend.dodged` |
| `attacking-combat-defend-parried` | `if.action.attacking.combat.defend.parried` |
| `attacking-combat-ended` | `if.action.attacking.combat.ended` |
| `attacking-combat-health-badly-wounded` | `if.action.attacking.combat.health.badly_wounded` |
| `attacking-combat-health-dead` | `if.action.attacking.combat.health.dead` |
| `attacking-combat-health-healthy` | `if.action.attacking.combat.health.healthy` |
| `attacking-combat-health-near-death` | `if.action.attacking.combat.health.near_death` |
| `attacking-combat-health-unconscious` | `if.action.attacking.combat.health.unconscious` |
| `attacking-combat-health-wounded` | `if.action.attacking.combat.health.wounded` |
| `attacking-combat-need-weapon` | `if.action.attacking.combat.need_weapon` |
| `attacking-combat-no-target` | `if.action.attacking.combat.no_target` |
| `attacking-combat-not-hostile` | `if.action.attacking.combat.not_hostile` |
| `attacking-combat-player-died` | `if.action.attacking.combat.player_died` |
| `attacking-combat-player-resurrected` | `if.action.attacking.combat.player_resurrected` |
| `attacking-combat-special-blessed-weapon` | `if.action.attacking.combat.special.blessed_weapon` |
| `attacking-combat-special-sword-glows` | `if.action.attacking.combat.special.sword_glows` |
| `attacking-combat-special-sword-stops-glowing` | `if.action.attacking.combat.special.sword_stops_glowing` |
| `attacking-combat-started` | `if.action.attacking.combat.started` |
| `attacking-combat-target-unconscious` | `if.action.attacking.combat.target_unconscious` |
| `attacking-debris-created` | `if.action.attacking.debris_created` |
| `attacking-defends` | `if.action.attacking.defends` |
| `attacking-destroyed` | `if.action.attacking.destroyed` |
| `attacking-dodges` | `if.action.attacking.dodges` |
| `attacking-flees` | `if.action.attacking.flees` |
| `attacking-hit-blindly` | `if.action.attacking.hit_blindly` |
| `attacking-hit-target` | `if.action.attacking.hit_target` |
| `attacking-hit-with` | `if.action.attacking.hit_with` |
| `attacking-indestructible` | `if.action.attacking.indestructible` |
| `attacking-items-spilled` | `if.action.attacking.items_spilled` |
| `attacking-kicked` | `if.action.attacking.kicked` |
| `attacking-killed-blindly` | `if.action.attacking.killed_blindly` |
| `attacking-killed-target` | `if.action.attacking.killed_target` |
| `attacking-need-weapon-to-damage` | `if.action.attacking.need_weapon_to_damage` |
| `attacking-no-fighting` | `if.action.attacking.no_fighting` |
| `attacking-no-target` | `if.action.attacking.no_target` |
| `attacking-not-holding-weapon` | `if.action.attacking.not_holding_weapon` |
| `attacking-not-reachable` | `if.action.attacking.not_reachable` |
| `attacking-not-visible` | `if.action.attacking.not_visible` |
| `attacking-passage-revealed` | `if.action.attacking.passage_revealed` |
| `attacking-peaceful-solution` | `if.action.attacking.peaceful_solution` |
| `attacking-punched` | `if.action.attacking.punched` |
| `attacking-retaliates` | `if.action.attacking.retaliates` |
| `attacking-self` | `if.action.attacking.self` |
| `attacking-shattered` | `if.action.attacking.shattered` |
| `attacking-smashed` | `if.action.attacking.smashed` |
| `attacking-struck` | `if.action.attacking.struck` |
| `attacking-struck-with` | `if.action.attacking.struck_with` |
| `attacking-target-broke` | `if.action.attacking.target_broke` |
| `attacking-target-damaged` | `if.action.attacking.target_damaged` |
| `attacking-target-destroyed` | `if.action.attacking.target_destroyed` |
| `attacking-target-shattered` | `if.action.attacking.target_shattered` |
| `attacking-unarmed-attack` | `if.action.attacking.unarmed_attack` |
| `attacking-unnecessary-violence` | `if.action.attacking.unnecessary_violence` |
| `attacking-violence-not-the-answer` | `if.action.attacking.violence_not_the_answer` |
| `attacking-wrong-weapon-type` | `if.action.attacking.wrong_weapon_type` |

### `if.action.climbing` (13)

| alias | platform message id |
|---|---|
| `climbing-already-there` | `if.action.climbing.already_there` |
| `climbing-cant-go-that-way` | `if.action.climbing.cant_go_that_way` |
| `climbing-climb-nowhere` | `if.action.climbing.climb_nowhere` |
| `climbing-climbed-down` | `if.action.climbing.climbed_down` |
| `climbing-climbed-onto` | `if.action.climbing.climbed_onto` |
| `climbing-climbed-up` | `if.action.climbing.climbed_up` |
| `climbing-need-equipment` | `if.action.climbing.need_equipment` |
| `climbing-no-target` | `if.action.climbing.no_target` |
| `climbing-not-climbable` | `if.action.climbing.not_climbable` |
| `climbing-nothing-to-climb` | `if.action.climbing.nothing_to_climb` |
| `climbing-too-dangerous` | `if.action.climbing.too_dangerous` |
| `climbing-too-high` | `if.action.climbing.too_high` |
| `climbing-too-slippery` | `if.action.climbing.too_slippery` |

### `if.action.closing` (6)

| alias | platform message id |
|---|---|
| `closing-already-closed` | `if.action.closing.already_closed` |
| `closing-cant-reach` | `if.action.closing.cant_reach` |
| `closing-closed` | `if.action.closing.closed` |
| `closing-no-target` | `if.action.closing.no_target` |
| `closing-not-closable` | `if.action.closing.not_closable` |
| `closing-prevents-closing` | `if.action.closing.prevents_closing` |

### `if.action.drinking` (25)

| alias | platform message id |
|---|---|
| `drinking-already-consumed` | `if.action.drinking.already_consumed` |
| `drinking-bitter` | `if.action.drinking.bitter` |
| `drinking-container-closed` | `if.action.drinking.container_closed` |
| `drinking-drunk` | `if.action.drinking.drunk` |
| `drinking-drunk-all` | `if.action.drinking.drunk_all` |
| `drinking-drunk-from` | `if.action.drinking.drunk_from` |
| `drinking-drunk-some` | `if.action.drinking.drunk_some` |
| `drinking-empty-now` | `if.action.drinking.empty_now` |
| `drinking-from-container` | `if.action.drinking.from_container` |
| `drinking-gulped` | `if.action.drinking.gulped` |
| `drinking-healing` | `if.action.drinking.healing` |
| `drinking-magical-effects` | `if.action.drinking.magical_effects` |
| `drinking-no-item` | `if.action.drinking.no_item` |
| `drinking-not-drinkable` | `if.action.drinking.not_drinkable` |
| `drinking-not-reachable` | `if.action.drinking.not_reachable` |
| `drinking-not-visible` | `if.action.drinking.not_visible` |
| `drinking-quaffed` | `if.action.drinking.quaffed` |
| `drinking-refreshing` | `if.action.drinking.refreshing` |
| `drinking-satisfying` | `if.action.drinking.satisfying` |
| `drinking-sipped` | `if.action.drinking.sipped` |
| `drinking-some-remains` | `if.action.drinking.some_remains` |
| `drinking-still-thirsty` | `if.action.drinking.still_thirsty` |
| `drinking-strong` | `if.action.drinking.strong` |
| `drinking-sweet` | `if.action.drinking.sweet` |
| `drinking-thirst-quenched` | `if.action.drinking.thirst_quenched` |

### `if.action.dropping` (8)

| alias | platform message id |
|---|---|
| `dropping-dropped` | `if.action.dropping.dropped` |
| `dropping-dropped-in` | `if.action.dropping.dropped_in` |
| `dropping-dropped-multi` | `if.action.dropping.dropped_multi` |
| `dropping-dropped-on` | `if.action.dropping.dropped_on` |
| `dropping-no-target` | `if.action.dropping.no_target` |
| `dropping-not-held` | `if.action.dropping.not_held` |
| `dropping-nothing-to-drop` | `if.action.dropping.nothing_to_drop` |
| `dropping-still-worn` | `if.action.dropping.still_worn` |

### `if.action.eating` (22)

| alias | platform message id |
|---|---|
| `eating-already-consumed` | `if.action.eating.already_consumed` |
| `eating-awful` | `if.action.eating.awful` |
| `eating-bland` | `if.action.eating.bland` |
| `eating-delicious` | `if.action.eating.delicious` |
| `eating-devoured` | `if.action.eating.devoured` |
| `eating-eaten` | `if.action.eating.eaten` |
| `eating-eaten-all` | `if.action.eating.eaten_all` |
| `eating-eaten-portion` | `if.action.eating.eaten_portion` |
| `eating-eaten-some` | `if.action.eating.eaten_some` |
| `eating-filling` | `if.action.eating.filling` |
| `eating-is-drink` | `if.action.eating.is_drink` |
| `eating-munched` | `if.action.eating.munched` |
| `eating-nibbled` | `if.action.eating.nibbled` |
| `eating-no-item` | `if.action.eating.no_item` |
| `eating-not-edible` | `if.action.eating.not_edible` |
| `eating-not-reachable` | `if.action.eating.not_reachable` |
| `eating-not-visible` | `if.action.eating.not_visible` |
| `eating-poisonous` | `if.action.eating.poisonous` |
| `eating-satisfying` | `if.action.eating.satisfying` |
| `eating-still-hungry` | `if.action.eating.still_hungry` |
| `eating-tasted` | `if.action.eating.tasted` |
| `eating-tasty` | `if.action.eating.tasty` |

### `if.action.entering` (11)

| alias | platform message id |
|---|---|
| `entering-already-inside` | `if.action.entering.already_inside` |
| `entering-cant-enter` | `if.action.entering.cant_enter` |
| `entering-container-closed` | `if.action.entering.container_closed` |
| `entering-entered` | `if.action.entering.entered` |
| `entering-entered-on` | `if.action.entering.entered_on` |
| `entering-no-target` | `if.action.entering.no_target` |
| `entering-not-enterable` | `if.action.entering.not_enterable` |
| `entering-not-here` | `if.action.entering.not_here` |
| `entering-occupied` | `if.action.entering.occupied` |
| `entering-too-full` | `if.action.entering.too_full` |
| `entering-too-small` | `if.action.entering.too_small` |

### `if.action.examining` (25)

| alias | platform message id |
|---|---|
| `examining-brief-description` | `if.action.examining.brief_description` |
| `examining-cant-see` | `if.action.examining.cant_see` |
| `examining-container-closed` | `if.action.examining.container_closed` |
| `examining-container-contents` | `if.action.examining.container_contents` |
| `examining-container-empty` | `if.action.examining.container_empty` |
| `examining-container-open` | `if.action.examining.container_open` |
| `examining-default-description` | `if.action.examining.default_description` |
| `examining-default-description-self` | `if.action.examining.default_description_self` |
| `examining-description` | `if.action.examining.description` |
| `examining-examined` | `if.action.examining.examined` |
| `examining-examined-container` | `if.action.examining.examined_container` |
| `examining-examined-door` | `if.action.examining.examined_door` |
| `examining-examined-readable` | `if.action.examining.examined_readable` |
| `examining-examined-self` | `if.action.examining.examined_self` |
| `examining-examined-supporter` | `if.action.examining.examined_supporter` |
| `examining-examined-switchable` | `if.action.examining.examined_switchable` |
| `examining-examined-wall` | `if.action.examining.examined_wall` |
| `examining-examined-wearable` | `if.action.examining.examined_wearable` |
| `examining-no-description` | `if.action.examining.no_description` |
| `examining-no-target` | `if.action.examining.no_target` |
| `examining-not-visible` | `if.action.examining.not_visible` |
| `examining-nothing-special` | `if.action.examining.nothing_special` |
| `examining-surface-contents` | `if.action.examining.surface_contents` |
| `examining-worn-by-other` | `if.action.examining.worn_by_other` |
| `examining-worn-by-you` | `if.action.examining.worn_by_you` |

### `if.action.exiting` (10)

| alias | platform message id |
|---|---|
| `exiting-already-outside` | `if.action.exiting.already_outside` |
| `exiting-cant-exit` | `if.action.exiting.cant_exit` |
| `exiting-container-closed` | `if.action.exiting.container_closed` |
| `exiting-exit-blocked` | `if.action.exiting.exit_blocked` |
| `exiting-exited` | `if.action.exiting.exited` |
| `exiting-exited-from` | `if.action.exiting.exited_from` |
| `exiting-must-stand-first` | `if.action.exiting.must_stand_first` |
| `exiting-not-in-that` | `if.action.exiting.not_in_that` |
| `exiting-not-on-that` | `if.action.exiting.not_on_that` |
| `exiting-nowhere-to-go` | `if.action.exiting.nowhere_to_go` |

### `if.action.giving` (15)

| alias | platform message id |
|---|---|
| `giving-accepts` | `if.action.giving.accepts` |
| `giving-given` | `if.action.giving.given` |
| `giving-gratefully-accepts` | `if.action.giving.gratefully_accepts` |
| `giving-inventory-full` | `if.action.giving.inventory_full` |
| `giving-no-item` | `if.action.giving.no_item` |
| `giving-no-recipient` | `if.action.giving.no_recipient` |
| `giving-not-actor` | `if.action.giving.not_actor` |
| `giving-not-holding` | `if.action.giving.not_holding` |
| `giving-not-interested` | `if.action.giving.not_interested` |
| `giving-recipient-not-reachable` | `if.action.giving.recipient_not_reachable` |
| `giving-recipient-not-visible` | `if.action.giving.recipient_not_visible` |
| `giving-refuses` | `if.action.giving.refuses` |
| `giving-reluctantly-accepts` | `if.action.giving.reluctantly_accepts` |
| `giving-self` | `if.action.giving.self` |
| `giving-too-heavy` | `if.action.giving.too_heavy` |

### `if.action.going` (20)

| alias | platform message id |
|---|---|
| `going-already-there` | `if.action.going.already_there` |
| `going-arrived` | `if.action.going.arrived` |
| `going-cant-go` | `if.action.going.cant_go` |
| `going-cant-go-through` | `if.action.going.cant_go_through` |
| `going-contents-list` | `if.action.going.contents_list` |
| `going-destination-not-found` | `if.action.going.destination_not_found` |
| `going-door-closed` | `if.action.going.door_closed` |
| `going-door-locked` | `if.action.going.door_locked` |
| `going-moved` | `if.action.going.moved` |
| `going-movement-blocked` | `if.action.going.movement_blocked` |
| `going-need-light` | `if.action.going.need_light` |
| `going-no-direction` | `if.action.going.no_direction` |
| `going-no-exit` | `if.action.going.no_exit` |
| `going-no-exit-that-way` | `if.action.going.no_exit_that_way` |
| `going-no-exits` | `if.action.going.no_exits` |
| `going-not-in-room` | `if.action.going.not_in_room` |
| `going-nowhere-to-go` | `if.action.going.nowhere_to_go` |
| `going-room-description` | `if.action.going.room_description` |
| `going-too-dark` | `if.action.going.too_dark` |
| `going-went` | `if.action.going.went` |

### `if.action.help` (11)

| alias | platform message id |
|---|---|
| `help-first-time` | `if.action.help.first_time` |
| `help-general` | `if.action.help.general` |
| `help-help-footer` | `if.action.help.help_footer` |
| `help-help-movement` | `if.action.help.help_movement` |
| `help-help-objects` | `if.action.help.help_objects` |
| `help-help-special` | `if.action.help.help_special` |
| `help-hints-available` | `if.action.help.hints_available` |
| `help-hints-disabled` | `if.action.help.hints_disabled` |
| `help-stuck-help` | `if.action.help.stuck_help` |
| `help-topic` | `if.action.help.topic` |
| `help-unknown-topic` | `if.action.help.unknown_topic` |

### `if.action.hiding` (10)

| alias | platform message id |
|---|---|
| `hiding-already-hidden` | `if.action.hiding.already_hidden` |
| `hiding-behind` | `if.action.hiding.behind` |
| `hiding-cant-hide-there-behind` | `if.action.hiding.cant_hide_there_behind` |
| `hiding-cant-hide-there-inside` | `if.action.hiding.cant_hide_there_inside` |
| `hiding-cant-hide-there-on` | `if.action.hiding.cant_hide_there_on` |
| `hiding-cant-hide-there-under` | `if.action.hiding.cant_hide_there_under` |
| `hiding-inside` | `if.action.hiding.inside` |
| `hiding-nothing-to-hide` | `if.action.hiding.nothing_to_hide` |
| `hiding-on` | `if.action.hiding.on` |
| `hiding-under` | `if.action.hiding.under` |

### `if.action.inserting` (9)

| alias | platform message id |
|---|---|
| `inserting-already-there` | `if.action.inserting.already_there` |
| `inserting-container-closed` | `if.action.inserting.container_closed` |
| `inserting-inserted` | `if.action.inserting.inserted` |
| `inserting-no-destination` | `if.action.inserting.no_destination` |
| `inserting-no-target` | `if.action.inserting.no_target` |
| `inserting-not-container` | `if.action.inserting.not_container` |
| `inserting-not-held` | `if.action.inserting.not_held` |
| `inserting-not-insertable` | `if.action.inserting.not_insertable` |
| `inserting-wont-fit` | `if.action.inserting.wont_fit` |

### `if.action.inventory` (17)

| alias | platform message id |
|---|---|
| `inventory-burden-heavy` | `if.action.inventory.burden_heavy` |
| `inventory-burden-light` | `if.action.inventory.burden_light` |
| `inventory-burden-overloaded` | `if.action.inventory.burden_overloaded` |
| `inventory-carrying` | `if.action.inventory.carrying` |
| `inventory-carrying-and-wearing` | `if.action.inventory.carrying_and_wearing` |
| `inventory-carrying-count` | `if.action.inventory.carrying_count` |
| `inventory-empty` | `if.action.inventory.empty` |
| `inventory-hands-empty` | `if.action.inventory.hands_empty` |
| `inventory-holding-list` | `if.action.inventory.holding_list` |
| `inventory-inventory-empty` | `if.action.inventory.inventory_empty` |
| `inventory-inventory-header` | `if.action.inventory.inventory_header` |
| `inventory-item-list` | `if.action.inventory.item_list` |
| `inventory-nothing-at-all` | `if.action.inventory.nothing_at_all` |
| `inventory-pockets-empty` | `if.action.inventory.pockets_empty` |
| `inventory-wearing` | `if.action.inventory.wearing` |
| `inventory-wearing-count` | `if.action.inventory.wearing_count` |
| `inventory-worn-list` | `if.action.inventory.worn_list` |

### `if.action.listening` (11)

| alias | platform message id |
|---|---|
| `listening-active-devices` | `if.action.listening.active_devices` |
| `listening-ambient-sounds` | `if.action.listening.ambient_sounds` |
| `listening-container-sounds` | `if.action.listening.container_sounds` |
| `listening-device-off` | `if.action.listening.device_off` |
| `listening-device-running` | `if.action.listening.device_running` |
| `listening-liquid-sounds` | `if.action.listening.liquid_sounds` |
| `listening-listened-environment` | `if.action.listening.listened_environment` |
| `listening-listened-to` | `if.action.listening.listened_to` |
| `listening-no-sound` | `if.action.listening.no_sound` |
| `listening-not-visible` | `if.action.listening.not_visible` |
| `listening-silence` | `if.action.listening.silence` |

### `if.action.locking` (10)

| alias | platform message id |
|---|---|
| `locking-already-locked` | `if.action.locking.already_locked` |
| `locking-cant-reach` | `if.action.locking.cant_reach` |
| `locking-key-not-held` | `if.action.locking.key_not_held` |
| `locking-locked` | `if.action.locking.locked` |
| `locking-locked-with` | `if.action.locking.locked_with` |
| `locking-no-key` | `if.action.locking.no_key` |
| `locking-no-target` | `if.action.locking.no_target` |
| `locking-not-closed` | `if.action.locking.not_closed` |
| `locking-not-lockable` | `if.action.locking.not_lockable` |
| `locking-wrong-key` | `if.action.locking.wrong_key` |

### `if.action.looking` (8)

| alias | platform message id |
|---|---|
| `looking-container-contents` | `if.action.looking.container_contents` |
| `looking-contents-list` | `if.action.looking.contents_list` |
| `looking-exits` | `if.action.looking.exits` |
| `looking-nothing-special` | `if.action.looking.nothing_special` |
| `looking-room-dark` | `if.action.looking.room_dark` |
| `looking-room-description` | `if.action.looking.room_description` |
| `looking-surface-contents` | `if.action.looking.surface_contents` |
| `looking-you-see` | `if.action.looking.you_see` |

### `if.action.lowering` (4)

| alias | platform message id |
|---|---|
| `lowering-already-down` | `if.action.lowering.already_down` |
| `lowering-cant-lower-that` | `if.action.lowering.cant_lower_that` |
| `lowering-lowered` | `if.action.lowering.lowered` |
| `lowering-no-target` | `if.action.lowering.no_target` |

### `if.action.opening` (11)

| alias | platform message id |
|---|---|
| `opening-already-open` | `if.action.opening.already_open` |
| `opening-cant-reach` | `if.action.opening.cant_reach` |
| `opening-its-empty` | `if.action.opening.its_empty` |
| `opening-locked` | `if.action.opening.locked` |
| `opening-no-target` | `if.action.opening.no_target` |
| `opening-no-tool` | `if.action.opening.no_tool` |
| `opening-not-openable` | `if.action.opening.not_openable` |
| `opening-opened` | `if.action.opening.opened` |
| `opening-revealing` | `if.action.opening.revealing` |
| `opening-tool-not-held` | `if.action.opening.tool_not_held` |
| `opening-wrong-tool` | `if.action.opening.wrong_tool` |

### `if.action.pulling` (8)

| alias | platform message id |
|---|---|
| `pulling-already-pulled` | `if.action.pulling.already_pulled` |
| `pulling-cant-pull-that` | `if.action.pulling.cant_pull_that` |
| `pulling-no-target` | `if.action.pulling.no_target` |
| `pulling-not-reachable` | `if.action.pulling.not_reachable` |
| `pulling-not-visible` | `if.action.pulling.not_visible` |
| `pulling-nothing-happens` | `if.action.pulling.nothing_happens` |
| `pulling-pulled` | `if.action.pulling.pulled` |
| `pulling-worn` | `if.action.pulling.worn` |

### `if.action.pushing` (15)

| alias | platform message id |
|---|---|
| `pushing-button-clicks` | `if.action.pushing.button_clicks` |
| `pushing-button-pushed` | `if.action.pushing.button_pushed` |
| `pushing-fixed-in-place` | `if.action.pushing.fixed_in_place` |
| `pushing-no-target` | `if.action.pushing.no_target` |
| `pushing-not-reachable` | `if.action.pushing.not_reachable` |
| `pushing-not-visible` | `if.action.pushing.not_visible` |
| `pushing-pushed-direction` | `if.action.pushing.pushed_direction` |
| `pushing-pushed-nudged` | `if.action.pushing.pushed_nudged` |
| `pushing-pushed-with-effort` | `if.action.pushing.pushed_with_effort` |
| `pushing-pushing-does-nothing` | `if.action.pushing.pushing_does_nothing` |
| `pushing-reveals-passage` | `if.action.pushing.reveals_passage` |
| `pushing-switch-toggled` | `if.action.pushing.switch_toggled` |
| `pushing-too-heavy` | `if.action.pushing.too_heavy` |
| `pushing-wearing-it` | `if.action.pushing.wearing_it` |
| `pushing-wont-budge` | `if.action.pushing.wont_budge` |

### `if.action.putting` (13)

| alias | platform message id |
|---|---|
| `putting-already-there` | `if.action.putting.already_there` |
| `putting-cant-put-in-itself` | `if.action.putting.cant_put_in_itself` |
| `putting-cant-put-on-itself` | `if.action.putting.cant_put_on_itself` |
| `putting-container-closed` | `if.action.putting.container_closed` |
| `putting-no-destination` | `if.action.putting.no_destination` |
| `putting-no-room` | `if.action.putting.no_room` |
| `putting-no-space` | `if.action.putting.no_space` |
| `putting-no-target` | `if.action.putting.no_target` |
| `putting-not-container` | `if.action.putting.not_container` |
| `putting-not-held` | `if.action.putting.not_held` |
| `putting-not-surface` | `if.action.putting.not_surface` |
| `putting-put-in` | `if.action.putting.put_in` |
| `putting-put-on` | `if.action.putting.put_on` |

### `if.action.quitting` (9)

| alias | platform message id |
|---|---|
| `quitting-achievements-earned` | `if.action.quitting.achievements_earned` |
| `quitting-final-score` | `if.action.quitting.final_score` |
| `quitting-final-stats` | `if.action.quitting.final_stats` |
| `quitting-quit-and-saved` | `if.action.quitting.quit_and_saved` |
| `quitting-quit-cancelled` | `if.action.quitting.quit_cancelled` |
| `quitting-quit-confirm-query` | `if.action.quitting.quit_confirm_query` |
| `quitting-quit-confirmed` | `if.action.quitting.quit_confirmed` |
| `quitting-quit-save-query` | `if.action.quitting.quit_save_query` |
| `quitting-quit-unsaved-query` | `if.action.quitting.quit_unsaved_query` |

### `if.action.raising` (4)

| alias | platform message id |
|---|---|
| `raising-already-up` | `if.action.raising.already_up` |
| `raising-cant-raise-that` | `if.action.raising.cant_raise_that` |
| `raising-no-target` | `if.action.raising.no_target` |
| `raising-raised` | `if.action.raising.raised` |

### `if.action.reading` (8)

| alias | platform message id |
|---|---|
| `reading-cannot-read-now` | `if.action.reading.cannot_read_now` |
| `reading-not-readable` | `if.action.reading.not_readable` |
| `reading-read-book` | `if.action.reading.read_book` |
| `reading-read-book-page` | `if.action.reading.read_book_page` |
| `reading-read-inscription` | `if.action.reading.read_inscription` |
| `reading-read-sign` | `if.action.reading.read_sign` |
| `reading-read-text` | `if.action.reading.read_text` |
| `reading-what-to-read` | `if.action.reading.what_to_read` |

### `if.action.removing` (9)

| alias | platform message id |
|---|---|
| `removing-already-have` | `if.action.removing.already_have` |
| `removing-cant-reach` | `if.action.removing.cant_reach` |
| `removing-container-closed` | `if.action.removing.container_closed` |
| `removing-no-source` | `if.action.removing.no_source` |
| `removing-no-target` | `if.action.removing.no_target` |
| `removing-not-in-container` | `if.action.removing.not_in_container` |
| `removing-not-on-surface` | `if.action.removing.not_on_surface` |
| `removing-removed-from` | `if.action.removing.removed_from` |
| `removing-removed-from-surface` | `if.action.removing.removed_from_surface` |

### `if.action.restarting` (6)

| alias | platform message id |
|---|---|
| `restarting-game-restarting` | `if.action.restarting.game_restarting` |
| `restarting-new-game` | `if.action.restarting.new_game` |
| `restarting-restart-confirm` | `if.action.restarting.restart_confirm` |
| `restarting-restart-requested` | `if.action.restarting.restart_requested` |
| `restarting-restart-unsaved` | `if.action.restarting.restart_unsaved` |
| `restarting-starting-over` | `if.action.restarting.starting_over` |

### `if.action.restoring` (20)

| alias | platform message id |
|---|---|
| `restoring-available-saves` | `if.action.restoring.available_saves` |
| `restoring-choose-save` | `if.action.restoring.choose_save` |
| `restoring-confirm-restore` | `if.action.restoring.confirm_restore` |
| `restoring-corrupt-save` | `if.action.restoring.corrupt_save` |
| `restoring-game-loaded` | `if.action.restoring.game_loaded` |
| `restoring-game-restored` | `if.action.restoring.game_restored` |
| `restoring-import-save` | `if.action.restoring.import_save` |
| `restoring-incompatible-save` | `if.action.restoring.incompatible_save` |
| `restoring-no-saves` | `if.action.restoring.no_saves` |
| `restoring-no-saves-available` | `if.action.restoring.no_saves_available` |
| `restoring-quick-restore` | `if.action.restoring.quick_restore` |
| `restoring-restore-details` | `if.action.restoring.restore_details` |
| `restoring-restore-failed` | `if.action.restoring.restore_failed` |
| `restoring-restore-not-allowed` | `if.action.restoring.restore_not_allowed` |
| `restoring-restore-successful` | `if.action.restoring.restore_successful` |
| `restoring-resuming-game` | `if.action.restoring.resuming_game` |
| `restoring-save-imported` | `if.action.restoring.save_imported` |
| `restoring-save-not-found` | `if.action.restoring.save_not_found` |
| `restoring-unsaved-progress` | `if.action.restoring.unsaved_progress` |
| `restoring-welcome-back` | `if.action.restoring.welcome_back` |

### `if.action.revealing` (2)

| alias | platform message id |
|---|---|
| `revealing-not-hidden` | `if.action.revealing.not_hidden` |
| `revealing-revealed` | `if.action.revealing.revealed` |

### `if.action.saving` (18)

| alias | platform message id |
|---|---|
| `saving-auto-save` | `if.action.saving.auto_save` |
| `saving-confirm-overwrite` | `if.action.saving.confirm_overwrite` |
| `saving-game-saved` | `if.action.saving.game_saved` |
| `saving-game-saved-as` | `if.action.saving.game_saved_as` |
| `saving-invalid-save-name` | `if.action.saving.invalid_save_name` |
| `saving-no-save-slots` | `if.action.saving.no_save_slots` |
| `saving-overwrite-save` | `if.action.saving.overwrite_save` |
| `saving-quick-save` | `if.action.saving.quick_save` |
| `saving-save-details` | `if.action.saving.save_details` |
| `saving-save-exported` | `if.action.saving.save_exported` |
| `saving-save-failed` | `if.action.saving.save_failed` |
| `saving-save-in-progress` | `if.action.saving.save_in_progress` |
| `saving-save-not-allowed` | `if.action.saving.save_not_allowed` |
| `saving-save-reminder` | `if.action.saving.save_reminder` |
| `saving-save-slot` | `if.action.saving.save_slot` |
| `saving-save-successful` | `if.action.saving.save_successful` |
| `saving-saved-locally` | `if.action.saving.saved_locally` |
| `saving-saved-to-cloud` | `if.action.saving.saved_to_cloud` |

### `if.action.scoring` (17)

| alias | platform message id |
|---|---|
| `scoring-early-game` | `if.action.scoring.early_game` |
| `scoring-game-complete` | `if.action.scoring.game_complete` |
| `scoring-late-game` | `if.action.scoring.late_game` |
| `scoring-mid-game` | `if.action.scoring.mid_game` |
| `scoring-no-achievements` | `if.action.scoring.no_achievements` |
| `scoring-no-scoring` | `if.action.scoring.no_scoring` |
| `scoring-perfect-score` | `if.action.scoring.perfect_score` |
| `scoring-rank-amateur` | `if.action.scoring.rank_amateur` |
| `scoring-rank-expert` | `if.action.scoring.rank_expert` |
| `scoring-rank-master` | `if.action.scoring.rank_master` |
| `scoring-rank-novice` | `if.action.scoring.rank_novice` |
| `scoring-rank-proficient` | `if.action.scoring.rank_proficient` |
| `scoring-score-display` | `if.action.scoring.score_display` |
| `scoring-score-simple` | `if.action.scoring.score_simple` |
| `scoring-score-with-rank` | `if.action.scoring.score_with_rank` |
| `scoring-scoring-not-enabled` | `if.action.scoring.scoring_not_enabled` |
| `scoring-with-achievements` | `if.action.scoring.with_achievements` |

### `if.action.searching` (13)

| alias | platform message id |
|---|---|
| `searching-container-closed` | `if.action.searching.container_closed` |
| `searching-container-contents` | `if.action.searching.container_contents` |
| `searching-empty-container` | `if.action.searching.empty_container` |
| `searching-found-concealed-here` | `if.action.searching.found_concealed_here` |
| `searching-found-concealed-in-container` | `if.action.searching.found_concealed_in_container` |
| `searching-found-concealed-on-supporter` | `if.action.searching.found_concealed_on_supporter` |
| `searching-found-items` | `if.action.searching.found_items` |
| `searching-not-reachable` | `if.action.searching.not_reachable` |
| `searching-not-visible` | `if.action.searching.not_visible` |
| `searching-nothing-special` | `if.action.searching.nothing_special` |
| `searching-searched-location` | `if.action.searching.searched_location` |
| `searching-searched-object` | `if.action.searching.searched_object` |
| `searching-supporter-contents` | `if.action.searching.supporter_contents` |

### `if.action.showing` (14)

| alias | platform message id |
|---|---|
| `showing-no-item` | `if.action.showing.no_item` |
| `showing-no-viewer` | `if.action.showing.no_viewer` |
| `showing-not-actor` | `if.action.showing.not_actor` |
| `showing-not-carrying` | `if.action.showing.not_carrying` |
| `showing-self` | `if.action.showing.self` |
| `showing-shown` | `if.action.showing.shown` |
| `showing-viewer-examines` | `if.action.showing.viewer_examines` |
| `showing-viewer-impressed` | `if.action.showing.viewer_impressed` |
| `showing-viewer-nods` | `if.action.showing.viewer_nods` |
| `showing-viewer-not-visible` | `if.action.showing.viewer_not_visible` |
| `showing-viewer-recognizes` | `if.action.showing.viewer_recognizes` |
| `showing-viewer-too-far` | `if.action.showing.viewer_too_far` |
| `showing-viewer-unimpressed` | `if.action.showing.viewer_unimpressed` |
| `showing-wearing-shown` | `if.action.showing.wearing_shown` |

### `if.action.sleeping` (13)

| alias | platform message id |
|---|---|
| `sleeping-already-well-rested` | `if.action.sleeping.already_well_rested` |
| `sleeping-brief-nap` | `if.action.sleeping.brief_nap` |
| `sleeping-cant-sleep-here` | `if.action.sleeping.cant_sleep_here` |
| `sleeping-deep-sleep` | `if.action.sleeping.deep_sleep` |
| `sleeping-disturbed-sleep` | `if.action.sleeping.disturbed_sleep` |
| `sleeping-dozed-off` | `if.action.sleeping.dozed_off` |
| `sleeping-fell-asleep` | `if.action.sleeping.fell_asleep` |
| `sleeping-nightmares` | `if.action.sleeping.nightmares` |
| `sleeping-peaceful-sleep` | `if.action.sleeping.peaceful_sleep` |
| `sleeping-slept` | `if.action.sleeping.slept` |
| `sleeping-slept-fitfully` | `if.action.sleeping.slept_fitfully` |
| `sleeping-too-dangerous-to-sleep` | `if.action.sleeping.too_dangerous_to_sleep` |
| `sleeping-woke-refreshed` | `if.action.sleeping.woke_refreshed` |

### `if.action.smelling` (15)

| alias | platform message id |
|---|---|
| `smelling-burning-scent` | `if.action.smelling.burning_scent` |
| `smelling-container-food-scent` | `if.action.smelling.container_food_scent` |
| `smelling-drink-scent` | `if.action.smelling.drink_scent` |
| `smelling-food-nearby` | `if.action.smelling.food_nearby` |
| `smelling-food-scent` | `if.action.smelling.food_scent` |
| `smelling-fresh-scent` | `if.action.smelling.fresh_scent` |
| `smelling-musty-scent` | `if.action.smelling.musty_scent` |
| `smelling-no-particular-scent` | `if.action.smelling.no_particular_scent` |
| `smelling-no-scent` | `if.action.smelling.no_scent` |
| `smelling-not-visible` | `if.action.smelling.not_visible` |
| `smelling-room-scents` | `if.action.smelling.room_scents` |
| `smelling-smelled` | `if.action.smelling.smelled` |
| `smelling-smelled-environment` | `if.action.smelling.smelled_environment` |
| `smelling-smoke-detected` | `if.action.smelling.smoke_detected` |
| `smelling-too-far` | `if.action.smelling.too_far` |

### `if.action.switching_off` (13)

| alias | platform message id |
|---|---|
| `switching-off-already-off` | `if.action.switching_off.already_off` |
| `switching-off-device-stops` | `if.action.switching_off.device_stops` |
| `switching-off-door-closes` | `if.action.switching_off.door_closes` |
| `switching-off-light-off` | `if.action.switching_off.light_off` |
| `switching-off-light-off-still-lit` | `if.action.switching_off.light_off_still_lit` |
| `switching-off-no-target` | `if.action.switching_off.no_target` |
| `switching-off-not-reachable` | `if.action.switching_off.not_reachable` |
| `switching-off-not-switchable` | `if.action.switching_off.not_switchable` |
| `switching-off-not-visible` | `if.action.switching_off.not_visible` |
| `switching-off-silence-falls` | `if.action.switching_off.silence_falls` |
| `switching-off-switched-off` | `if.action.switching_off.switched_off` |
| `switching-off-was-temporary` | `if.action.switching_off.was_temporary` |
| `switching-off-with-sound` | `if.action.switching_off.with_sound` |

### `if.action.switching_on` (13)

| alias | platform message id |
|---|---|
| `switching-on-already-on` | `if.action.switching_on.already_on` |
| `switching-on-device-humming` | `if.action.switching_on.device_humming` |
| `switching-on-door-opens` | `if.action.switching_on.door_opens` |
| `switching-on-illuminates-darkness` | `if.action.switching_on.illuminates_darkness` |
| `switching-on-light-on` | `if.action.switching_on.light_on` |
| `switching-on-no-power` | `if.action.switching_on.no_power` |
| `switching-on-no-target` | `if.action.switching_on.no_target` |
| `switching-on-not-reachable` | `if.action.switching_on.not_reachable` |
| `switching-on-not-switchable` | `if.action.switching_on.not_switchable` |
| `switching-on-not-visible` | `if.action.switching_on.not_visible` |
| `switching-on-switched-on` | `if.action.switching_on.switched_on` |
| `switching-on-temporary-activation` | `if.action.switching_on.temporary_activation` |
| `switching-on-with-sound` | `if.action.switching_on.with_sound` |

### `if.action.taking` (12)

| alias | platform message id |
|---|---|
| `taking-already-have` | `if.action.taking.already_have` |
| `taking-cannot-take` | `if.action.taking.cannot_take` |
| `taking-cant-take-room` | `if.action.taking.cant_take_room` |
| `taking-cant-take-self` | `if.action.taking.cant_take_self` |
| `taking-container-full` | `if.action.taking.container_full` |
| `taking-fixed-in-place` | `if.action.taking.fixed_in_place` |
| `taking-no-target` | `if.action.taking.no_target` |
| `taking-nothing-to-take` | `if.action.taking.nothing_to_take` |
| `taking-taken` | `if.action.taking.taken` |
| `taking-taken-from` | `if.action.taking.taken_from` |
| `taking-taken-multi` | `if.action.taking.taken_multi` |
| `taking-too-heavy` | `if.action.taking.too_heavy` |

### `if.action.taking_off` (5)

| alias | platform message id |
|---|---|
| `taking-off-cant-remove` | `if.action.taking_off.cant_remove` |
| `taking-off-no-target` | `if.action.taking_off.no_target` |
| `taking-off-not-wearing` | `if.action.taking_off.not_wearing` |
| `taking-off-prevents-removal` | `if.action.taking_off.prevents_removal` |
| `taking-off-removed` | `if.action.taking_off.removed` |

### `if.action.talking` (18)

| alias | platform message id |
|---|---|
| `talking-acknowledges` | `if.action.talking.acknowledges` |
| `talking-casual-greeting` | `if.action.talking.casual_greeting` |
| `talking-first-meeting` | `if.action.talking.first_meeting` |
| `talking-formal-greeting` | `if.action.talking.formal_greeting` |
| `talking-friendly-greeting` | `if.action.talking.friendly_greeting` |
| `talking-greets-again` | `if.action.talking.greets_again` |
| `talking-greets-back` | `if.action.talking.greets_back` |
| `talking-has-topics` | `if.action.talking.has_topics` |
| `talking-no-response` | `if.action.talking.no_response` |
| `talking-no-target` | `if.action.talking.no_target` |
| `talking-not-actor` | `if.action.talking.not_actor` |
| `talking-not-available` | `if.action.talking.not_available` |
| `talking-not-visible` | `if.action.talking.not_visible` |
| `talking-nothing-to-say` | `if.action.talking.nothing_to_say` |
| `talking-remembers-you` | `if.action.talking.remembers_you` |
| `talking-self` | `if.action.talking.self` |
| `talking-talked` | `if.action.talking.talked` |
| `talking-too-far` | `if.action.talking.too_far` |

### `if.action.telling` (15)

| alias | platform message id |
|---|---|
| `telling-already-knew` | `if.action.telling.already_knew` |
| `telling-bored` | `if.action.telling.bored` |
| `telling-dismissive` | `if.action.telling.dismissive` |
| `telling-grateful` | `if.action.telling.grateful` |
| `telling-ignores` | `if.action.telling.ignores` |
| `telling-informed` | `if.action.telling.informed` |
| `telling-interested` | `if.action.telling.interested` |
| `telling-no-target` | `if.action.telling.no_target` |
| `telling-no-topic` | `if.action.telling.no_topic` |
| `telling-not-actor` | `if.action.telling.not_actor` |
| `telling-not-interested` | `if.action.telling.not_interested` |
| `telling-not-visible` | `if.action.telling.not_visible` |
| `telling-told` | `if.action.telling.told` |
| `telling-too-far` | `if.action.telling.too_far` |
| `telling-very-interested` | `if.action.telling.very_interested` |

### `if.action.throwing` (24)

| alias | platform message id |
|---|---|
| `throwing-bounces-off` | `if.action.throwing.bounces_off` |
| `throwing-breaks-against` | `if.action.throwing.breaks_against` |
| `throwing-breaks-on-impact` | `if.action.throwing.breaks_on_impact` |
| `throwing-fragile-breaks` | `if.action.throwing.fragile_breaks` |
| `throwing-hits-target` | `if.action.throwing.hits_target` |
| `throwing-lands-in` | `if.action.throwing.lands_in` |
| `throwing-lands-on` | `if.action.throwing.lands_on` |
| `throwing-misses-target` | `if.action.throwing.misses_target` |
| `throwing-no-exit` | `if.action.throwing.no_exit` |
| `throwing-no-item` | `if.action.throwing.no_item` |
| `throwing-not-holding` | `if.action.throwing.not_holding` |
| `throwing-sails-through` | `if.action.throwing.sails_through` |
| `throwing-self` | `if.action.throwing.self` |
| `throwing-target-angry` | `if.action.throwing.target_angry` |
| `throwing-target-catches` | `if.action.throwing.target_catches` |
| `throwing-target-ducks` | `if.action.throwing.target_ducks` |
| `throwing-target-not-here` | `if.action.throwing.target_not_here` |
| `throwing-target-not-visible` | `if.action.throwing.target_not_visible` |
| `throwing-thrown` | `if.action.throwing.thrown` |
| `throwing-thrown-at` | `if.action.throwing.thrown_at` |
| `throwing-thrown-direction` | `if.action.throwing.thrown_direction` |
| `throwing-thrown-down` | `if.action.throwing.thrown_down` |
| `throwing-thrown-gently` | `if.action.throwing.thrown_gently` |
| `throwing-too-heavy` | `if.action.throwing.too_heavy` |

### `if.action.touching` (19)

| alias | platform message id |
|---|---|
| `touching-device-vibrating` | `if.action.touching.device_vibrating` |
| `touching-feels-hard` | `if.action.touching.feels_hard` |
| `touching-feels-hot` | `if.action.touching.feels_hot` |
| `touching-feels-normal` | `if.action.touching.feels_normal` |
| `touching-feels-smooth` | `if.action.touching.feels_smooth` |
| `touching-feels-soft` | `if.action.touching.feels_soft` |
| `touching-feels-warm` | `if.action.touching.feels_warm` |
| `touching-feels-wet` | `if.action.touching.feels_wet` |
| `touching-immovable-object` | `if.action.touching.immovable_object` |
| `touching-liquid-container` | `if.action.touching.liquid_container` |
| `touching-no-target` | `if.action.touching.no_target` |
| `touching-not-reachable` | `if.action.touching.not_reachable` |
| `touching-not-visible` | `if.action.touching.not_visible` |
| `touching-patted` | `if.action.touching.patted` |
| `touching-poked` | `if.action.touching.poked` |
| `touching-prodded` | `if.action.touching.prodded` |
| `touching-stroked` | `if.action.touching.stroked` |
| `touching-touched` | `if.action.touching.touched` |
| `touching-touched-gently` | `if.action.touching.touched_gently` |

### `if.action.turning` (25)

| alias | platform message id |
|---|---|
| `turning-cant-turn-that` | `if.action.turning.cant_turn_that` |
| `turning-crank-turned` | `if.action.turning.crank_turned` |
| `turning-dial-adjusted` | `if.action.turning.dial_adjusted` |
| `turning-dial-set` | `if.action.turning.dial_set` |
| `turning-dial-turned` | `if.action.turning.dial_turned` |
| `turning-flow-changes` | `if.action.turning.flow_changes` |
| `turning-key-needs-lock` | `if.action.turning.key_needs_lock` |
| `turning-key-turned` | `if.action.turning.key_turned` |
| `turning-knob-clicks` | `if.action.turning.knob_clicks` |
| `turning-knob-toggled` | `if.action.turning.knob_toggled` |
| `turning-knob-turned` | `if.action.turning.knob_turned` |
| `turning-mechanism-activated` | `if.action.turning.mechanism_activated` |
| `turning-mechanism-grinds` | `if.action.turning.mechanism_grinds` |
| `turning-no-target` | `if.action.turning.no_target` |
| `turning-not-reachable` | `if.action.turning.not_reachable` |
| `turning-not-visible` | `if.action.turning.not_visible` |
| `turning-nothing-happens` | `if.action.turning.nothing_happens` |
| `turning-requires-more-turns` | `if.action.turning.requires_more_turns` |
| `turning-rotated` | `if.action.turning.rotated` |
| `turning-spun` | `if.action.turning.spun` |
| `turning-turned` | `if.action.turning.turned` |
| `turning-valve-closed` | `if.action.turning.valve_closed` |
| `turning-valve-opened` | `if.action.turning.valve_opened` |
| `turning-wearing-it` | `if.action.turning.wearing_it` |
| `turning-wheel-turned` | `if.action.turning.wheel_turned` |

### `if.action.undoing` (4)

| alias | platform message id |
|---|---|
| `undoing-nothing-to-undo` | `if.action.undoing.nothing_to_undo` |
| `undoing-undo-failed` | `if.action.undoing.undo_failed` |
| `undoing-undo-success` | `if.action.undoing.undo_success` |
| `undoing-undo-to-turn` | `if.action.undoing.undo_to_turn` |

### `if.action.unlocking` (10)

| alias | platform message id |
|---|---|
| `unlocking-already-unlocked` | `if.action.unlocking.already_unlocked` |
| `unlocking-cant-reach` | `if.action.unlocking.cant_reach` |
| `unlocking-key-not-held` | `if.action.unlocking.key_not_held` |
| `unlocking-no-key` | `if.action.unlocking.no_key` |
| `unlocking-no-target` | `if.action.unlocking.no_target` |
| `unlocking-not-lockable` | `if.action.unlocking.not_lockable` |
| `unlocking-still-locked` | `if.action.unlocking.still_locked` |
| `unlocking-unlocked` | `if.action.unlocking.unlocked` |
| `unlocking-unlocked-with` | `if.action.unlocking.unlocked_with` |
| `unlocking-wrong-key` | `if.action.unlocking.wrong_key` |

### `if.action.version` (3)

| alias | platform message id |
|---|---|
| `version-version-compact` | `if.action.version.version_compact` |
| `version-version-full` | `if.action.version.version_full` |
| `version-version-no-date` | `if.action.version.version_no_date` |

### `if.action.waiting` (12)

| alias | platform message id |
|---|---|
| `waiting-grows-restless` | `if.action.waiting.grows_restless` |
| `waiting-nothing-happens` | `if.action.waiting.nothing_happens` |
| `waiting-patience-rewarded` | `if.action.waiting.patience_rewarded` |
| `waiting-something-approaches` | `if.action.waiting.something_approaches` |
| `waiting-time-passes` | `if.action.waiting.time_passes` |
| `waiting-time-runs-out` | `if.action.waiting.time_runs_out` |
| `waiting-waited` | `if.action.waiting.waited` |
| `waiting-waited-anxiously` | `if.action.waiting.waited_anxiously` |
| `waiting-waited-briefly` | `if.action.waiting.waited_briefly` |
| `waiting-waited-for-event` | `if.action.waiting.waited_for_event` |
| `waiting-waited-in-vehicle` | `if.action.waiting.waited_in_vehicle` |
| `waiting-waited-patiently` | `if.action.waiting.waited_patiently` |

### `if.action.wearing` (7)

| alias | platform message id |
|---|---|
| `wearing-already-wearing` | `if.action.wearing.already_wearing` |
| `wearing-cant-wear-that` | `if.action.wearing.cant_wear_that` |
| `wearing-hands-full` | `if.action.wearing.hands_full` |
| `wearing-no-target` | `if.action.wearing.no_target` |
| `wearing-not-held` | `if.action.wearing.not_held` |
| `wearing-not-wearable` | `if.action.wearing.not_wearable` |
| `wearing-worn` | `if.action.wearing.worn` |
