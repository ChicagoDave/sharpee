/**
 * Dialogue extension types (ADR-102 / ADR-142)
 *
 * Defines the DialogueExtension interface and DialogueResult type
 * from ADR-102. The character model conversation system (ADR-142)
 * implements this interface via CharacterModelDialogue.
 *
 * Public interface: DialogueExtension, DialogueResult.
 * Owner context: @sharpee/character / conversation
 */

import { ResponseIntent } from './response-types';

// ---------------------------------------------------------------------------
// Dialogue result
// ---------------------------------------------------------------------------

/**
 * The result of a dialogue extension handling a conversation action.
 * Contains everything the action needs to produce output.
 */
export interface DialogueResult {
  /** Whether the extension handled the input. */
  handled: boolean;

  /** Message ID for the action to emit via the reporting phase. */
  messageId?: string;

  /** Parameters for the language layer message. */
  params?: Record<string, unknown>;

  /** The structured response intent (for systems that need it). */
  responseIntent?: ResponseIntent;
}

// ---------------------------------------------------------------------------
// Dialogue extension interface
// ---------------------------------------------------------------------------

/**
 * Interface for dialogue extensions (ADR-102).
 *
 * Stdlib conversation actions (ASK, TELL, SAY, TALK TO) delegate
 * to a registered DialogueExtension to produce conversation results.
 * The extension resolves free text to topics, evaluates constraints,
 * and returns structured results.
 */
export interface DialogueExtension {
  /**
   * Handle ASK [npc] ABOUT [text].
   * Extension resolves text to topic and selects a response.
   *
   * @param npcId - The NPC entity ID
   * @param aboutText - The raw text after "about"
   * @returns Dialogue result
   */
  handleAsk(npcId: string, aboutText: string): DialogueResult;

  /**
   * Handle TELL [npc] ABOUT [text].
   * Confrontation path — the player presents information.
   *
   * @param npcId - The NPC entity ID
   * @param aboutText - The raw text after "about"
   * @returns Dialogue result
   */
  handleTell(npcId: string, aboutText: string): DialogueResult;

  /**
   * Handle SAY [text] or SAY [text] TO [npc].
   * Free speech routed through topic resolution.
   *
   * @param npcId - The NPC entity ID, or undefined for untargeted speech
   * @param spokenText - The raw text
   * @returns Dialogue result
   */
  handleSay(npcId: string | undefined, spokenText: string): DialogueResult;

  /**
   * Handle TALK TO [npc].
   * Initiates conversation lifecycle and fires initiative triggers.
   *
   * @param npcId - The NPC entity ID
   * @returns Dialogue result
   */
  handleTalkTo(npcId: string): DialogueResult;
}
