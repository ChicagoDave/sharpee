/**
 * Standard grammar patterns for Sharpee
 * Based on common IF actions, organized by category
 */

import { 
  CategorizedGrammarPattern, 
  GrammarCategory,
  EnhancedGrammarPattern 
} from './enhanced-grammar-types';

/**
 * Create the standard English grammar patterns
 */
export function createStandardGrammar(): CategorizedGrammarPattern[] {
  const patterns: CategorizedGrammarPattern[] = [];

  // ============================================
  // OBJECT MANIPULATION - Core interaction verbs
  // ============================================
  
  // Taking
  patterns.push({
    id: 'taking',
    pattern: 'take|get|pick up|grab|carry|hold <noun+:here>',
    action: 'taking',
    category: GrammarCategory.OBJECT_MANIPULATION,
    iterateObjects: true,
    priority: 100
  });

  patterns.push({
    id: 'taking-phrasal',
    pattern: 'pick <noun+:here> up',
    action: 'taking',
    category: GrammarCategory.OBJECT_MANIPULATION,
    iterateObjects: true
  });

  patterns.push({
    id: 'taking-all',
    pattern: 'take|get all|everything',
    action: 'taking',
    category: GrammarCategory.OBJECT_MANIPULATION,
    matchAll: true,
    scopeFilter: 'takeable'
  });

  patterns.push({
    id: 'taking-all-except',
    pattern: 'take|get all|everything (except|but) <noun+>',
    action: 'taking',
    category: GrammarCategory.OBJECT_MANIPULATION,
    matchAll: true,
    except: true,
    scopeFilter: 'takeable'
  });

  // Dropping
  patterns.push({
    id: 'dropping',
    pattern: 'drop|put down|discard|throw <noun+:held>',
    action: 'dropping',
    category: GrammarCategory.OBJECT_MANIPULATION,
    iterateObjects: true,
    priority: 90
  });

  patterns.push({
    id: 'dropping-phrasal',
    pattern: 'put <noun+:held> down',
    action: 'dropping',
    category: GrammarCategory.OBJECT_MANIPULATION,
    iterateObjects: true
  });

  // Container operations
  patterns.push({
    id: 'inserting',
    pattern: 'put|place|insert <noun+:held> in|into|inside <second:container>',
    action: 'inserting',
    category: GrammarCategory.OBJECT_MANIPULATION,
    requiresSecond: true,
    prepositions: ['in', 'into', 'inside'],
    iterateObjects: true
  });

  patterns.push({
    id: 'putting-on',
    pattern: 'put|place <noun+:held> on|onto <second:supporter>',
    action: 'putting on',
    category: GrammarCategory.OBJECT_MANIPULATION,
    requiresSecond: true,
    prepositions: ['on', 'onto'],
    iterateObjects: true
  });

  patterns.push({
    id: 'removing',
    pattern: 'take|get|remove <noun+> from|off <second>',
    action: 'removing',
    category: GrammarCategory.OBJECT_MANIPULATION,
    requiresSecond: true,
    prepositions: ['from', 'off'],
    iterateObjects: true
  });

  // ============================================
  // MOVEMENT - Navigation and positioning
  // ============================================

  patterns.push({
    id: 'going',
    pattern: 'go|walk|run|move <direction>',
    action: 'going',
    category: GrammarCategory.MOVEMENT,
    priority: 95
  });

  patterns.push({
    id: 'going-implicit',
    pattern: '<direction>',
    action: 'going',
    category: GrammarCategory.MOVEMENT,
    priority: 50  // Lower priority so it doesn't override other patterns
  });

  patterns.push({
    id: 'entering',
    pattern: 'enter|go in|go into|get in|get into <noun:enterable>',
    action: 'entering',
    category: GrammarCategory.MOVEMENT
  });

  patterns.push({
    id: 'exiting',
    pattern: 'exit|leave|go out|get out|get off',
    action: 'exiting',
    category: GrammarCategory.MOVEMENT
  });

  patterns.push({
    id: 'getting-off',
    pattern: 'get off|get out of|exit <noun:here>',
    action: 'getting off',
    category: GrammarCategory.MOVEMENT
  });

  patterns.push({
    id: 'climbing',
    pattern: 'climb|climb up|climb over|scale <noun:here>',
    action: 'climbing',
    category: GrammarCategory.MOVEMENT
  });

  // ============================================
  // EXAMINATION - Looking and sensing
  // ============================================

  patterns.push({
    id: 'looking',
    pattern: 'look|l',
    action: 'looking',
    category: GrammarCategory.EXAMINATION,
    priority: 100
  });

  patterns.push({
    id: 'examining',
    pattern: 'look at|examine|x|watch|check|inspect <noun>',
    action: 'examining',
    category: GrammarCategory.EXAMINATION,
    priority: 95
  });

  patterns.push({
    id: 'examining-implicit',
    pattern: 'look|examine|x <noun>',
    action: 'examining',
    category: GrammarCategory.EXAMINATION,
    priority: 90
  });

  patterns.push({
    id: 'searching',
    pattern: 'look in|look inside|look into|search <noun:container>',
    action: 'searching',
    category: GrammarCategory.EXAMINATION
  });

  patterns.push({
    id: 'looking-under',
    pattern: 'look under|look beneath <noun:here>',
    action: 'looking under',
    category: GrammarCategory.EXAMINATION
  });

  patterns.push({
    id: 'reading',
    pattern: 'read <noun:readable>',
    action: 'examining',
    category: GrammarCategory.EXAMINATION
  });

  patterns.push({
    id: 'consulting',
    pattern: 'look up|consult|read about <topic> in <noun:readable>',
    action: 'consulting',
    category: GrammarCategory.EXAMINATION,
    requiresSecond: true,
    textCapture: 'topic'
  });

  // Other senses
  patterns.push({
    id: 'smelling',
    pattern: 'smell|sniff <noun>',
    action: 'smelling',
    category: GrammarCategory.EXAMINATION
  });

  patterns.push({
    id: 'listening',
    pattern: 'listen to|hear <noun>',
    action: 'listening to',
    category: GrammarCategory.EXAMINATION
  });

  patterns.push({
    id: 'tasting',
    pattern: 'taste <noun:held>',
    action: 'tasting',
    category: GrammarCategory.EXAMINATION
  });

  patterns.push({
    id: 'touching',
    pattern: 'touch|feel <noun>',
    action: 'touching',
    category: GrammarCategory.EXAMINATION
  });

  // ============================================
  // CONVERSATION - NPC interaction
  // ============================================

  patterns.push({
    id: 'asking-about',
    pattern: 'ask|question|interrogate <noun:person> about <topic>',
    action: 'asking about',
    category: GrammarCategory.CONVERSATION,
    requiresSecond: true,
    textCapture: 'topic'
  });

  patterns.push({
    id: 'telling-about',
    pattern: 'tell|inform <noun:person> about <topic>',
    action: 'telling about',
    category: GrammarCategory.CONVERSATION,
    requiresSecond: true,
    textCapture: 'topic'
  });

  patterns.push({
    id: 'asking-for',
    pattern: 'ask <noun:person> for <second>',
    action: 'asking for',
    category: GrammarCategory.CONVERSATION,
    requiresSecond: true
  });

  patterns.push({
    id: 'giving',
    pattern: 'give|offer|hand|pay|feed <noun:held> to <second:person>',
    action: 'giving',
    category: GrammarCategory.CONVERSATION,
    requiresSecond: true,
    prepositions: ['to']
  });

  patterns.push({
    id: 'giving-reversed',
    pattern: 'give|offer|hand|pay|feed <second:person> <noun:held>',
    action: 'giving',
    category: GrammarCategory.CONVERSATION,
    requiresSecond: true,
    reversed: true
  });

  patterns.push({
    id: 'showing',
    pattern: 'show|present|display <noun:held> to <second:person>',
    action: 'showing',
    category: GrammarCategory.CONVERSATION,
    requiresSecond: true,
    prepositions: ['to']
  });

  patterns.push({
    id: 'showing-reversed',
    pattern: 'show|present|display <second:person> <noun:held>',
    action: 'showing',
    category: GrammarCategory.CONVERSATION,
    requiresSecond: true,
    reversed: true
  });

  // ============================================
  // MANIPULATION - Using objects
  // ============================================

  patterns.push({
    id: 'opening',
    pattern: 'open|unwrap|uncover <noun:openable>',
    action: 'opening',
    category: GrammarCategory.MANIPULATION,
    priority: 85
  });

  patterns.push({
    id: 'closing',
    pattern: 'close|shut|cover <noun:openable>',
    action: 'closing',
    category: GrammarCategory.MANIPULATION,
    priority: 85
  });

  patterns.push({
    id: 'unlocking',
    pattern: 'unlock|open <noun:lockable> with <second:held>',
    action: 'unlocking',
    category: GrammarCategory.MANIPULATION,
    requiresSecond: true,
    prepositions: ['with']
  });

  patterns.push({
    id: 'locking',
    pattern: 'lock <noun:lockable> with <second:held>',
    action: 'locking',
    category: GrammarCategory.MANIPULATION,
    requiresSecond: true,
    prepositions: ['with']
  });

  patterns.push({
    id: 'switching-on',
    pattern: 'turn on|switch on|activate <noun:switchable>',
    action: 'switching on',
    category: GrammarCategory.MANIPULATION
  });

  patterns.push({
    id: 'switching-on-alt',
    pattern: 'turn|switch <noun:switchable> on',
    action: 'switching on',
    category: GrammarCategory.MANIPULATION
  });

  patterns.push({
    id: 'switching-off',
    pattern: 'turn off|switch off|deactivate <noun:switchable>',
    action: 'switching off',
    category: GrammarCategory.MANIPULATION
  });

  patterns.push({
    id: 'switching-off-alt',
    pattern: 'turn|switch <noun:switchable> off',
    action: 'switching off',
    category: GrammarCategory.MANIPULATION
  });

  patterns.push({
    id: 'pushing',
    pattern: 'push|press|move|shift <noun:here>',
    action: 'pushing',
    category: GrammarCategory.MANIPULATION
  });

  patterns.push({
    id: 'pushing-to',
    pattern: 'push|move|shift <noun:pushable> <direction>',
    action: 'pushing to',
    category: GrammarCategory.MANIPULATION,
    requiresSecond: true
  });

  patterns.push({
    id: 'pulling',
    pattern: 'pull|drag|tug <noun:here>',
    action: 'pulling',
    category: GrammarCategory.MANIPULATION
  });

  patterns.push({
    id: 'turning',
    pattern: 'turn|rotate|twist|spin <noun:here>',
    action: 'turning',
    category: GrammarCategory.MANIPULATION
  });

  // ============================================
  // CLOTHING - Wearing items
  // ============================================

  patterns.push({
    id: 'wearing',
    pattern: 'wear|put on|don <noun+:wearable>',
    action: 'wearing',
    category: GrammarCategory.CLOTHING,
    iterateObjects: true
  });

  patterns.push({
    id: 'wearing-alt',
    pattern: 'put <noun+:wearable> on',
    action: 'wearing',
    category: GrammarCategory.CLOTHING,
    iterateObjects: true
  });

  patterns.push({
    id: 'taking-off',
    pattern: 'take off|remove|shed|doff <noun+:worn>',
    action: 'taking off',
    category: GrammarCategory.CLOTHING,
    iterateObjects: true
  });

  patterns.push({
    id: 'taking-off-alt',
    pattern: 'take <noun+:worn> off',
    action: 'taking off',
    category: GrammarCategory.CLOTHING,
    iterateObjects: true
  });

  // ============================================
  // META - Game control commands
  // ============================================

  patterns.push({
    id: 'inventory',
    pattern: 'inventory|inv|i',
    action: 'taking inventory',
    category: GrammarCategory.META,
    priority: 100
  });

  patterns.push({
    id: 'waiting',
    pattern: 'wait|z',
    action: 'waiting',
    category: GrammarCategory.META
  });

  patterns.push({
    id: 'again',
    pattern: 'again|g',
    action: 'repeating',
    category: GrammarCategory.META,
    meta: true,
    priority: 100
  });

  patterns.push({
    id: 'undo',
    pattern: 'undo',
    action: 'undoing',
    category: GrammarCategory.META,
    meta: true
  });

  patterns.push({
    id: 'save',
    pattern: 'save',
    action: 'saving',
    category: GrammarCategory.META,
    meta: true
  });

  patterns.push({
    id: 'restore',
    pattern: 'restore|load',
    action: 'restoring',
    category: GrammarCategory.META,
    meta: true
  });

  patterns.push({
    id: 'restart',
    pattern: 'restart',
    action: 'restarting',
    category: GrammarCategory.META,
    meta: true
  });

  patterns.push({
    id: 'quit',
    pattern: 'quit|q',
    action: 'quitting',
    category: GrammarCategory.META,
    meta: true
  });

  patterns.push({
    id: 'score',
    pattern: 'score|points',
    action: 'requesting score',
    category: GrammarCategory.META
  });

  patterns.push({
    id: 'help',
    pattern: 'help|?',
    action: 'requesting help',
    category: GrammarCategory.META
  });

  // ============================================
  // Additional common patterns
  // ============================================

  // Eating/Drinking
  patterns.push({
    id: 'eating',
    pattern: 'eat|consume|devour <noun:held>',
    action: 'eating',
    category: GrammarCategory.CONSUMPTION
  });

  patterns.push({
    id: 'drinking',
    pattern: 'drink|sip|swallow <noun:held>',
    action: 'drinking',
    category: GrammarCategory.CONSUMPTION
  });

  // Violence (kept simple)
  patterns.push({
    id: 'attacking',
    pattern: 'attack|hit|fight|kick|punch <noun>',
    action: 'attacking',
    category: GrammarCategory.VIOLENCE
  });

  patterns.push({
    id: 'breaking',
    pattern: 'break|smash|destroy <noun:here>',
    action: 'attacking',
    category: GrammarCategory.VIOLENCE
  });

  // Social
  patterns.push({
    id: 'kissing',
    pattern: 'kiss|hug|embrace <noun:person>',
    action: 'kissing',
    category: GrammarCategory.SOCIAL
  });

  patterns.push({
    id: 'waving',
    pattern: 'wave',
    action: 'waving hands',
    category: GrammarCategory.SOCIAL
  });

  patterns.push({
    id: 'waving-at',
    pattern: 'wave at|wave to <noun:person>',
    action: 'waving',
    category: GrammarCategory.SOCIAL
  });

  // Sort by priority (higher first) and then by ID
  patterns.sort((a, b) => {
    const priorityDiff = (b.priority || 0) - (a.priority || 0);
    return priorityDiff !== 0 ? priorityDiff : a.id.localeCompare(b.id);
  });

  return patterns;
}

/**
 * Get patterns by category
 */
export function getPatternsByCategory(
  patterns: CategorizedGrammarPattern[],
  category: GrammarCategory
): CategorizedGrammarPattern[] {
  return patterns.filter(p => p.category === category);
}

/**
 * Get all action names
 */
export function getAllActions(patterns: CategorizedGrammarPattern[]): Set<string> {
  return new Set(patterns.map(p => p.action));
}