/**
 * Thief's Canvas Puzzle Objects - ADR-078
 *
 * Objects for the ghost ritual puzzle:
 * - Empty Frame: Spawns in Treasure Room when Thief dies
 * - Frame Piece: Created when frame is broken, has carved clue
 * - Incense: Found in maze Dead End 1, used to disarm basin trap
 * - Thief's Canvas: Treasure that spawns in Gallery after ritual
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  EntityType,
  SceneryTrait,
  ReadableTrait
} from '@sharpee/world-model';
import { TreasureTrait } from '../traits';
import { BurnableTrait } from '../traits/burnable-trait';
import { FramePieceTrait } from '../traits/frame-piece-trait';

/**
 * Create the empty picture frame
 * Spawns in Treasure Room when Thief dies
 * Can be examined (front/back) and broken
 */
export function createEmptyFrame(world: WorldModel): IFEntity {
  const frame = world.createEntity('empty frame', EntityType.SCENERY);

  frame.add(new IdentityTrait({
    name: 'empty frame',
    aliases: ['frame', 'picture frame', 'ornate frame', 'empty picture frame'],
    description: 'An ornate but empty picture frame mounted on the wall. The craftsmanship is exquisite, though the canvas it once held is missing. There appears to be something carved on the back.',
    properName: false,
    article: 'an'
  }));

  frame.add(new SceneryTrait({ cantTakeMessage: 'dungeo.frame.cant_take' }));

  // Readable with isReadable=false gives custom "can't read" message
  frame.add(new ReadableTrait({
    text: '',
    isReadable: false,
    cannotReadMessage: "You can make out some writing on the back of the frame, but it's too difficult to read while it's mounted on the wall."
  }));

  // Marks for puzzle logic
  frame.attributes.isEmptyFrame = true;
  frame.attributes.isBreakable = true;

  return frame;
}

/**
 * Create the frame piece (result of breaking the empty frame)
 * Has the clue inscription needed for the ritual
 */
export function createFramePiece(world: WorldModel): IFEntity {
  const piece = world.createEntity('frame piece', EntityType.ITEM);

  piece.add(new IdentityTrait({
    name: 'frame piece',
    aliases: ['piece', 'carved piece', 'piece of frame', 'frame fragment'],
    description: 'A piece of the broken frame bearing a carved inscription: "Only devotion can reveal my location."',
    properName: false,
    article: 'a',
    weight: 2
  }));

  // Mark as frame piece for ghost ritual interceptor (ADR-118)
  piece.add(new FramePieceTrait());

  // Readable — the carved clue inscription
  piece.add(new ReadableTrait({
    text: 'Carved into the back of the frame in rough letters: "Only devotion can reveal my location."'
  }));

  return piece;
}

/**
 * Create the incense
 * Found in maze Dead End 1 with the skeleton
 * Burns for 3 turns when lit, disarming the basin trap
 */
export function createIncense(world: WorldModel): IFEntity {
  const incense = world.createEntity('incense', EntityType.ITEM);

  incense.add(new IdentityTrait({
    name: 'incense',
    aliases: ['incense', 'incense stick', 'stick of incense', 'joss stick'],
    description: 'A stick of ancient incense, still fragrant after all these years. It was clutched in the skeleton\'s bony fingers.',
    properName: false,
    article: 'a',
    weight: 5
  }));

  // Burnable trait for incense - burns for 3 turns via fuse
  incense.add(new BurnableTrait({
    burnableType: 'incense',
    isBurning: false,
    burnedOut: false
  }));

  return incense;
}

/**
 * Create the Thief's Canvas treasure
 * Spawns in Gallery after the ghost ritual is complete
 * Worth 34 points total: 10 (ritual reveal) + 10 (take) + 14 (trophy case)
 */
export function createThiefsCanvas(world: WorldModel): IFEntity {
  const canvas = world.createEntity('rolled up canvas', EntityType.ITEM);

  canvas.add(new IdentityTrait({
    name: 'rolled up canvas',
    aliases: ['canvas', 'rolled canvas', 'painting', 'thief\'s canvas', 'portrait'],
    description: 'The thief apparently had a superior artistic streak, for this is one of the greatest creations in all of Zork. It is a faithful rendering of The Implementors, the mythical Gods remembered by all inhabitants.',
    properName: false,
    article: 'a',
    weight: 5,
    points: 10             // 10 pts on take (ADR-078)
  }));

  canvas.add(new TreasureTrait({
    trophyCaseValue: 14,   // 14 pts in trophy case (ADR-078)
  }));

  return canvas;
}
