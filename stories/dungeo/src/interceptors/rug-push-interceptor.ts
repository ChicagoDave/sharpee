/**
 * Rug Push Interceptor
 *
 * Handles the one-time reveal of the trap door when the oriental rug
 * is pushed in the Living Room. Registered on RugTrait for if.action.pushing.
 *
 * postExecute: Moves trapdoor into the room, wires DOWN/UP exits between
 *   Living Room and Cellar, sets pushable state to 'pushed'.
 * postReport: Emits the reveal message if the trapdoor was just revealed.
 *
 * Replaces the entity `on` handler from house-interior.ts (ISSUE-068 Phase 4).
 *
 * From MDL source (dung.355): MOVE RUG reveals TRAP-DOOR
 */

import {
  ActionInterceptor,
  InterceptorSharedData,
  IFEntity,
  WorldModel,
  PushableTrait,
  RoomBehavior,
  Direction,
  TraitType,
  createEffect,
  CapabilityEffect,
} from '@sharpee/world-model';
import { RugTrait } from '../traits/rug-trait';

export const RugPushMessages = {
  REVEAL_TRAPDOOR: 'dungeo.rug.moved.reveal_trapdoor',
} as const;

export const RugPushInterceptor: ActionInterceptor = {
  /**
   * POST-EXECUTE: Reveal the trapdoor and wire room exits.
   *
   * Only fires once — checks PushableTrait.state to prevent re-triggering.
   */
  postExecute(
    entity: IFEntity,
    world: WorldModel,
    _actorId: string,
    sharedData: InterceptorSharedData
  ): void {
    const pushable = entity.get(TraitType.PUSHABLE) as PushableTrait | undefined;
    if (pushable && pushable.state === 'pushed') {
      return; // Already revealed — no-op
    }

    const rugTrait = entity.get(RugTrait.type) as RugTrait | undefined;
    if (!rugTrait) return;

    const { trapdoorId, cellarId } = rugTrait;
    const livingRoomId = world.getLocation(entity.id);
    if (!livingRoomId) return;

    // Move trapdoor into the living room (makes it visible/interactable)
    world.moveEntity(trapdoorId, livingRoomId);

    // Wire room exits through the trapdoor
    const livingRoom = world.getEntity(livingRoomId);
    if (livingRoom) {
      RoomBehavior.setExit(livingRoom, Direction.DOWN, cellarId, trapdoorId);
    }
    const cellar = world.getEntity(cellarId);
    if (cellar) {
      RoomBehavior.setExit(cellar, Direction.UP, livingRoomId, trapdoorId);
    }

    // Mark as pushed (prevents re-triggering)
    if (pushable) {
      pushable.state = 'pushed';
    }

    // Flag for postReport
    sharedData.rugRevealed = true;
  },

  /**
   * POST-REPORT: Emit the trapdoor reveal message.
   */
  postReport(
    _entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    sharedData: InterceptorSharedData
  ): CapabilityEffect[] {
    if (!sharedData.rugRevealed) {
      return [];
    }

    return [
      createEffect('game.message', {
        messageId: RugPushMessages.REVEAL_TRAPDOOR,
      }),
    ];
  },
};
