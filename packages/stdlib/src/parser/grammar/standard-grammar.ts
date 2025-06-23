/**
 * Standard Grammar Patterns
 * 
 * Based on Inform 10's standard grammar
 */

import { GrammarPattern, PatternCategory, ScopeHintType } from './types';
import { createPattern } from './registry';

/**
 * Standard action names following Inform conventions
 */
export const StandardActions = {
  // Object manipulation
  TAKING: 'taking',
  DROPPING: 'dropping',
  INSERTING: 'inserting it into',
  PUTTING: 'putting it on',
  REMOVING: 'removing it from',
  
  // Wearing
  WEARING: 'wearing',
  TAKING_OFF: 'taking off',
  
  // Movement
  GOING: 'going',
  ENTERING: 'entering',
  EXITING: 'exiting',
  GETTING_OFF: 'getting off',
  
  // Examination
  EXAMINING: 'examining',
  LOOKING: 'looking',
  LOOKING_UNDER: 'looking under',
  SEARCHING: 'searching',
  CONSULTING: 'consulting it about',
  
  // Container/door manipulation
  OPENING: 'opening',
  CLOSING: 'closing',
  LOCKING: 'locking it with',
  UNLOCKING: 'unlocking it with',
  
  // Switching
  SWITCHING_ON: 'switching on',
  SWITCHING_OFF: 'switching off',
  
  // Physical manipulation
  PUSHING: 'pushing',
  PULLING: 'pulling',
  TURNING: 'turning',
  PUSHING_TO: 'pushing it to',
  
  // Violence
  ATTACKING: 'attacking',
  
  // Conversation
  ASKING_ABOUT: 'asking it about',
  TELLING_ABOUT: 'telling it about',
  ANSWERING: 'answering it that',
  ASKING_FOR: 'asking it for',
  
  // Giving/showing
  GIVING: 'giving it to',
  SHOWING: 'showing it to',
  
  // Other actions
  WAITING: 'waiting',
  SLEEPING: 'sleeping',
  WAKING_UP: 'waking up',
  WAKING: 'waking',
  KISSING: 'kissing',
  THINKING: 'thinking',
  SMELLING: 'smelling',
  LISTENING: 'listening to',
  TASTING: 'tasting',
  TOUCHING: 'touching',
  RUBBING: 'rubbing',
  TYING: 'tying it to',
  BURNING: 'burning',
  CUTTING: 'cutting',
  DRINKING: 'drinking',
  EATING: 'eating',
  JUMPING: 'jumping',
  CLIMBING: 'climbing',
  BUYING: 'buying',
  SQUEEZING: 'squeezing',
  SWINGING: 'swinging',
  WAVING: 'waving',
  WAVING_HANDS: 'waving hands',
  SETTING: 'setting it to',
  
  // Meta commands
  INVENTORY: 'taking inventory',
  QUIT: 'quitting the game',
  SAVE: 'saving the game',
  RESTORE: 'restoring the game',
  RESTART: 'restarting the game',
  SCORE: 'requesting the score',
  VERSION: 'requesting the story file version',
  TRANSCRIPT_ON: 'switching the story transcript on',
  TRANSCRIPT_OFF: 'switching the story transcript off',
  
  // Preferences
  BRIEF: 'preferring sometimes abbreviated room descriptions',
  VERBOSE: 'preferring unabbreviated room descriptions',
  SUPERBRIEF: 'preferring abbreviated room descriptions',
  
  // Pronouns
  PRONOUNS: 'requesting the pronoun meanings',
  
  // Yes/No
  YES: 'saying yes',
  NO: 'saying no',
  SORRY: 'saying sorry'
} as const;

/**
 * Create all standard grammar patterns
 */
export function createStandardGrammar(): GrammarPattern[] {
  const patterns: GrammarPattern[] = [];

  // Helper to add patterns
  const add = (pattern: string, action: string, priority = 50, scopeHints?: any) => {
    patterns.push(createPattern(pattern, action, {
      category: PatternCategory.STANDARD,
      priority,
      scopeHints
    }));
  };

  // TAKING
  add('take|get <noun>', StandardActions.TAKING, 50);
  add('take off <noun:worn>', StandardActions.TAKING_OFF, 60);
  add('take <noun:worn> off', StandardActions.TAKING_OFF, 60);
  add('take <noun> from <noun:container>', StandardActions.REMOVING, 55);
  add('take <noun> off <noun:supporter>', StandardActions.REMOVING, 55);
  add('take inventory', StandardActions.INVENTORY, 70);
  add('pick up <noun>', StandardActions.TAKING, 50);
  add('pick <noun> up', StandardActions.TAKING, 50);
  
  // Alternative verbs for taking
  add('carry <noun>', StandardActions.TAKING, 45);
  add('hold <noun>', StandardActions.TAKING, 45);

  // DROPPING
  add('drop <noun:held>', StandardActions.DROPPING, 50);
  add('drop <noun> in|into <noun:container>', StandardActions.INSERTING, 55);
  add('drop <noun> on|onto <noun:supporter>', StandardActions.PUTTING, 55);
  add('put down <noun:held>', StandardActions.DROPPING, 50);
  add('put <noun:held> down', StandardActions.DROPPING, 50);
  
  // Alternative verbs for dropping
  add('throw <noun:held>', StandardActions.DROPPING, 45);
  add('discard <noun:held>', StandardActions.DROPPING, 45);

  // INSERTING/PUTTING
  add('put <noun> in|into <noun:container>', StandardActions.INSERTING, 50);
  add('put <noun> on|onto <noun:supporter>', StandardActions.PUTTING, 50);
  add('put on <noun:wearable>', StandardActions.WEARING, 55);
  add('put <noun:wearable> on', StandardActions.WEARING, 55);
  add('insert <noun> in|into <noun:container>', StandardActions.INSERTING, 50);

  // REMOVING
  add('remove <noun:held>', StandardActions.TAKING_OFF, 50);
  add('remove <noun> from <noun:container>', StandardActions.REMOVING, 50);
  add('get <noun> from <noun:container>', StandardActions.REMOVING, 50);

  // WEARING
  add('wear <noun:wearable>', StandardActions.WEARING, 50);
  add('don <noun:wearable>', StandardActions.WEARING, 45);
  add('shed <noun:worn>', StandardActions.TAKING_OFF, 45);
  add('doff <noun:worn>', StandardActions.TAKING_OFF, 45);
  add('disrobe <noun:worn>', StandardActions.TAKING_OFF, 45);

  // MOVEMENT
  add('go', StandardActions.GOING, 40);
  add('go <direction>', StandardActions.GOING, 50);
  add('go <noun:door>', StandardActions.ENTERING, 45);
  add('go into|in|inside|through <noun:enterable>', StandardActions.ENTERING, 50);
  add('walk', StandardActions.GOING, 35);
  add('walk <direction>', StandardActions.GOING, 45);
  add('run', StandardActions.GOING, 35);
  add('run <direction>', StandardActions.GOING, 45);
  
  // Just compass directions
  add('north|n', StandardActions.GOING, 60);
  add('south|s', StandardActions.GOING, 60);
  add('east|e', StandardActions.GOING, 60);
  add('west|w', StandardActions.GOING, 60);
  add('northeast|ne', StandardActions.GOING, 60);
  add('northwest|nw', StandardActions.GOING, 60);
  add('southeast|se', StandardActions.GOING, 60);
  add('southwest|sw', StandardActions.GOING, 60);
  add('up|u', StandardActions.GOING, 60);
  add('down|d', StandardActions.GOING, 60);
  add('in', StandardActions.GOING, 60);
  add('out', StandardActions.GOING, 60);

  // ENTERING/EXITING
  add('enter', StandardActions.ENTERING, 45);
  add('enter <noun:enterable>', StandardActions.ENTERING, 50);
  add('get in|on', StandardActions.ENTERING, 45);
  add('get in|into|on|onto <noun:enterable>', StandardActions.ENTERING, 50);
  add('sit on|in|inside <noun:enterable>', StandardActions.ENTERING, 50);
  add('stand on <noun:supporter>', StandardActions.ENTERING, 50);
  add('climb <noun>', StandardActions.CLIMBING, 50);
  add('climb up|over <noun>', StandardActions.CLIMBING, 50);
  
  add('exit', StandardActions.EXITING, 50);
  add('leave', StandardActions.EXITING, 50);
  add('get out|off|down|up', StandardActions.EXITING, 50);
  add('stand', StandardActions.EXITING, 45);
  add('stand up', StandardActions.EXITING, 45);

  // EXAMINING
  add('examine|x <noun>', StandardActions.EXAMINING, 50);
  add('look', StandardActions.LOOKING, 50);
  add('look at <noun>', StandardActions.EXAMINING, 50);
  add('look <noun>', StandardActions.EXAMINING, 45);
  add('l', StandardActions.LOOKING, 60);
  add('look inside|in|into|through <noun:container>', StandardActions.SEARCHING, 55);
  add('look under <noun>', StandardActions.LOOKING_UNDER, 50);
  add('search <noun>', StandardActions.SEARCHING, 50);
  add('read <noun>', StandardActions.EXAMINING, 50);
  
  // Alternative examining verbs
  add('watch <noun>', StandardActions.EXAMINING, 45);
  add('describe <noun>', StandardActions.EXAMINING, 45);
  add('check <noun>', StandardActions.EXAMINING, 45);

  // CONSULTING
  add('consult <noun> on|about <text>', StandardActions.CONSULTING, 50);
  add('look up <text> in <noun>', StandardActions.CONSULTING, 50);
  add('read about <text> in <noun>', StandardActions.CONSULTING, 50);

  // OPENING/CLOSING
  add('open <noun:openable>', StandardActions.OPENING, 50);
  add('open <noun:lockable> with <noun:held>', StandardActions.UNLOCKING, 55);
  add('close <noun:openable>', StandardActions.CLOSING, 50);
  add('shut <noun:openable>', StandardActions.CLOSING, 45);
  
  // Alternative open/close verbs
  add('unwrap <noun>', StandardActions.OPENING, 40);
  add('uncover <noun>', StandardActions.OPENING, 40);
  add('cover <noun>', StandardActions.CLOSING, 40);

  // LOCKING/UNLOCKING
  add('lock <noun:lockable> with <noun:held>', StandardActions.LOCKING, 50);
  add('unlock <noun:lockable> with <noun:held>', StandardActions.UNLOCKING, 50);

  // SWITCHING
  add('switch <noun:switchedOn>', StandardActions.SWITCHING_OFF, 55);
  add('switch <noun:switchable>', StandardActions.SWITCHING_ON, 50);
  add('switch on <noun:switchable>', StandardActions.SWITCHING_ON, 55);
  add('switch <noun:switchable> on', StandardActions.SWITCHING_ON, 55);
  add('switch off <noun:switchedOn>', StandardActions.SWITCHING_OFF, 55);
  add('switch <noun:switchedOn> off', StandardActions.SWITCHING_OFF, 55);
  add('turn <noun:switchable> on', StandardActions.SWITCHING_ON, 50);
  add('turn on <noun:switchable>', StandardActions.SWITCHING_ON, 50);
  add('turn <noun:switchedOn> off', StandardActions.SWITCHING_OFF, 50);
  add('turn off <noun:switchedOn>', StandardActions.SWITCHING_OFF, 50);
  add('close off <noun:switchedOn>', StandardActions.SWITCHING_OFF, 45);

  // PHYSICAL MANIPULATION
  add('push <noun>', StandardActions.PUSHING, 50);
  add('push <noun> <direction>', StandardActions.PUSHING_TO, 55);
  add('push <noun> to <direction>', StandardActions.PUSHING_TO, 55);
  add('pull <noun>', StandardActions.PULLING, 50);
  add('turn <noun>', StandardActions.TURNING, 50);
  add('set <noun> to <text>', StandardActions.SETTING, 50);
  
  // Alternative manipulation verbs
  add('move <noun>', StandardActions.PUSHING, 45);
  add('shift <noun>', StandardActions.PUSHING, 45);
  add('press <noun>', StandardActions.PUSHING, 45);
  add('drag <noun>', StandardActions.PULLING, 45);
  add('rotate <noun>', StandardActions.TURNING, 45);
  add('twist <noun>', StandardActions.TURNING, 45);
  add('adjust <noun> to <text>', StandardActions.SETTING, 45);

  // VIOLENCE
  add('attack <noun>', StandardActions.ATTACKING, 50);
  add('hit <noun>', StandardActions.ATTACKING, 45);
  add('break <noun>', StandardActions.ATTACKING, 45);
  add('smash <noun>', StandardActions.ATTACKING, 45);
  add('fight <noun>', StandardActions.ATTACKING, 45);
  add('kill <noun>', StandardActions.ATTACKING, 45);
  add('murder <noun>', StandardActions.ATTACKING, 45);
  add('punch <noun>', StandardActions.ATTACKING, 45);
  add('kick <noun>', StandardActions.ATTACKING, 45);
  add('torture <noun>', StandardActions.ATTACKING, 40);
  add('wreck <noun>', StandardActions.ATTACKING, 40);
  add('crack <noun>', StandardActions.ATTACKING, 40);
  add('destroy <noun>', StandardActions.ATTACKING, 40);
  add('thump <noun>', StandardActions.ATTACKING, 40);

  // CONVERSATION
  add('ask <noun:person> about <text>', StandardActions.ASKING_ABOUT, 50);
  add('ask <noun:person> for <noun>', StandardActions.ASKING_FOR, 50);
  add('tell <noun:person> about <text>', StandardActions.TELLING_ABOUT, 50);
  add('answer <text> to <noun:person>', StandardActions.ANSWERING, 50);
  add('say <text> to <noun:person>', StandardActions.ANSWERING, 45);
  add('shout <text> to <noun:person>', StandardActions.ANSWERING, 45);
  add('speak <text> to <noun:person>', StandardActions.ANSWERING, 45);

  // GIVING/SHOWING
  add('give <noun:held> to <noun:person>', StandardActions.GIVING, 50);
  add('give <noun:person> <noun:held>', StandardActions.GIVING, 50);
  add('show <noun> to <noun:person>', StandardActions.SHOWING, 50);
  add('show <noun:person> <noun>', StandardActions.SHOWING, 50);
  
  // Alternative giving verbs
  add('offer <noun:held> to <noun:person>', StandardActions.GIVING, 45);
  add('pay <noun:person> <noun:held>', StandardActions.GIVING, 45);
  add('feed <noun:person> <noun:held>', StandardActions.GIVING, 45);
  add('present <noun> to <noun:person>', StandardActions.SHOWING, 45);
  add('display <noun> to <noun:person>', StandardActions.SHOWING, 45);

  // SENSES
  add('smell', StandardActions.SMELLING, 45);
  add('smell <noun>', StandardActions.SMELLING, 50);
  add('sniff <noun>', StandardActions.SMELLING, 45);
  add('listen', StandardActions.LISTENING, 45);
  add('listen to <noun>', StandardActions.LISTENING, 50);
  add('hear <noun>', StandardActions.LISTENING, 45);
  add('taste <noun>', StandardActions.TASTING, 50);
  add('touch <noun>', StandardActions.TOUCHING, 50);
  add('feel <noun>', StandardActions.TOUCHING, 45);

  // OTHER PHYSICAL ACTIONS
  add('eat <noun:edible>', StandardActions.EATING, 50);
  add('drink <noun>', StandardActions.DRINKING, 50);
  add('swallow <noun>', StandardActions.DRINKING, 45);
  add('sip <noun>', StandardActions.DRINKING, 45);
  add('rub <noun>', StandardActions.RUBBING, 50);
  add('clean <noun>', StandardActions.RUBBING, 45);
  add('polish <noun>', StandardActions.RUBBING, 45);
  add('dust <noun>', StandardActions.RUBBING, 45);
  add('wipe <noun>', StandardActions.RUBBING, 45);
  add('scrub <noun>', StandardActions.RUBBING, 45);
  add('sweep <noun>', StandardActions.RUBBING, 45);
  add('shine <noun>', StandardActions.RUBBING, 45);
  add('squeeze <noun>', StandardActions.SQUEEZING, 50);
  add('squash <noun>', StandardActions.SQUEEZING, 45);
  add('burn <noun>', StandardActions.BURNING, 50);
  add('light <noun>', StandardActions.BURNING, 45);
  add('cut <noun>', StandardActions.CUTTING, 50);
  add('slice <noun>', StandardActions.CUTTING, 45);
  add('chop <noun>', StandardActions.CUTTING, 45);
  add('prune <noun>', StandardActions.CUTTING, 45);
  add('tie <noun> to <noun>', StandardActions.TYING, 50);
  add('attach <noun> to <noun>', StandardActions.TYING, 45);
  add('fasten <noun> to <noun>', StandardActions.TYING, 45);
  add('swing <noun>', StandardActions.SWINGING, 50);
  add('swing on <noun>', StandardActions.SWINGING, 50);
  add('wave', StandardActions.WAVING_HANDS, 50);
  add('wave <noun>', StandardActions.WAVING, 50);

  // SIMPLE ACTIONS
  add('wait', StandardActions.WAITING, 50);
  add('z', StandardActions.WAITING, 60);
  add('sleep', StandardActions.SLEEPING, 50);
  add('nap', StandardActions.SLEEPING, 45);
  add('wake', StandardActions.WAKING_UP, 45);
  add('wake up', StandardActions.WAKING_UP, 50);
  add('wake <noun:person>', StandardActions.WAKING, 50);
  add('wake <noun:person> up', StandardActions.WAKING, 50);
  add('wake up <noun:person>', StandardActions.WAKING, 50);
  add('awake', StandardActions.WAKING_UP, 45);
  add('awaken', StandardActions.WAKING_UP, 45);
  add('kiss <noun:person>', StandardActions.KISSING, 50);
  add('hug <noun:person>', StandardActions.KISSING, 45);
  add('embrace <noun:person>', StandardActions.KISSING, 45);
  add('think', StandardActions.THINKING, 50);
  add('jump', StandardActions.JUMPING, 50);
  add('hop', StandardActions.JUMPING, 45);
  add('skip', StandardActions.JUMPING, 45);
  add('buy <noun>', StandardActions.BUYING, 50);
  add('purchase <noun>', StandardActions.BUYING, 45);

  // INVENTORY
  add('inventory', StandardActions.INVENTORY, 50);
  add('i', StandardActions.INVENTORY, 60);
  add('inv', StandardActions.INVENTORY, 55);

  // YES/NO/SORRY
  add('yes', StandardActions.YES, 50);
  add('y', StandardActions.YES, 60);
  add('no', StandardActions.NO, 50);
  add('sorry', StandardActions.SORRY, 50);

  // META COMMANDS
  add('quit', StandardActions.QUIT, 50);
  add('q', StandardActions.QUIT, 60);
  add('save', StandardActions.SAVE, 50);
  add('restore', StandardActions.RESTORE, 50);
  add('restart', StandardActions.RESTART, 50);
  add('score', StandardActions.SCORE, 50);
  add('version', StandardActions.VERSION, 50);
  add('verify', StandardActions.VERSION, 45);
  add('script', StandardActions.TRANSCRIPT_ON, 50);
  add('script on', StandardActions.TRANSCRIPT_ON, 55);
  add('transcript', StandardActions.TRANSCRIPT_ON, 50);
  add('transcript on', StandardActions.TRANSCRIPT_ON, 55);
  add('script off', StandardActions.TRANSCRIPT_OFF, 55);
  add('transcript off', StandardActions.TRANSCRIPT_OFF, 55);
  add('brief', StandardActions.BRIEF, 50);
  add('normal', StandardActions.BRIEF, 45);
  add('verbose', StandardActions.VERBOSE, 50);
  add('long', StandardActions.VERBOSE, 45);
  add('superbrief', StandardActions.SUPERBRIEF, 50);
  add('short', StandardActions.SUPERBRIEF, 45);
  add('nouns', StandardActions.PRONOUNS, 50);
  add('pronouns', StandardActions.PRONOUNS, 50);

  return patterns;
}

/**
 * Get a subset of standard patterns for minimal IF
 */
export function createMinimalGrammar(): GrammarPattern[] {
  const patterns: GrammarPattern[] = [];
  
  const add = (pattern: string, action: string, priority = 50) => {
    patterns.push(createPattern(pattern, action, {
      category: PatternCategory.STANDARD,
      priority
    }));
  };

  // Essential object manipulation
  add('take|get <noun>', StandardActions.TAKING);
  add('drop <noun:held>', StandardActions.DROPPING);
  add('inventory|i', StandardActions.INVENTORY);
  
  // Essential movement
  add('go <direction>', StandardActions.GOING);
  add('north|n|south|s|east|e|west|w', StandardActions.GOING, 60);
  
  // Essential examination
  add('look|l', StandardActions.LOOKING);
  add('examine|x <noun>', StandardActions.EXAMINING);
  
  // Essential interaction
  add('open <noun:openable>', StandardActions.OPENING);
  add('close <noun:openable>', StandardActions.CLOSING);
  
  // Meta
  add('quit|q', StandardActions.QUIT);
  add('save', StandardActions.SAVE);
  add('restore', StandardActions.RESTORE);

  return patterns;
}
