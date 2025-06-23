/**
 * Actor behavior - static methods for actor operations
 */

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { ActorTrait } from './actorTrait';

/**
 * Static behavior methods for actors
 */
export class ActorBehavior extends Behavior {
  static requiredTraits = [TraitType.ACTOR];
  
  /**
   * Check if an entity can perform actions
   */
  static canAct(actor: IFEntity): boolean {
    const actorTrait = actor.getTrait(TraitType.ACTOR) as ActorTrait;
    return actorTrait?.canAct ?? false;
  }
  
  /**
   * Check if an entity is the player
   */
  static isPlayer(actor: IFEntity): boolean {
    const actorTrait = actor.getTrait(TraitType.ACTOR) as ActorTrait;
    return actorTrait?.isPlayer ?? false;
  }
  
  /**
   * Get the current state of an actor
   */
  static getState(actor: IFEntity): string | undefined {
    const actorTrait = actor.getTrait(TraitType.ACTOR) as ActorTrait;
    return actorTrait?.state;
  }
  
  /**
   * Set the state of an actor
   */
  static setState(actor: IFEntity, state: string): void {
    const actorTrait = actor.getTrait(TraitType.ACTOR) as ActorTrait;
    if (actorTrait) {
      actorTrait.state = state;
    }
  }
  
  /**
   * Enable or disable an actor's ability to act
   */
  static setCanAct(actor: IFEntity, canAct: boolean): void {
    const actorTrait = actor.getTrait(TraitType.ACTOR) as ActorTrait;
    if (actorTrait) {
      actorTrait.canAct = canAct;
    }
  }
  
  /**
   * Find the player entity in a collection
   */
  static findPlayer(entities: IFEntity[]): IFEntity | undefined {
    return entities.find(entity => this.isPlayer(entity));
  }
}
