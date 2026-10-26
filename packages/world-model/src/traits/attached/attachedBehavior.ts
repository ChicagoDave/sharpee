/**
 * Behavior for attached entities (ADR-373 D1, D6) — the one owner of an
 * attachment's mutations: tying or fastening a thing to an anchor, and
 * pulling or untying it free.
 *
 * Public interface: AttachedBehavior (isAttached, isDetachable, anchorOf,
 * attach, detach), IDetachResult.
 * Owner context: @sharpee/world-model / traits
 */

import { Behavior } from '../../behaviors/behavior.js';
import { IFEntity } from '../../entities/if-entity.js';
import { TraitType } from '../trait-types.js';
import { AttachedTrait, IAttachedData } from './attachedTrait.js';

/** Result of detaching an entity. */
export interface IDetachResult {
  /** Whether the entity was freed */
  success: boolean;
  /** The anchor it was attached to, when it was attached */
  anchorId?: string;
  /** Why it was not freed: not attached at all, or attached and not detachable */
  reason?: 'not_attached' | 'not_detachable';
}

/**
 * Attachment rules. An entity is attached while its `AttachedTrait` names an
 * anchor and is not `loose`; detaching clears the anchor and leaves the
 * entity where it is.
 */
export class AttachedBehavior extends Behavior {
  static requiredTraits = [TraitType.ATTACHED];

  /**
   * Whether the entity is held fast to an anchor.
   * @param entity The entity to test
   * @returns true when it carries an anchor and is not loose
   */
  static isAttached(entity: IFEntity): boolean {
    const attached = entity.get<AttachedTrait>(TraitType.ATTACHED);
    return !!attached && !!attached.attachedTo && !attached.loose;
  }

  /**
   * Whether an attached entity can be pulled or untied free.
   * @param entity The entity to test
   * @returns true when it is attached and detachable
   */
  static isDetachable(entity: IFEntity): boolean {
    return AttachedBehavior.isAttached(entity) && entity.get<AttachedTrait>(TraitType.ATTACHED)!.detachable;
  }

  /**
   * The anchor's entity id, when the entity is attached.
   * @param entity The entity to read
   * @returns The anchor id, or undefined
   */
  static anchorOf(entity: IFEntity): string | undefined {
    return AttachedBehavior.isAttached(entity) ? entity.get<AttachedTrait>(TraitType.ATTACHED)!.attachedTo : undefined;
  }

  /**
   * Attach the entity to an anchor, adding the trait when it has none.
   * @param entity The entity to attach
   * @param anchorId The anchor's entity id
   * @param attachmentType How it is attached
   * @param detachable Whether it can be pulled or untied free
   * @throws Error when the entity would be attached to itself
   */
  static attach(
    entity: IFEntity,
    anchorId: string,
    attachmentType: NonNullable<IAttachedData['attachmentType']>,
    detachable: boolean
  ): void {
    if (anchorId === entity.id) {
      throw new Error(`An entity cannot be attached to itself (${entity.id}).`);
    }
    let attached = entity.get<AttachedTrait>(TraitType.ATTACHED);
    if (!attached) {
      attached = new AttachedTrait();
      entity.add(attached);
    }
    attached.attachedTo = anchorId;
    attached.attachmentType = attachmentType;
    attached.detachable = detachable;
    attached.loose = false;
  }

  /**
   * Free a detachable attached entity: clears its anchor, leaves it in place.
   * @param entity The entity to free
   * @returns success with the former anchor, or the refusal reason; nothing
   *          changes on a refusal
   */
  static detach(entity: IFEntity): IDetachResult {
    if (!AttachedBehavior.isAttached(entity)) {
      return { success: false, reason: 'not_attached' };
    }
    const attached = entity.get<AttachedTrait>(TraitType.ATTACHED)!;
    const anchorId = attached.attachedTo;
    if (!attached.detachable) {
      return { success: false, anchorId, reason: 'not_detachable' };
    }
    attached.attachedTo = undefined;
    return { success: true, anchorId };
  }
}
