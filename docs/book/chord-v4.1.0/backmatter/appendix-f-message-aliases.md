# Appendix F. Message aliases {.unnumbered}

Every standard message a story can replace with `override message`: 885 aliases in 78 groups,
one group per action, each alias beside the text the platform prints by default. A `\n` marks a
line break in the text. Generated from the output of `sharpee messages` (Sharpee 5.6.3 · Chord 4.0.3, locale en-US) by
`scripts/generate-chord-appendices.cjs`.

## `about` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `about-about-compact` | \{verbatim\:title\} v\{version\} by \{verbatim\:author\} |
| `about-about-footer` | Thank you for playing\! |
| `about-about-header` | About \{verbatim\:title\} |
| `about-acknowledgments` | Acknowledgments\: \{acknowledgments\} |
| `about-contact` | Contact\: \{contact\} |
| `about-copyright` | Copyright \{copyright\} |
| `about-credits-header` | Credits\: |
| `about-credits-list` | \{credits\} |
| `about-dedication` | Dedication\: \{dedication\} |
| `about-description` | Description\: \{verbatim\:description\} |
| `about-engine-info` | Powered by \{engine\} version \{verbatim\:engineVersion\} |
| `about-enjoy-game` | We hope you enjoy playing \{verbatim\:title\}\! |
| `about-game-info` | \{verbatim\:title\} `\n` Version \{verbatim\:version\} `\n` By \{verbatim\:author\} `\n` Released\: \{releaseDate\} |
| `about-game-info-simple` | \{verbatim\:title\} by \{verbatim\:author\} |
| `about-license` | License\: \{license\} |
| `about-play-stats` | Current Session\: `\n` Time played\: \{playTime\} `\n` Moves made\: \{sessionMoves\} |
| `about-session-info` | You\'ve been playing for \{playTime\} and made \{sessionMoves\} moves\. |
| `about-special-thanks` | Special Thanks\: \{specialThanks\} |
| `about-success` | \{verbatim\:title\} `\n` Version \{verbatim\:version\} `\n` By \{verbatim\:author\} `\n`  `\n` \{verbatim\:description\} |
| `about-technical-info` | Technical Information\: `\n` Engine\: \{engine\} v\{verbatim\:engineVersion\} `\n` Platform\: Interactive Fiction |
| `about-website` | Website\: \{website\} |

## `again` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `again-nothing-to-repeat` | There is nothing to repeat\. |

## `answering` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `answering-answered` | \{You\} \{answer\}\, \"\{verbatim\:response\}\.\" |
| `answering-no-question` | No one has asked \{you\} anything\. |
| `answering-no-response` | Answer what\? |
| `answering-not-an-answer` | \{capitalize the target\} \{verb\:waits target\} for an answer to the question\. |

## `asking` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `asking-already-told` | \{capitalize the target\} \{verb\:says target\}\, \"I already told you about that\.\" |
| `asking-confused` | \{capitalize the target\} looks confused\. |
| `asking-earned-trust` | \{capitalize the target\} \{verb\:says target\}\, \"Since you\'ve proven yourself\, I\'ll tell you\.\.\.\" |
| `asking-explains` | \{capitalize the target\} \{verb\:explains target\} about \{verbatim\:topic\}\. |
| `asking-must-do-first` | \{capitalize the target\} \{verb\:says target\}\, \"There\'s something you need to do first\.\" |
| `asking-no-idea` | \{capitalize the target\} \{verb\:says target\}\, \"No idea what you\'re talking about\.\" |
| `asking-no-target` | Ask whom\? |
| `asking-no-topic` | Ask about what\? |
| `asking-not-actor` | \{You\} can only ask questions of people\. |
| `asking-not-visible` | \{You\} \{can\'t\} see \{the target\}\. |
| `asking-not-yet` | \{capitalize the target\} \{verb\:says target\}\, \"I can\'t tell you about that yet\.\" |
| `asking-remembers` | \{capitalize the target\} \{verb\:says target\}\, \"Ah yes\, about \{verbatim\:topic\}\.\.\.\" |
| `asking-responds` | \{capitalize the target\} \{verb\:tells target\} \{you\} about \{verbatim\:topic\}\. |
| `asking-shrugs` | \{capitalize the target\} shrugs\. |
| `asking-too-far` | \{capitalize the target\} \{verb\:is target\} too far away\. |
| `asking-unknown-topic` | \{capitalize the target\} \{verb\:says target\}\, \"I don\'t know anything about that\.\" |

## `asking_for` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `asking-for-already-have` | \{You\} already \{have\} \{the item\}\. |
| `asking-for-no-item` | Ask \{the recipient\} for what\? |
| `asking-for-no-target` | Ask whom\? |
| `asking-for-not-actor` | \{You\} can only ask people for things\. |
| `asking-for-not-visible` | \{You\} \{can\'t\} see \{the recipient\}\. |
| `asking-for-refused` | \{capitalize the recipient\} \{verb\:doesn\'t recipient\} seem inclined to hand over \{the item\}\. |
| `asking-for-self` | \{You\} can\'t ask \{yourself\} for things\. |
| `asking-for-too-far` | \{capitalize the recipient\} \{verb\:is recipient\} too far away\. |

## `attacking` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `attacking-already-dead` | \{capitalize the target\} \{verb\:is target\} already dead\. |
| `attacking-attack-ineffective` | \{Your\} attack has no effect on \{the target\}\. |
| `attacking-attack-invulnerable` | \{capitalize the target\} cannot be damaged\. |
| `attacking-attack-requires-weapon` | \{You\} \{need\} a weapon to damage \{the target\}\. |
| `attacking-attack-wrong-weapon-type` | That weapon won\'t work on \{the target\}\. |
| `attacking-attacked` | \{You\} \{attack\} \{the target\}\. |
| `attacking-attacked-with` | \{You\} \{attack\} \{the target\} with \{the weapon\}\. |
| `attacking-broke` | \{You\} \{break\} \{the target\}\! |
| `attacking-combat-already-dead` | \{capitalize the target\} \{verb\:is target\} already dead\. |
| `attacking-combat-attack-hit` | \{You\} \{hit\} \{the target\} for \{damage\} damage\. |
| `attacking-combat-attack-hit-heavy` | \{You\} \{land\} a solid blow on \{the target\}\, dealing \{damage\} damage\! |
| `attacking-combat-attack-hit-light` | \{You\} \{graze\} \{the target\}\, doing \{damage\} damage\. |
| `attacking-combat-attack-killed` | \{You\} \{have\} slain \{the target\}\! |
| `attacking-combat-attack-knocked-out` | \{capitalize the target\} collapses\, unconscious\! |
| `attacking-combat-attack-missed` | \{You\} \{swing\} at \{the target\} but miss\! |
| `attacking-combat-cannot-attack` | \{You\} \{can\'t\} attack \{the target\}\. |
| `attacking-combat-defend-blocked` | \{capitalize the target\} blocks \{your\} attack\! |
| `attacking-combat-defend-dodged` | \{capitalize the target\} dodges out of the way\! |
| `attacking-combat-defend-parried` | \{capitalize the target\} parries \{your\} attack\! |
| `attacking-combat-ended` | The battle is over\. |
| `attacking-combat-health-badly-wounded` | \{capitalize the target\} \{verb\:is target\} badly wounded\. |
| `attacking-combat-health-dead` | \{capitalize the target\} \{verb\:is target\} dead\. |
| `attacking-combat-health-healthy` | \{capitalize the target\} appears uninjured\. |
| `attacking-combat-health-near-death` | \{capitalize the target\} \{verb\:is target\} barely clinging to life\! |
| `attacking-combat-health-unconscious` | \{capitalize the target\} lies unconscious\. |
| `attacking-combat-health-wounded` | \{capitalize the target\} \{verb\:has target\} been wounded\. |
| `attacking-combat-need-weapon` | \{You\} \{need\} a weapon to attack effectively\. |
| `attacking-combat-no-target` | Attack what\? |
| `attacking-combat-not-hostile` | \{capitalize the target\} \{verb\:isn\'t target\} hostile\. |
| `attacking-combat-player-died` | \{You\} \{have\} been slain\! |
| `attacking-combat-player-resurrected` | \{You\} \{feel\} life return to \{your\} body\. |
| `attacking-combat-special-blessed-weapon` | \{Your\} blessed weapon burns the undead\! |
| `attacking-combat-special-sword-glows` | \{Your\} sword glows brightly\! |
| `attacking-combat-special-sword-stops-glowing` | \{Your\} sword\'s glow fades\. |
| `attacking-combat-started` | Combat has begun\! |
| `attacking-combat-target-unconscious` | \{capitalize the target\} \{verb\:is target\} already unconscious\. |
| `attacking-debris-created` | Debris from \{the target\} litters the area\. |
| `attacking-defends` | \{capitalize the target\} defends against \{your\} attack\. |
| `attacking-destroyed` | \{You\} \{destroy\} \{the target\}\! |
| `attacking-dodges` | \{capitalize the target\} dodges \{your\} attack\. |
| `attacking-flees` | \{capitalize the target\} flees from \{you\}\! |
| `attacking-hit-blindly` | \{You\} \{swing\} wildly\, hitting nothing\. |
| `attacking-hit-target` | \{You\} \{hit\} \{the target\}\. |
| `attacking-hit-with` | \{You\} \{hit\} \{the target\} with \{the weapon\}\. |
| `attacking-indestructible` | \{capitalize the target\} \{verb\:is target\} far too solid to damage\. |
| `attacking-items-spilled` | \{capitalize the target\}\'s possessions spill onto the ground\. |
| `attacking-kicked` | \{You\} \{kick\} \{the target\}\. |
| `attacking-killed-blindly` | Something dies in the darkness\. |
| `attacking-killed-target` | \{You\} \{have\} defeated \{the target\}\! |
| `attacking-need-weapon-to-damage` | \{capitalize the target\} requires a weapon to damage\. |
| `attacking-no-fighting` | Fighting won\'t solve this problem\. |
| `attacking-no-target` | Attack what\? |
| `attacking-not-holding-weapon` | \{You\} aren\'t holding \{the weapon\}\. |
| `attacking-not-reachable` | \{You\} \{can\'t\} reach \{the target\}\. |
| `attacking-not-visible` | \{You\} \{can\'t\} see \{the target\}\. |
| `attacking-passage-revealed` | A hidden passage is revealed\! |
| `attacking-peaceful-solution` | Violence isn\'t necessary here\. |
| `attacking-punched` | \{You\} \{punch\} \{the target\}\. |
| `attacking-retaliates` | \{capitalize the target\} fights back\! |
| `attacking-self` | Violence against \{yourself\} isn\'t the answer\. |
| `attacking-shattered` | \{capitalize the target\} shatters\! |
| `attacking-smashed` | \{You\} \{smash\} \{the target\} to pieces\! |
| `attacking-struck` | \{You\} \{strike\} \{the target\}\! |
| `attacking-struck-with` | \{You\} \{strike\} \{the target\} with \{the weapon\}\! |
| `attacking-target-broke` | \{capitalize the target\} breaks\! |
| `attacking-target-damaged` | \{capitalize the target\} shows signs of damage\. \(\{damage\} damage dealt\) |
| `attacking-target-destroyed` | \{capitalize the target\} \{verb\:is target\} utterly destroyed\! |
| `attacking-target-shattered` | \{capitalize the target\} shatters into pieces\! |
| `attacking-unarmed-attack` | \{You\} \{attack\} \{the target\} with \{your\} bare hands\. |
| `attacking-unnecessary-violence` | That seems unnecessarily violent\. |
| `attacking-violence-not-the-answer` | Violence is not the answer\. |
| `attacking-wrong-weapon-type` | \{capitalize the target\} can\'t be damaged with that type of weapon\. |

## `burning` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `burning-burned` | \{You\} \{set\} fire to \{the item\}\. |
| `burning-cant-burn` | Burning \{the item\} would achieve nothing here\. |
| `burning-needs-tool` | \{You\} \{need\} \{the tool\} to burn \{the item\}\. |
| `burning-no-target` | Burn what\? |
| `burning-no-tool` | \{You\} \{need\} something to burn \{the item\} with\. |
| `burning-not-flammable` | \{capitalize the item\} isn\'t something \{you\} can burn\. |
| `burning-tool-not-held` | \{You\} \{aren\'t\} holding \{the tool\}\. |
| `burning-wrong-tool` | \{capitalize the tool\} won\'t burn \{the item\}\. |

## `buying` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `buying-already-have` | \{You\} already \{have\} \{the target\}\. |
| `buying-bought` | \{You\} \{buy\} \{the target\}\. |
| `buying-cant-afford` | \{You\} can\'t afford \{the target\}\. |
| `buying-no-target` | Buy what\? |
| `buying-not-for-sale` | \{capitalize the target\} \{verb\:isn\'t target\} for sale\. |

## `climbing` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `climbing-already-there` | \{You\'re\} already on \{the place\}\. |
| `climbing-cant-go-that-way` | \{You\} \{can\'t\} climb \{direction\:direction\} from here\. |
| `climbing-climb-nowhere` | Climbing \{the object\} would get \{you\} nowhere\. |
| `climbing-climbed-down` | \{You\} \{climb\} down\. |
| `climbing-climbed-onto` | \{You\} \{climb\} onto \{the target\}\. |
| `climbing-climbed-up` | \{You\} \{climb\} up\. |
| `climbing-need-equipment` | \{You\}\'d need climbing equipment for that\. |
| `climbing-no-target` | What do \{you\} want to climb\? |
| `climbing-not-climbable` | \{You\} \{can\'t\} climb \{the object\}\. |
| `climbing-nothing-to-climb` | There\'s nothing to climb here\. |
| `climbing-too-dangerous` | That looks too dangerous to climb\. |
| `climbing-too-high` | That\'s too high to climb\. |
| `climbing-too-slippery` | It\'s too slippery to climb\. |

## `closing` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `closing-already-closed` | \{capitalize the item\} \{verb\:is item\} already closed\. |
| `closing-cant-reach` | \{You\} \{can\'t\} reach \{the item\}\. |
| `closing-closed` | \{You\} \{close\} \{the item\}\. |
| `closing-no-target` | Close what\? |
| `closing-not-closable` | \{capitalize the item\} can\'t be closed\. |
| `closing-prevents-closing` | \{You\} \{can\'t\} close \{the item\} while \{obstacle\} \{verb\:is obstacle\} in the way\. |

## `consulting` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `consulting-no-target` | Consult what\? |
| `consulting-no-topic` | Look up what in \{the source\}\? |
| `consulting-not-consultable` | \{capitalize the source\} \{verb\:isn\'t source\} something \{you\} can look things up in\. |
| `consulting-nothing-found` | \{You\} \{find\} nothing about that in \{the source\}\. |

## `cutting` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `cutting-cant-cut` | Cutting \{the item\} would achieve nothing here\. |
| `cutting-cut` | \{You\} \{cut\} \{the item\}\. |
| `cutting-needs-tool` | \{You\} \{need\} \{the tool\} to cut \{the item\}\. |
| `cutting-no-target` | Cut what\? |
| `cutting-no-tool` | \{You\} \{need\} something to cut \{the item\} with\. |
| `cutting-not-cuttable` | \{capitalize the item\} \{verb\:is item\} not something \{you\} can cut\. |
| `cutting-tool-not-held` | \{You\} \{need\} to be holding \{the tool\}\. |
| `cutting-wrong-tool` | \{capitalize the tool\} won\'t cut \{the item\}\. |

## `digging` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `digging-cant-dig` | Digging \{the item\} would achieve nothing here\. |
| `digging-dug` | \{You\} \{dig\} \{the item\}\. |
| `digging-needs-tool` | \{You\} \{need\} \{the tool\} to dig \{the item\}\. |
| `digging-no-target` | Dig what\? |
| `digging-no-tool` | \{You\} \{need\} something to dig \{the item\} with\. |
| `digging-not-diggable` | \{capitalize the item\} \{verb\:is item\} not something \{you\} can dig\. |
| `digging-tool-not-held` | \{You\} \{need\} to be holding \{the tool\}\. |
| `digging-wrong-tool` | \{capitalize the tool\} won\'t dig \{the item\}\. |

## `drinking` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `drinking-already-consumed` | There\'s nothing left to drink\. |
| `drinking-bitter` | \{You\} \{drink\} \{the item\}\. It\'s quite bitter\. |
| `drinking-container-closed` | \{You\} \{need\} to open \{the item\} first\. |
| `drinking-drunk` | \{You\} \{drink\} \{the item\}\. |
| `drinking-drunk-all` | \{You\} \{drink\} all of \{the item\}\. |
| `drinking-drunk-from` | \{You\} \{drink\} from \{the item\}\. |
| `drinking-drunk-some` | \{You\} \{drink\} some of \{the item\}\. |
| `drinking-empty-now` | \{You\} \{drink\} the last of the \{liquidType\}\. |
| `drinking-from-container` | \{You\} \{drink\} the \{liquidType\} from \{the item\}\. |
| `drinking-gulped` | \{You\} \{gulp\} down \{the item\}\. |
| `drinking-healing` | \{You\} \{drink\} \{the item\}\. \{You\} \{feel\} better\! |
| `drinking-magical-effects` | \{You\} \{drink\} \{the item\}\. \{You\} \{feel\} strange\.\.\. |
| `drinking-no-item` | Drink what\? |
| `drinking-not-drinkable` | That\'s not something \{you\} can drink\. |
| `drinking-not-reachable` | \{You\} \{can\'t\} reach \{the item\}\. |
| `drinking-not-visible` | \{You\} \{can\'t\} see \{the item\}\. |
| `drinking-quaffed` | \{You\} \{quaff\} \{the item\} heartily\. |
| `drinking-refreshing` | \{You\} \{drink\} \{the item\}\. How refreshing\! |
| `drinking-satisfying` | \{You\} \{drink\} \{the item\}\. That hits the spot\. |
| `drinking-sipped` | \{You\} \{take\} a sip of \{the item\}\. |
| `drinking-some-remains` | \{You\} \{drink\} some \{liquidType\}\. Some remains\. |
| `drinking-still-thirsty` | \{You\} \{drink\} \{the item\}\, but \{you\'re\} still thirsty\. |
| `drinking-strong` | \{You\} \{drink\} \{the item\}\. It\'s strong\! |
| `drinking-sweet` | \{You\} \{drink\} \{the item\}\. It\'s sweet\. |
| `drinking-thirst-quenched` | \{You\} \{drink\} \{the item\}\. \{Your\} thirst is quenched\. |

## `dropping` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `dropping-dropped` | Dropped\. |
| `dropping-dropped-afloat` | \{capitalize the item\} \{verb\:floats item\} where \{verb\:it item\} \{verb\:falls item\}\. |
| `dropping-dropped-breaks` | \{capitalize the item\} \{verb\:hits item\} the floor and \{verb\:breaks item\}\. |
| `dropping-dropped-in` | \{You\} \{put\} \{the item\} in \{the container\}\. |
| `dropping-dropped-multi` | \{item\}\: Dropped\. |
| `dropping-dropped-on` | \{You\} \{put\} \{the item\} on \{the surface\}\. |
| `dropping-lost-overboard` | \{capitalize the item\} drifts away\. |
| `dropping-no-target` | Drop what\? |
| `dropping-not-held` | \{You\} aren\'t holding \{the item\}\. |
| `dropping-nothing-to-drop` | \{You\} aren\'t carrying anything\. |
| `dropping-still-worn` | \{You\}\'ll need to take off \{the item\} first\. |

## `eating` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `eating-already-consumed` | There\'s nothing left of \{the item\} to eat\. |
| `eating-awful` | \{You\} \{eat\} \{the item\}\. It tastes awful\! |
| `eating-bland` | \{You\} \{eat\} \{the item\}\. It\'s rather bland\. |
| `eating-delicious` | \{You\} \{eat\} \{the item\}\. Delicious\! |
| `eating-devoured` | \{You\} \{devour\} \{the item\} hungrily\. |
| `eating-eaten` | \{You\} \{eat\} \{the item\}\. |
| `eating-eaten-all` | \{You\} \{eat\} all of \{the item\}\. |
| `eating-eaten-portion` | \{You\} \{eat\} a portion of \{the item\}\. |
| `eating-eaten-some` | \{You\} \{eat\} some of \{the item\}\. |
| `eating-filling` | \{You\} \{eat\} \{the item\}\. That was filling\. |
| `eating-is-drink` | \{You\} should drink \{the item\}\, not eat it\. |
| `eating-munched` | \{You\} \{munch\} on \{the item\}\. |
| `eating-nibbled` | \{You\} \{nibble\} on \{the item\}\. |
| `eating-no-item` | Eat what\? |
| `eating-not-edible` | That\'s not something \{you\} can eat\. |
| `eating-not-reachable` | \{You\} \{can\'t\} reach \{the item\}\. |
| `eating-not-visible` | \{You\} \{can\'t\} see \{the item\}\. |
| `eating-poisonous` | \{You\} \{eat\} \{the item\}\. It tastes strange\.\.\. |
| `eating-satisfying` | \{You\} \{eat\} \{the item\}\. Very satisfying\! |
| `eating-still-hungry` | \{You\} \{eat\} \{the item\}\, but \{you\'re\} still hungry\. |
| `eating-tasted` | \{You\} \{taste\} \{the item\}\. |
| `eating-tasty` | \{You\} \{eat\} \{the item\}\. It\'s quite tasty\. |

## `emptying` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `emptying-already-empty` | \{capitalize the target\} \{verb\:is target\} already empty\. |
| `emptying-cant-empty-into` | \{You\} \{can\'t\} empty \{the target\} into \{the destination\}\. |
| `emptying-container-closed` | \{capitalize the target\} \{verb\:is target\} closed\. |
| `emptying-destination-closed` | \{capitalize the destination\} \{verb\:is destination\} closed\. |
| `emptying-destination-full` | \{capitalize the destination\} \{verb\:has destination\} no room for \{the item\}\. |
| `emptying-emptied-here` | \{You\} \{empty\} \{the target\} onto the floor\: \{items\}\. |
| `emptying-emptied-into` | \{You\} \{empty\} \{the target\} into \{the destination\}\: \{items\}\. |
| `emptying-into-itself` | \{You\} \{can\'t\} empty \{the target\} into itself\. |
| `emptying-no-target` | Empty what\? |
| `emptying-not-a-container` | \{You\} \{can\'t\} empty \{the target\}\. |

## `entering` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `entering-already-inside` | \{You\'re\} already in \{the place\}\. |
| `entering-boarded` | \{You\} \{board\} \{the vehicle\}\. |
| `entering-cant-enter` | \{You\} \{can\'t\} enter \{the place\}\: \{reason\}\. |
| `entering-container-closed` | \{capitalize the container\} \{verb\:is container\} closed\. |
| `entering-entered` | \{You\} \{get\} into \{the place\}\. |
| `entering-entered-on` | \{You\} \{get\} onto \{the place\}\. |
| `entering-no-target` | Enter what\? |
| `entering-not-enterable` | \{You\} \{can\'t\} enter \{the place\}\. |
| `entering-not-here` | \{You\} \{don\'t\} see \{the place\} here\. |
| `entering-occupied` | \{capitalize the place\} \{verb\:is place\} already occupied\. |
| `entering-too-full` | \{capitalize the place\} \{verb\:is place\} full \(maximum \{max\} occupants\)\. |
| `entering-too-small` | \{capitalize the place\} \{verb\:is place\} too small for \{you\} to enter\. |
| `entering-vehicle-not-boardable` | \{You\} \{can\'t\} board \{the vehicle\}\. |

## `examining` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `examining-brief-description` | \{verbatim\:description\} |
| `examining-cant-see` | \{You\} \{can\'t\} see \{the item\} here\. |
| `examining-container-closed` | \{capitalize the item\} \{verb\:is item\} closed\. |
| `examining-container-contents` | In \{the container\} \{you\} \{see\} \{items\}\. |
| `examining-container-empty` | \{capitalize the item\} \{verb\:is item\} empty\. |
| `examining-container-open` | \{capitalize the item\} \{verb\:is item\} open\. |
| `examining-default-description` | \{capitalize the item\} \{verb\:is item\} just \{a item\}\.\{slot\:detail\} |
| `examining-default-description-self` | As good\-looking as ever\. |
| `examining-description` | \{verbatim\:description\}\{slot\:detail\} |
| `examining-examined` | \{verbatim\:description\}\{slot\:detail\} |
| `examining-examined-container` | \{verbatim\:description\}\{slot\:detail\} |
| `examining-examined-door` | \{verbatim\:description\}\{slot\:detail\} |
| `examining-examined-readable` | \{verbatim\:description\}\{slot\:detail\} |
| `examining-examined-self` | \{verbatim\:description\}\{slot\:detail\} |
| `examining-examined-supporter` | \{verbatim\:description\}\{slot\:detail\} |
| `examining-examined-switchable` | \{verbatim\:description\}\{slot\:detail\} |
| `examining-examined-wall` | \{verbatim\:description\}\{slot\:detail\} |
| `examining-examined-wearable` | \{verbatim\:description\}\{slot\:detail\} |
| `examining-no-description` | \{You\} \{see\} nothing special about \{the item\}\. |
| `examining-no-target` | Examine what\? |
| `examining-not-visible` | \{You\} \{can\'t\} see \{the item\} here\. |
| `examining-nothing-special` | \{You\} \{see\} nothing special about \{the item\}\. |
| `examining-seen-from-afar` | \{verbatim\:description\} |
| `examining-surface-contents` | On \{the surface\} \{you\} \{see\} \{items\}\. |
| `examining-worn-by-other` | \{actor\} \{verb\:is actor\} wearing \{the item\}\. |
| `examining-worn-by-you` | \{You\} \{are\} wearing \{the item\}\. |

## `exiting` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `exiting-already-outside` | \{You\'re\} not inside anything\. |
| `exiting-cant-exit` | \{You\} \{can\'t\} exit \{the place\}\. |
| `exiting-container-closed` | \{capitalize the container\} \{verb\:is container\} closed\. |
| `exiting-exit-blocked` | The way out is blocked\. |
| `exiting-exited` | \{You\} \{get\} out of \{the place\}\. |
| `exiting-exited-from` | \{You\} \{get\} \{preposition\} \{the place\}\. |
| `exiting-must-stand-first` | \{You\}\'ll need to stand up first\. |
| `exiting-not-in-that` | But \{you\} \{aren\'t\} in \{the container\}\. |
| `exiting-not-on-that` | But \{you\} \{aren\'t\} on \{the container\}\. |
| `exiting-nowhere-to-go` | There\'s nowhere to go from here\. |
| `exiting-outside-ambiguous` | \{You\} ponder the reality of being outside\.\.\. |
| `exiting-vehicle-not-at-hatch` | There\'s no way off from here\. |

## `extinguishing` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `extinguishing-extinguished` | \{You\} \{put\} out \{the target\}\. |
| `extinguishing-extinguished-into-darkness` | \{You\} \{put\} out \{the target\}\, and darkness closes in\. |
| `extinguishing-no-target` | Put out what\? |
| `extinguishing-not-light-source` | \{capitalize the target\} isn\'t something \{you\} can put out\. |
| `extinguishing-not-lit` | \{capitalize the target\} \{verb\:isn\'t target\} lit\. |

## `giving` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `giving-accepts` | \{capitalize the recipient\} accepts \{the item\}\. |
| `giving-given` | \{You\} \{give\} \{the item\} to \{the recipient\}\. |
| `giving-gratefully-accepts` | \{capitalize the recipient\} gratefully accepts \{the item\}\. |
| `giving-inventory-full` | \{capitalize the recipient\} says\, \"I can\'t carry any more\.\" |
| `giving-no-item` | Give what\? |
| `giving-no-recipient` | Give it to whom\? |
| `giving-not-actor` | \{You\} can only give things to people\. |
| `giving-not-holding` | \{You\} aren\'t holding \{the item\}\. |
| `giving-not-interested` | \{capitalize the recipient\} \{verb\:doesn\'t recipient\} seem interested in \{the item\}\. |
| `giving-recipient-not-reachable` | \{capitalize the recipient\} \{verb\:is recipient\} too far away\. |
| `giving-recipient-not-visible` | \{You\} \{can\'t\} see \{the recipient\}\. |
| `giving-refuses` | \{capitalize the recipient\} politely declines\. |
| `giving-reluctantly-accepts` | \{capitalize the recipient\} reluctantly takes \{the item\}\. |
| `giving-self` | \{You\} already \{have\} \{the item\}\! |
| `giving-too-heavy` | \{capitalize the recipient\} says\, \"That\'s too heavy for me\.\" |

## `going` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `going-already-there` | \{You\'re\} already there\. |
| `going-arrived` | \{You\} \{arrive\}\. |
| `going-arrives` | \{You\} \{enter\} from the \{direction\:direction\}\. |
| `going-cant-go` | \{You\} \{can\'t\} go that way\. |
| `going-cant-go-through` | \{You\} \{can\'t\} go through \{obstacle\}\. |
| `going-contents-list` | \{You\} can \{see\} \{items\} here\. |
| `going-departs` | \{You\} \{leave\} to the \{direction\:direction\}\. |
| `going-destination-not-found` | \{You\} \{can\'t\} go that way\. |
| `going-door-closed` | \{capitalize the door\} \{verb\:is door\} closed\. |
| `going-door-locked` | \{capitalize the door\} \{verb\:is door\} locked\. |
| `going-expanse-edge` | \{You\} can go no farther that way\. |
| `going-moved` | \{You\} \{go\} \{direction\:direction\}\. |
| `going-movement-blocked` | \{verbatim\:message\} |
| `going-need-light` | It\'s too dark to go that way safely\. |
| `going-no-direction` | \{You\}\'ll have to say which direction to go\. |
| `going-no-exit` | \{You\} \{can\'t\} go that way\. |
| `going-no-exit-that-way` | \{You\} \{can\'t\} go that way\. |
| `going-no-exits` | There are no obvious exits\. |
| `going-not-in-room` | \{You\'re\} not in a place where \{you\} can go anywhere\. |
| `going-nowhere-to-go` | \{You\}\'ll have to say which compass direction to go in\. |
| `going-room-description` | \{name\} `\n` \{verbatim\:description\} |
| `going-sailing-edge` | Wind and sea drive \{you\} back\. |
| `going-stays-by-vehicle` | \{You\} \{stay\} where \{you\} \{are\}\, by the vehicle\. |
| `going-thing-drifted` | \{capitalize the thing\} drifts\. |
| `going-thing-washed-up` | \{capitalize the thing\} washes up here\. |
| `going-too-dark` | It is pitch dark\. \{You\} \{be\} likely to be eaten by a grue\. |
| `going-vehicle-alongside` | \{capitalize the vehicle\} comes alongside \{the thing\}\. |
| `going-vehicle-arrived` | \{capitalize the vehicle\} arrives at \{the stop\}\. |
| `going-vehicle-at-end` | \{capitalize the vehicle\} is at the end of its line\. |
| `going-vehicle-cannot-go` | \{capitalize the vehicle\} \{can\'t\} go that way\. |
| `going-vehicle-cannot-walk` | \{You\} \{can\'t\} go anywhere from \{the vehicle\}\. |
| `going-vehicle-departed` | \{capitalize the vehicle\} pulls away\. |
| `going-vehicle-in-irons` | \{capitalize the vehicle\} \{verb\:is vehicle\} in irons\. |
| `going-vehicle-ride` | \{You\'re\} riding\, not walking\. |
| `going-vehicle-stopped` | \{capitalize the vehicle\} comes to a stop\. |
| `going-vehicle-under-way` | \{capitalize the vehicle\} is under way\. |
| `going-went` | \{You\} \{go\} \{direction\:direction\}\. |

## `help` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `help-first-time` | New to Interactive Fiction\? Try these commands to get started\: `\n` \- LOOK to see where you are `\n` \- INVENTORY to see what you\'re carrying `\n` \- EXAMINE interesting objects `\n` \- Go in compass directions \(NORTH\, SOUTH\, etc\.\) |
| `help-general` | Welcome to Interactive Fiction\! `\n`  `\n` Basic commands\: `\n` \- LOOK \(L\)\: Examine your surroundings `\n` \- INVENTORY \(I\)\: List what you\'re carrying `\n` \- EXAMINE \(X\) \[object\]\: Look at something closely `\n` \- TAKE\/DROP \[object\]\: Pick up or put down items `\n` \- GO \[direction\] or just \[direction\]\: Move around `\n`  `\n` For more help on a specific topic\, type HELP \[topic\]\. |
| `help-help-footer` | For a complete list of commands\, consult the game documentation\. |
| `help-help-movement` | Movement commands\: `\n` \- GO NORTH\/SOUTH\/EAST\/WEST \(or just N\/S\/E\/W\) `\n` \- UP\/DOWN \(U\/D\) `\n` \- IN\/OUT `\n` \- ENTER \[place\] `\n` \- EXIT |
| `help-help-objects` | Object commands\: `\n` \- TAKE\/GET \[object\] `\n` \- DROP \[object\] `\n` \- EXAMINE\/LOOK AT \[object\] `\n` \- OPEN\/CLOSE \[object\] `\n` \- PUT \[object\] IN\/ON \[container\] `\n` \- WEAR\/REMOVE \[clothing\] |
| `help-help-special` | Special commands\: `\n` \- SAVE\/RESTORE\: Save and load your game `\n` \- SCORE\: Check your progress `\n` \- WAIT \(Z\)\: Let time pass `\n` \- AGAIN \(G\)\: Repeat last command `\n` \- QUIT\: Exit the game |
| `help-stuck-help` | If you\'re stuck\, try\: `\n` \- LOOK around carefully `\n` \- EXAMINE everything `\n` \- Check your INVENTORY `\n` \- Try different verbs with objects |
| `help-topic` | Help on \{verbatim\:topic\}\: |
| `help-unknown-topic` | No help available on \'\{verbatim\:topic\}\'\. Type HELP for general help\. |

## `hiding` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `hiding-already-hidden` | \{You\'re\} already hidden\. |
| `hiding-behind` | \{You\} \{slip\} behind \{the target\}\. |
| `hiding-cant-hide-there-behind` | \{You\} \{can\'t\} hide behind \{the target\}\. |
| `hiding-cant-hide-there-inside` | \{You\} \{can\'t\} hide inside \{the target\}\. |
| `hiding-cant-hide-there-on` | \{You\} \{can\'t\} hide on \{the target\}\. |
| `hiding-cant-hide-there-under` | \{You\} \{can\'t\} hide under \{the target\}\. |
| `hiding-inside` | \{You\} \{climb\} into \{the target\}\, concealing \{yourself\}\. |
| `hiding-nothing-to-hide` | \{You\} \{can\'t\} hide there\. |
| `hiding-on` | \{You\} \{crouch\} on \{the target\}\, out of sight\. |
| `hiding-under` | \{You\} \{crawl\} under \{the target\}\. |

## `hunger` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `hunger-crossed` | The hunger sharpens\. |
| `hunger-starved` | \{You\} \{have\} starved to death\. |

## `inserting` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `inserting-already-there` | \{capitalize the item\} \{verb\:is item\} already in \{the destination\}\. |
| `inserting-container-closed` | \{capitalize the container\} \{verb\:is container\} closed\. |
| `inserting-inserted` | \{You\} \{insert\} \{the item\} into \{the container\}\. |
| `inserting-no-destination` | Insert \{the item\} into what\? |
| `inserting-no-room` | There\'s no room in \{the container\}\. |
| `inserting-no-target` | Insert what\? |
| `inserting-not-container` | \{You\} \{can\'t\} insert things into \{the destination\}\. |
| `inserting-not-held` | \{You\} \{need\} to be holding \{the item\} first\. |
| `inserting-not-insertable` | \{capitalize the item\} can\'t be inserted into things\. |
| `inserting-wont-fit` | \{capitalize the item\} won\'t fit in \{the container\}\. |

## `inventory` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `inventory-burden-heavy` | \{You\'re\} carrying quite a load\. |
| `inventory-burden-light` | \{You\'re\} traveling light\. |
| `inventory-burden-overloaded` | \{You\'re\} weighed down with everything \{you\'re\} carrying\. |
| `inventory-carrying` | \{You\} \{be\} carrying\: |
| `inventory-carrying-and-wearing` | \{You\} \{be\} carrying and wearing\: |
| `inventory-carrying-count` | \{You\} \{be\} carrying \{holdingCount\} item\(s\)\. |
| `inventory-empty` | \{You\} aren\'t carrying anything\. |
| `inventory-hands-empty` | \{Your\} hands are empty\. |
| `inventory-holding-list` |   \{items\} |
| `inventory-inventory-empty` | \{You\} aren\'t carrying anything\. |
| `inventory-inventory-header` | \{You\} \{be\} carrying\: |
| `inventory-item-list` |   \{item\} |
| `inventory-nothing-at-all` | \{You\} aren\'t carrying anything at all\. |
| `inventory-pockets-empty` | \{Your\} pockets are empty\. |
| `inventory-wearing` | \{You\} \{be\} wearing\: |
| `inventory-wearing-count` | \{You\} \{be\} wearing \{wearingCount\} item\(s\)\. |
| `inventory-worn-list` |   \{items\} \(worn\) |

## `jumping` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `jumping-jumped` | \{You\} \{jump\} on the spot\. Nothing comes of it\. |

## `kissing` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `kissing-kissed-person` | \{capitalize the target\} \{verb\:is target\} having none of that\. |
| `kissing-kissed-thing` | \{You\} \{kiss\} \{the target\}\. Nothing comes of it\. |
| `kissing-no-target` | Kiss what\? |

## `lighting` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `lighting-already-lit` | \{capitalize the target\} \{verb\:is target\} already lit\. |
| `lighting-lit` | \{You\} \{light\} \{the target\}\. |
| `lighting-lit-in-darkness` | \{You\} \{light\} \{the target\}\, and the darkness draws back\. |
| `lighting-needs-tool` | \{You\} \{need\} \{the tool\} to light \{the item\}\. |
| `lighting-no-fuel` | \{capitalize the target\} won\'t light\; it has nothing left to burn\. |
| `lighting-no-target` | Light what\? |
| `lighting-no-tool` | \{You\} \{need\} something to light \{the item\} with\. |
| `lighting-not-light-source` | \{capitalize the target\} isn\'t something \{you\} can light\. |
| `lighting-tool-not-held` | \{You\} \{aren\'t\} holding \{the tool\}\. |
| `lighting-wrong-tool` | \{capitalize the tool\} won\'t light \{the item\}\. |

## `listening` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `listening-active-devices` | \{You\} can \{hear\} \{devices\} operating nearby\. |
| `listening-ambient-sounds` | \{You\} \{hear\} the usual ambient sounds\. |
| `listening-container-sounds` | \{You\} \{hear\} faint sounds from inside \{the target\}\. |
| `listening-device-off` | \{capitalize the target\} \{verb\:is target\} silent\. |
| `listening-device-running` | \{capitalize the target\} \{verb\:is target\} making a soft humming sound\. |
| `listening-liquid-sounds` | \{You\} \{hear\} liquid sloshing in \{the target\}\. |
| `listening-listened-environment` | \{You\} \{listen\} carefully\. |
| `listening-listened-to` | \{You\} \{listen\} carefully to \{the target\}\. |
| `listening-no-sound` | \{capitalize the target\} \{verb\:isn\'t target\} making any sound\. |
| `listening-not-visible` | \{You\} \{can\'t\} see \{the target\} well enough to focus on its sounds\. |
| `listening-silence` | \{You\} \{hear\} nothing out of the ordinary\. |
| `listening-sounds-from-target` | \{capitalize the target\} \{verb\:is target\} making a noise\. |
| `listening-sounds-nearby` | \{You\} \{hear\} \{sources\}\. |

## `locking` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `locking-already-locked` | \{capitalize the item\} \{verb\:is item\} already locked\. |
| `locking-cant-reach` | \{You\} \{can\'t\} reach \{the item\}\. |
| `locking-key-not-held` | \{You\} \{need\} to be holding \{the key\}\. |
| `locking-locked` | \{You\} \{lock\} \{the item\}\. |
| `locking-locked-with` | \{You\} \{lock\} \{the item\} with \{the key\}\. |
| `locking-no-key` | What do \{you\} want to lock it with\? |
| `locking-no-target` | Lock what\? |
| `locking-not-closed` | \{You\} \{need\} to close \{the item\} first\. |
| `locking-not-lockable` | \{capitalize the item\} can\'t be locked\. |
| `locking-wrong-key` | \{capitalize the key\} doesn\'t fit \{the item\}\. |

## `looking` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `looking-container-contents` | In \{the container\} \{you\} \{see\} \{items\}\. |
| `looking-contents-list` | \{You\} can \{see\} \{items\} here\. |
| `looking-examine-surroundings` | \{name\} `\n` \{verbatim\:description\} |
| `looking-hidden-at` | \(\{You\'re\} hiding \{verbatim\:position\} \{the spot\}\.\) |
| `looking-in-container` | \{You\} \{be\} in \{the container\}\. |
| `looking-nothing-special` | \{You\} \{see\} nothing special\. |
| `looking-on-supporter` | \{You\} \{be\} on \{the supporter\}\. |
| `looking-room-dark` | It\'s pitch dark\, and \{you\} \{can\'t\} see a thing\. |
| `looking-room-description` | \{name\} `\n` \{verbatim\:description\} |
| `looking-sighting-close-by` | \{capitalize the thing\}\, close by\, to the \{direction\:direction\}\. |
| `looking-sighting-here` | \{capitalize the thing\}\, right here\. |
| `looking-sighting-in-the-distance` | \{capitalize the thing\}\, in the distance\, to the \{direction\:direction\}\. |
| `looking-sighting-on-the-horizon` | \{capitalize the thing\}\, on the horizon\, to the \{direction\:direction\}\. |
| `looking-surface-contents` | On \{the surface\} \{you\} \{see\} \{items\}\. |
| `looking-you-see` | \{You\} can \{see\} \{items\} here\. |

## `looking_under` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `looking-under-found-under` | Under \{the target\} \{you\} \{find\} \{items\}\. |
| `looking-under-no-target` | Look under what\? |
| `looking-under-nothing-under` | \{You\} \{find\} nothing under \{the target\}\. |

## `lowering` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `lowering-already-down` | That\'s already lowered\. |
| `lowering-cant-lower-that` | \{You\} \{can\'t\} lower \{the target\}\. |
| `lowering-lowered` | \{You\} \{lower\} \{the target\}\. |
| `lowering-no-target` | Lower what\? |

## `opening` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `opening-already-open` | \{capitalize the item\} \{verb\:is item\} already open\. |
| `opening-cant-reach` | \{You\} \{can\'t\} reach \{the item\}\. |
| `opening-its-empty` | \{You\} \{open\} \{the container\}\, which is empty\. |
| `opening-locked` | \{capitalize the item\} \{verb\:is item\} locked\. |
| `opening-needs-tool` | \{You\} \{need\} \{the tool\} to open \{the item\}\. |
| `opening-no-target` | Open what\? |
| `opening-no-tool` | \{You\} \{need\} something to open \{the item\} with\. |
| `opening-not-openable` | \{capitalize the item\} can\'t be opened\. |
| `opening-opened` | \{You\} \{open\} \{the item\}\. |
| `opening-revealing` | Opening \{the container\} reveals \{items\}\. |
| `opening-tool-not-held` | \{You\} \{need\} to be holding \{the tool\}\. |
| `opening-wrong-tool` | \{capitalize the tool\} won\'t open \{the item\}\. |

## `pulling` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `pulling-cant-pull-that` | \{capitalize the target\} \{verb\:is target\} not something \{you\} can pull\. |
| `pulling-detached` | \{You\} \{pull\} \{the target\} free of \{the anchor\}\. |
| `pulling-no-target` | Pull what\? |
| `pulling-not-reachable` | \{You\} \{can\'t\} reach \{the target\}\. |
| `pulling-not-visible` | \{You\} \{can\'t\} see \{the target\}\. |
| `pulling-pulled` | \{You\} \{pull\} \{the target\}\. |
| `pulling-wont-budge` | \{capitalize the target\} won\'t budge\. |
| `pulling-worn` | \{You\} \{can\'t\} pull \{the target\} while wearing it\. |

## `pushing` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `pushing-button-clicks` | \{You\} \{press\} \{the target\}\. Click\! |
| `pushing-button-pushed` | \{You\} \{push\} \{the target\}\. |
| `pushing-cannot-push-that-way` | \{You\} \{can\'t\} push \{the target\} that way\. |
| `pushing-carrying-it` | \{You\} \{can\'t\} push \{the target\} while carrying it\. |
| `pushing-fixed-in-place` | \{capitalize the target\} \{verb\:is target\} fixed in place\. |
| `pushing-no-target` | Push what\? |
| `pushing-not-reachable` | \{You\} \{can\'t\} reach \{the target\}\. |
| `pushing-not-visible` | \{You\} \{can\'t\} see \{the target\}\. |
| `pushing-pushed-direction` | \{You\} \{push\} \{the target\} \{direction\:direction\}\. |
| `pushing-pushed-nudged` | \{You\} \{give\} \{the target\} a push\, but it doesn\'t move far\. |
| `pushing-pushing-does-nothing` | Pushing \{the target\} has no effect\. |
| `pushing-switch-toggled` | \{You\} \{push\} \{the target\}\, toggling it \{newState\}\. |
| `pushing-too-heavy` | \{capitalize the target\} \{verb\:is target\} far too heavy to push \(weighs \{weight\}kg\)\. |
| `pushing-wearing-it` | \{You\} \{can\'t\} push \{the target\} while wearing it\. |
| `pushing-wont-budge` | \{capitalize the target\} won\'t budge\. |

## `putting` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `putting-already-there` | \{capitalize the item\} \{verb\:is item\} already \{relation\} \{the destination\}\. |
| `putting-cant-put-in-itself` | \{You\} \{can\'t\} put \{the item\} inside itself\. |
| `putting-cant-put-on-itself` | \{You\} \{can\'t\} put \{the item\} on itself\. |
| `putting-container-closed` | \{capitalize the container\} \{verb\:is container\} closed\. |
| `putting-no-destination` | Where do \{you\} want to put \{the item\}\? |
| `putting-no-room` | There\'s no room in \{the container\}\. |
| `putting-no-space` | There\'s no space on \{the surface\}\. |
| `putting-no-target` | Put what\? |
| `putting-not-container` | \{You\} \{can\'t\} put things in \{the destination\}\. |
| `putting-not-held` | \{You\} \{need\} to be holding \{the item\} first\. |
| `putting-not-surface` | \{You\} \{can\'t\} put things on \{the destination\}\. |
| `putting-put-in` | \{You\} \{put\} \{the item\} in \{the container\}\. |
| `putting-put-on` | \{You\} \{put\} \{the item\} on \{the surface\}\. |

## `quitting` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `quitting-achievements-earned` | \{You\} earned \{count\} achievements during \{your\} play\! |
| `quitting-final-score` | \{Your\} final score was \{finalScore\} out of \{maxScore\}\. |
| `quitting-final-stats` | Final Statistics\: `\n` Score\: \{finalScore\}\/\{maxScore\} `\n` Moves\: \{moves\} `\n` Time played\: \{playTime\} |
| `quitting-quit-and-saved` | Game saved\. `\n`  `\n` Thanks for playing\! `\n`  `\n` Final score\: \{finalScore\} out of \{maxScore\} `\n` Moves\: \{moves\} |
| `quitting-quit-cancelled` | Quit cancelled\. |
| `quitting-quit-confirm-query` | Are \{you\} sure \{you\} want to quit\? |
| `quitting-quit-confirmed` | Thanks for playing\! `\n`  `\n` Final score\: \{finalScore\} out of \{maxScore\} `\n` Moves\: \{moves\} |
| `quitting-quit-save-query` | Would \{you\} like to save before quitting\? |
| `quitting-quit-unsaved-query` | \{You\} \{have\} unsaved progress\. What would \{you\} like to do\? |

## `raising` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `raising-already-up` | That\'s already raised\. |
| `raising-cant-raise-that` | \{You\} \{can\'t\} raise \{the target\}\. |
| `raising-no-target` | Raise what\? |
| `raising-raised` | \{You\} \{raise\} \{the target\}\. |

## `reading` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `reading-cannot-read-now` | \{verbatim\:reason\} |
| `reading-not-readable` | There\'s nothing written on \{the item\}\. |
| `reading-read-book` | \{capitalize the item\} reads\: `\n` \{verbatim\:text\} |
| `reading-read-book-page` | \{capitalize the item\} \(page \{currentPage\} of \{totalPages\}\)\: `\n` \{verbatim\:text\} |
| `reading-read-inscription` | \{capitalize the item\} reads\: `\n` \{verbatim\:text\} |
| `reading-read-sign` | \{capitalize the item\} says\: `\n` \{verbatim\:text\} |
| `reading-read-text` | \{capitalize the item\} reads\: `\n` \{verbatim\:text\} |
| `reading-what-to-read` | What do you want to read\? |

## `removing` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `removing-already-have` | \{You\} already \{have\} \{the item\}\. |
| `removing-attached` | \{capitalize the item\} \{verb\:is item\} fixed to \{the anchor\}\. |
| `removing-cant-reach` | \{You\} \{can\'t\} reach \{the item\}\. |
| `removing-container-closed` | \{capitalize the container\} \{verb\:is container\} closed\. |
| `removing-no-source` | Remove \{the item\} from what\? |
| `removing-no-target` | Remove what\? |
| `removing-not-in-container` | \{capitalize the item\} isn\'t in \{the container\}\. |
| `removing-not-on-surface` | \{capitalize the item\} isn\'t on \{the surface\}\. |
| `removing-removed-from` | \{You\} \{take\} \{the item\} from \{the container\}\. |
| `removing-removed-from-surface` | \{You\} \{take\} \{the item\} from \{the surface\}\. |

## `restarting` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `restarting-game-restarting` | The story restarts\. |
| `restarting-new-game` | A new story begins\. |
| `restarting-restart-confirm` | Are you sure you want to restart\? All unsaved progress will be lost\. |
| `restarting-restart-requested` | Restarting the story\.\.\. |
| `restarting-restart-unsaved` | You have unsaved progress\. Restart anyway\? |
| `restarting-starting-over` | Starting over from the beginning\. |

## `restoring` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `restoring-available-saves` | Available saves\: \{saves\} |
| `restoring-choose-save` | Which save would \{you\} like to restore\? |
| `restoring-confirm-restore` | Restore game from \'\{verbatim\:saveName\}\'\? Current progress will be lost\. |
| `restoring-corrupt-save` | The save file \'\{verbatim\:saveName\}\' appears to be corrupted\. |
| `restoring-game-loaded` | Game loaded from \'\{verbatim\:saveName\}\'\. |
| `restoring-game-restored` | Game restored\. |
| `restoring-import-save` | Import a save file to restore\. |
| `restoring-incompatible-save` | This save file is from a different version and cannot be loaded\. |
| `restoring-no-saves` | No saved games found\. |
| `restoring-no-saves-available` | No saved games available\. |
| `restoring-quick-restore` | Quick restore completed\. |
| `restoring-restore-details` | Restored\: \{verbatim\:saveName\} `\n` Score\: \{score\} `\n` Moves\: \{moves\} |
| `restoring-restore-failed` | Failed to restore game\. |
| `restoring-restore-not-allowed` | \{You\} cannot restore a game at this time\. |
| `restoring-restore-successful` | \{Your\} saved game has been restored successfully\. |
| `restoring-resuming-game` | Resuming \{your\} adventure\.\.\. |
| `restoring-save-imported` | Save file imported successfully\. |
| `restoring-save-not-found` | No save named \'\{verbatim\:saveName\}\' was found\. |
| `restoring-unsaved-progress` | \{You\} \{have\} unsaved progress\. Restore anyway\? |
| `restoring-welcome-back` | Welcome back\! Game restored from \{verbatim\:saveName\}\. |

## `revealing` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `revealing-not-hidden` | \{You\'re\} not hiding\. |
| `revealing-revealed` | \{You\} \{come\} out of hiding\. |

## `saving` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `saving-auto-save` | Auto\-saving game\.\.\. |
| `saving-confirm-overwrite` | A save named \'\{verbatim\:saveName\}\' already exists\. Overwrite it\? |
| `saving-game-saved` | Game saved\. |
| `saving-game-saved-as` | Game saved as \'\{verbatim\:saveName\}\'\. |
| `saving-invalid-save-name` | \'\{verbatim\:saveName\}\' is not a valid save name\. |
| `saving-no-save-slots` | No save slots available\. |
| `saving-overwrite-save` | Previous save \'\{verbatim\:saveName\}\' has been overwritten\. |
| `saving-quick-save` | Quick save completed\. |
| `saving-save-details` | Saved\: \{verbatim\:saveName\} `\n` Score\: \{score\} `\n` Moves\: \{moves\} |
| `saving-save-exported` | Save file exported successfully\. |
| `saving-save-failed` | Failed to save game\. |
| `saving-save-in-progress` | Another save is already in progress\. |
| `saving-save-not-allowed` | \{You\} cannot save the game at this time\. |
| `saving-save-reminder` | Don\'t forget to save \{your\} game regularly\! |
| `saving-save-slot` | Game saved to slot \{verbatim\:saveName\}\. |
| `saving-save-successful` | \{Your\} game has been saved successfully\. |
| `saving-saved-locally` | Game saved to local storage\. |
| `saving-saved-to-cloud` | Game saved to cloud storage\. |

## `saying_goodbye` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `saying-goodbye-not-talking` | \{You\} \{aren\'t\} talking to anyone\. |
| `saying-goodbye-not-talking-to` | \{You\} \{aren\'t\} talking to \{the target\}\. |
| `saying-goodbye-said-goodbye` | \{You\} \{say\} goodbye to \{the target\}\. |

## `saying_no` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `saying-no-nobody-asked` | Nobody asked \{you\} anything\. |

## `saying_sorry` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `saying-sorry-nothing-to-apologize-for` | There is nothing to apologize for\. |

## `saying_yes` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `saying-yes-nobody-asked` | Nobody asked \{you\} anything\. |

## `scoring` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `scoring-no-scoring` | This isn\'t that kind of game\. |
| `scoring-perfect-score` | \{You\} \{have\} achieved a perfect score of \{maxScore\} points\! |
| `scoring-promotion` | \{You\} \{have\} risen to the rank of \{rank\}\. |
| `scoring-score-display` | \{You\} \{have\} scored \{score\} out of a possible \{maxScore\}\. |
| `scoring-score-simple` | \{Your\} score is \{score\} points\. |
| `scoring-score-with-rank` | \{You\} \{have\} scored \{score\} out of \{maxScore\}\, earning \{you\} the rank of \{rank\}\. |

## `searching` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `searching-container-closed` | \{capitalize the target\} \{verb\:is target\} closed\. |
| `searching-container-contents` | In \{the target\} \{you\} \{see\}\: \{items\}\. |
| `searching-empty-container` | \{capitalize the target\} \{verb\:is target\} empty\. |
| `searching-found-concealed-here` | Hidden here\, \{you\} \{discover\}\: \{items\}\. |
| `searching-found-concealed-in-container` | Hidden inside \{the target\}\, \{you\} \{discover\}\: \{items\}\. |
| `searching-found-concealed-on-supporter` | Hidden on \{the target\}\, \{you\} \{discover\}\: \{items\}\. |
| `searching-found-items` | \{You\} \{discover\}\: \{items\}\. |
| `searching-looked-through` | \{You\} \{look\} through \{the target\}\. |
| `searching-looked-through-nothing` | \{You\} \{see\} nothing through \{the target\}\. |
| `searching-not-reachable` | \{You\} \{can\'t\} reach \{the target\} to search it\. |
| `searching-not-visible` | \{You\} \{can\'t\} see \{the target\} to search it\. |
| `searching-nothing-special` | \{You\} \{find\} nothing of interest\. |
| `searching-searched-location` | \{You\} \{search\} around carefully\. |
| `searching-searched-object` | \{You\} \{search\} \{the target\} thoroughly\. |
| `searching-supporter-contents` | On \{the target\} \{you\} \{see\}\: \{items\}\. |

## `setting` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `setting-cant-set-that` | \{capitalize the target\} isn\'t something \{you\} can set\. |
| `setting-no-target` | Set what\? |
| `setting-no-value` | Set \{the target\} to what\? |
| `setting-not-a-setting` | \{capitalize the target\} goes to \{values\}\. |
| `setting-set` | \{You\} \{set\} \{the target\} to \{verbatim\:value\}\. |

## `setting_course` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `setting-course-already-there` | \{capitalize the vehicle\} \{verb\:is vehicle\} already at \{the destination\}\. |
| `setting-course-coordinates-outside-expanse` | \{verbatim\:destination\} lies beyond the edge\. |
| `setting-course-course-set` | \{You\} \{set\} course for \{the destination\}\. |
| `setting-course-course-set-cell` | \{You\} \{set\} course for \{verbatim\:x\}\, \{verbatim\:y\}\. |
| `setting-course-no-destination` | Set course for where\? |
| `setting-course-not-a-destination` | \{capitalize the vehicle\} \{verb\:does vehicle\} not go to \{verbatim\:destination\}\. |
| `setting-course-not-in-vehicle` | \{You\'re\} not aboard anything that takes a course\. |
| `setting-course-vehicle-no-such-command` | \{capitalize the vehicle\} takes no course\. |
| `setting-course-vehicle-under-way` | \{capitalize the vehicle\} \{verb\:is vehicle\} already under way\. |

## `showing` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `showing-no-item` | Show what\? |
| `showing-no-viewer` | Show it to whom\? |
| `showing-not-actor` | \{You\} can only show things to people\. |
| `showing-not-carrying` | \{You\} aren\'t carrying \{the item\}\. |
| `showing-self` | \{You\} \{examine\} \{the item\} closely\. |
| `showing-shown` | \{You\} \{show\} \{the item\} to \{the viewer\}\. |
| `showing-viewer-examines` | \{capitalize the viewer\} examines \{the item\} carefully\. |
| `showing-viewer-impressed` | \{capitalize the viewer\} looks impressed\. |
| `showing-viewer-nods` | \{capitalize the viewer\} nods\. |
| `showing-viewer-not-visible` | \{You\} \{can\'t\} see \{the viewer\}\. |
| `showing-viewer-recognizes` | \{capitalize the viewer\} recognizes \{the item\}\! |
| `showing-viewer-too-far` | \{capitalize the viewer\} \{verb\:is viewer\} too far away to see clearly\. |
| `showing-viewer-unimpressed` | \{capitalize the viewer\} seems unimpressed\. |
| `showing-wearing-shown` | \{You\} \{show\} \{the viewer\} that \{you\'re\} wearing \{the item\}\. |

## `sleeping` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `sleeping-already-well-rested` | \{You\'re\} already well\-rested and don\'t feel tired\. |
| `sleeping-brief-nap` | \{You\} \{take\} a brief nap\. |
| `sleeping-cant-sleep-here` | \{You\} \{can\'t\} sleep in \{location\}\. |
| `sleeping-deep-sleep` | \{You\} \{fall\} into a deep\, restful sleep\. |
| `sleeping-disturbed-sleep` | \{Your\} sleep is disturbed\. |
| `sleeping-dozed-off` | \{You\} \{doze\} off for a bit\. |
| `sleeping-fell-asleep` | \{You\} \{fall\} into a deep sleep\. |
| `sleeping-nightmares` | \{You\} \{have\} unsettling dreams\. |
| `sleeping-not-tired` | \{You\} aren\'t tired\. |
| `sleeping-peaceful-sleep` | \{You\} \{enjoy\} a peaceful sleep\. |
| `sleeping-slept` | \{You\} \{sleep\} for a while\. |
| `sleeping-slept-fitfully` | \{You\} \{sleep\} fitfully\. |
| `sleeping-too-dangerous-to-sleep` | It\'s too dangerous to sleep in \{location\}\. |
| `sleeping-woke-refreshed` | \{You\} \{wake\} feeling refreshed\. |

## `smelling` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `smelling-burning-scent` | \{capitalize the target\} gives off a smoky smell\. |
| `smelling-container-food-scent` | \{You\} \{smell\} food inside \{the target\}\. |
| `smelling-declared-scent` | \{capitalize the target\} \{verb\:has target\} a distinct smell\. |
| `smelling-drink-scent` | \{capitalize the target\} \{verb\:has target\} a pleasant aroma\. |
| `smelling-food-nearby` | \{You\} \{smell\} food nearby\. |
| `smelling-food-scent` | \{capitalize the target\} smells delicious\. |
| `smelling-fresh-scent` | \{capitalize the target\} smells fresh and clean\. |
| `smelling-musty-scent` | \{capitalize the target\} smells a bit musty\. |
| `smelling-no-particular-scent` | \{capitalize the target\} \{verb\:has target\} no particular smell\. |
| `smelling-no-scent` | \{You\} \{don\'t\} smell anything unusual\. |
| `smelling-not-visible` | \{You\} \{can\'t\} see \{the target\} to smell it\. |
| `smelling-room-scents` | The air carries various scents\. |
| `smelling-scents-nearby` | \{You\} \{smell\} \{sources\}\. |
| `smelling-smelled` | \{You\} \{smell\} \{the target\}\. |
| `smelling-smelled-environment` | \{You\} \{sniff\} the air\. |
| `smelling-smoke-detected` | \{You\} \{detect\} a faint smell of smoke\. |
| `smelling-too-far` | \{capitalize the target\} \{verb\:is target\} too far away to smell\. |

## `steering` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `steering-ahead` | \{capitalize the vehicle\} gathers way on \{verbatim\:bearing\} degrees\. |
| `steering-came-about` | \{You\} \{come\} about\, and \{the vehicle\} settles on \{verbatim\:bearing\} degrees\. |
| `steering-cannot-steer` | \{You\} \{can\'t\} steer \{the vehicle\} that way\. |
| `steering-hove-to` | \{You\} \{heave\} to\, and \{the vehicle\} loses way\. |
| `steering-naval-cannot-come-about` | \{capitalize the vehicle\} \{verb\:lies vehicle\} dead to the wind\, with no other side to come about to\. |
| `steering-naval-how-far` | How many degrees\? |
| `steering-naval-no-wind` | There is no wind to come about through\. |
| `steering-not-in-vehicle` | \{You\'re\} not aboard anything \{you\} can steer\. |
| `steering-not-under-way` | \{capitalize the vehicle\} \{verb\:is vehicle\} not under way\. |
| `steering-sail-made` | \{You\} \{make\} sail\. |
| `steering-sail-shortened` | \{You\} \{shorten\} sail\. |
| `steering-sails-already-furled` | The sails are already furled\. |
| `steering-sails-at-full` | All sail is set\. |
| `steering-sails-furled` | \{You\} \{furl\} the sails\. |
| `steering-steered` | \{You\} \{steer\} \{the vehicle\} \{direction\:direction\}\. |
| `steering-turned` | \{You\} \{bring\} \{the vehicle\} to \{verbatim\:side\}\, to \{verbatim\:bearing\} degrees\. |
| `steering-vehicle-no-such-command` | \{You\} \{can\'t\} steer \{the vehicle\}\. |

## `switching_off` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `switching-off-already-off` | \{capitalize the target\} \{verb\:is target\} already off\. |
| `switching-off-device-stops` | \{capitalize the target\} powers down with a soft whir\. |
| `switching-off-door-closes` | \{capitalize the target\} switches off and closes\. |
| `switching-off-light-off` | \{You\} \{switch\} off \{the target\}\, plunging the area into darkness\. |
| `switching-off-light-off-still-lit` | \{You\} \{switch\} off \{the target\}\. |
| `switching-off-no-target` | Switch off what\? |
| `switching-off-not-reachable` | \{You\} \{can\'t\} reach \{the target\}\. |
| `switching-off-not-switchable` | \{capitalize the target\} isn\'t something \{you\} can switch off\. |
| `switching-off-not-visible` | \{You\} \{can\'t\} see \{the target\}\. |
| `switching-off-silence-falls` | \{You\} \{switch\} off \{the target\}\. Silence falls\. |
| `switching-off-switched-off` | \{You\} \{switch\} off \{the target\}\. |
| `switching-off-was-temporary` | \{capitalize the target\} switches off \(it had \{remainingTime\} seconds left\)\. |
| `switching-off-with-sound` | \{You\} \{switch\} off \{the target\}\. \{sound\} |

## `switching_on` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `switching-on-already-on` | \{capitalize the target\} \{verb\:is target\} already on\. |
| `switching-on-device-humming` | \{capitalize the target\} hums to life\. |
| `switching-on-door-opens` | \{capitalize the target\} switches on and opens\. |
| `switching-on-illuminates-darkness` | \{capitalize the target\} switches on\, banishing the darkness\. |
| `switching-on-light-on` | \{You\} \{switch\} on \{the target\}\. |
| `switching-on-no-power` | \{capitalize the target\} \{verb\:has target\} no power source\. |
| `switching-on-no-target` | Switch on what\? |
| `switching-on-not-reachable` | \{You\} \{can\'t\} reach \{the target\}\. |
| `switching-on-not-switchable` | \{capitalize the target\} isn\'t something \{you\} can switch on\. |
| `switching-on-not-visible` | \{You\} \{can\'t\} see \{the target\}\. |
| `switching-on-switched-on` | \{You\} \{switch\} on \{the target\}\. |
| `switching-on-temporary-activation` | \{capitalize the target\} switches on temporarily\. |
| `switching-on-with-sound` | \{You\} \{switch\} on \{the target\}\. \{sound\} |

## `taking` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `taking-already-have` | \{You\} already \{have\} \{the item\}\. |
| `taking-attached` | \{capitalize the item\} \{verb\:is item\} fixed to \{the anchor\}\. |
| `taking-cannot-take` | \{You\} \{can\'t\} take \{the item\}\. |
| `taking-cant-take-room` | \{You\} \{can\'t\} take \{the item\}\. |
| `taking-cant-take-self` | \{You\} \{can\'t\} take \{yourself\}\. |
| `taking-container-full` | \{You\'re\} carrying too much already\. |
| `taking-fixed-in-place` | \{capitalize the item\} \{verb\:is item\} fixed in place\. |
| `taking-no-target` | Take what\? |
| `taking-nothing-to-take` | \{You\} \{take\} in everything \{you\} \{see\} and \{enjoy\} the moment\. |
| `taking-retrieved` | \{You\} \{haul\} \{the item\} aboard\. |
| `taking-taken` | Taken\. |
| `taking-taken-from` | \{You\} \{take\} \{the item\} from \{the container\}\. |
| `taking-taken-multi` | \{item\}\: Taken\. |
| `taking-too-heavy` | \{Your\} load is too heavy\. \{You\} will have to leave something behind\. |

## `taking_off` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `taking-off-cant-remove` | \{You\} \{can\'t\} take off \{the item\}\. |
| `taking-off-no-target` | Take off what\? |
| `taking-off-not-wearing` | \{You\} aren\'t wearing \{the item\}\. |
| `taking-off-prevents-removal` | \{You\}\'ll need to take off \{the blocking\} first\. |
| `taking-off-removed` | \{You\} \{take\} off \{the item\}\. |

## `talking` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `talking-acknowledges` | \{capitalize the target\} acknowledges \{you\}\. |
| `talking-casual-greeting` | \{capitalize the target\} \{verb\:says target\}\, \"Hey\!\" |
| `talking-first-meeting` | \{You\} \{introduce\} \{yourself\} to \{the target\}\. |
| `talking-formal-greeting` | \{capitalize the target\} \{verb\:says target\}\, \"Good day to you\.\" |
| `talking-friendly-greeting` | \{capitalize the target\} smiles in recognition\. |
| `talking-greets-again` | \{capitalize the target\} \{verb\:says target\}\, \"Hello again\.\" |
| `talking-greets-back` | \{capitalize the target\} \{verb\:says target\}\, \"Hello there\!\" |
| `talking-has-topics` | \{capitalize the target\} seems willing to discuss various topics\. |
| `talking-no-response` | \{capitalize the target\} doesn\'t respond\. |
| `talking-no-target` | Talk to whom\? |
| `talking-not-actor` | \{You\} can only talk to people\. |
| `talking-not-available` | \{capitalize the target\} doesn\'t want to talk right now\. |
| `talking-not-visible` | \{You\} \{can\'t\} see \{the target\}\. |
| `talking-nothing-to-say` | \{capitalize the target\} \{verb\:has target\} nothing particular to say\. |
| `talking-remembers-you` | \{capitalize the target\} \{verb\:says target\}\, \"Ah\, it\'s you again\.\" |
| `talking-self` | Talking to \{yourself\} is a sign of madness\. |
| `talking-talked` | \{You\} \{greet\} \{the target\}\. |
| `talking-too-far` | \{capitalize the target\} \{verb\:is target\} too far away for conversation\. |

## `telling` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `telling-already-knew` | \{capitalize the target\} \{verb\:says target\}\, \"Yes\, I\'m aware of that\.\" |
| `telling-bored` | \{capitalize the target\} looks bored\. |
| `telling-dismissive` | \{capitalize the target\} \{verb\:says target\}\, \"So what\?\" |
| `telling-grateful` | \{capitalize the target\} \{verb\:says target\}\, \"Thank you for telling me\!\" |
| `telling-ignores` | \{capitalize the target\} ignores what \{you\'re\} saying\. |
| `telling-informed` | \{You\} \{inform\} \{the target\} about \{verbatim\:topic\}\. |
| `telling-interested` | \{capitalize the target\} listens with interest\. |
| `telling-no-target` | Tell whom\? |
| `telling-no-topic` | Tell them about what\? |
| `telling-not-actor` | \{You\} can only tell things to people\. |
| `telling-not-interested` | \{capitalize the target\} doesn\'t seem interested\. |
| `telling-not-visible` | \{You\} \{can\'t\} see \{the target\}\. |
| `telling-told` | \{You\} \{tell\} \{the target\} about \{verbatim\:topic\}\. |
| `telling-too-far` | \{capitalize the target\} \{verb\:is target\} too far away\. |
| `telling-very-interested` | \{capitalize the target\} \{verb\:says target\}\, \"Really\? Tell me more\!\" |

## `throwing` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `throwing-bounces-off` | \{capitalize the item\} bounces off \{the target\}\. |
| `throwing-breaks-against` | \{capitalize the item\} smashes against \{the target\}\! |
| `throwing-breaks-on-impact` | \{capitalize the item\} shatters on impact\! |
| `throwing-cant-throw-that-way` | \{You\} \{can\'t\} throw \{the item\} that way\. |
| `throwing-fragile-breaks` | The fragile \{item\} breaks into pieces\. |
| `throwing-hits-target` | \{You\} \{throw\} \{the item\} at \{the target\}\. It hits\! |
| `throwing-lands-in` | \{capitalize the item\} lands in \{the target\}\. |
| `throwing-lands-on` | \{capitalize the item\} lands on \{the target\}\. |
| `throwing-lost-overboard` | \{capitalize the item\} drifts away\. |
| `throwing-misses-target` | \{You\} \{throw\} \{the item\} at \{the target\}\, but miss\. |
| `throwing-no-exit` | There\'s no exit \{direction\:direction\}\. |
| `throwing-no-item` | Throw what\? |
| `throwing-not-holding` | \{You\} aren\'t holding \{the item\}\. |
| `throwing-sails-through` | \{capitalize the item\} sails through the exit to the \{direction\:direction\}\. |
| `throwing-self` | \{You\} \{can\'t\} throw things at \{yourself\}\. |
| `throwing-target-angry` | \{capitalize the target\} doesn\'t appreciate being hit with \{the item\}\. |
| `throwing-target-catches` | \{capitalize the target\} catches \{the item\}\! |
| `throwing-target-ducks` | \{capitalize the target\} ducks out of the way\. |
| `throwing-target-not-here` | \{capitalize the target\} isn\'t here\. |
| `throwing-target-not-visible` | \{You\} \{can\'t\} see \{the target\}\. |
| `throwing-thrown` | \{You\} \{throw\} \{the item\}\. |
| `throwing-thrown-afloat` | \{capitalize the item\} \{verb\:floats item\} where \{verb\:it item\} \{verb\:falls item\}\. |
| `throwing-thrown-at` | \{You\} \{throw\} \{the item\} at \{the target\}\. |
| `throwing-thrown-direction` | \{You\} \{throw\} \{the item\} \{direction\:direction\}\. |
| `throwing-thrown-down` | \{You\} \{toss\} \{the item\} to the ground\. |
| `throwing-too-heavy` | \{capitalize the item\} \{verb\:is item\} too heavy to throw far \(weighs \{weight\}kg\)\. |

## `touching` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `touching-device-vibrating` | \{capitalize the target\} \{verb\:is target\} vibrating slightly\. |
| `touching-feels-hard` | \{capitalize the target\} feels hard and solid\. |
| `touching-feels-hot` | \{capitalize the target\} \{verb\:is target\} hot\! \{You\} \{pull\} \{your\} hand back quickly\. |
| `touching-feels-normal` | \{capitalize the target\} feels as \{you\}\'d expect\. |
| `touching-feels-smooth` | \{capitalize the target\} feels smooth\. |
| `touching-feels-soft` | \{capitalize the target\} feels soft\. |
| `touching-feels-warm` | \{capitalize the target\} feels warm to the touch\. |
| `touching-feels-wet` | \{capitalize the target\} feels damp\. |
| `touching-immovable-object` | \{capitalize the target\} \{verb\:is target\} solid and immovable\. |
| `touching-liquid-container` | \{You\} \{feel\} liquid sloshing inside \{the target\}\. |
| `touching-no-target` | Touch what\? |
| `touching-not-reachable` | \{You\} \{can\'t\} reach \{the target\}\. |
| `touching-not-visible` | \{You\} \{can\'t\} see \{the target\} to touch it\. |
| `touching-patted` | \{You\} \{pat\} \{the target\}\. |
| `touching-poked` | \{You\} \{poke\} \{the target\}\. |
| `touching-prodded` | \{You\} \{prod\} \{the target\}\. |
| `touching-stroked` | \{You\} \{stroke\} \{the target\}\. |
| `touching-touched` | \{You\} \{touch\} \{the target\}\. |
| `touching-touched-gently` | \{You\} gently \{touch\} \{the target\}\. |

## `turning` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `turning-cant-turn-that` | \{capitalize the target\} isn\'t something \{you\} can turn\. |
| `turning-crank-turned` | \{You\} \{crank\} \{the target\}\. |
| `turning-dial-adjusted` | \{You\} \{adjust\} \{the target\} \{verbatim\:direction\}\. |
| `turning-dial-set` | \{You\} \{turn\} \{the target\} to \{setting\}\. |
| `turning-dial-turned` | \{You\} \{turn\} \{the target\}\. |
| `turning-flow-changes` | \{You\} \{turn\} \{the target\}\, adjusting the flow\. |
| `turning-key-needs-lock` | \{You\} \{need\} to put \{the target\} in a lock first\. |
| `turning-key-turned` | \{You\} \{turn\} \{the target\} in the lock\. |
| `turning-knob-clicks` | \{You\} \{turn\} \{the target\} with a click\. |
| `turning-knob-toggled` | \{You\} \{turn\} \{the target\}\, switching it \{newState\}\. |
| `turning-knob-turned` | \{You\} \{turn\} \{the target\}\. |
| `turning-mechanism-activated` | As \{you\} \{turn\} \{the target\}\, \{you\} \{hear\} machinery activate\! |
| `turning-mechanism-grinds` | \{You\} \{turn\} \{the target\}\. Gears grind and machinery moves\. |
| `turning-no-target` | Turn what\? |
| `turning-not-reachable` | \{You\} \{can\'t\} reach \{the target\}\. |
| `turning-not-visible` | \{You\} \{can\'t\} see \{the target\}\. |
| `turning-nothing-happens` | \{You\} \{turn\} \{the target\}\, but nothing happens\. |
| `turning-requires-more-turns` | \{You\} \{turn\} \{the target\}\. It seems to need more turning\. |
| `turning-rotated` | \{You\} \{rotate\} \{the target\}\. |
| `turning-spun` | \{You\} \{spin\} \{the target\}\. |
| `turning-turned` | \{You\} \{turn\} \{the target\}\. |
| `turning-valve-closed` | \{You\} \{turn\} \{the target\}\, closing the valve\. |
| `turning-valve-opened` | \{You\} \{turn\} \{the target\}\, opening the valve\. |
| `turning-wearing-it` | \{You\} \{can\'t\} turn \{the target\} while wearing it\. |
| `turning-wheel-turned` | \{You\} \{turn\} \{the target\}\. |

## `tying` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `tying-no-anchor` | What do \{you\} want to tie \{the item\} to\? |
| `tying-no-target` | Tie what\? |
| `tying-not-to-people` | \{You\} can\'t tie things to people\. |
| `tying-self` | \{You\} can\'t tie \{the item\} to itself\. |
| `tying-tied` | \{You\} \{tie\} \{the item\} to \{the anchor\}\. |

## `undoing` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `undoing-nothing-to-undo` | Nothing to undo\. |
| `undoing-undo-failed` | Undo failed\. |
| `undoing-undo-success` | Previous turn undone\. |
| `undoing-undo-to-turn` | Undone\. \(Now at turn \{turn\}\) |

## `unlocking` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `unlocking-already-unlocked` | \{capitalize the item\} \{verb\:is item\} already unlocked\. |
| `unlocking-cant-reach` | \{You\} \{can\'t\} reach \{the item\}\. |
| `unlocking-key-not-held` | \{You\} \{need\} to be holding \{the key\}\. |
| `unlocking-no-key` | What do \{you\} want to unlock it with\? |
| `unlocking-no-target` | Unlock what\? |
| `unlocking-not-lockable` | \{capitalize the item\} can\'t be unlocked\. |
| `unlocking-still-locked` | \{capitalize the item\} \{verb\:is item\} locked\. |
| `unlocking-unlocked` | \{You\} \{unlock\} \{the item\}\. |
| `unlocking-unlocked-and-opened` | \{You\} \{unlock\} \{the item\}\, and it swings open\. |
| `unlocking-unlocked-with` | \{You\} \{unlock\} \{the item\} with \{the key\}\. |
| `unlocking-unlocked-with-and-opened` | \{You\} \{unlock\} \{the item\} with \{the key\}\, and it swings open\. |
| `unlocking-wrong-key` | \{capitalize the key\} doesn\'t fit \{the item\}\. |

## `untying` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `untying-no-target` | Untie what\? |
| `untying-not-tied` | \{capitalize the item\} \{verb\:isn\'t item\} tied to anything\. |
| `untying-untied` | \{You\} \{untie\} \{the item\}\. |

## `version` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `version-version-compact` | \{verbatim\:storyTitle\} v\{verbatim\:storyVersion\} \(Sharpee v\{verbatim\:engineVersion\}\) |
| `version-version-full` | \{verbatim\:storyTitle\} v\{verbatim\:storyVersion\} `\n` Sharpee Engine v\{verbatim\:engineVersion\} `\n` Built\: \{buildDate\} |
| `version-version-no-date` | \{verbatim\:storyTitle\} v\{verbatim\:storyVersion\} `\n` Sharpee Engine v\{verbatim\:engineVersion\} |

## `waiting` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `waiting-grows-restless` | \{You\} \{grow\} restless from waiting\. |
| `waiting-nothing-happens` | \{You\} \{wait\}\. Nothing happens\. |
| `waiting-patience-rewarded` | \{Your\} patience is rewarded\. |
| `waiting-something-approaches` | As \{you\} \{wait\}\, \{you\} \{hear\} something approaching\. |
| `waiting-time-passes` | Time passes\.\.\. |
| `waiting-time-runs-out` | \{You\}\'ve waited too long\! |
| `waiting-waited` | Time passes\. |
| `waiting-waited-anxiously` | \{You\} \{wait\} anxiously\. |
| `waiting-waited-briefly` | \{You\} \{wait\} for a moment\. |
| `waiting-waited-for-event` | \{You\} \{wait\} for something to happen\. |
| `waiting-waited-in-vehicle` | \{You\} \{wait\} in \{the vehicle\}\. |
| `waiting-waited-patiently` | \{You\} \{wait\} patiently\. |

## `waking` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `waking-already-awake` | \{You\'re\} already awake\. |

## `waving` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `waving-not-held` | \{You\} \{aren\'t\} holding \{the target\}\. |
| `waving-waved` | \{You\} \{wave\} \{the target\} about\. Nothing happens\. |
| `waving-waved-hands` | \{You\} \{wave\}\. Nobody waves back\. |

## `wearing` {.unnumbered .unlisted}

| Alias | Default text |
| --- | --- |
| `wearing-already-wearing` | \{You\'re\} already wearing \{the item\}\. |
| `wearing-already-wearing-there` | \{You\'re\} already wearing \{the item\} on \{your\} \{bare part\}\. |
| `wearing-cant-wear-that` | \{You\} \{can\'t\} wear \{the item\}\. |
| `wearing-hands-full` | \{You\} \{need\} to have \{your\} hands free to put that on\. |
| `wearing-no-target` | Wear what\? |
| `wearing-not-held` | \{You\} \{need\} to be holding \{the item\} first\. |
| `wearing-not-wearable` | \{You\} \{can\'t\} wear \{the item\}\. |
| `wearing-worn` | \{You\} \{put\} on \{the item\}\. |
| `wearing-worn-under` | \{You\} would have to take off \{the item\} first\. |
