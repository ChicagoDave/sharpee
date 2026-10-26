/**
 * Rug Push Interceptor
 *
 * Handles the one-time reveal of the trap door when the oriental rug
 * is pushed in the Living Room. Registered on RugTrait for if.action.pushing.
 *
 * postExecute: Moves trapdoor into the room, wires DOWN/UP exits between
 *   Living Room and Cellar, marks the rug's trait revealed.
 * postReport: Emits the reveal message if the trapdoor was just revealed.
 *
 * Replaces the entity `on` handler from house-interior.ts (ISSUE-068 Phase 4).
 *
 * From MDL source (dung.355): MOVE RUG reveals TRAP-DOOR
 */

import {
  type ActionInterceptor,
  type InterceptorSharedData,
  type InterceptorReportResult,
  IFEntity,
  WorldModel,
  RoomBehavior,
  RoomTrait,
  Direction,
} from '@sharpee/world-model';
import { RugTrait } from '../traits/rug-trait';

export const RugPushMessages = {
  REVEAL_TRAPDOOR: 'dungeo.rug.moved.reveal_trapdoor',
} as const;

export const RugPushInterceptor: ActionInterceptor = {
  /**
   * POST-EXECUTE: Reveal the trapdoor and wire room exits.
   *
   * Only fires once — the rug's own trait remembers the reveal.
   */
  postExecute(
    entity: IFEntity,
    world: WorldModel,
    _actorId: string,
    sharedData: InterceptorSharedData
  ): void {
    const rugTrait = entity.get(RugTrait.type) as RugTrait | undefined;
    if (!rugTrait || rugTrait.revealed) return; // Already revealed — no-op

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

    // Mark as revealed (prevents re-triggering)
    rugTrait.revealed = true;

    // ADR-209: the room prose's rug mention follows the rug's new position
    // (handler-driven snippet mutation — set, never delete). Bare fragment
    // (ADR-211): sentence site — the platform supplies the join space.
    const livingRoomTrait = livingRoom?.get(RoomTrait);
    if (livingRoomTrait?.snippets) {
      livingRoomTrait.snippets.rug =
        'A large oriental rug lies to one side of the room, moved away from the trap door it once covered.';
    }

    // Flag for postReport
    sharedData.rugRevealed = true;
  },

  /**
   * POST-REPORT: Override the standard pushed_nudged message with the
   * trapdoor reveal text. The rug-reveal message *replaces* the generic
   * "you give the rug a push" line — pre-cleanup behavior matching MDL.
   */
  postReport(
    _entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    sharedData: InterceptorSharedData
  ): InterceptorReportResult {
    if (!sharedData.rugRevealed) {
      return {};
    }

    return {
      override: { messageId: RugPushMessages.REVEAL_TRAPDOOR },
    };
  },
};
