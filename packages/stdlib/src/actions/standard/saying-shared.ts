/**
 * The shared shape of the three bare-answer actions — saying yes, saying no,
 * saying sorry (ADR-370 D1, D2, D4, D6).
 *
 * Each is a signal action: it validates, mutates nothing, and reports one
 * event carrying its stock line ("Nobody asked you anything."). The
 * consultable entity is the person the actor is in a live conversation
 * scene with, so a Chord `on the player saying_yes` in that person's block
 * fires; outside any scene it is the actor's room. Inside an OPEN exchange
 * the engine's exchange-offer stage has already turned `yes` into
 * `answer yes` (GH #346), so these actions see only what no exchange claims.
 *
 * Public interface: createSayingAction, SaidEventData.
 * Owner context: stdlib / standard actions / social
 */

import { Action, ActionContext, ValidationResult } from '../enhanced-types.js';
import { type EntityId, type ISemanticEvent } from '@sharpee/core';
import { IFEntity, sceneWith } from '@sharpee/world-model';
import { ActionMetadata } from '../../validation/index.js';
import {
  ActionLifecycleDescriptor,
  blockedMessageId
} from '../lifecycle/index.js';

/**
 * Event data for a bare answer (`if.event.said_yes` and its siblings).
 */
export interface SaidEventData {
  /** The person the actor was talking to, when in a live scene */
  speaker?: EntityId;

  /** Name of that person */
  speakerName?: string;

  /** Location where the answer was spoken */
  location?: EntityId;

  /** Name of the location */
  locationName?: string;
}

/** Shared data passed between execute and report phases. */
interface SayingSharedData {
  speakerId?: string;
  speakerName?: string;
  locationId?: string;
  locationName?: string;
}

/**
 * The person the actor is in a live conversation scene with, if any.
 * @param ctx the action context
 * @returns the other participant of the actor's scene, else undefined
 */
export function sceneSpeaker(ctx: ActionContext): IFEntity | undefined {
  const scene = sceneWith(ctx.world, ctx.actor.id);
  const partnerId = scene?.participantIds.find((p) => p !== ctx.actor.id);
  return partnerId ? ctx.world.getEntity(partnerId) : undefined;
}

/**
 * Build one bare-answer action and its lifecycle descriptor.
 * @param spec.actionId the action id (`if.action.saying_yes`)
 * @param spec.reportEventType the success event (`if.event.said_yes`)
 * @param spec.blockedEventType the blocked event (`if.event.say_yes_blocked`)
 * @param spec.stockMessage the stock message id (`nobody_asked`)
 * @returns the action and its descriptor
 */
export function createSayingAction(spec: {
  actionId: string;
  reportEventType: string;
  blockedEventType: string;
  stockMessage: string;
}): { action: Action & { metadata: ActionMetadata }; lifecycle: ActionLifecycleDescriptor } {
  const lifecycle: ActionLifecycleDescriptor = {
    actionId: spec.actionId,
    reportEventType: spec.reportEventType,
    blockedEventType: spec.blockedEventType,
    slots: [
      {
        id: 'target',
        actionIds: [spec.actionId],
        resolve: (ctx) => sceneSpeaker(ctx) ?? ctx.currentLocation ?? undefined
      }
    ]
  };

  const action: Action & { metadata: ActionMetadata } = {
    id: spec.actionId,

    requiredMessages: [spec.stockMessage],

    group: "social",

    metadata: {
      requiresDirectObject: false,
      requiresIndirectObject: false
    },

    validate(_context: ActionContext): ValidationResult {
      // No preconditions of its own; the interceptor consultations run in
      // the executor (ADR-337 D1), around this phase.
      return { valid: true };
    },

    execute(context: ActionContext): void {
      // NO world mutations — speaker and location ride to the report.
      const speaker = sceneSpeaker(context);
      const location = context.currentLocation;
      const sharedData = context.sharedData as SayingSharedData;
      sharedData.speakerId = speaker?.id;
      sharedData.speakerName = speaker?.name;
      sharedData.locationId = location?.id;
      sharedData.locationName = location?.name;
    },

    blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
      return [context.event(spec.blockedEventType, {
        blocked: true,
        messageId: blockedMessageId(context, result),
        params: result.params,
        reason: result.error
      })];
    },

    report(context: ActionContext): ISemanticEvent[] {
      const sharedData = context.sharedData as SayingSharedData;

      // The stock line — a story's reaction on the speaker or the room replaces it.
      return [context.event(spec.reportEventType, {
        messageId: `${context.action.id}.${spec.stockMessage}`,
        speaker: sharedData.speakerId,
        speakerName: sharedData.speakerName,
        location: sharedData.locationId,
        locationName: sharedData.locationName
      } as SaidEventData & { messageId: string })];
    }
  };

  return { action, lifecycle };
}
