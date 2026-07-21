/**
 * Data builder for examining action
 * 
 * Centralizes all entity snapshot and event data logic for the examining action.
 * This separates data structure concerns from business logic.
 */

import { Phrase } from '@sharpee/if-domain';
import { ActionDataBuilder, ActionDataConfig } from '../../data-builder-types.js';
import { ActionContext } from '../../enhanced-types.js';
import { WorldModel, TraitType, IFEntity, IdentityTrait, ReadableTrait, WallEntity } from '@sharpee/world-model';
import { OpenableBehavior, SwitchableBehavior, LockableBehavior, WearableBehavior, VisibilityBehavior } from '@sharpee/world-model';
import { captureEntitySnapshot, captureEntitySnapshots } from '../../base/snapshot-utils.js';
import { ExaminedEventData } from './examining-events.js';
import { nounPhraseFor } from '../../../utils/index.js';

/**
 * Build examining action success data
 * 
 * Creates the complete data structure for examined events,
 * including entity snapshots and trait-specific information.
 */
export const buildExaminingData: ActionDataBuilder<Record<string, unknown>> = (
  context: ActionContext,
  preState?: WorldModel,
  postState?: WorldModel
): Record<string, unknown> => {
  const actor = context.player;
  const noun = context.command.directObject?.entity;
  
  if (!noun) {
    // Shouldn't happen if validation passed, but handle gracefully
    return {
      targetId: '',
      targetName: 'nothing'
    };
  }
  
  const isSelf = noun.id === actor.id;
  
  // Capture complete entity snapshot for atomic event
  const entitySnapshot = captureEntitySnapshot(noun, context.world, true);
  
  // Build base event data
  const eventData: Record<string, unknown> = {
    // New atomic structure
    target: entitySnapshot,
    // Backward compatibility fields
    targetId: noun.id,
    targetName: isSelf ? 'yourself' : noun.name
  };
  
  if (isSelf) {
    eventData.self = true;
    // Description is universal — the player carries an IdentityTrait description
    // via the `noun.description` computed getter, same as any other entity.
    eventData.hasDescription = !!noun.description;
    return eventData; // No trait checking for self-examination
  }

  // Walls (ADR-173 Phase 4): per-side description rendering. The wall entity
  // is symmetric, but the *description* the player sees depends on which side
  // they're standing on. We pull `wall.getSide(playerRoom)?.description` and
  // emit `examined_wall` with that as the description param.
  //
  // The actor's current location resolves the side. If the actor is not in
  // either of the wall's two rooms, no per-side description is available —
  // the message falls through to `nothing_special` in `buildExaminingMessageParams`.
  // (In practice this branch is unreachable because the validator's scope
  // filter only admits walls when the actor is in a connecting room, but the
  // data builder stays safe regardless.)
  if (noun instanceof WallEntity) {
    const playerRoom = context.world.getLocation(actor.id);
    const side = playerRoom ? noun.getSide(playerRoom) : undefined;
    eventData.isWall = true;
    if (side?.description) {
      eventData.hasDescription = true;
      eventData.wallDescription = side.description;
    }
    return eventData;
  }

  // Add trait-specific information

  // Description and brief (description uses computed getter for trait-aware text)
  eventData.hasDescription = !!noun.description;
  if (noun.has(TraitType.IDENTITY)) {
    const identityTrait = noun.getTrait(IdentityTrait);
    if (identityTrait) {
      eventData.hasBrief = !!identityTrait.brief;
    }
  }
  
  // Container trait
  if (noun.has(TraitType.CONTAINER)) {
    // Shared visibility read (one definition with LOOK/scope): a
    // still-concealed item stays out of EXAMINE's contents until revealed
    const contents = VisibilityBehavior.getVisibleContents(noun, context.world);
    const contentsSnapshots = captureEntitySnapshots(contents, context.world);

    eventData.isContainer = true;
    eventData.hasContents = contents.length > 0;
    eventData.contentCount = contents.length;
    // New: full snapshots
    eventData.contentsSnapshots = contentsSnapshots;
    // Backward compatibility: simple references
    eventData.contents = contents.map(e => ({ id: e.id, name: e.name }));
    // PhraseList for the contents message (ADR-192): built here where the
    // entities are in hand, so grammatical metadata survives to the assembler
    eventData.contentsPhrases = phraseListForEntities(contents);
    
    // Check if open/closed
    if (noun.has(TraitType.OPENABLE)) {
      eventData.isOpenable = true;
      eventData.isOpen = OpenableBehavior.isOpen(noun);
    } else {
      eventData.isOpen = true; // Containers without openable trait are always open
    }
  }
  
  // Supporter trait
  if (noun.has(TraitType.SUPPORTER)) {
    // Shared visibility read: same rule as the container branch above
    const contents = VisibilityBehavior.getVisibleContents(noun, context.world);
    const contentsSnapshots = captureEntitySnapshots(contents, context.world);

    eventData.isSupporter = true;
    eventData.hasContents = contents.length > 0;
    eventData.contentCount = contents.length;
    // New: full snapshots
    eventData.contentsSnapshots = contentsSnapshots;
    // Backward compatibility: simple references
    eventData.contents = contents.map(e => ({ id: e.id, name: e.name }));
    // PhraseList for the contents message (ADR-192) — see container branch
    eventData.contentsPhrases = phraseListForEntities(contents);
  }
  
  // Switchable trait
  if (noun.has(TraitType.SWITCHABLE)) {
    eventData.isSwitchable = true;
    eventData.isOn = SwitchableBehavior.isOn(noun);
  }
  
  // Readable trait
  if (noun.has(TraitType.READABLE)) {
    const readableTrait = noun.getTrait(ReadableTrait);
    eventData.isReadable = true;
    eventData.hasText = readableTrait ? !!readableTrait.text : false;
  }
  
  // Wearable trait
  if (noun.has(TraitType.WEARABLE)) {
    eventData.isWearable = true;
    eventData.isWorn = WearableBehavior.isWorn(noun);
  }
  
  // Door trait
  if (noun.has(TraitType.DOOR)) {
    eventData.isDoor = true;
    
    // Check if door is openable
    if (noun.has(TraitType.OPENABLE)) {
      eventData.isOpenable = true;
      eventData.isOpen = OpenableBehavior.isOpen(noun);
    }
    
    // Add lock status
    if (noun.has(TraitType.LOCKABLE)) {
      eventData.isLockable = true;
      eventData.isLocked = LockableBehavior.isLocked(noun);
    }
  }
  
  return eventData;
};

/**
 * Bridge a list of entities to a PhraseList message param (ADR-192): the
 * assembler owns articles/joining, so params never carry pre-joined strings.
 */
function phraseListForEntities(entities: IFEntity[]): Phrase {
  return {
    kind: 'list',
    conj: 'and',
    items: entities.map(e => nounPhraseFor(e)),
  };
}

/**
 * The PhraseList for a container's/supporter's examined contents. Prefers the
 * entity-built list from buildExaminingData; a story-extended data builder
 * that replaced `contents` without `contentsPhrases` degrades to minimal
 * noun phrases from the {id, name} references.
 */
function contentsPhraseList(eventData: Record<string, unknown>): Phrase {
  if (eventData.contentsPhrases) {
    return eventData.contentsPhrases as Phrase;
  }
  const refs = (eventData.contents as Array<{ id: string; name: string }>) ?? [];
  return {
    kind: 'list',
    conj: 'and',
    items: refs.map(r => ({
      kind: 'noun',
      name: r.name,
      number: 'singular',
      articleType: 'indefinite',
      referableId: r.id,
    })),
  };
}

/**
 * Result of building message parameters for examining
 */
export interface ExaminingMessageResult {
  messageId: string;
  params: Record<string, any>;
  /** Additional message for container/supporter contents */
  contentsMessage?: { messageId: string; params: Record<string, any> };
}

/**
 * Build message parameters for examining action
 *
 * Creates the parameters needed for text generation based on
 * the entity's traits and state. Also returns an optional
 * contentsMessage for containers/supporters with visible items.
 */
export function buildExaminingMessageParams(
  eventData: Record<string, unknown>,
  noun: IFEntity
): ExaminingMessageResult {
  const params: Record<string, any> = {};
  let messageId = eventData.self ? 'examined_self' : 'examined';
  let contentsMessage: ExaminingMessageResult['contentsMessage'] = undefined;

  // Description is universal (self and non-self alike). Set it before the
  // self-guard so `examined_self`'s `{description}` placeholder is populated;
  // the trait branches below stay self-exclusive.
  if (noun && eventData.hasDescription && noun.description) {
    params.description = noun.description;
  }

  if (!eventData.self && noun) {
    // Add trait-specific parameters

    // Wall-specific message (ADR-173 Phase 4) — checked first because walls
    // do not carry IdentityTrait, so the trait branches below are no-ops.
    if (eventData.isWall) {
      if (eventData.wallDescription) {
        params.description = eventData.wallDescription;
        messageId = 'examined_wall';
      } else {
        params.item = nounPhraseFor(noun);
        messageId = 'nothing_special';
      }
      return { messageId, params, contentsMessage };
    }

    // Container-specific message
    if (eventData.isContainer) {
      messageId = 'examined_container';
      params.isOpen = eventData.isOpen;

      // Add contents message if container is open and has contents
      if (eventData.isOpen && eventData.hasContents && eventData.contents) {
        contentsMessage = {
          messageId: 'container_contents',
          params: {
            container: nounPhraseFor(noun),
            items: contentsPhraseList(eventData)
          }
        };
      }
    }

    // Supporter-specific message (only if not also a container)
    else if (eventData.isSupporter) {
      messageId = 'examined_supporter';

      // Add contents message if supporter has contents
      if (eventData.hasContents && eventData.contents) {
        contentsMessage = {
          messageId: 'surface_contents',
          params: {
            surface: nounPhraseFor(noun),
            items: contentsPhraseList(eventData)
          }
        };
      }
    }

    // Switchable-specific message
    else if (eventData.isSwitchable) {
      messageId = 'examined_switchable';
      params.isOn = eventData.isOn;
    }

    // Readable-specific message
    else if (eventData.isReadable && eventData.hasText && noun.has(TraitType.READABLE)) {
      const readableTrait = noun.getTrait(ReadableTrait);
      if (readableTrait?.text) {
        params.text = readableTrait.text;
        messageId = 'examined_readable';
      }
    }

    // Wearable-specific message
    else if (eventData.isWearable) {
      messageId = 'examined_wearable';
      params.isWorn = eventData.isWorn;
    }

    // Door-specific message
    else if (eventData.isDoor) {
      messageId = 'examined_door';
      if (eventData.isLocked !== undefined) {
        params.isLocked = eventData.isLocked;
      }
    }

    // Default parameters for basic examined message
    else if (messageId === 'examined') {
      params.target = nounPhraseFor(noun);
    }

    // Generalized descriptionless fallback (platform-issue-sweep Phase 3a;
    // David's ruling 2026-07-20): every variant above renders
    // "{verbatim:description}{slot:detail}", which realized to NOTHING when
    // no description was bound — only the wall branch (returned above) had a
    // fallback. With no description, switch to default_description ("The
    // pebble is just a pebble.") instead of a silent blank; a contents
    // message (container/supporter) still follows. Self does not fit the
    // "just a" phrasing and gets its own fallback below.
    if (params.description === undefined) {
      messageId = 'default_description';
      params.item = nounPhraseFor(noun);
    }
  }

  // Self counterpart (David's wording ruling 2026-07-20): descriptionless
  // EXAMINE ME renders "As good-looking as ever." instead of a silent blank.
  else if (eventData.self && params.description === undefined) {
    messageId = 'default_description_self';
  }

  return { messageId, params, contentsMessage };
}

/**
 * Configuration for examining data builder
 * 
 * Allows stories to extend the data while protecting core fields
 */
export const examiningDataConfig: ActionDataConfig<Record<string, unknown>> = {
  builder: buildExaminingData,
  protectedFields: ['targetId', 'targetName', 'target']
};