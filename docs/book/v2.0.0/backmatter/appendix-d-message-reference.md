# Appendix D — Message-ID Reference {.unnumbered}

Every message ID registered by `@sharpee/lang-en-us`, with its default English text.
Override any of these from a story with `extendLanguage` (Volume V). Generated from the
language provider by `scripts/generate-appendix-d.cjs`; 821 messages in 84 groups.

## `character.conversation` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `character.conversation.ends` | {capitalize the speaker} {verb:nods speaker}, ending the conversation. |
| `character.conversation.initiates` | {capitalize the speaker} {verb:approaches speaker} you. "A word, if you please." |

## `character.conversation.attention` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `character.conversation.attention.blocks` | {capitalize the speaker} {verb:steps speaker} in front of you. "We're not done here." |
| `character.conversation.attention.protests` | {capitalize the speaker} {verb:frowns speaker} as you turn away. "I wasn't finished." |
| `character.conversation.attention.yields` | {capitalize the speaker} {verb:steps speaker} aside, yielding the conversation. |

## `character.conversation.between.confessing` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `character.conversation.between.confessing.1` | {capitalize the speaker} {verb:shifts speaker} uncomfortably, as though wanting to say more. |
| `character.conversation.between.confessing.3` | {capitalize the speaker} {verb:opens speaker} their mouth, then closes it again. |

## `character.conversation.between.eager` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `character.conversation.between.eager.1` | {capitalize the speaker} {verb:watches speaker} you expectantly. |
| `character.conversation.between.eager.3` | {capitalize the speaker} {verb:clears speaker} their throat, waiting for your attention. |

## `character.conversation.between.hostile` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `character.conversation.between.hostile.1` | {capitalize the speaker} {verb:glares speaker} at you impatiently. |

## `character.conversation.between.neutral` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `character.conversation.between.neutral.3` | {capitalize the speaker} {verb:seems speaker} to lose interest in the conversation. |

## `character.conversation.between.reluctant` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `character.conversation.between.reluctant.1` | {capitalize the speaker} {verb:seems speaker} relieved you're occupied. |

## `character.conversation.cognitive` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `character.conversation.cognitive.detached` | {capitalize the speaker} {verb:responds speaker} flatly, as if reciting from a great distance. |
| `character.conversation.cognitive.drifting` | {capitalize the speaker} {verb:trails speaker} off, attention wandering to something only they can see. |
| `character.conversation.cognitive.fragmented` | {capitalize the speaker} {verb:speaks speaker} in broken fragments, losing the thread mid-sentence. |

## `character.conversation.response` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `character.conversation.response.confabulate` | {capitalize the speaker} {verb:seems speaker} to be filling in the gaps from memory. |
| `character.conversation.response.deflect` | {capitalize the speaker} {verb:changes speaker} the subject. |
| `character.conversation.response.omit` | {capitalize the speaker} {verb:says speaker} nothing about that. |
| `character.conversation.response.refuse` | {capitalize the speaker} {verb:refuses speaker} to discuss that. |

## `character.influence.effect` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `character.influence.effect.departed` | With {verbatim:influencerName} gone, {verbatim:targetName} regains composure. |
| `character.influence.effect.expired` | The influence over {verbatim:targetName} fades. |

## `character.influence.pc` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `character.influence.pc.action_intercepted` | You find it hard to concentrate. |
| `character.influence.pc.focus_clouded` | You were about to do something, but you've lost your train of thought. |

## `character.influence.resisted` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `character.influence.resisted.default` | {verbatim:targetName} seems unaffected by {verbatim:influencerName}. |

## `character.influence.witnessed` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `character.influence.witnessed.default` | {verbatim:influencerName} exerts a subtle influence on {verbatim:targetName}. |

## `character.propagation` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `character.propagation.eavesdropped` | You overhear {verbatim:speakerName} speaking to {verbatim:listenerName}. |

## `character.propagation.witnessed` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `character.propagation.witnessed.conspiratorial` | {verbatim:speakerName} leans close to {verbatim:listenerName}, muttering under their breath. |
| `character.propagation.witnessed.dramatic` | {verbatim:speakerName} excitedly tells {verbatim:listenerName} about something. |
| `character.propagation.witnessed.fearful` | {verbatim:speakerName} nervously whispers something to {verbatim:listenerName}. |
| `character.propagation.witnessed.neutral` | {verbatim:speakerName} mentions something to {verbatim:listenerName}. |
| `character.propagation.witnessed.vague` | {verbatim:speakerName} vaguely alludes to something near {verbatim:listenerName}. |

## `core` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `core.ambiguous_reference` | Which do you mean? |
| `core.command_failed` | I don't understand that. |
| `core.command_not_understood` | I don't understand that command. |
| `core.disambiguation_prompt` | Which do you mean: {options}? |
| `core.entity_not_found` | You can't see any such thing. |

## `game.started` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `game.started.banner` | {title} By {author}  Type HELP for instructions. |

## `if.action.about` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.about.about_compact` | {verbatim:title} v{version} by {verbatim:author} |
| `if.action.about.about_footer` | Thank you for playing! |
| `if.action.about.about_header` | About {verbatim:title} |
| `if.action.about.acknowledgments` | Acknowledgments: {acknowledgments} |
| `if.action.about.contact` | Contact: {contact} |
| `if.action.about.copyright` | Copyright {copyright} |
| `if.action.about.credits_header` | Credits: |
| `if.action.about.credits_list` | {credits} |
| `if.action.about.dedication` | Dedication: {dedication} |
| `if.action.about.description` | Description: {verbatim:description} |
| `if.action.about.engine_info` | Powered by {engine} version {verbatim:engineVersion} |
| `if.action.about.enjoy_game` | We hope you enjoy playing {verbatim:title}! |
| `if.action.about.game_info` | {verbatim:title} Version {verbatim:version} By {verbatim:author} Released: {releaseDate} |
| `if.action.about.game_info_simple` | {verbatim:title} by {verbatim:author} |
| `if.action.about.license` | License: {license} |
| `if.action.about.play_stats` | Current Session: Time played: {playTime} Moves made: {sessionMoves} |
| `if.action.about.session_info` | You've been playing for {playTime} and made {sessionMoves} moves. |
| `if.action.about.special_thanks` | Special Thanks: {specialThanks} |
| `if.action.about.success` | {verbatim:title} Version {verbatim:version} By {verbatim:author}  {verbatim:description} |
| `if.action.about.technical_info` | Technical Information: Engine: {engine} v{verbatim:engineVersion} Platform: Interactive Fiction |
| `if.action.about.website` | Website: {website} |

## `if.action.again` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.again.nothing_to_repeat` | There is nothing to repeat. |

## `if.action.answering` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.answering.accepted` | {Your} answer is accepted. |
| `if.action.answering.answered` | {You} {answer}, "{response}" |
| `if.action.answering.answered_no` | {You} {say}, "No." |
| `if.action.answering.answered_yes` | {You} {say}, "Yes." |
| `if.action.answering.confused_by_answer` | {Your} answer seems to confuse them. |
| `if.action.answering.gave_answer` | {You} {respond} to the question. |
| `if.action.answering.invalid_response` | That's not a valid answer to the question. |
| `if.action.answering.needs_yes_or_no` | Please answer yes or no. |
| `if.action.answering.no_one_asked` | No one asked {you} anything. |
| `if.action.answering.no_question` | There's nothing to answer. |
| `if.action.answering.noted` | {Your} response is noted. |
| `if.action.answering.rejected` | {Your} answer is not what they wanted to hear. |
| `if.action.answering.too_late` | It's too late to answer that. |
| `if.action.answering.unclear_answer` | {Your} answer isn't clear. Try again. |

## `if.action.asking` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.asking.already_told` | {capitalize the target} {verb:says target}, "I already told you about that." |
| `if.action.asking.confused` | {capitalize the target} looks confused. |
| `if.action.asking.earned_trust` | {capitalize the target} {verb:says target}, "Since you've proven yourself, I'll tell you..." |
| `if.action.asking.explains` | {capitalize the target} {verb:explains target} about {verbatim:topic}. |
| `if.action.asking.must_do_first` | {capitalize the target} {verb:says target}, "There's something you need to do first." |
| `if.action.asking.no_idea` | {capitalize the target} {verb:says target}, "No idea what you're talking about." |
| `if.action.asking.no_target` | Ask whom? |
| `if.action.asking.no_topic` | Ask about what? |
| `if.action.asking.not_actor` | {You} can only ask questions of people. |
| `if.action.asking.not_visible` | {You} {can't} see {the target}. |
| `if.action.asking.not_yet` | {capitalize the target} {verb:says target}, "I can't tell you about that yet." |
| `if.action.asking.remembers` | {capitalize the target} {verb:says target}, "Ah yes, about {verbatim:topic}..." |
| `if.action.asking.responds` | {capitalize the target} {verb:tells target} you about {verbatim:topic}. |
| `if.action.asking.shrugs` | {capitalize the target} shrugs. |
| `if.action.asking.too_far` | {capitalize the target} {verb:is target} too far away. |
| `if.action.asking.unknown_topic` | {capitalize the target} {verb:says target}, "I don't know anything about that." |

## `if.action.attacking` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.attacking.already_dead` | {capitalize the target} {verb:is target} already dead. |
| `if.action.attacking.attack_ineffective` | {Your} attack has no effect on {the target}. |
| `if.action.attacking.attacked` | {You} {attack} {the target}. |
| `if.action.attacking.attacked_with` | {You} {attack} {the target} with {the weapon}. |
| `if.action.attacking.broke` | {You} {break} {the target}! |
| `if.action.attacking.debris_created` | Debris from {the target} litters the area. |
| `if.action.attacking.defends` | {capitalize the target} defends against {your} attack. |
| `if.action.attacking.destroyed` | {You} {destroy} {the target}! |
| `if.action.attacking.dodges` | {capitalize the target} dodges {your} attack. |
| `if.action.attacking.flees` | {capitalize the target} flees from {you}! |
| `if.action.attacking.hit_blindly` | {You} {swing} wildly, hitting nothing. |
| `if.action.attacking.hit_target` | {You} {hit} {the target}. |
| `if.action.attacking.hit_with` | {You} {hit} {the target} with {the weapon}. |
| `if.action.attacking.indestructible` | {capitalize the target} {verb:is target} far too solid to damage. |
| `if.action.attacking.items_spilled` | {capitalize the target}'s possessions spill onto the ground. |
| `if.action.attacking.kicked` | {You} {kick} {the target}. |
| `if.action.attacking.killed_blindly` | Something dies in the darkness. |
| `if.action.attacking.killed_target` | {You} {have} defeated {the target}! |
| `if.action.attacking.need_weapon_to_damage` | {capitalize the target} requires a weapon to damage. |
| `if.action.attacking.no_fighting` | Fighting won't solve this problem. |
| `if.action.attacking.no_target` | Attack what? |
| `if.action.attacking.not_holding_weapon` | {You} aren't holding {the weapon}. |
| `if.action.attacking.not_reachable` | {You} {can't} reach {the target}. |
| `if.action.attacking.not_visible` | {You} {can't} see {the target}. |
| `if.action.attacking.passage_revealed` | A hidden passage is revealed! |
| `if.action.attacking.peaceful_solution` | Violence isn't necessary here. |
| `if.action.attacking.punched` | {You} {punch} {the target}. |
| `if.action.attacking.retaliates` | {capitalize the target} fights back! |
| `if.action.attacking.self` | Violence against {yourself} isn't the answer. |
| `if.action.attacking.shattered` | {capitalize the target} shatters! |
| `if.action.attacking.smashed` | {You} {smash} {the target} to pieces! |
| `if.action.attacking.struck` | {You} {strike} {the target}! |
| `if.action.attacking.struck_with` | {You} {strike} {the target} with {the weapon}! |
| `if.action.attacking.target_broke` | {capitalize the target} breaks! |
| `if.action.attacking.target_damaged` | {capitalize the target} shows signs of damage. ({damage} damage dealt) |
| `if.action.attacking.target_destroyed` | {capitalize the target} {verb:is target} utterly destroyed! |
| `if.action.attacking.target_shattered` | {capitalize the target} shatters into pieces! |
| `if.action.attacking.unarmed_attack` | {You} {attack} {the target} with {your} bare hands. |
| `if.action.attacking.unnecessary_violence` | That seems unnecessarily violent. |
| `if.action.attacking.violence_not_the_answer` | Violence is not the answer. |
| `if.action.attacking.wrong_weapon_type` | {capitalize the target} can't be damaged with that type of weapon. |

## `if.action.attacking.combat` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.attacking.combat.already_dead` | {capitalize the target} {verb:is target} already dead. |
| `if.action.attacking.combat.cannot_attack` | {You} {can't} attack {the target}. |
| `if.action.attacking.combat.ended` | The battle is over. |
| `if.action.attacking.combat.need_weapon` | {You} {need} a weapon to attack effectively. |
| `if.action.attacking.combat.no_target` | Attack what? |
| `if.action.attacking.combat.not_hostile` | {capitalize the target} isn't hostile. |
| `if.action.attacking.combat.player_died` | {You} {have} been slain! |
| `if.action.attacking.combat.player_resurrected` | {You} {feel} life return to {your} body. |
| `if.action.attacking.combat.started` | Combat has begun! |
| `if.action.attacking.combat.target_unconscious` | {capitalize the target} {verb:is target} already unconscious. |

## `if.action.attacking.combat.attack` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.attacking.combat.attack.hit` | {You} {hit} {the target} for {damage} damage. |
| `if.action.attacking.combat.attack.hit_heavy` | {You} {land} a solid blow on {the target}, dealing {damage} damage! |
| `if.action.attacking.combat.attack.hit_light` | {You} {graze} {the target}, doing {damage} damage. |
| `if.action.attacking.combat.attack.killed` | {You} {have} slain {the target}! |
| `if.action.attacking.combat.attack.knocked_out` | {capitalize the target} collapses, unconscious! |
| `if.action.attacking.combat.attack.missed` | {You} {swing} at {the target} but miss! |

## `if.action.attacking.combat.defend` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.attacking.combat.defend.blocked` | {capitalize the target} blocks {your} attack! |
| `if.action.attacking.combat.defend.dodged` | {capitalize the target} dodges out of the way! |
| `if.action.attacking.combat.defend.parried` | {capitalize the target} parries {your} attack! |

## `if.action.attacking.combat.health` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.attacking.combat.health.badly_wounded` | {capitalize the target} {verb:is target} badly wounded. |
| `if.action.attacking.combat.health.dead` | {capitalize the target} {verb:is target} dead. |
| `if.action.attacking.combat.health.healthy` | {capitalize the target} appears uninjured. |
| `if.action.attacking.combat.health.near_death` | {capitalize the target} {verb:is target} barely clinging to life! |
| `if.action.attacking.combat.health.unconscious` | {capitalize the target} lies unconscious. |
| `if.action.attacking.combat.health.wounded` | {capitalize the target} {verb:has target} been wounded. |

## `if.action.attacking.combat.special` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.attacking.combat.special.blessed_weapon` | {Your} blessed weapon burns the undead! |
| `if.action.attacking.combat.special.sword_glows` | {Your} sword glows brightly! |
| `if.action.attacking.combat.special.sword_stops_glowing` | {Your} sword's glow fades. |

## `if.action.climbing` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.climbing.already_there` | {You're} already on {the place}. |
| `if.action.climbing.cant_go_that_way` | {You} {can't} climb {verbatim:direction} from here. |
| `if.action.climbing.climbed_down` | {You} {climb} down. |
| `if.action.climbing.climbed_onto` | {You} {climb} onto {the target}. |
| `if.action.climbing.climbed_up` | {You} {climb} up. |
| `if.action.climbing.need_equipment` | {You}'d need climbing equipment for that. |
| `if.action.climbing.no_target` | What do {you} want to climb? |
| `if.action.climbing.not_climbable` | {You} {can't} climb {the object}. |
| `if.action.climbing.nothing_to_climb` | There's nothing to climb here. |
| `if.action.climbing.too_dangerous` | That looks too dangerous to climb. |
| `if.action.climbing.too_high` | That's too high to climb. |
| `if.action.climbing.too_slippery` | It's too slippery to climb. |

## `if.action.closing` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.closing.already_closed` | {capitalize the item} {verb:is item} already closed. |
| `if.action.closing.cant_reach` | {You} {can't} reach {the item}. |
| `if.action.closing.closed` | {You} {close} {the item}. |
| `if.action.closing.no_target` | Close what? |
| `if.action.closing.not_closable` | {capitalize the item} can't be closed. |
| `if.action.closing.prevents_closing` | {You} {can't} close {the item} while {obstacle} {verb:is obstacle} in the way. |

## `if.action.drinking` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.drinking.already_consumed` | There's nothing left to drink. |
| `if.action.drinking.bitter` | {You} {drink} {the item}. It's quite bitter. |
| `if.action.drinking.container_closed` | {You} {need} to open {the item} first. |
| `if.action.drinking.drunk` | {You} {drink} {the item}. |
| `if.action.drinking.drunk_all` | {You} {drink} all of {the item}. |
| `if.action.drinking.drunk_from` | {You} {drink} from {the item}. |
| `if.action.drinking.drunk_some` | {You} {drink} some of {the item}. |
| `if.action.drinking.empty_now` | {You} {drink} the last of the {liquidType}. |
| `if.action.drinking.from_container` | {You} {drink} the {liquidType} from {the item}. |
| `if.action.drinking.gulped` | {You} {gulp} down {the item}. |
| `if.action.drinking.healing` | {You} {drink} {the item}. {You} {feel} better! |
| `if.action.drinking.magical_effects` | {You} {drink} {the item}. {You} {feel} strange... |
| `if.action.drinking.no_item` | Drink what? |
| `if.action.drinking.not_drinkable` | That's not something {you} can drink. |
| `if.action.drinking.not_reachable` | {You} {can't} reach {the item}. |
| `if.action.drinking.not_visible` | {You} {can't} see {the item}. |
| `if.action.drinking.quaffed` | {You} {quaff} {the item} heartily. |
| `if.action.drinking.refreshing` | {You} {drink} {the item}. How refreshing! |
| `if.action.drinking.satisfying` | {You} {drink} {the item}. That hits the spot. |
| `if.action.drinking.sipped` | {You} {take} a sip of {the item}. |
| `if.action.drinking.some_remains` | {You} {drink} some {liquidType}. Some remains. |
| `if.action.drinking.still_thirsty` | {You} {drink} {the item}, but {you're} still thirsty. |
| `if.action.drinking.strong` | {You} {drink} {the item}. It's strong! |
| `if.action.drinking.sweet` | {You} {drink} {the item}. It's sweet. |
| `if.action.drinking.thirst_quenched` | {You} {drink} {the item}. {Your} thirst is quenched. |

## `if.action.dropping` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.dropping.dropped` | Dropped. |
| `if.action.dropping.dropped_in` | {You} {put} {the item} in {the container}. |
| `if.action.dropping.dropped_multi` | {item}: Dropped. |
| `if.action.dropping.dropped_on` | {You} {put} {the item} on {the surface}. |
| `if.action.dropping.no_target` | Drop what? |
| `if.action.dropping.not_held` | {You} aren't holding {the item}. |
| `if.action.dropping.nothing_to_drop` | {You} aren't carrying anything. |

## `if.action.eating` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.eating.already_consumed` | There's nothing left of {the item} to eat. |
| `if.action.eating.awful` | {You} {eat} {the item}. It tastes awful! |
| `if.action.eating.bland` | {You} {eat} {the item}. It's rather bland. |
| `if.action.eating.delicious` | {You} {eat} {the item}. Delicious! |
| `if.action.eating.devoured` | {You} {devour} {the item} hungrily. |
| `if.action.eating.eaten` | {You} {eat} {the item}. |
| `if.action.eating.eaten_all` | {You} {eat} all of {the item}. |
| `if.action.eating.eaten_portion` | {You} {eat} a portion of {the item}. |
| `if.action.eating.eaten_some` | {You} {eat} some of {the item}. |
| `if.action.eating.filling` | {You} {eat} {the item}. That was filling. |
| `if.action.eating.is_drink` | {You} should drink {the item}, not eat it. |
| `if.action.eating.munched` | {You} {munch} on {the item}. |
| `if.action.eating.nibbled` | {You} {nibble} on {the item}. |
| `if.action.eating.no_item` | Eat what? |
| `if.action.eating.not_edible` | That's not something {you} can eat. |
| `if.action.eating.not_reachable` | {You} {can't} reach {the item}. |
| `if.action.eating.not_visible` | {You} {can't} see {the item}. |
| `if.action.eating.poisonous` | {You} {eat} {the item}. It tastes strange... |
| `if.action.eating.satisfying` | {You} {eat} {the item}. Very satisfying! |
| `if.action.eating.still_hungry` | {You} {eat} {the item}, but {you're} still hungry. |
| `if.action.eating.tasted` | {You} {taste} {the item}. |
| `if.action.eating.tasty` | {You} {eat} {the item}. It's quite tasty. |

## `if.action.entering` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.entering.already_inside` | {You're} already in {the place}. |
| `if.action.entering.cant_enter` | {You} {can't} enter {the place}: {reason}. |
| `if.action.entering.container_closed` | {capitalize the container} {verb:is container} closed. |
| `if.action.entering.entered` | {You} {get} into {the place}. |
| `if.action.entering.entered_on` | {You} {get} onto {the place}. |
| `if.action.entering.no_target` | Enter what? |
| `if.action.entering.not_enterable` | {You} {can't} enter {the place}. |
| `if.action.entering.not_here` | {You} {don't} see {the place} here. |
| `if.action.entering.occupied` | {capitalize the place} {verb:is place} already occupied. |
| `if.action.entering.too_full` | {capitalize the place} {verb:is place} full (maximum {max} occupants). |
| `if.action.entering.too_small` | {capitalize the place} {verb:is place} too small for {you} to enter. |

## `if.action.examining` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.examining.brief_description` | {verbatim:description} |
| `if.action.examining.cant_see` | {You} {can't} see {the item} here. |
| `if.action.examining.container_closed` | {capitalize the item} {verb:is item} closed. |
| `if.action.examining.container_contents` | In {the container} {you} {see} {items}. |
| `if.action.examining.container_empty` | {capitalize the item} {verb:is item} empty. |
| `if.action.examining.container_open` | {capitalize the item} {verb:is item} open. |
| `if.action.examining.description` | {verbatim:description}{slot:detail} |
| `if.action.examining.examined` | {verbatim:description}{slot:detail} |
| `if.action.examining.examined_container` | {verbatim:description}{slot:detail} |
| `if.action.examining.examined_door` | {verbatim:description}{slot:detail} |
| `if.action.examining.examined_readable` | {verbatim:description}{slot:detail} |
| `if.action.examining.examined_self` | {verbatim:description} |
| `if.action.examining.examined_supporter` | {verbatim:description}{slot:detail} |
| `if.action.examining.examined_switchable` | {verbatim:description}{slot:detail} |
| `if.action.examining.examined_wall` | {verbatim:description}{slot:detail} |
| `if.action.examining.examined_wearable` | {verbatim:description}{slot:detail} |
| `if.action.examining.no_description` | {You} {see} nothing special about {the item}. |
| `if.action.examining.no_target` | Examine what? |
| `if.action.examining.not_visible` | {You} {can't} see {the item} here. |
| `if.action.examining.nothing_special` | {You} {see} nothing special about {the item}. |
| `if.action.examining.surface_contents` | On {the surface} {you} {see} {items}. |
| `if.action.examining.worn_by_other` | {actor} {verb:is actor} wearing {the item}. |
| `if.action.examining.worn_by_you` | {You} {are} wearing {the item}. |

## `if.action.exiting` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.exiting.already_outside` | {You're} not inside anything. |
| `if.action.exiting.cant_exit` | {You} {can't} exit {the place}. |
| `if.action.exiting.container_closed` | {capitalize the container} {verb:is container} closed. |
| `if.action.exiting.exit_blocked` | The way out is blocked. |
| `if.action.exiting.exited` | {You} {get} out of {the place}. |
| `if.action.exiting.exited_from` | {You} {get} {preposition} {the place}. |
| `if.action.exiting.must_stand_first` | {You}'ll need to stand up first. |
| `if.action.exiting.nowhere_to_go` | There's nowhere to go from here. |

## `if.action.giving` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.giving.accepts` | {capitalize the recipient} accepts {the item}. |
| `if.action.giving.given` | {You} {give} {the item} to {the recipient}. |
| `if.action.giving.gratefully_accepts` | {capitalize the recipient} gratefully accepts {the item}. |
| `if.action.giving.inventory_full` | {capitalize the recipient} says, "I can't carry any more." |
| `if.action.giving.no_item` | Give what? |
| `if.action.giving.no_recipient` | Give it to whom? |
| `if.action.giving.not_actor` | {You} can only give things to people. |
| `if.action.giving.not_holding` | {You} aren't holding {the item}. |
| `if.action.giving.not_interested` | {capitalize the recipient} doesn't seem interested in {the item}. |
| `if.action.giving.recipient_not_reachable` | {capitalize the recipient} {verb:is recipient} too far away. |
| `if.action.giving.recipient_not_visible` | {You} {can't} see {the recipient}. |
| `if.action.giving.refuses` | {capitalize the recipient} politely declines. |
| `if.action.giving.reluctantly_accepts` | {capitalize the recipient} reluctantly takes {the item}. |
| `if.action.giving.self` | {You} already {have} {the item}! |
| `if.action.giving.too_heavy` | {capitalize the recipient} says, "That's too heavy for me." |

## `if.action.going` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.going.already_there` | {You're} already there. |
| `if.action.going.arrived` | {You} {arrive}. |
| `if.action.going.cant_go` | {You} {can't} go that way. |
| `if.action.going.cant_go_through` | {You} {can't} go through {obstacle}. |
| `if.action.going.contents_list` | {You} can {see} {items} here. |
| `if.action.going.destination_not_found` | {You} {can't} go that way. |
| `if.action.going.door_closed` | {capitalize the door} {verb:is door} closed. |
| `if.action.going.door_locked` | {capitalize the door} {verb:is door} locked. |
| `if.action.going.moved` | {You} {go} {verbatim:direction}. |
| `if.action.going.movement_blocked` | {verbatim:message} |
| `if.action.going.need_light` | It's too dark to go that way safely. |
| `if.action.going.no_direction` | {You}'ll have to say which direction to go. |
| `if.action.going.no_exit` | {You} {can't} go that way. |
| `if.action.going.no_exit_that_way` | {You} {can't} go that way. |
| `if.action.going.no_exits` | There are no obvious exits. |
| `if.action.going.not_in_room` | {You're} not in a place where {you} can go anywhere. |
| `if.action.going.nowhere_to_go` | {You}'ll have to say which compass direction to go in. |
| `if.action.going.room_description` | {name} {verbatim:description} |
| `if.action.going.too_dark` | It is pitch dark. You are likely to be eaten by a grue. |
| `if.action.going.went` | {You} {go} {verbatim:direction}. |

## `if.action.help` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.help.first_time` | New to Interactive Fiction? Try these commands to get started: - LOOK to see where you are - INVENTORY to see what you're carrying - EXAMINE interesting objects - Go in compass directions (NORTH, SOUTH, etc.) |
| `if.action.help.general` | Welcome to Interactive Fiction!  Basic commands: - LOOK (L): Examine your surroundings - INVENTORY (I): List what you're carrying - EXAMINE (X) [object]: Look at something closely - TAKE/DROP [object]: Pick up or put down items - GO [direction] or just [direction]: Move around  For more help on a specific topic, type HELP [topic]. |
| `if.action.help.help_footer` | For a complete list of commands, consult the game documentation. |
| `if.action.help.help_movement` | Movement commands: - GO NORTH/SOUTH/EAST/WEST (or just N/S/E/W) - UP/DOWN (U/D) - IN/OUT - ENTER [place] - EXIT |
| `if.action.help.help_objects` | Object commands: - TAKE/GET [object] - DROP [object] - EXAMINE/LOOK AT [object] - OPEN/CLOSE [object] - PUT [object] IN/ON [container] - WEAR/REMOVE [clothing] |
| `if.action.help.help_special` | Special commands: - SAVE/RESTORE: Save and load your game - SCORE: Check your progress - WAIT (Z): Let time pass - AGAIN (G): Repeat last command - QUIT: Exit the game |
| `if.action.help.hints_available` | Hints are available. Type HINTS to see them. |
| `if.action.help.hints_disabled` | Hints are not available in this game. |
| `if.action.help.stuck_help` | If you're stuck, try: - LOOK around carefully - EXAMINE everything - Check your INVENTORY - Try different verbs with objects |
| `if.action.help.topic` | Help on {verbatim:topic}: |
| `if.action.help.unknown_topic` | No help available on '{verbatim:topic}'. Type HELP for general help. |

## `if.action.hiding` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.hiding.already_hidden` | {You're} already hidden. |
| `if.action.hiding.behind` | {You} {slip} behind {the target}. |
| `if.action.hiding.cant_hide_there` | {You} {can't} hide {position} {the target}. |
| `if.action.hiding.inside` | {You} {climb} into {the target}, concealing {yourself}. |
| `if.action.hiding.nothing_to_hide` | {You} {can't} hide there. |
| `if.action.hiding.on` | {You} {crouch} on {the target}, out of sight. |
| `if.action.hiding.under` | {You} {crawl} under {the target}. |

## `if.action.inserting` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.inserting.already_there` | {capitalize the item} {verb:is item} already in {the destination}. |
| `if.action.inserting.container_closed` | {capitalize the container} {verb:is container} closed. |
| `if.action.inserting.inserted` | {You} {insert} {the item} into {the container}. |
| `if.action.inserting.no_destination` | Insert {the item} into what? |
| `if.action.inserting.no_target` | Insert what? |
| `if.action.inserting.not_container` | {You} {can't} insert things into {the destination}. |
| `if.action.inserting.not_held` | {You} {need} to be holding {the item} first. |
| `if.action.inserting.not_insertable` | {capitalize the item} can't be inserted into things. |
| `if.action.inserting.wont_fit` | {capitalize the item} won't fit in {the container}. |

## `if.action.inventory` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.inventory.burden_heavy` | {You're} carrying quite a load. |
| `if.action.inventory.burden_light` | {You're} traveling light. |
| `if.action.inventory.burden_overloaded` | {You're} weighed down with everything {you're} carrying. |
| `if.action.inventory.carrying` | {You} {be} carrying: |
| `if.action.inventory.carrying_and_wearing` | {You} {be} carrying and wearing: |
| `if.action.inventory.carrying_count` | {You} {be} carrying {holdingCount} item(s). |
| `if.action.inventory.empty` | {You} aren't carrying anything. |
| `if.action.inventory.hands_empty` | {Your} hands are empty. |
| `if.action.inventory.holding_list` | {items} |
| `if.action.inventory.inventory_empty` | {You} aren't carrying anything. |
| `if.action.inventory.inventory_header` | {You} {be} carrying: |
| `if.action.inventory.item_list` | {item} |
| `if.action.inventory.nothing_at_all` | {You} aren't carrying anything at all. |
| `if.action.inventory.pockets_empty` | {Your} pockets are empty. |
| `if.action.inventory.wearing` | {You} {be} wearing: |
| `if.action.inventory.wearing_count` | {You} {be} wearing {wearingCount} item(s). |
| `if.action.inventory.worn_list` | {items} (worn) |

## `if.action.listening` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.listening.active_devices` | {You} can {hear} {devices} operating nearby. |
| `if.action.listening.ambient_sounds` | {You} {hear} the usual ambient sounds. |
| `if.action.listening.container_sounds` | {You} {hear} faint sounds from inside {the target}. |
| `if.action.listening.device_off` | {capitalize the target} {verb:is target} silent. |
| `if.action.listening.device_running` | {capitalize the target} {verb:is target} making a soft humming sound. |
| `if.action.listening.liquid_sounds` | {You} {hear} liquid sloshing in {the target}. |
| `if.action.listening.listened_environment` | {You} {listen} carefully. |
| `if.action.listening.listened_to` | {You} {listen} carefully to {the target}. |
| `if.action.listening.no_sound` | {capitalize the target} isn't making any sound. |
| `if.action.listening.not_visible` | {You} {can't} see {the target} well enough to focus on its sounds. |
| `if.action.listening.silence` | {You} {hear} nothing out of the ordinary. |

## `if.action.locking` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.locking.already_locked` | {capitalize the item} {verb:is item} already locked. |
| `if.action.locking.cant_reach` | {You} {can't} reach {the item}. |
| `if.action.locking.key_not_held` | {You} {need} to be holding {the key}. |
| `if.action.locking.locked` | {You} {lock} {the item}. |
| `if.action.locking.locked_with` | {You} {lock} {the item} with {the key}. |
| `if.action.locking.no_key` | What do {you} want to lock it with? |
| `if.action.locking.no_target` | Lock what? |
| `if.action.locking.not_closed` | {You} {need} to close {the item} first. |
| `if.action.locking.not_lockable` | {capitalize the item} can't be locked. |
| `if.action.locking.wrong_key` | {capitalize the key} doesn't fit {the item}. |

## `if.action.looking` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.looking.container_contents` | In {the container} {you} {see} {items}. |
| `if.action.looking.contents_list` | {You} can {see} {items} here. |
| `if.action.looking.exits` | Exits: {exits} |
| `if.action.looking.nothing_special` | {You} {see} nothing special. |
| `if.action.looking.room_dark` | It's pitch dark, and {you} {can't} see a thing. |
| `if.action.looking.room_description` | {name} {verbatim:description} |
| `if.action.looking.surface_contents` | On {the surface} {you} {see} {items}. |
| `if.action.looking.you_see` | {You} can {see} {items} here. |

## `if.action.lowering` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.lowering.already_down` | That's already lowered. |
| `if.action.lowering.cant_lower_that` | {You} {can't} lower {the target}. |
| `if.action.lowering.lowered` | {You} {lower} {the target}. |
| `if.action.lowering.no_target` | Lower what? |

## `if.action.opening` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.opening.already_open` | {capitalize the item} {verb:is item} already open. |
| `if.action.opening.cant_reach` | {You} {can't} reach {the item}. |
| `if.action.opening.its_empty` | {You} {open} {the container}, which is empty. |
| `if.action.opening.locked` | {capitalize the item} {verb:is item} locked. |
| `if.action.opening.no_target` | Open what? |
| `if.action.opening.not_openable` | {capitalize the item} can't be opened. |
| `if.action.opening.opened` | {You} {open} {the item}. |
| `if.action.opening.revealing` | Opening {the container} reveals {items}. |

## `if.action.pulling` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.pulling.bell_rings` | {You} {pull} {the target}. A bell rings somewhere! |
| `if.action.pulling.comes_loose` | {You} {pull} {the target} and it comes loose! |
| `if.action.pulling.cord_activates` | {You} {give} {the target} a firm tug. |
| `if.action.pulling.cord_pulled` | {You} {pull} {the target}. |
| `if.action.pulling.firmly_attached` | {You} {pull} {the target}, but it's firmly attached. |
| `if.action.pulling.fixed_in_place` | {capitalize the target} {verb:is target} fixed in place. |
| `if.action.pulling.lever_clicks` | {You} {pull} {the target} with a satisfying click. |
| `if.action.pulling.lever_pulled` | {You} {pull} {the target}. |
| `if.action.pulling.lever_toggled` | {You} {pull} {the target}, switching it {newState}. |
| `if.action.pulling.no_target` | Pull what? |
| `if.action.pulling.not_reachable` | {You} {can't} reach {the target}. |
| `if.action.pulling.not_visible` | {You} {can't} see {the target}. |
| `if.action.pulling.pulled_direction` | {You} {pull} {the target} {verbatim:direction}. |
| `if.action.pulling.pulled_nudged` | {You} {tug} at {the target}, moving it slightly. |
| `if.action.pulling.pulled_with_effort` | With effort, {you} {drag} {the target} {verbatim:direction}. |
| `if.action.pulling.pulling_does_nothing` | Pulling {the target} has no effect. |
| `if.action.pulling.too_heavy` | {capitalize the target} {verb:is target} too heavy to pull (weighs {weight}kg). |
| `if.action.pulling.tugging_useless` | Tugging on {the target} accomplishes nothing. |
| `if.action.pulling.wearing_it` | {You} {can't} pull {the target} while wearing it. |
| `if.action.pulling.wont_budge` | {capitalize the target} won't budge. |

## `if.action.pushing` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.pushing.button_clicks` | {You} {press} {the target}. Click! |
| `if.action.pushing.button_pushed` | {You} {push} {the target}. |
| `if.action.pushing.fixed_in_place` | {capitalize the target} {verb:is target} fixed in place. |
| `if.action.pushing.no_target` | Push what? |
| `if.action.pushing.not_reachable` | {You} {can't} reach {the target}. |
| `if.action.pushing.not_visible` | {You} {can't} see {the target}. |
| `if.action.pushing.pushed_direction` | {You} {push} {the target} {verbatim:direction}. |
| `if.action.pushing.pushed_nudged` | {You} {give} {the target} a push, but it doesn't move far. |
| `if.action.pushing.pushed_with_effort` | With considerable effort, {you} {push} {the target} {verbatim:direction}. |
| `if.action.pushing.pushing_does_nothing` | Pushing {the target} has no effect. |
| `if.action.pushing.reveals_passage` | As {you} {push} {the target} {verbatim:direction}, it slides aside, revealing a hidden passage! |
| `if.action.pushing.switch_toggled` | {You} {push} {the target}, toggling it {newState}. |
| `if.action.pushing.too_heavy` | {capitalize the target} {verb:is target} far too heavy to push (weighs {weight}kg). |
| `if.action.pushing.wearing_it` | {You} {can't} push {the target} while wearing it. |
| `if.action.pushing.wont_budge` | {capitalize the target} won't budge. |

## `if.action.putting` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.putting.already_there` | {capitalize the item} {verb:is item} already {relation} {the destination}. |
| `if.action.putting.cant_put_in_itself` | {You} {can't} put {the item} inside itself. |
| `if.action.putting.cant_put_on_itself` | {You} {can't} put {the item} on itself. |
| `if.action.putting.container_closed` | {capitalize the container} {verb:is container} closed. |
| `if.action.putting.no_destination` | Where do {you} want to put {the item}? |
| `if.action.putting.no_room` | There's no room in {the container}. |
| `if.action.putting.no_space` | There's no space on {the surface}. |
| `if.action.putting.no_target` | Put what? |
| `if.action.putting.not_container` | {You} {can't} put things in {the destination}. |
| `if.action.putting.not_held` | {You} {need} to be holding {the item} first. |
| `if.action.putting.not_surface` | {You} {can't} put things on {the destination}. |
| `if.action.putting.put_in` | {You} {put} {the item} in {the container}. |
| `if.action.putting.put_on` | {You} {put} {the item} on {the surface}. |

## `if.action.quitting` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.quitting.achievements_earned` | {You} earned {count} achievements during {your} play! |
| `if.action.quitting.final_score` | {Your} final score was {finalScore} out of {maxScore}. |
| `if.action.quitting.final_stats` | Final Statistics: Score: {finalScore}/{maxScore} Moves: {moves} Time played: {playTime} |
| `if.action.quitting.quit_and_saved` | Game saved.  Thanks for playing!  Final score: {finalScore} out of {maxScore} Moves: {moves} |
| `if.action.quitting.quit_cancelled` | Quit cancelled. |
| `if.action.quitting.quit_confirm_query` | Are {you} sure {you} want to quit? |
| `if.action.quitting.quit_confirmed` | Thanks for playing!  Final score: {finalScore} out of {maxScore} Moves: {moves} |
| `if.action.quitting.quit_save_query` | Would {you} like to save before quitting? |
| `if.action.quitting.quit_unsaved_query` | {You} {have} unsaved progress. What would {you} like to do? |

## `if.action.raising` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.raising.already_up` | That's already raised. |
| `if.action.raising.cant_raise_that` | {You} {can't} raise {the target}. |
| `if.action.raising.no_target` | Raise what? |
| `if.action.raising.raised` | {You} {raise} {the target}. |

## `if.action.reading` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.reading.cannot_read_now` | {verbatim:reason} |
| `if.action.reading.not_readable` | There's nothing written on {the item}. |
| `if.action.reading.read_book` | {capitalize the item} reads: {verbatim:text} |
| `if.action.reading.read_book_page` | {capitalize the item} (page {currentPage} of {totalPages}): {verbatim:text} |
| `if.action.reading.read_inscription` | {capitalize the item} reads: {verbatim:text} |
| `if.action.reading.read_sign` | {capitalize the item} says: {verbatim:text} |
| `if.action.reading.read_text` | {capitalize the item} reads: {verbatim:text} |
| `if.action.reading.what_to_read` | What do you want to read? |

## `if.action.removing` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.removing.already_have` | {You} already {have} {the item}. |
| `if.action.removing.cant_reach` | {You} {can't} reach {the item}. |
| `if.action.removing.container_closed` | {capitalize the container} {verb:is container} closed. |
| `if.action.removing.no_source` | Remove {the item} from what? |
| `if.action.removing.no_target` | Remove what? |
| `if.action.removing.not_in_container` | {capitalize the item} isn't in {the container}. |
| `if.action.removing.not_on_surface` | {capitalize the item} isn't on {the surface}. |
| `if.action.removing.removed_from` | {You} {take} {the item} from {the container}. |
| `if.action.removing.removed_from_surface` | {You} {take} {the item} from {the surface}. |

## `if.action.restoring` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.restoring.available_saves` | Available saves: {saves} |
| `if.action.restoring.choose_save` | Which save would {you} like to restore? |
| `if.action.restoring.confirm_restore` | Restore game from '{verbatim:saveName}'? Current progress will be lost. |
| `if.action.restoring.corrupt_save` | The save file '{verbatim:saveName}' appears to be corrupted. |
| `if.action.restoring.game_loaded` | Game loaded from '{verbatim:saveName}'. |
| `if.action.restoring.game_restored` | Game restored. |
| `if.action.restoring.import_save` | Import a save file to restore. |
| `if.action.restoring.incompatible_save` | This save file is from a different version and cannot be loaded. |
| `if.action.restoring.no_saves` | No saved games found. |
| `if.action.restoring.no_saves_available` | No saved games available. |
| `if.action.restoring.quick_restore` | Quick restore completed. |
| `if.action.restoring.restore_details` | Restored: {verbatim:saveName} Score: {score} Moves: {moves} |
| `if.action.restoring.restore_failed` | Failed to restore game. |
| `if.action.restoring.restore_not_allowed` | {You} cannot restore a game at this time. |
| `if.action.restoring.restore_successful` | {Your} saved game has been restored successfully. |
| `if.action.restoring.resuming_game` | Resuming {your} adventure... |
| `if.action.restoring.save_imported` | Save file imported successfully. |
| `if.action.restoring.save_not_found` | No save named '{verbatim:saveName}' was found. |
| `if.action.restoring.unsaved_progress` | {You} {have} unsaved progress. Restore anyway? |
| `if.action.restoring.welcome_back` | Welcome back! Game restored from {verbatim:saveName}. |

## `if.action.revealing` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.revealing.not_hidden` | {You're} not hiding. |
| `if.action.revealing.revealed` | {You} {come} out of hiding. |

## `if.action.saving` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.saving.auto_save` | Auto-saving game... |
| `if.action.saving.confirm_overwrite` | A save named '{verbatim:saveName}' already exists. Overwrite it? |
| `if.action.saving.game_saved` | Game saved. |
| `if.action.saving.game_saved_as` | Game saved as '{verbatim:saveName}'. |
| `if.action.saving.invalid_save_name` | '{verbatim:saveName}' is not a valid save name. |
| `if.action.saving.no_save_slots` | No save slots available. |
| `if.action.saving.overwrite_save` | Previous save '{verbatim:saveName}' has been overwritten. |
| `if.action.saving.quick_save` | Quick save completed. |
| `if.action.saving.save_details` | Saved: {verbatim:saveName} Score: {score} Moves: {moves} |
| `if.action.saving.save_exported` | Save file exported successfully. |
| `if.action.saving.save_failed` | Failed to save game. |
| `if.action.saving.save_in_progress` | Another save is already in progress. |
| `if.action.saving.save_not_allowed` | {You} cannot save the game at this time. |
| `if.action.saving.save_reminder` | Don't forget to save {your} game regularly! |
| `if.action.saving.save_slot` | Game saved to slot {verbatim:saveName}. |
| `if.action.saving.save_successful` | {Your} game has been saved successfully. |
| `if.action.saving.saved_locally` | Game saved to local storage. |
| `if.action.saving.saved_to_cloud` | Game saved to cloud storage. |

## `if.action.scoring` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.scoring.early_game` | {You're} just getting started! |
| `if.action.scoring.game_complete` | {You} {have} completed the game! |
| `if.action.scoring.late_game` | {You're} nearing the end of {your} adventure. |
| `if.action.scoring.mid_game` | {You're} making good progress. |
| `if.action.scoring.no_achievements` | {You} {have}n't earned any special achievements yet. |
| `if.action.scoring.no_scoring` | This isn't that kind of game. |
| `if.action.scoring.perfect_score` | {You} {have} achieved a perfect score of {maxScore} points! |
| `if.action.scoring.rank_amateur` | {You} {are} ranked as an Amateur adventurer. |
| `if.action.scoring.rank_expert` | {You} {are} ranked as an Expert adventurer. |
| `if.action.scoring.rank_master` | {You} {are} ranked as a Master adventurer! |
| `if.action.scoring.rank_novice` | {You} {are} ranked as a Novice adventurer. |
| `if.action.scoring.rank_proficient` | {You} {are} ranked as a Proficient adventurer. |
| `if.action.scoring.score_display` | {You} {have} scored {score} out of a possible {maxScore}, in {moves} turns. |
| `if.action.scoring.score_simple` | {Your} score is {score} points. |
| `if.action.scoring.score_with_rank` | {You} {have} scored {score} out of {maxScore}, earning {you} the rank of {rank}. |
| `if.action.scoring.scoring_not_enabled` | There is no score in this game. |
| `if.action.scoring.with_achievements` | {You} {have} earned the following achievements: {achievements}. |

## `if.action.searching` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.searching.container_closed` | {capitalize the target} {verb:is target} closed. |
| `if.action.searching.container_contents` | In {the target} {you} {see}: {items}. |
| `if.action.searching.empty_container` | {capitalize the target} {verb:is target} empty. |
| `if.action.searching.found_concealed` | Hidden {where}, {you} {discover}: {items}. |
| `if.action.searching.found_items` | {You} {discover}: {items}. |
| `if.action.searching.not_reachable` | {You} {can't} reach {the target} to search it. |
| `if.action.searching.not_visible` | {You} {can't} see {the target} to search it. |
| `if.action.searching.nothing_special` | {You} {find} nothing of interest. |
| `if.action.searching.searched_location` | {You} {search} around carefully. |
| `if.action.searching.searched_object` | {You} {search} {the target} thoroughly. |
| `if.action.searching.supporter_contents` | On {the target} {you} {see}: {items}. |

## `if.action.showing` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.showing.no_item` | Show what? |
| `if.action.showing.no_viewer` | Show it to whom? |
| `if.action.showing.not_actor` | {You} can only show things to people. |
| `if.action.showing.not_carrying` | {You} aren't carrying {the item}. |
| `if.action.showing.self` | {You} {examine} {the item} closely. |
| `if.action.showing.shown` | {You} {show} {the item} to {the viewer}. |
| `if.action.showing.viewer_examines` | {capitalize the viewer} examines {the item} carefully. |
| `if.action.showing.viewer_impressed` | {capitalize the viewer} looks impressed. |
| `if.action.showing.viewer_nods` | {capitalize the viewer} nods. |
| `if.action.showing.viewer_not_visible` | {You} {can't} see {the viewer}. |
| `if.action.showing.viewer_recognizes` | {capitalize the viewer} recognizes {the item}! |
| `if.action.showing.viewer_too_far` | {capitalize the viewer} {verb:is viewer} too far away to see clearly. |
| `if.action.showing.viewer_unimpressed` | {capitalize the viewer} seems unimpressed. |
| `if.action.showing.wearing_shown` | {You} {show} {the viewer} that {you're} wearing {the item}. |

## `if.action.sleeping` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.sleeping.already_well_rested` | {You're} already well-rested and don't feel tired. |
| `if.action.sleeping.brief_nap` | {You} {take} a brief nap. |
| `if.action.sleeping.cant_sleep_here` | {You} {can't} sleep in {location}. |
| `if.action.sleeping.deep_sleep` | {You} {fall} into a deep, restful sleep. |
| `if.action.sleeping.disturbed_sleep` | {Your} sleep is disturbed. |
| `if.action.sleeping.dozed_off` | {You} {doze} off for a bit. |
| `if.action.sleeping.fell_asleep` | {You} {fall} into a deep sleep. |
| `if.action.sleeping.nightmares` | {You} {have} unsettling dreams. |
| `if.action.sleeping.peaceful_sleep` | {You} {enjoy} a peaceful sleep. |
| `if.action.sleeping.slept` | {You} {sleep} for a while. |
| `if.action.sleeping.slept_fitfully` | {You} {sleep} fitfully. |
| `if.action.sleeping.too_dangerous_to_sleep` | It's too dangerous to sleep in {location}. |
| `if.action.sleeping.woke_refreshed` | {You} {wake} feeling refreshed. |

## `if.action.smelling` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.smelling.burning_scent` | {capitalize the target} gives off a smoky smell. |
| `if.action.smelling.container_food_scent` | {You} {smell} food inside {the target}. |
| `if.action.smelling.drink_scent` | {capitalize the target} {verb:has target} a pleasant aroma. |
| `if.action.smelling.food_nearby` | {You} {smell} food nearby. |
| `if.action.smelling.food_scent` | {capitalize the target} smells delicious. |
| `if.action.smelling.fresh_scent` | {capitalize the target} smells fresh and clean. |
| `if.action.smelling.musty_scent` | {capitalize the target} smells a bit musty. |
| `if.action.smelling.no_particular_scent` | {capitalize the target} {verb:has target} no particular smell. |
| `if.action.smelling.no_scent` | {You} {don't} smell anything unusual. |
| `if.action.smelling.not_visible` | {You} {can't} see {the target} to smell it. |
| `if.action.smelling.room_scents` | The air carries various scents. |
| `if.action.smelling.smelled` | {You} {smell} {the target}. |
| `if.action.smelling.smelled_environment` | {You} {sniff} the air. |
| `if.action.smelling.smoke_detected` | {You} {detect} a faint smell of smoke. |
| `if.action.smelling.too_far` | {capitalize the target} {verb:is target} too far away to smell. |

## `if.action.switching_off` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.switching_off.already_off` | {capitalize the target} {verb:is target} already off. |
| `if.action.switching_off.device_stops` | {capitalize the target} powers down with a soft whir. |
| `if.action.switching_off.door_closes` | {capitalize the target} switches off and closes. |
| `if.action.switching_off.light_off` | {You} {switch} off {the target}, plunging the area into darkness. |
| `if.action.switching_off.light_off_still_lit` | {You} {switch} off {the target}. |
| `if.action.switching_off.no_target` | Switch off what? |
| `if.action.switching_off.not_reachable` | {You} {can't} reach {the target}. |
| `if.action.switching_off.not_switchable` | {capitalize the target} isn't something {you} can switch off. |
| `if.action.switching_off.not_visible` | {You} {can't} see {the target}. |
| `if.action.switching_off.silence_falls` | {You} {switch} off {the target}. Silence falls. |
| `if.action.switching_off.switched_off` | {You} {switch} off {the target}. |
| `if.action.switching_off.was_temporary` | {capitalize the target} switches off (it had {remainingTime} seconds left). |
| `if.action.switching_off.with_sound` | {You} {switch} off {the target}. {sound} |

## `if.action.switching_on` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.switching_on.already_on` | {capitalize the target} {verb:is target} already on. |
| `if.action.switching_on.device_humming` | {capitalize the target} hums to life. |
| `if.action.switching_on.door_opens` | {capitalize the target} switches on and opens. |
| `if.action.switching_on.illuminates_darkness` | {capitalize the target} switches on, banishing the darkness. |
| `if.action.switching_on.light_on` | {You} {switch} on {the target}, illuminating the area. |
| `if.action.switching_on.no_power` | {capitalize the target} {verb:has target} no power source. |
| `if.action.switching_on.no_target` | Switch on what? |
| `if.action.switching_on.not_reachable` | {You} {can't} reach {the target}. |
| `if.action.switching_on.not_switchable` | {capitalize the target} isn't something {you} can switch on. |
| `if.action.switching_on.not_visible` | {You} {can't} see {the target}. |
| `if.action.switching_on.switched_on` | {You} {switch} on {the target}. |
| `if.action.switching_on.temporary_activation` | {capitalize the target} switches on temporarily. |
| `if.action.switching_on.with_sound` | {You} {switch} on {the target}. {sound} |

## `if.action.taking` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.taking.already_have` | {You} already {have} {the item}. |
| `if.action.taking.cannot_take` | {You} {can't} take {the item}. |
| `if.action.taking.cant_take_room` | {You} {can't} take {the item}. |
| `if.action.taking.cant_take_self` | {You} {can't} take {yourself}. |
| `if.action.taking.container_full` | {You're} carrying too much already. |
| `if.action.taking.fixed_in_place` | {capitalize the item} {verb:is item} fixed in place. |
| `if.action.taking.no_target` | Take what? |
| `if.action.taking.nothing_to_take` | You take in everything you see and enjoy the moment. |
| `if.action.taking.taken` | Taken. |
| `if.action.taking.taken_from` | {You} {take} {the item} from {the container}. |
| `if.action.taking.taken_multi` | {item}: Taken. |
| `if.action.taking.too_heavy` | Your load is too heavy. You will have to leave something behind. |

## `if.action.taking_off` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.taking_off.cant_remove` | {You} {can't} take off {the item}. |
| `if.action.taking_off.no_target` | Take off what? |
| `if.action.taking_off.not_wearing` | {You} aren't wearing {the item}. |
| `if.action.taking_off.prevents_removal` | {You}'ll need to take off {the blocking} first. |
| `if.action.taking_off.removed` | {You} {take} off {the item}. |

## `if.action.talking` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.talking.acknowledges` | {capitalize the target} acknowledges {you}. |
| `if.action.talking.casual_greeting` | {capitalize the target} {verb:says target}, "Hey!" |
| `if.action.talking.first_meeting` | {You} {introduce} {yourself} to {the target}. |
| `if.action.talking.formal_greeting` | {capitalize the target} {verb:says target}, "Good day to you." |
| `if.action.talking.friendly_greeting` | {capitalize the target} smiles in recognition. |
| `if.action.talking.greets_again` | {capitalize the target} {verb:says target}, "Hello again." |
| `if.action.talking.greets_back` | {capitalize the target} {verb:says target}, "Hello there!" |
| `if.action.talking.has_topics` | {capitalize the target} seems willing to discuss various topics. |
| `if.action.talking.no_response` | {capitalize the target} doesn't respond. |
| `if.action.talking.no_target` | Talk to whom? |
| `if.action.talking.not_actor` | {You} can only talk to people. |
| `if.action.talking.not_available` | {capitalize the target} doesn't want to talk right now. |
| `if.action.talking.not_visible` | {You} {can't} see {the target}. |
| `if.action.talking.nothing_to_say` | {capitalize the target} {verb:has target} nothing particular to say. |
| `if.action.talking.remembers_you` | {capitalize the target} {verb:says target}, "Ah, it's you again." |
| `if.action.talking.self` | Talking to {yourself} is a sign of madness. |
| `if.action.talking.talked` | {You} {greet} {the target}. |
| `if.action.talking.too_far` | {capitalize the target} {verb:is target} too far away for conversation. |

## `if.action.telling` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.telling.already_knew` | {capitalize the target} {verb:says target}, "Yes, I'm aware of that." |
| `if.action.telling.bored` | {capitalize the target} looks bored. |
| `if.action.telling.dismissive` | {capitalize the target} {verb:says target}, "So what?" |
| `if.action.telling.grateful` | {capitalize the target} {verb:says target}, "Thank you for telling me!" |
| `if.action.telling.ignores` | {capitalize the target} ignores what {you're} saying. |
| `if.action.telling.informed` | {You} {inform} {the target} about {verbatim:topic}. |
| `if.action.telling.interested` | {capitalize the target} listens with interest. |
| `if.action.telling.no_target` | Tell whom? |
| `if.action.telling.no_topic` | Tell them about what? |
| `if.action.telling.not_actor` | {You} can only tell things to people. |
| `if.action.telling.not_interested` | {capitalize the target} doesn't seem interested. |
| `if.action.telling.not_visible` | {You} {can't} see {the target}. |
| `if.action.telling.told` | {You} {tell} {the target} about {verbatim:topic}. |
| `if.action.telling.too_far` | {capitalize the target} {verb:is target} too far away. |
| `if.action.telling.very_interested` | {capitalize the target} {verb:says target}, "Really? Tell me more!" |

## `if.action.throwing` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.throwing.bounces_off` | {capitalize the item} bounces off {the target}. |
| `if.action.throwing.breaks_against` | {capitalize the item} smashes against {the target}! |
| `if.action.throwing.breaks_on_impact` | {capitalize the item} shatters on impact! |
| `if.action.throwing.fragile_breaks` | The fragile {item} breaks into pieces. |
| `if.action.throwing.hits_target` | {You} {throw} {the item} at {the target}. It hits! |
| `if.action.throwing.lands_in` | {capitalize the item} lands in {the target}. |
| `if.action.throwing.lands_on` | {capitalize the item} lands on {the target}. |
| `if.action.throwing.misses_target` | {You} {throw} {the item} at {the target}, but miss. |
| `if.action.throwing.no_exit` | There's no exit {verbatim:direction}. |
| `if.action.throwing.no_item` | Throw what? |
| `if.action.throwing.not_holding` | {You} aren't holding {the item}. |
| `if.action.throwing.sails_through` | {capitalize the item} sails through the exit to the {verbatim:direction}. |
| `if.action.throwing.self` | {You} {can't} throw things at {yourself}. |
| `if.action.throwing.target_angry` | {capitalize the target} doesn't appreciate being hit with {the item}. |
| `if.action.throwing.target_catches` | {capitalize the target} catches {the item}! |
| `if.action.throwing.target_ducks` | {capitalize the target} ducks out of the way. |
| `if.action.throwing.target_not_here` | {capitalize the target} isn't here. |
| `if.action.throwing.target_not_visible` | {You} {can't} see {the target}. |
| `if.action.throwing.thrown` | {You} {throw} {the item}. |
| `if.action.throwing.thrown_at` | {You} {throw} {the item} at {the target}. |
| `if.action.throwing.thrown_direction` | {You} {throw} {the item} {verbatim:direction}. |
| `if.action.throwing.thrown_down` | {You} {toss} {the item} to the ground. |
| `if.action.throwing.thrown_gently` | {You} gently {toss} {the item}. |
| `if.action.throwing.too_heavy` | {capitalize the item} {verb:is item} too heavy to throw far (weighs {weight}kg). |

## `if.action.touching` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.touching.device_vibrating` | {capitalize the target} {verb:is target} vibrating slightly. |
| `if.action.touching.feels_cold` | {capitalize the target} feels cold. |
| `if.action.touching.feels_hard` | {capitalize the target} feels hard and solid. |
| `if.action.touching.feels_hot` | {capitalize the target} {verb:is target} hot! {You} {pull} {your} hand back quickly. |
| `if.action.touching.feels_normal` | {capitalize the target} feels as {you}'d expect. |
| `if.action.touching.feels_rough` | {capitalize the target} feels rough. |
| `if.action.touching.feels_smooth` | {capitalize the target} feels smooth. |
| `if.action.touching.feels_soft` | {capitalize the target} feels soft. |
| `if.action.touching.feels_warm` | {capitalize the target} feels warm to the touch. |
| `if.action.touching.feels_wet` | {capitalize the target} feels damp. |
| `if.action.touching.immovable_object` | {capitalize the target} {verb:is target} solid and immovable. |
| `if.action.touching.liquid_container` | {You} {feel} liquid sloshing inside {the target}. |
| `if.action.touching.no_target` | Touch what? |
| `if.action.touching.not_reachable` | {You} {can't} reach {the target}. |
| `if.action.touching.not_visible` | {You} {can't} see {the target} to touch it. |
| `if.action.touching.patted` | {You} {pat} {the target}. |
| `if.action.touching.poked` | {You} {poke} {the target}. |
| `if.action.touching.prodded` | {You} {prod} {the target}. |
| `if.action.touching.stroked` | {You} {stroke} {the target}. |
| `if.action.touching.touched` | {You} {touch} {the target}. |
| `if.action.touching.touched_gently` | {You} gently {touch} {the target}. |

## `if.action.turning` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.turning.cant_turn_that` | {capitalize the target} isn't something {you} can turn. |
| `if.action.turning.crank_turned` | {You} {crank} {the target}. |
| `if.action.turning.dial_adjusted` | {You} {adjust} {the target} {verbatim:direction}. |
| `if.action.turning.dial_set` | {You} {turn} {the target} to {setting}. |
| `if.action.turning.dial_turned` | {You} {turn} {the target}. |
| `if.action.turning.flow_changes` | {You} {turn} {the target}, adjusting the flow. |
| `if.action.turning.key_needs_lock` | {You} {need} to put {the target} in a lock first. |
| `if.action.turning.key_turned` | {You} {turn} {the target} in the lock. |
| `if.action.turning.knob_clicks` | {You} {turn} {the target} with a click. |
| `if.action.turning.knob_toggled` | {You} {turn} {the target}, switching it {newState}. |
| `if.action.turning.knob_turned` | {You} {turn} {the target}. |
| `if.action.turning.mechanism_activated` | As {you} {turn} {the target}, {you} {hear} machinery activate! |
| `if.action.turning.mechanism_grinds` | {You} {turn} {the target}. Gears grind and machinery moves. |
| `if.action.turning.no_target` | Turn what? |
| `if.action.turning.not_reachable` | {You} {can't} reach {the target}. |
| `if.action.turning.not_visible` | {You} {can't} see {the target}. |
| `if.action.turning.nothing_happens` | {You} {turn} {the target}, but nothing happens. |
| `if.action.turning.requires_more_turns` | {You} {turn} {the target}. It seems to need more turning. |
| `if.action.turning.rotated` | {You} {rotate} {the target}. |
| `if.action.turning.spun` | {You} {spin} {the target}. |
| `if.action.turning.turned` | {You} {turn} {the target}. |
| `if.action.turning.valve_closed` | {You} {turn} {the target}, closing the valve. |
| `if.action.turning.valve_opened` | {You} {turn} {the target}, opening the valve. |
| `if.action.turning.wearing_it` | {You} {can't} turn {the target} while wearing it. |
| `if.action.turning.wheel_turned` | {You} {turn} {the target}. |

## `if.action.undoing` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.undoing.nothing_to_undo` | Nothing to undo. |
| `if.action.undoing.undo_failed` | Undo failed. |
| `if.action.undoing.undo_success` | Previous turn undone. |
| `if.action.undoing.undo_to_turn` | Undone. (Now at turn {turn}) |

## `if.action.unlocking` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.unlocking.already_unlocked` | {capitalize the item} {verb:is item} already unlocked. |
| `if.action.unlocking.cant_reach` | {You} {can't} reach {the item}. |
| `if.action.unlocking.key_not_held` | {You} {need} to be holding {the key}. |
| `if.action.unlocking.no_key` | What do {you} want to unlock it with? |
| `if.action.unlocking.no_target` | Unlock what? |
| `if.action.unlocking.not_lockable` | {capitalize the item} can't be unlocked. |
| `if.action.unlocking.still_locked` | {capitalize the item} {verb:is item} locked. |
| `if.action.unlocking.unlocked` | {You} {unlock} {the item}. |
| `if.action.unlocking.unlocked_with` | {You} {unlock} {the item} with {the key}. |
| `if.action.unlocking.wrong_key` | {capitalize the key} doesn't fit {the item}. |

## `if.action.version` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.version.version_compact` | {verbatim:storyTitle} v{verbatim:storyVersion} (Sharpee v{verbatim:engineVersion}) |
| `if.action.version.version_full` | {verbatim:storyTitle} v{verbatim:storyVersion} Sharpee Engine v{verbatim:engineVersion} Built: {buildDate} |
| `if.action.version.version_no_date` | {verbatim:storyTitle} v{verbatim:storyVersion} Sharpee Engine v{verbatim:engineVersion} |

## `if.action.waiting` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.waiting.grows_restless` | {You} {grow} restless from waiting. |
| `if.action.waiting.nothing_happens` | {You} {wait}. Nothing happens. |
| `if.action.waiting.patience_rewarded` | {Your} patience is rewarded. |
| `if.action.waiting.something_approaches` | As {you} {wait}, {you} {hear} something approaching. |
| `if.action.waiting.time_passes` | Time passes... |
| `if.action.waiting.time_runs_out` | {You}'ve waited too long! |
| `if.action.waiting.waited` | Time passes. |
| `if.action.waiting.waited_anxiously` | {You} {wait} anxiously. |
| `if.action.waiting.waited_briefly` | {You} {wait} for a moment. |
| `if.action.waiting.waited_for_event` | {You} {wait} for something to happen. |
| `if.action.waiting.waited_in_vehicle` | {You} {wait} in {the vehicle}. |
| `if.action.waiting.waited_patiently` | {You} {wait} patiently. |

## `if.action.wearing` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.action.wearing.already_wearing` | {You're} already wearing {the item}. |
| `if.action.wearing.cant_wear_that` | {You} {can't} wear {the item}. |
| `if.action.wearing.hands_full` | {You} {need} to have {your} hands free to put that on. |
| `if.action.wearing.no_target` | Wear what? |
| `if.action.wearing.not_held` | {You} {need} to be holding {the item} first. |
| `if.action.wearing.not_wearable` | {You} {can't} wear {the item}. |
| `if.action.wearing.worn` | {You} {put} on {the item}. |

## `if.platform` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.platform.prompt` | > |

## `if.room` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `if.room.description_body` | {verbatim:description}{slot:here} |

## `npc` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `npc.arrives` | {capitalize the speaker} {verb:arrives speaker}. |
| `npc.attacks` | {capitalize the speaker} {verb:attacks speaker} you! |
| `npc.confused` | {capitalize the speaker} {verb:looks speaker} confused. |
| `npc.cries` | {capitalize the speaker} {verb:cries speaker}. |
| `npc.departs` | {capitalize the speaker} {verb:departs speaker}. |
| `npc.drops` | {capitalize the speaker} {verb:drops speaker} {verbatim:itemName}. |
| `npc.emote` | {verbatim:text} |
| `npc.enters` | {capitalize the speaker} {verb:enters speaker} from the {verbatim:direction}. |
| `npc.farewell` | {capitalize the speaker} {verb:bids speaker} you farewell. |
| `npc.follows` | {capitalize the speaker} {verb:follows speaker} you. |
| `npc.greets` | {capitalize the speaker} {verb:greets speaker} you. |
| `npc.growls` | {capitalize the speaker} {verb:growls speaker} menacingly. |
| `npc.heard_arrives` | You hear someone enter. |
| `npc.heard_departs` | You hear someone leave. |
| `npc.hits` | {capitalize the speaker} {verb:hits speaker} you for {damage} damage! |
| `npc.ignores_player` | {capitalize the speaker} {verb:ignores speaker} you. |
| `npc.killed` | {capitalize the speaker} {verb:has speaker} been slain. |
| `npc.laughs` | {capitalize the speaker} {verb:laughs speaker}. |
| `npc.leaves` | {capitalize the speaker} {verb:leaves speaker} to the {verbatim:direction}. |
| `npc.misses` | {capitalize the speaker} {verb:swings speaker} at you but {verb:misses speaker}! |
| `npc.mutters` | {capitalize the speaker} {verb:mutters speaker}, "{verbatim:text}" |
| `npc.no_response` | {capitalize the speaker} {verb:does speaker} not respond. |
| `npc.notices_player` | {capitalize the speaker} {verb:notices speaker} you. |
| `npc.shouts` | {capitalize the speaker} {verb:shouts speaker}, "{verbatim:text}" |
| `npc.sighs` | {capitalize the speaker} {verb:sighs speaker}. |
| `npc.speaks` | {capitalize the speaker} {verb:says speaker}, "{verbatim:text}" |
| `npc.speech` | {verbatim:text} |
| `npc.takes` | {capitalize the speaker} {verb:picks speaker} up {verbatim:itemName}. |
| `npc.unconscious` | {capitalize the speaker} {verb:collapses speaker}, unconscious. |
| `npc.whispers` | {capitalize the speaker} {verb:whispers speaker}, "{verbatim:text}" |

## `npc.combat.attack` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `npc.combat.attack.hit` | The axe gets you right in the side. Ouch! |
| `npc.combat.attack.hit_heavy` | The troll hits you with a glancing blow, and you are momentarily stunned. |
| `npc.combat.attack.hit_light` | The flat of the troll's axe skins across your forearm. |
| `npc.combat.attack.killed` | The troll lands a killing blow. You are dead. |
| `npc.combat.attack.knocked_out` | The flat of the troll's axe hits you delicately on the head, knocking you out. |
| `npc.combat.attack.missed` | The troll swings his axe, but it misses. |

## `npc.guard` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `npc.guard.attacks` | {capitalize the speaker} {verb:attacks speaker} you! |
| `npc.guard.blocks` | {capitalize the speaker} {verb:blocks speaker} your way! |
| `npc.guard.defeated` | {capitalize the speaker} {verb:is speaker} no longer a threat. |

## `platform` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `platform.restore_completed` | Restored. |
| `platform.restore_failed` | Restore failed. |
| `platform.save_completed` | Saved. |
| `platform.save_failed` | Save failed. |
| `platform.undo_completed` | Previous turn undone. |
| `platform.undo_failed` | Nothing to undo. |

## `sound.heard.ambient` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `sound.heard.ambient.fragments` | {You} {catch} the faint sound of {verbatim:kind}. |
| `sound.heard.ambient.full` | {You} {hear} {verbatim:kind}. |
| `sound.heard.ambient.muffled` | {You} {hear} a muffled {verbatim:kind}. |
| `sound.heard.ambient.presence-only` | {You} {hear} something at the edge of hearing. |

## `sound.heard.default` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `sound.heard.default.fragments` | {You} {catch} broken {verbatim:kind}. |
| `sound.heard.default.full` | {You} {hear} {verbatim:kind}. |
| `sound.heard.default.muffled` | {You} {hear} a muffled {verbatim:kind}. |
| `sound.heard.default.presence-only` | {You} {hear} something distant. |

## `sound.heard.speech` {.unnumbered .unlisted}

| Message ID | Default text |
|---|---|
| `sound.heard.speech.fragments` | {You} {catch} fragments of speech. |
| `sound.heard.speech.full` | {You} {hear}: "{verbatim:content}" |
| `sound.heard.speech.muffled` | {You} {catch} a muffled voice: "{verbatim:content}" |
| `sound.heard.speech.presence-only` | {You} {hear} voices nearby. |
