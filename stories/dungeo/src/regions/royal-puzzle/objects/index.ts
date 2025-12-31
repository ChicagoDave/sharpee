/**
 * Royal Puzzle Objects
 *
 * Objects in the Royal Puzzle region:
 * - Gold card (treasure, 25 pts total: 10 take + 15 case)
 * - Warning note (readable, in Puzzle Room)
 */

import {
  WorldModel,
  IFEntity,
  EntityType,
  IdentityTrait,
  ReadableTrait
} from '@sharpee/world-model';

/**
 * Create the gold card treasure
 *
 * The gold card is found inside the Royal Puzzle, in a depression
 * in one of the sandstone blocks. It's embossed with the royal crest.
 *
 * Note: The card is initially "inside" the puzzle, so we don't place
 * it in a normal room. The puzzle handler manages when it becomes
 * available to take.
 */
export function createGoldCard(world: WorldModel): IFEntity {
  const card = world.createEntity('gold card', EntityType.ITEM);

  card.add(new IdentityTrait({
    name: 'gold card',
    aliases: ['card', 'royal card', 'gold', 'golden card'],
    description: 'This is an ornate gold card, beautifully embossed with the royal crest of the Great Underground Empire.',
    properName: false,
    article: 'a'
  }));

  // Mark as treasure
  (card as any).isTreasure = true;
  (card as any).treasureId = 'gold-card';
  (card as any).treasureValue = 10;      // Points for taking
  (card as any).trophyCaseValue = 15;    // Additional points in trophy case

  return card;
}

/**
 * Create the warning note
 *
 * A small note lying on the ground in the Puzzle Room, warning
 * adventurers about the dangers of the Royal Puzzle.
 */
export function createWarningNote(world: WorldModel, puzzleRoomId: string): IFEntity {
  const note = world.createEntity('warning note', EntityType.ITEM);

  note.add(new IdentityTrait({
    name: 'warning note',
    aliases: ['note', 'warning', 'small note'],
    description: 'This is a small yellowed note with faded writing.',
    properName: false,
    article: 'a'
  }));

  note.add(new ReadableTrait({
    text: `Warning:

The Royal Puzzle is dangerous. Many who have entered
have never returned, trapped forever within its confines.
If you do enter, be warned: there is only one way out,
and that requires pushing the sandstone walls.

The treasure within is yours for the taking, but only
if you can find your way back.`
  }));

  // Place in Puzzle Room
  world.moveEntity(note.id, puzzleRoomId);

  return note;
}

/**
 * Create all objects in the Royal Puzzle region
 */
export function createRoyalPuzzleObjects(
  world: WorldModel,
  roomIds: { puzzleRoom: string; roomInPuzzle: string }
): { goldCard: IFEntity; warningNote: IFEntity } {
  const goldCard = createGoldCard(world);
  const warningNote = createWarningNote(world, roomIds.puzzleRoom);

  // Place card in the Room in a Puzzle so it's in scope for entity resolution.
  // The puzzle handler controls when it can actually be taken (only when adjacent).
  world.moveEntity(goldCard.id, roomIds.roomInPuzzle);

  return { goldCard, warningNote };
}
