/**
 * @file English Message Templates
 * @description Message templates for actions and events in English
 */

/**
 * English message templates
 */
export const englishTemplates = {
  /**
   * Action message templates
   * Format: "action.phase.key" -> template
   */
  actions: {
    // Taking action
    'taking.check.already_have': 'You already have {item}.',
    'taking.check.not_here': "You don't see {item} here.",
    'taking.check.cannot_take': "You can't take {item}.",
    'taking.check.too_heavy': '{item:cap} is too heavy to pick up.',
    'taking.perform.success': 'Taken.',
    'taking.report.success': 'You take {item}.',
    
    // Dropping action
    'dropping.check.not_holding': "You aren't holding {item}.",
    'dropping.perform.success': 'Dropped.',
    'dropping.report.success': 'You drop {item}.',
    
    // Opening action
    'opening.check.already_open': '{item:cap} is already open.',
    'opening.check.not_openable': "You can't open {item}.",
    'opening.check.locked': '{item:cap} is locked.',
    'opening.perform.success': 'Opened.',
    'opening.report.success': 'You open {item}.',
    'opening.report.reveal': 'Opening {container} reveals {contents}.',
    
    // Closing action
    'closing.check.already_closed': '{item:cap} is already closed.',
    'closing.check.not_closable': "You can't close {item}.",
    'closing.perform.success': 'Closed.',
    'closing.report.success': 'You close {item}.',
    
    // Examining action
    'examining.check.not_visible': "You can't see {item} here.",
    'examining.report.basic': '{description}',
    'examining.report.container_open': '{description} {item:cap} is open.',
    'examining.report.container_closed': '{description} {item:cap} is closed.',
    'examining.report.container_empty': '{item:cap} is empty.',
    'examining.report.container_contents': '{item:cap} contains {contents}.',
    'examining.report.supporter_contents': 'On {item} you see {contents}.',
    
    // Reading action
    'reading.check.what_to_read': 'What do you want to read?',
    'reading.check.not_readable': "There's nothing written on {item}.",
    'reading.check.cannot_read_now': '{reason}',
    'reading.perform.read_text': '{text}',
    'reading.perform.read_book': 'The book reads:\n{text}',
    'reading.perform.read_book_page': 'Page {currentPage} of {totalPages}:\n{text}',
    'reading.perform.read_sign': 'The sign says:\n{text}',
    'reading.perform.read_inscription': 'The inscription reads:\n{text}',
    
    // Looking action
    'looking.report.room_name': '{name}',
    'looking.report.room_description': '{description}',
    'looking.report.exits': 'Exits: {exits}.',
    'looking.report.contents': 'You can see {items} here.',
    'looking.report.also_here': 'You can also see {items} here.',
    
    // Going action
    'going.check.no_exit': "You can't go that way.",
    'going.check.door_closed': 'The {door} is closed.',
    'going.check.door_locked': 'The {door} is locked.',
    'going.perform.success': 'You go {direction}.',
    'going.report.enter_room': '{description}',
    
    // Inventory action
    'inventory.empty': "You aren't carrying anything.",
    'inventory.list': 'You are carrying:',
    'inventory.wearing': 'You are wearing:',
    
    // Locking/Unlocking
    'locking.check.not_lockable': "You can't lock {item}.",
    'locking.check.already_locked': '{item:cap} is already locked.',
    'locking.check.need_key': 'You need a key to lock {item}.',
    'locking.check.wrong_key': "{key:cap} doesn't fit the lock.",
    'locking.perform.success': 'Locked.',
    'locking.report.success': 'You lock {item} with {key}.',
    
    'unlocking.check.not_lockable': "You can't unlock {item}.",
    'unlocking.check.already_unlocked': '{item:cap} is already unlocked.',
    'unlocking.check.need_key': 'You need a key to unlock {item}.',
    'unlocking.check.wrong_key': "{key:cap} doesn't fit the lock.",
    'unlocking.perform.success': 'Unlocked.',
    'unlocking.report.success': 'You unlock {item} with {key}.',
    
    // Switching on/off
    'switching_on.check.already_on': '{item:cap} is already on.',
    'switching_on.check.not_switchable': "You can't switch {item} on.",
    'switching_on.perform.success': 'Switched on.',
    'switching_on.report.success': 'You switch {item} on.',
    
    'switching_off.check.already_off': '{item:cap} is already off.',
    'switching_off.check.not_switchable': "You can't switch {item} off.",
    'switching_off.perform.success': 'Switched off.',
    'switching_off.report.success': 'You switch {item} off.',
    
    // Putting action
    'putting.check.not_holding': "You aren't holding {item}.",
    'putting.check.cannot_put': "You can't put {item} {preposition} {target}.",
    'putting.check.put_self': "You can't put something inside itself.",
    'putting.check.already_there': '{item:cap} is already {preposition} {target}.',
    'putting.perform.success': 'Done.',
    'putting.report.success': 'You put {item} {preposition} {target}.',
    
    // Giving action
    'giving.check.not_holding': "You aren't holding {item}.",
    'giving.check.not_person': "You can only give things to people.",
    'giving.check.self': "You already have {item}.",
    'giving.perform.success': 'Given.',
    'giving.report.success': 'You give {item} to {recipient}.',
    'giving.report.npc_accepts': '{recipient:cap} accepts {item}.',
    'giving.report.npc_refuses': '{recipient:cap} politely refuses.',
    
    // Inserting action (specifically for containers)
    'inserting.check.no_item': 'What do you want to insert?',
    'inserting.check.no_container': 'What do you want to insert it into?',
    'inserting.check.not_holding': "You aren't holding {item}.",
    'inserting.check.container_not_visible': "You don't see {container} here.",
    'inserting.check.container_not_reachable': "You can't reach {container}.",
    'inserting.check.insert_self': "You can't put something inside itself.",
    'inserting.check.circular_containment': "That would create an impossible loop!",
    'inserting.check.already_inside': '{item:cap} is already in {container}.',
    'inserting.perform.success': 'Inserted.',
    'inserting.report.success': 'You insert {item} into {container}.',
    
    // Showing action
    'showing.check.no_item': 'What do you want to show?',
    'showing.check.no_viewer': 'Who do you want to show it to?',
    'showing.check.not_carrying': "You don't have {item}.",
    'showing.check.viewer_not_visible': "You don't see {viewer} here.",
    'showing.check.viewer_too_far': "{viewer:cap} is too far away to see it clearly.",
    'showing.check.not_actor': "{viewer:cap} can't see things.",
    'showing.check.self': "You can already see {item}.",
    'showing.perform.success': 'Shown.',
    'showing.report.success': 'You show {item} to {viewer}.',
    'showing.report.reaction_interest': '{viewer:cap} looks at {item} with interest.',
    'showing.report.reaction_recognition': "{viewer:cap} says, 'Ah yes, I recognize that.'",
    'showing.report.reaction_disinterest': '{viewer:cap} glances at {item} briefly.',
    
    // Throwing action
    'throwing.check.no_item': 'What do you want to throw?',
    'throwing.check.not_holding': "You aren't holding {item}.",
    'throwing.check.target_not_visible': "You don't see {target} here.",
    'throwing.check.target_not_here': "{target:cap} isn't here.",
    'throwing.check.no_exit': "You can't throw things {direction} from here.",
    'throwing.check.too_heavy': '{item:cap} is too heavy to throw that far.',
    'throwing.check.self': "You can't throw things at yourself.",
    'throwing.perform.at_target': 'You throw {item} at {target}.',
    'throwing.perform.direction': 'You throw {item} {direction}.',
    'throwing.perform.general': 'You toss {item} away.',
    'throwing.report.hit': '{item:cap} hits {target}!',
    'throwing.report.miss': '{item:cap} misses {target} and falls to the ground.',
    'throwing.report.breaks': '{item:cap} shatters into pieces!',
    'throwing.report.lands_on': '{item:cap} lands on {target}.',
    'throwing.report.lands_in': '{item:cap} lands in {target}.',
    'throwing.report.disappears': '{item:cap} flies {direction} and disappears.',
    
    // Talking action
    'talking.check.not_person': "You can't talk to {target}.",
    'talking.check.no_response': '{target:cap} has nothing to say right now.',
    'talking.report.greeting': '{target:cap} says "Hello."',
    
    // Eating/Drinking
    'eating.check.not_edible': "You can't eat {item}.",
    'eating.check.not_holding': 'You need to be holding {item} first.',
    'eating.perform.success': 'Eaten.',
    'eating.report.success': 'You eat {item}. Not bad.',
    
    'drinking.check.not_drinkable': "You can't drink {item}.",
    'drinking.check.not_holding': 'You need to be holding {item} first.',
    'drinking.perform.success': 'Drunk.',
    'drinking.report.success': 'You drink {item}. Refreshing.',
    
    // Wearing/Removing
    'wearing.check.not_wearable': "You can't wear {item}.",
    'wearing.check.not_holding': 'You need to be holding {item} first.',
    'wearing.check.already_wearing': 'You are already wearing {item}.',
    'wearing.perform.success': 'Worn.',
    'wearing.report.success': 'You put on {item}.',
    
    'taking_off.check.not_wearing': "You aren't wearing {item}.",
    'taking_off.perform.success': 'Removed.',
    'taking_off.report.success': 'You take off {item}.',
    
    // Meta actions
    'waiting.perform.success': 'Time passes.',
    'waiting.report.success': 'You wait for a moment.',
    'waiting.report.impatient': 'Time passes slowly.',
    
    'scoring.report.basic': 'Your score is {score} of a possible {maxScore}, in {moves} turn{moves|s}.',
    'scoring.report.rank': 'Your score is {score} of a possible {maxScore}, in {moves} turn{moves|s}.\nThis gives you a rank of {rank}.',
    'scoring.report.percentage': 'Your score is {score} of a possible {maxScore} ({percentage}%), in {moves} turn{moves|s}.',
    'scoring.report.no_max': 'Your score is {score} point{score|s} in {moves} turn{moves|s}.',
    
    'help.header': 'Available Commands',
    'help.basic_commands': 'Basic commands: LOOK, INVENTORY, TAKE, DROP, EXAMINE, GO [direction]',
    'help.movement': 'Movement: GO NORTH/SOUTH/EAST/WEST or just N/S/E/W',
    'help.objects': 'Objects: TAKE [object], DROP [object], EXAMINE [object], OPEN [object]',
    'help.special_commands': 'Special: SAVE, RESTORE, SCORE, QUIT, ABOUT',
    'help.footer': 'For more detailed help on a specific topic, type HELP [topic].',
    'help.topic_not_found': "I don't have help on that topic.",
    
    'about.title': '{title}',
    'about.byline': 'by {author}',
    'about.version': 'Version {version}',
    'about.copyright': '© {copyright}',
    'about.description': '{description}',
    'about.credits': 'Credits: {credits}',
    'about.engine': 'Running on {engine} {engineVersion}',
    'about.play_time': 'You have been playing for {playTime} minutes.',
    
    // Entering/Exiting actions
    'entering.check.no_target': 'What do you want to enter?',
    'entering.check.not_visible': "You don't see {target} here.",
    'entering.check.not_reachable': "You can't reach {target}.",
    'entering.check.already_inside': 'You are already {preposition} {target}.',
    'entering.check.not_enterable': "You can't enter {target}.",
    'entering.check.entry_blocked': "You can't enter {target} right now.",
    'entering.check.full': '{target:cap} is full.',
    'entering.check.container_closed': '{target:cap} is closed.',
    'entering.perform.success': 'You get {preposition} {target}.',
    'entering.report.success': 'You are now {preposition} {target}.',
    'entering.report.with_posture': 'You are now {posture} {preposition} {target}.',
    
    'exiting.check.no_location': "You don't seem to be anywhere.",
    'exiting.check.already_outside': "You aren't inside anything.",
    'exiting.check.no_exit_destination': "There's nowhere to go from here.",
    'exiting.check.container_closed': "You can't get out. {container:cap} is closed.",
    'exiting.check.exit_blocked': "You can't exit right now.",
    'exiting.perform.success': 'You get {preposition} {container}.',
    'exiting.report.success': 'You are now outside.',
    
    'climbing.check.no_target': 'What do you want to climb?',
    'climbing.check.invalid_direction': "You can only climb up or down.",
    'climbing.check.not_in_room': "You can't climb from here.",
    'climbing.check.no_exit': "You can't climb {direction} from here.",
    'climbing.check.not_visible': "You don't see {target} here.",
    'climbing.check.not_reachable': "You can't reach {target}.",
    'climbing.check.not_climbable': "You can't climb {target}.",
    'climbing.perform.directional': 'You climb {direction}.',
    'climbing.perform.onto': 'You climb onto {target}.',
    'climbing.perform.up': 'You climb {target}.',
    'climbing.report.success': 'You have climbed {target}.',
    
    // Searching action
    'searching.check.not_visible': "You don't see {target} here.",
    'searching.check.not_reachable': "You can't reach {target}.",
    'searching.check.container_closed': 'You need to open {target} first.',
    'searching.perform.location': 'You search around.',
    'searching.perform.target': 'You search {target}.',
    'searching.report.nothing_found': 'You find nothing of interest.',
    'searching.report.found_items': 'You find {items}.',
    'searching.report.found_concealed': 'Your search reveals {items}!',
    'searching.report.container_empty': '{target:cap} is empty.',
    'searching.report.container_contents': 'In {target} you see {items}.',
    
    // Listening action
    'listening.check.not_visible': "You don't see {target} here.",
    'listening.perform.general': 'You listen carefully.',
    'listening.perform.target': 'You listen to {target}.',
    'listening.report.silence': "You don't hear anything unusual.",
    'listening.report.device_humming': '{target:cap} is humming quietly.',
    'listening.report.device_buzzing': '{target:cap} is making a buzzing sound.',
    'listening.report.contents_shifting': 'You hear something shifting inside {target}.',
    'listening.report.ambient_sounds': 'You hear {sounds}.',
    
    // Smelling action
    'smelling.check.not_visible': "You don't see {target} here.",
    'smelling.check.too_far': '{target:cap} is too far away to smell.',
    'smelling.perform.general': 'You sniff the air.',
    'smelling.perform.target': 'You smell {target}.',
    'smelling.report.no_scent': "You don't smell anything unusual.",
    'smelling.report.edible_fresh': '{target:cap} smells fresh and appetizing.',
    'smelling.report.edible_stale': '{target:cap} has a stale odor.',
    'smelling.report.burning': '{target:cap} has a burnt smell.',
    'smelling.report.container_scents': 'From {target} you smell {scents}.',
    'smelling.report.ambient_scents': 'You detect {scents} in the air.',
    
    // Touching action
    'touching.check.no_target': 'What do you want to touch?',
    'touching.check.not_visible': "You don't see {target} here.",
    'touching.check.not_reachable': "You can't reach {target}.",
    'touching.perform.success': 'You touch {target}.',
    'touching.report.texture_soft': '{target:cap} feels soft.',
    'touching.report.texture_hard': '{target:cap} feels hard and solid.',
    'touching.report.texture_smooth': '{target:cap} feels smooth.',
    'touching.report.texture_rough': '{target:cap} feels rough.',
    'touching.report.temperature_warm': '{target:cap} feels warm to the touch.',
    'touching.report.temperature_hot': '{target:cap} is hot! You quickly pull your hand away.',
    'touching.report.temperature_cold': '{target:cap} feels cold.',
    'touching.report.device_vibrating': '{target:cap} is vibrating slightly.',
    'touching.report.immovable': '{target:cap} is firmly fixed in place.',
    
    // Generic/fallback messages
    'generic.not_understood': "I didn't understand that.",
    'generic.nothing_happens': 'Nothing happens.',
    'generic.ok': 'OK.',
    'generic.done': 'Done.',
    'generic.cannot_do': "You can't do that.",
    'generic.not_here': "You don't see that here.",
    'generic.be_more_specific': 'You need to be more specific.',
    'generic.which_one': 'Which {item} do you mean?',
  },
  
  /**
   * Event message templates
   */
  events: {
    // These would be populated with actual event messages
    // For now, keeping it empty to avoid duplicates with events.ts
  }
};
