/**
 * @file English Verb Definitions
 * @description Verb mappings for English language
 */

import { VerbDefinition } from '@sharpee/stdlib/language/base';
import { IFActions } from '@sharpee/stdlib/constants';

/**
 * English verb definitions mapping verbs to IF actions
 */
export const englishVerbs: VerbDefinition[] = [
  // Movement
  {
    action: IFActions.GOING,
    verbs: ['go', 'move', 'walk', 'run', 'head', 'travel'],
    requiresObject: true
  },
  {
    action: IFActions.ENTERING,
    verbs: ['enter', 'go in', 'go into'],
    requiresObject: true
  },
  {
    action: IFActions.EXITING,
    verbs: ['exit', 'leave', 'go out', 'get out'],
    requiresObject: false
  },
  {
    action: IFActions.CLIMBING,
    verbs: ['climb', 'scale', 'ascend'],
    requiresObject: true
  },
  
  // Observation
  {
    action: IFActions.LOOKING,
    verbs: ['look', 'l'],
    requiresObject: false
  },
  {
    action: IFActions.EXAMINING,
    verbs: ['examine', 'x', 'inspect', 'check', 'view', 'read', 'observe', 'look at'],
    requiresObject: true
  },
  {
    action: IFActions.SEARCHING,
    verbs: ['search', 'find', 'locate'],
    requiresObject: true
  },
  {
    action: IFActions.LISTENING,
    verbs: ['listen', 'hear'],
    requiresObject: false
  },
  {
    action: IFActions.SMELLING,
    verbs: ['smell', 'sniff'],
    requiresObject: false
  },
  {
    action: IFActions.TOUCHING,
    verbs: ['touch', 'feel'],
    requiresObject: true
  },
  
  // Manipulation
  {
    action: IFActions.TAKING,
    verbs: ['take', 'get', 'pick', 'grab', 'acquire', 'pick up', 'take up'],
    requiresObject: true
  },
  {
    action: IFActions.DROPPING,
    verbs: ['drop', 'put down', 'discard', 'throw away'],
    requiresObject: true
  },
  {
    action: IFActions.PUTTING,
    verbs: ['put', 'place', 'put in', 'put on'],
    requiresObject: true,
    allowsIndirectObject: true
  },
  {
    action: IFActions.INSERTING,
    verbs: ['insert', 'insert into'],
    requiresObject: true,
    allowsIndirectObject: true
  },
  {
    action: IFActions.OPENING,
    verbs: ['open', 'unwrap', 'uncover'],
    requiresObject: true
  },
  {
    action: IFActions.CLOSING,
    verbs: ['close', 'shut', 'cover'],
    requiresObject: true
  },
  {
    action: IFActions.LOCKING,
    verbs: ['lock', 'secure'],
    requiresObject: true
  },
  {
    action: IFActions.UNLOCKING,
    verbs: ['unlock', 'unsecure'],
    requiresObject: true
  },
  {
    action: IFActions.SWITCHING_ON,
    verbs: ['switch on', 'turn on', 'activate', 'start'],
    requiresObject: true
  },
  {
    action: IFActions.SWITCHING_OFF,
    verbs: ['switch off', 'turn off', 'deactivate', 'stop'],
    requiresObject: true
  },
  {
    action: IFActions.PUSHING,
    verbs: ['push', 'press', 'shove'],
    requiresObject: true
  },
  {
    action: IFActions.PULLING,
    verbs: ['pull', 'tug', 'drag'],
    requiresObject: true
  },
  {
    action: IFActions.TURNING,
    verbs: ['turn', 'rotate', 'twist'],
    requiresObject: true
  },
  {
    action: IFActions.USING,
    verbs: ['use', 'utilize', 'employ'],
    requiresObject: true,
    allowsIndirectObject: true
  },
  {
    action: IFActions.GIVING,
    verbs: ['give', 'hand', 'offer'],
    requiresObject: true,
    allowsIndirectObject: true
  },
  {
    action: IFActions.SHOWING,
    verbs: ['show', 'display', 'present'],
    requiresObject: true,
    allowsIndirectObject: true
  },
  {
    action: IFActions.THROWING,
    verbs: ['throw', 'toss', 'hurl'],
    requiresObject: true,
    allowsIndirectObject: true
  },
  {
    action: IFActions.ATTACKING,
    verbs: ['attack', 'hit', 'strike', 'fight', 'kill'],
    requiresObject: true
  },
  {
    action: IFActions.WEARING,
    verbs: ['wear', 'put on', 'don', 'equip'],
    requiresObject: true
  },
  {
    action: IFActions.TAKING_OFF,
    verbs: ['remove', 'take off', 'doff', 'unequip'],
    requiresObject: true
  },
  {
    action: IFActions.EATING,
    verbs: ['eat', 'consume', 'devour'],
    requiresObject: true
  },
  {
    action: IFActions.DRINKING,
    verbs: ['drink', 'sip', 'swallow', 'quaff'],
    requiresObject: true
  },
  
  // Communication
  {
    action: IFActions.TALKING,
    verbs: ['talk', 'speak', 'converse', 'chat', 'talk to'],
    requiresObject: true
  },
  {
    action: IFActions.ASKING,
    verbs: ['ask', 'inquire', 'question'],
    requiresObject: true,
    allowsIndirectObject: true
  },
  {
    action: IFActions.TELLING,
    verbs: ['tell', 'inform', 'say'],
    requiresObject: true,
    allowsIndirectObject: true
  },
  {
    action: IFActions.ANSWERING,
    verbs: ['answer', 'respond', 'reply'],
    requiresObject: true
  },
  
  // Meta commands
  {
    action: IFActions.INVENTORY,
    verbs: ['inventory', 'i', 'inv'],
    requiresObject: false
  },
  {
    action: IFActions.WAIT,
    verbs: ['wait', 'z'],
    requiresObject: false
  },
  {
    action: IFActions.SAVING,
    verbs: ['save', 'save game'],
    requiresObject: false
  },
  {
    action: IFActions.RESTORING,
    verbs: ['restore', 'load', 'load game', 'restore game'],
    requiresObject: false
  },
  {
    action: IFActions.QUITTING,
    verbs: ['quit', 'q', 'exit game'],
    requiresObject: false
  },
  {
    action: IFActions.HELP,
    verbs: ['help', '?', 'commands'],
    requiresObject: false
  },
  {
    action: IFActions.ABOUT,
    verbs: ['about', 'info', 'credits'],
    requiresObject: false
  },
  {
    action: IFActions.SCORING,
    verbs: ['score', 'points'],
    requiresObject: false
  }
];
