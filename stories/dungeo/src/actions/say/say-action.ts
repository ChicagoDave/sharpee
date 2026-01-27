/**
 * Say Action
 *
 * Handles player speech for Dungeo.
 * Routes speech to NPCs in the current room via their behaviors.
 *
 * Handles several word puzzles:
 * - Cyclops puzzle: say "Odysseus" or "Ulysses" to scare it away
 * - Loud Room echo: say "echo" (dangerous without platinum bar!)
 * - Riddle Room: answer "well" to open the stone door
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { NpcTrait, IdentityTrait, ActorTrait, RoomTrait, Direction } from '@sharpee/world-model';
import { SAY_ACTION_ID, SayMessages } from './types';

// Import cyclops-specific helpers
import { makeCyclopsFlee, CyclopsCustomProperties } from '../../npcs/cyclops/cyclops-entity';
import { CyclopsMessages } from '../../npcs/cyclops/cyclops-messages';
import { RiddleRoomTrait } from '../../traits';

/**
 * Extract the words spoken from the command
 */
function extractSpokenWords(context: ActionContext): string | undefined {
  const command = context.command;

  // Check raw input for text after "say"
  const rawInput = command.parsed?.rawInput?.toLowerCase() || '';

  // Handle bare magic words (mainframe Zork style)
  const bareMagicWords = ['echo', 'ulysses', 'odysseus', 'xyzzy'];
  if (bareMagicWords.includes(rawInput)) {
    return rawInput;
  }

  // Try to extract text after "say " or "say to"
  const sayMatch = rawInput.match(/^say\s+(?:to\s+\w+\s+)?["']?(.+?)["']?$/);
  if (sayMatch) {
    return sayMatch[1].trim();
  }

  // Check extras.message from grammar pattern "say :message"
  const extras = command.parsed?.extras || {};
  if (extras.message) {
    return String(extras.message);
  }

  // Check for :arg pattern
  if (extras.arg) {
    return String(extras.arg);
  }

  // Fallback to the raw input after "say"
  const simpleMatch = rawInput.replace(/^say\s*/, '');
  if (simpleMatch) {
    return simpleMatch;
  }

  return undefined;
}

/**
 * Check if player is in the Loud Room
 */
function isInLoudRoom(context: ActionContext): boolean {
  const identity = context.currentLocation.get(IdentityTrait);
  if (!identity) return false;
  return identity.name?.toLowerCase().includes('loud room') || false;
}

/**
 * Check if player is in the Riddle Room (underground version)
 */
function isInRiddleRoom(context: ActionContext): boolean {
  const identity = context.currentLocation.get(IdentityTrait);
  if (!identity) return false;
  return identity.name?.toLowerCase().includes('riddle room') || false;
}

/**
 * Check if player has the platinum bar
 */
function hasPlatinumBar(context: ActionContext): boolean {
  const player = context.player;
  if (!player) return false;

  // Get all items in player's inventory
  const contents = context.world.getContents(player.id);
  for (const item of contents) {
    const identity = item.get(IdentityTrait);
    if (!identity) continue;
    if (identity.name?.toLowerCase().includes('platinum bar') ||
        identity.aliases?.some(a => a.toLowerCase().includes('platinum'))) {
      return true;
    }
  }
  return false;
}

/**
 * Handle saying "echo" in the Loud Room
 *
 * Mainframe Zork behavior:
 * - Say "echo" WITHOUT platinum bar → Safe, room stops echoing, can take bar
 * - Say "echo" WITH platinum bar → DEATH (bar amplifies reverberations)
 */
function handleLoudRoomEcho(context: ActionContext): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const room = context.currentLocation as any;

  // Check if already solved
  if (room.echoSolved) {
    events.push(context.event('action.success', {
      actionId: SAY_ACTION_ID,
      messageId: SayMessages.LOUD_ROOM_ACOUSTICS,
    }));
    return events;
  }

  // Check if player has the platinum bar
  if (hasPlatinumBar(context)) {
    // DEATH! The bar amplifies the echo reverberations
    events.push(context.event('player.died', {
      actionId: SAY_ACTION_ID,
      messageId: SayMessages.LOUD_ROOM_ECHO_DEATH,
      cause: 'echo_reverberations',
    }));
  } else {
    // Safe! Without the bar, the echo dissipates harmlessly
    room.echoSolved = true;
    events.push(context.event('action.success', {
      actionId: SAY_ACTION_ID,
      messageId: SayMessages.LOUD_ROOM_ECHO_SAFE,
    }));
  }

  return events;
}

/**
 * Handle answering "well" in the Riddle Room
 * Opens the stone door to the east
 */
function handleRiddleAnswer(context: ActionContext, words: string): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const riddleTrait = context.currentLocation.get(RiddleRoomTrait);

  // Check if already solved
  if (riddleTrait?.riddleSolved) {
    events.push(context.event('action.success', {
      actionId: SAY_ACTION_ID,
      messageId: SayMessages.RIDDLE_ALREADY_SOLVED,
    }));
    return events;
  }

  // Extract the answer (handle "answer X", "say X", "X")
  let answer = words.toLowerCase().trim();
  // Remove common prefixes
  answer = answer.replace(/^(answer|say|reply)\s+/, '');
  // Remove quotes
  answer = answer.replace(/^["']|["']$/g, '');

  // Check for correct answer
  if (answer === 'well' || answer === 'a well') {
    if (riddleTrait) {
      riddleTrait.riddleSolved = true;
    }

    // Open the east exit - we need to find what room is east
    // For now, we'll store that the riddle is solved and let the room
    // connection logic handle it (or add the exit dynamically)
    const roomTrait = context.currentLocation.get(RoomTrait);
    if (roomTrait) {
      // Find the Pearl Room or next room to connect
      // We'll search for it by name
      const allEntities = context.world.getAllEntities();
      const pearlRoom = allEntities.find(e => {
        const ident = e.get(IdentityTrait);
        return ident?.name?.toLowerCase() === 'pearl room';
      });

      if (pearlRoom) {
        roomTrait.exits[Direction.EAST] = { destination: pearlRoom.id };
      }
    }

    events.push(context.event('action.success', {
      actionId: SAY_ACTION_ID,
      messageId: SayMessages.RIDDLE_CORRECT,
    }));
  } else {
    // Wrong answer
    events.push(context.event('action.success', {
      actionId: SAY_ACTION_ID,
      messageId: SayMessages.RIDDLE_WRONG,
    }));
  }

  return events;
}

/**
 * Find NPCs in the current room
 */
function findNpcsInRoom(context: ActionContext): any[] {
  const currentLocationId = context.currentLocation.id;
  const entities = context.world.getAllEntities();

  return entities.filter(entity => {
    // Check if it's an NPC
    const npcTrait = entity.get(NpcTrait);
    if (!npcTrait) return false;

    // Check if it's in the current room
    const location = context.world.getLocation(entity.id);
    return location === currentLocationId;
  });
}

/**
 * Check if an NPC is the Cyclops
 */
function isCyclops(npc: any): boolean {
  const identity = npc.get(IdentityTrait);
  if (!identity) return false;
  return identity.name?.toLowerCase().includes('cyclops');
}

/**
 * Get Cyclops custom properties
 */
function getCyclopsProps(npc: any): CyclopsCustomProperties | null {
  const npcTrait = npc.get(NpcTrait);
  if (!npcTrait?.customProperties) return null;
  return npcTrait.customProperties as unknown as CyclopsCustomProperties;
}

/**
 * Handle speech to the Cyclops
 */
function handleCyclopsSpeech(
  context: ActionContext,
  cyclops: any,
  words: string
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const lowerWords = words.toLowerCase();

  // Check for the magic words
  if (lowerWords.includes('odysseus') || lowerWords.includes('ulysses')) {
    const props = getCyclopsProps(cyclops);
    if (props?.state === 'FLED') {
      // Cyclops already fled
      return [];
    }

    const roomId = props?.roomId || context.currentLocation.id;

    // Cyclops panics and flees!
    events.push(context.event('npc.emoted', {
      npc: cyclops.id,
      messageId: CyclopsMessages.PANICS,
      npcName: 'cyclops'
    }));

    events.push(context.event('npc.emoted', {
      npc: cyclops.id,
      messageId: CyclopsMessages.FLEES,
      npcName: 'cyclops'
    }));

    // Make the cyclops flee (opens passage, awards points)
    const fleeEvents = makeCyclopsFlee(context.world, cyclops, roomId);
    events.push(...fleeEvents);

    // Add passage opened message
    events.push(context.event('game.message', {
      messageId: CyclopsMessages.PASSAGE_OPENS
    }));

    return events;
  }

  // Cyclops ignores other words
  events.push(context.event('npc.emoted', {
    npc: cyclops.id,
    messageId: CyclopsMessages.IGNORES,
    npcName: 'cyclops'
  }));

  return events;
}

export const sayAction: Action = {
  id: SAY_ACTION_ID,
  group: 'communication',

  validate(context: ActionContext): ValidationResult {
    const words = extractSpokenWords(context);
    if (!words || words.trim().length === 0) {
      return { valid: false, error: SayMessages.NOTHING_TO_SAY };
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const words = extractSpokenWords(context) || '';
    context.sharedData.spokenWords = words;
    const lowerWords = words.toLowerCase();

    // Check for room-specific puzzles first
    // Loud Room "echo" puzzle
    if (isInLoudRoom(context) && lowerWords === 'echo') {
      context.sharedData.isLoudRoomEcho = true;
      return;
    }

    // Riddle Room puzzle - any speech could be an answer attempt
    if (isInRiddleRoom(context)) {
      context.sharedData.isRiddleAnswer = true;
      return;
    }

    // Find NPCs in the room
    const npcs = findNpcsInRoom(context);
    context.sharedData.npcsInRoom = npcs;
    context.sharedData.npcResponses = [];

    // Check for Cyclops-specific handling
    const cyclops = npcs.find(isCyclops);
    if (cyclops) {
      const props = getCyclopsProps(cyclops);
      if (props?.state !== 'FLED') {
        context.sharedData.hasCyclops = true;
        context.sharedData.cyclops = cyclops;
      }
    }
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: SAY_ACTION_ID,
      messageId: result.error || SayMessages.NOTHING_TO_SAY,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const words = context.sharedData.spokenWords as string;

    // Handle Loud Room "echo" puzzle
    if (context.sharedData.isLoudRoomEcho) {
      return handleLoudRoomEcho(context);
    }

    // Handle Riddle Room puzzle
    if (context.sharedData.isRiddleAnswer) {
      return handleRiddleAnswer(context, words);
    }

    const npcs = context.sharedData.npcsInRoom as any[];

    // Handle Cyclops specifically
    if (context.sharedData.hasCyclops && context.sharedData.cyclops) {
      const cyclopsEvents = handleCyclopsSpeech(context, context.sharedData.cyclops, words);
      events.push(...cyclopsEvents);
      return events;
    }

    // No NPCs in room - speaking to the air
    if (!npcs || npcs.length === 0) {
      events.push(context.event('action.success', {
        actionId: SAY_ACTION_ID,
        messageId: SayMessages.SAY_TO_AIR,
        message: `You say "${words}" but nobody is here to listen.`
      }));
      return events;
    }

    // Default NPC response - no reaction
    events.push(context.event('action.success', {
      actionId: SAY_ACTION_ID,
      messageId: 'npc.no_response',
      message: `You say "${words}".`
    }));

    return events;
  }
};
