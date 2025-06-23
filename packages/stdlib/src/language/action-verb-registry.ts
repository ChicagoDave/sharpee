// packages/stdlib/src/language/action-verb-registry.ts

import { IFActions } from '../constants/if-actions';

/**
 * Registry for mapping actions to their associated verbs
 * This allows actions to self-register their verbs instead of
 * the language provider having to know about all actions
 */
export class ActionVerbRegistry {
  private actionToVerbs = new Map<IFActions, string[]>();
  private verbToAction = new Map<string, IFActions>();
  
  /**
   * Register verbs for an action
   */
  registerAction(action: IFActions, verbs: string[]): void {
    // Store the action -> verbs mapping
    this.actionToVerbs.set(action, verbs);
    
    // Store the reverse mapping for each verb
    for (const verb of verbs) {
      this.verbToAction.set(verb.toLowerCase(), action);
    }
  }
  
  /**
   * Get all verbs associated with an action
   */
  getVerbsForAction(action: IFActions): string[] {
    return this.actionToVerbs.get(action) || [];
  }
  
  /**
   * Get the action associated with a verb
   */
  getActionForVerb(verb: string): IFActions | undefined {
    return this.verbToAction.get(verb.toLowerCase());
  }
  
  /**
   * Check if a word is a registered verb
   */
  isVerb(word: string): boolean {
    return this.verbToAction.has(word.toLowerCase());
  }
  
  /**
   * Get all registered actions
   */
  getAllActions(): IFActions[] {
    return Array.from(this.actionToVerbs.keys());
  }
  
  /**
   * Get all registered verbs
   */
  getAllVerbs(): string[] {
    return Array.from(this.verbToAction.keys());
  }
  
  /**
   * Clear all registrations
   */
  clear(): void {
    this.actionToVerbs.clear();
    this.verbToAction.clear();
  }
  
  /**
   * Merge another registry into this one
   */
  merge(other: ActionVerbRegistry): void {
    for (const [action, verbs] of other.actionToVerbs) {
      this.registerAction(action, verbs);
    }
  }
}

/**
 * Global registry instance
 */
let globalRegistry: ActionVerbRegistry | null = null;

/**
 * Get the global action verb registry
 */
export function getActionVerbRegistry(): ActionVerbRegistry {
  if (!globalRegistry) {
    globalRegistry = new ActionVerbRegistry();
  }
  return globalRegistry;
}

/**
 * Register standard English verbs for IF actions
 * This is called during initialization
 */
export function registerStandardVerbs(registry: ActionVerbRegistry): void {
  // Movement
  registry.registerAction(IFActions.GOING, ['go', 'walk', 'run', 'move']);
  registry.registerAction(IFActions.ENTERING, ['enter', 'go in', 'go into']);
  registry.registerAction(IFActions.EXITING, ['exit', 'leave', 'go out']);
  registry.registerAction(IFActions.CLIMBING, ['climb', 'scale']);
  registry.registerAction(IFActions.JUMPING, ['jump', 'leap', 'hop']);
  
  // Observation
  registry.registerAction(IFActions.LOOKING, ['look', 'l']);
  registry.registerAction(IFActions.EXAMINING, ['examine', 'x', 'look at', 'inspect']);
  registry.registerAction(IFActions.SEARCHING, ['search', 'look in', 'look inside']);
  registry.registerAction(IFActions.LOOKING_UNDER, ['look under', 'look beneath']);
  registry.registerAction(IFActions.LOOKING_BEHIND, ['look behind']);
  registry.registerAction(IFActions.LISTENING, ['listen', 'hear']);
  registry.registerAction(IFActions.SMELLING, ['smell', 'sniff']);
  registry.registerAction(IFActions.TOUCHING, ['touch', 'feel']);
  registry.registerAction(IFActions.TASTING, ['taste', 'lick']);
  
  // Manipulation
  registry.registerAction(IFActions.TAKING, ['take', 'get', 'pick up', 'grab']);
  registry.registerAction(IFActions.DROPPING, ['drop', 'put down', 'discard']);
  registry.registerAction(IFActions.PUTTING, ['put', 'place', 'set']);
  registry.registerAction(IFActions.INSERTING, ['insert', 'put in', 'place in']);
  registry.registerAction(IFActions.REMOVING, ['remove', 'take out', 'extract']);
  registry.registerAction(IFActions.THROWING, ['throw', 'toss', 'hurl']);
  
  // Container/door
  registry.registerAction(IFActions.OPENING, ['open']);
  registry.registerAction(IFActions.CLOSING, ['close', 'shut']);
  registry.registerAction(IFActions.LOCKING, ['lock']);
  registry.registerAction(IFActions.UNLOCKING, ['unlock']);
  
  // Wearing
  registry.registerAction(IFActions.WEARING, ['wear', 'put on', 'don']);
  registry.registerAction(IFActions.TAKING_OFF, ['remove', 'take off', 'doff']);
  
  // Device
  registry.registerAction(IFActions.SWITCHING_ON, ['turn on', 'switch on', 'activate']);
  registry.registerAction(IFActions.SWITCHING_OFF, ['turn off', 'switch off', 'deactivate']);
  registry.registerAction(IFActions.PUSHING, ['push', 'press', 'shove']);
  registry.registerAction(IFActions.PULLING, ['pull', 'drag', 'tug']);
  registry.registerAction(IFActions.TURNING, ['turn', 'rotate', 'twist']);
  
  // Consumption
  registry.registerAction(IFActions.EATING, ['eat', 'consume', 'devour']);
  registry.registerAction(IFActions.DRINKING, ['drink', 'sip', 'quaff']);
  
  // Communication
  registry.registerAction(IFActions.TALKING, ['talk', 'speak', 'say']);
  registry.registerAction(IFActions.ASKING, ['ask', 'question', 'inquire']);
  registry.registerAction(IFActions.TELLING, ['tell', 'inform', 'say']);
  registry.registerAction(IFActions.GIVING, ['give', 'offer', 'hand']);
  registry.registerAction(IFActions.SHOWING, ['show', 'display', 'present']);
  
  // Meta
  registry.registerAction(IFActions.INVENTORY, ['inventory', 'i', 'inv']);
  registry.registerAction(IFActions.WAITING, ['wait', 'z']);
  registry.registerAction(IFActions.SAVING, ['save']);
  registry.registerAction(IFActions.RESTORING, ['restore', 'load']);
  registry.registerAction(IFActions.QUITTING, ['quit', 'q']);
  registry.registerAction(IFActions.HELP, ['help', '?']);
}
