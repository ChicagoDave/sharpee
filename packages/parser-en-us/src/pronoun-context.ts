/**
 * @file Pronoun Context for Parser (ADR-089 Phase B)
 * @description Tracks entity references for pronoun resolution
 *
 * Enables commands like:
 * - "take lamp. light it" → "it" = lamp
 * - "talk to Alice. give her the key" → "her" = Alice
 * - "take all. drop them" → "them" = all items taken
 */

import type { IParsedCommand, INounPhrase } from '@sharpee/world-model';
import type { PronounSet } from '@sharpee/world-model';

/**
 * Reference to an entity mentioned in a command
 */
export interface EntityReference {
  /** The entity's ID */
  entityId: string;
  /** How the player referred to it ("the lamp", "Alice") */
  text: string;
  /** Turn number when this reference was set */
  turnNumber: number;
}

/**
 * Context for resolving pronouns in commands
 */
export interface PronounContext {
  /**
   * Inanimate singular - last direct object that's not an actor
   * Used for "it" resolution
   */
  it: EntityReference | null;

  /**
   * Plural - last list, "all" result, or plural entity
   * Used for "them" resolution (inanimate plural)
   */
  them: EntityReference[] | null;

  /**
   * Animate by object pronoun - keyed by the object pronoun form
   * "him" → entity using he/him
   * "her" → entity using she/her
   * Also handles animate singular "them" and neopronouns
   */
  animateByPronoun: Map<string, EntityReference>;

  /**
   * Last successful command (for "again"/"g" command)
   */
  lastCommand: IParsedCommand | null;
}

/**
 * Standard pronouns that the parser should recognize
 */
export const RECOGNIZED_PRONOUNS = [
  // Standard object pronouns
  'it', 'them', 'him', 'her',
  // Neopronouns (object form)
  'xem', 'zir', 'hir', 'em', 'faer'
] as const;

export type RecognizedPronoun = typeof RECOGNIZED_PRONOUNS[number];

/**
 * Check if a word is a recognized pronoun
 */
export function isRecognizedPronoun(word: string): word is RecognizedPronoun {
  return RECOGNIZED_PRONOUNS.includes(word.toLowerCase() as RecognizedPronoun);
}

/**
 * Inanimate pronoun sets for objects without ActorTrait
 */
export const INANIMATE_IT: PronounSet = {
  subject: 'it',
  object: 'it',
  possessive: 'its',
  possessiveAdj: 'its',
  reflexive: 'itself',
  verbForm: 'singular'
};

export const INANIMATE_THEM: PronounSet = {
  subject: 'they',
  object: 'them',
  possessive: 'theirs',
  possessiveAdj: 'their',
  reflexive: 'themselves',
  verbForm: 'plural'
};

/**
 * Module-level pronoun context manager instance
 * Set by the parser, used by slot consumers
 */
let _pronounContextManager: PronounContextManager | null = null;

/**
 * Set the global pronoun context manager (called by parser)
 */
export function setPronounContextManager(manager: PronounContextManager | null): void {
  _pronounContextManager = manager;
}

/**
 * Get the global pronoun context manager (used by slot consumers)
 */
export function getPronounContextManager(): PronounContextManager | null {
  return _pronounContextManager;
}

/**
 * Manager for pronoun context
 * Handles updating and resolving pronoun references
 */
export class PronounContextManager {
  private context: PronounContext;

  constructor() {
    this.context = this.createEmptyContext();
  }

  /**
   * Create an empty pronoun context
   */
  private createEmptyContext(): PronounContext {
    return {
      it: null,
      them: null,
      animateByPronoun: new Map(),
      lastCommand: null
    };
  }

  /**
   * Reset the pronoun context (e.g., on game restart)
   */
  reset(): void {
    this.context = this.createEmptyContext();
  }

  /**
   * Get the current pronoun context (for debugging/testing)
   */
  getContext(): Readonly<PronounContext> {
    return this.context;
  }

  /**
   * Resolve a pronoun to entity references
   * @param pronoun The pronoun to resolve ("it", "him", "her", "them", etc.)
   * @returns Entity reference(s) or null if no match
   */
  resolve(pronoun: string): EntityReference[] | null {
    const normalized = pronoun.toLowerCase();

    switch (normalized) {
      case 'it':
        return this.context.it ? [this.context.it] : null;

      case 'them':
        // Could be plural inanimate OR singular they/them animate
        if (this.context.them && this.context.them.length > 0) {
          return this.context.them;
        }
        // Check for singular they/them actor
        const themEntity = this.context.animateByPronoun.get('them');
        return themEntity ? [themEntity] : null;

      case 'him':
      case 'her':
      case 'xem':
      case 'zir':
      case 'hir':
      case 'em':
      case 'faer':
        const animateEntity = this.context.animateByPronoun.get(normalized);
        return animateEntity ? [animateEntity] : null;

      default:
        // Check if it's a registered animate pronoun (for custom neopronouns)
        const customEntity = this.context.animateByPronoun.get(normalized);
        return customEntity ? [customEntity] : null;
    }
  }

  /**
   * Update pronoun context after a successful parse
   * @param command The successfully parsed command
   * @param world The world model (for entity lookup)
   * @param turnNumber Current turn number
   */
  updateFromCommand(
    command: IParsedCommand,
    world: any, // WorldModel
    turnNumber: number
  ): void {
    // Store last command for "again" support
    this.context.lastCommand = command;

    // Process direct object
    if (command.structure.directObject) {
      this.processNounPhrase(command.structure.directObject, world, turnNumber);
    }

    // Process indirect object
    if (command.structure.indirectObject) {
      this.processNounPhrase(command.structure.indirectObject, world, turnNumber);
    }
  }

  /**
   * Process a noun phrase and update context
   */
  private processNounPhrase(
    nounPhrase: INounPhrase,
    world: any,
    turnNumber: number
  ): void {
    // Handle "all" or list results
    if (nounPhrase.isAll || nounPhrase.isList) {
      if (nounPhrase.items && nounPhrase.items.length > 0) {
        const refs = this.nounPhraseItemsToRefs(nounPhrase.items, world, turnNumber);
        if (refs.length > 0) {
          this.context.them = refs;
        }
      }
      return;
    }

    // Get entity ID - it may be in various places depending on resolution state
    const entityId = this.extractEntityId(nounPhrase, world);
    if (!entityId) {
      return; // Can't update without entity ID
    }

    const entity = world.getEntity(entityId);
    if (!entity) {
      return;
    }

    const ref: EntityReference = {
      entityId,
      text: nounPhrase.text,
      turnNumber
    };

    // Check if this is an actor (animate)
    const actorTrait = entity.get('actor');
    if (actorTrait?.pronouns) {
      // Animate entity - store by object pronoun
      const pronounSet = Array.isArray(actorTrait.pronouns)
        ? actorTrait.pronouns[0]
        : actorTrait.pronouns;

      this.context.animateByPronoun.set(pronounSet.object, ref);

      // For multiple pronoun sets, register all object pronouns
      if (Array.isArray(actorTrait.pronouns)) {
        for (const ps of actorTrait.pronouns) {
          this.context.animateByPronoun.set(ps.object, ref);
        }
      }
    } else {
      // Inanimate entity - check grammatical number
      const identityTrait = entity.get('identity');
      if (identityTrait?.grammaticalNumber === 'plural') {
        this.context.them = [ref];
      } else {
        this.context.it = ref;
      }
    }
  }

  /**
   * Extract entity ID from a noun phrase
   */
  private extractEntityId(nounPhrase: INounPhrase, world: any): string | null {
    // Check for resolved entity ID (set by scope evaluator)
    if ((nounPhrase as any).entityId) {
      return (nounPhrase as any).entityId;
    }

    // Try to find entity by name
    if (nounPhrase.text && world.findEntityByName) {
      const entity = world.findEntityByName(nounPhrase.text);
      if (entity) {
        return entity.id;
      }
    }

    // Check candidates array (old format)
    if (nounPhrase.candidates && nounPhrase.candidates.length === 1) {
      // If there's exactly one candidate and it looks like an entity ID
      const candidate = nounPhrase.candidates[0];
      if (typeof candidate === 'string' && !candidate.includes(' ')) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * Convert noun phrase items to entity references
   */
  private nounPhraseItemsToRefs(
    items: INounPhrase[],
    world: any,
    turnNumber: number
  ): EntityReference[] {
    const refs: EntityReference[] = [];

    for (const item of items) {
      const entityId = this.extractEntityId(item, world);
      if (entityId) {
        refs.push({
          entityId,
          text: item.text,
          turnNumber
        });
      }
    }

    return refs;
  }

  /**
   * Register an entity that was mentioned (for external use)
   * This allows actions to register entities they interact with
   */
  registerEntity(
    entityId: string,
    text: string,
    world: any,
    turnNumber: number
  ): void {
    const entity = world.getEntity(entityId);
    if (!entity) {
      return;
    }

    const ref: EntityReference = {
      entityId,
      text,
      turnNumber
    };

    const actorTrait = entity.get('actor');
    if (actorTrait?.pronouns) {
      const pronounSet = Array.isArray(actorTrait.pronouns)
        ? actorTrait.pronouns[0]
        : actorTrait.pronouns;
      this.context.animateByPronoun.set(pronounSet.object, ref);

      // For multiple pronoun sets, register all object pronouns
      if (Array.isArray(actorTrait.pronouns)) {
        for (const ps of actorTrait.pronouns) {
          this.context.animateByPronoun.set(ps.object, ref);
        }
      }
    } else {
      const identityTrait = entity.get('identity');
      if (identityTrait?.grammaticalNumber === 'plural') {
        this.context.them = [ref];
      } else {
        this.context.it = ref;
      }
    }
  }

  /**
   * Get the last successful command (for "again" support)
   */
  getLastCommand(): IParsedCommand | null {
    return this.context.lastCommand;
  }
}
