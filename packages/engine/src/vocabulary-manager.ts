/**
 * Vocabulary Manager - Manages entity vocabulary for parser scope resolution
 *
 * Extracted from GameEngine as part of Phase 4 remediation.
 * Handles registering entity nouns/adjectives with the vocabulary registry
 * to enable parser noun resolution within the current scope.
 */

import { IFEntity, WorldModel } from '@sharpee/world-model';
import { vocabularyRegistry } from '@sharpee/stdlib';

/**
 * Manages vocabulary registration for entities in scope
 */
export class VocabularyManager {
  /**
   * Update vocabulary for a single entity
   *
   * @param entity - The entity to register
   * @param inScope - Whether the entity is currently in scope
   */
  updateEntityVocabulary(entity: IFEntity, inScope: boolean): void {
    const identityTrait = entity.get('IDENTITY');
    if (identityTrait && typeof identityTrait === 'object') {
      const identity = identityTrait as {
        name?: string;
        aliases?: string[];
        adjectives?: string[];
      };

      // Build nouns from name and aliases
      const nouns: string[] = [];
      if (identity.name) {
        nouns.push(identity.name.toLowerCase());
      }
      if (identity.aliases && Array.isArray(identity.aliases)) {
        nouns.push(...identity.aliases);
      }

      vocabularyRegistry.registerEntity({
        entityId: entity.id,
        nouns: nouns,
        adjectives: identity.adjectives || [],
        inScope
      });
    }
  }

  /**
   * Update vocabulary for all entities based on current scope
   *
   * Marks all entities as out of scope first, then marks
   * entities visible to the player as in scope.
   *
   * @param world - The world model
   * @param playerId - The player entity ID
   */
  updateScopeVocabulary(world: WorldModel, playerId: string): void {
    const player = world.getEntity(playerId);
    if (!player) return;

    const inScope = world.getInScope(playerId);

    // Mark all entities as out of scope first
    for (const entity of world.getAllEntities()) {
      this.updateEntityVocabulary(entity, false);
    }

    // Mark in-scope entities
    for (const entity of inScope) {
      this.updateEntityVocabulary(entity, true);
    }
  }
}

/**
 * Create a vocabulary manager instance
 */
export function createVocabularyManager(): VocabularyManager {
  return new VocabularyManager();
}
